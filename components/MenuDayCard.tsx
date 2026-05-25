'use client'

import { useState } from 'react'
import { AllergenBadge, AllergenSelector } from './AllergenBadge'
import type { MenuDay, MenuItem, AllergenCode } from '@/lib/types'
import { DAY_NAMES, DAY_SHORT } from '@/lib/types'
import { createSupabaseBrowser } from '@/lib/supabase/client'

interface Props {
  day: MenuDay | null
  dayIndex: number  // 0–4
  dayDate: string   // YYYY-MM-DD
  menuId: string
  onRefresh: () => void
}

interface ItemFormState {
  name: string
  allergens: AllergenCode[]
  is_featured: boolean
}

const EMPTY_FORM: ItemFormState = { name: '', allergens: [], is_featured: false }

export default function MenuDayCard({ day, dayIndex, dayDate, menuId, onRefresh }: Props) {
  const [adding, setAdding]   = useState<'soup' | 'main' | 'dessert' | null>(null)
  const [form, setForm]       = useState<ItemFormState>(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const supabase = createSupabaseBrowser()

  const soup    = day?.menu_items.filter(i => i.type === 'soup') ?? []
  const mains   = day?.menu_items.filter(i => i.type === 'main').sort((a,b) => a.sort_order - b.sort_order) ?? []
  const dessert = day?.menu_items.filter(i => i.type === 'dessert') ?? []

  async function ensureDay(): Promise<string> {
    if (day) return day.id
    const { data, error } = await supabase
      .from('menu_days')
      .insert({ menu_id: menuId, day_of_week: dayIndex + 1, date: dayDate })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  }

  async function saveItem(type: 'soup' | 'main' | 'dessert') {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const dayId = await ensureDay()

      // For soup/dessert: replace existing
      if (type === 'soup' || type === 'dessert') {
        const existing = day?.menu_items.filter(i => i.type === type) ?? []
        if (existing.length) await supabase.from('menu_items').delete().in('id', existing.map(i => i.id))
      }

      const { data: item, error } = await supabase
        .from('menu_items')
        .insert({
          day_id: dayId,
          type,
          name: form.name.trim(),
          is_featured: form.is_featured,
          sort_order: type === 'main' ? mains.length : type === 'dessert' ? 99 : 0,
        })
        .select('id')
        .single()
      if (error) throw error

      if (form.allergens.length) {
        await supabase.from('item_allergens').insert(
          form.allergens.map(code => ({ item_id: item.id, code }))
        )
      }

      setAdding(null)
      setForm(EMPTY_FORM)
      onRefresh()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id: string) {
    await supabase.from('menu_items').delete().eq('id', id)
    onRefresh()
  }

  async function saveEdit(item: MenuItem) {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await supabase.from('menu_items').update({ name: form.name.trim(), is_featured: form.is_featured }).eq('id', item.id)
      await supabase.from('item_allergens').delete().eq('item_id', item.id)
      if (form.allergens.length) {
        await supabase.from('item_allergens').insert(form.allergens.map(code => ({ item_id: item.id, code })))
      }
      setEditId(null)
      setForm(EMPTY_FORM)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item: MenuItem) {
    setEditId(item.id)
    setForm({ name: item.name, allergens: item.item_allergens.map(a => a.code), is_featured: item.is_featured })
    setAdding(null)
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY_FORM) }
  function cancelAdd()  { setAdding(null); setForm(EMPTY_FORM) }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl flex flex-col min-w-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-800">
        <p className="text-xs text-stone-500">{DAY_SHORT[dayIndex]}</p>
        <p className="text-sm font-medium text-stone-200">{DAY_NAMES[dayIndex]}</p>
        <p className="text-xs text-stone-600 mt-0.5">{formatDate(dayDate)}</p>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Soup */}
        <Section label="Keitto">
          {soup.map(item => (
            editId === item.id
              ? <InlineForm key={item.id} form={form} setForm={setForm} onSave={() => saveEdit(item)} onCancel={cancelEdit} saving={saving} showFeatured={false} />
              : <ItemRow key={item.id} item={item} onEdit={() => startEdit(item)} onDelete={() => deleteItem(item.id)} />
          ))}
          {adding === 'soup'
            ? <InlineForm form={form} setForm={setForm} onSave={() => saveItem('soup')} onCancel={cancelAdd} saving={saving} showFeatured={false} />
            : <AddButton label="+ Lisää keitto" onClick={() => { setAdding('soup'); setForm(EMPTY_FORM) }} />
          }
        </Section>

        {/* Mains */}
        <Section label="Pääruoat">
          {mains.map(item => (
            editId === item.id
              ? <InlineForm key={item.id} form={form} setForm={setForm} onSave={() => saveEdit(item)} onCancel={cancelEdit} saving={saving} showFeatured />
              : <ItemRow key={item.id} item={item} onEdit={() => startEdit(item)} onDelete={() => deleteItem(item.id)} />
          ))}
          {adding === 'main'
            ? <InlineForm form={form} setForm={setForm} onSave={() => saveItem('main')} onCancel={cancelAdd} saving={saving} showFeatured />
            : <AddButton label="+ Lisää pääruoka" onClick={() => { setAdding('main'); setForm(EMPTY_FORM) }} />
          }
        </Section>

        {/* Dessert */}
        <Section label="Jälkiruoka">
          {dessert.map(item => (
            editId === item.id
              ? <InlineForm key={item.id} form={form} setForm={setForm} onSave={() => saveEdit(item)} onCancel={cancelEdit} saving={saving} showFeatured={false} />
              : <ItemRow key={item.id} item={item} onEdit={() => startEdit(item)} onDelete={() => deleteItem(item.id)} />
          ))}
          {adding === 'dessert'
            ? <InlineForm form={form} setForm={setForm} onSave={() => saveItem('dessert')} onCancel={cancelAdd} saving={saving} showFeatured={false} />
            : <AddButton label="+ Lisää jälkiruoka" onClick={() => { setAdding('dessert'); setForm(EMPTY_FORM) }} />
          }
        </Section>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function ItemRow({ item, onEdit, onDelete }: { item: MenuItem; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-start gap-2 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 truncate">{item.name}</p>
        {item.item_allergens.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.item_allergens.map(a => <AllergenBadge key={a.code} code={a.code} />)}
          </div>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onEdit} className="p-1 text-stone-500 hover:text-accent transition-colors text-xs">✎</button>
        <button onClick={onDelete} className="p-1 text-stone-500 hover:text-red-400 transition-colors text-xs">✕</button>
      </div>
    </div>
  )
}

function InlineForm({ form, setForm, onSave, onCancel, saving, showFeatured }: {
  form: ItemFormState
  setForm: (f: ItemFormState) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  showFeatured: boolean
}) {
  return (
    <div className="bg-stone-800 rounded-lg p-3 space-y-2">
      <input
        autoFocus
        type="text"
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        placeholder="Nimi..."
        className="w-full bg-stone-700 border border-stone-600 rounded px-2.5 py-1.5 text-sm text-stone-100
                   placeholder:text-stone-500 focus:outline-none focus:border-accent"
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
      />
      <AllergenSelector value={form.allergens} onChange={allergens => setForm({ ...form, allergens })} />
      {showFeatured && (
        <label className="flex items-center gap-2 text-xs text-stone-400 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={e => setForm({ ...form, is_featured: e.target.checked })}
            className="accent-amber-500"
          />
          Päivän suosikki
        </label>
      )}
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="px-3 py-1 bg-accent text-stone-950 text-xs font-medium rounded transition-opacity disabled:opacity-50"
        >
          {saving ? '…' : 'Tallenna'}
        </button>
        <button onClick={onCancel} className="px-3 py-1 text-stone-500 text-xs hover:text-stone-300 transition-colors">
          Peruuta
        </button>
      </div>
    </div>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left text-xs text-stone-600 hover:text-accent transition-colors py-1"
    >
      {label}
    </button>
  )
}

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${parseInt(d)}.${parseInt(m)}.`
}
