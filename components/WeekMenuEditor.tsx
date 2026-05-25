'use client'

import { useState, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import MenuDayCard from './MenuDayCard'
import { getMondayOf, toISO, addDays } from '@/lib/types'
import type { WeeklyMenu } from '@/lib/types'

interface Props {
  initialMenu: WeeklyMenu | null
  initialWeekStart: string
}

export default function WeekMenuEditor({ initialMenu, initialWeekStart }: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [menu, setMenu]           = useState<WeeklyMenu | null>(initialMenu)
  const [loading, setLoading]     = useState(false)
  const [publishing, setPublishing] = useState(false)
  const supabase = createSupabaseBrowser()

  const monday = new Date(weekStart + 'T00:00:00')

  // Fetch/refresh menu for current weekStart
  const loadMenu = useCallback(async (ws: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('weekly_menus')
      .select(`*, menu_days(*, menu_items(*, item_allergens(code)))`)
      .eq('week_start', ws)
      .maybeSingle()
    setMenu(data as WeeklyMenu | null)
    setLoading(false)
  }, [supabase])

  async function ensureMenu(): Promise<string> {
    if (menu) return menu.id
    const { data, error } = await supabase
      .from('weekly_menus')
      .insert({ week_start: weekStart, published: false })
      .select('id')
      .single()
    if (error) throw error
    await loadMenu(weekStart)
    return data.id
  }

  async function shiftWeek(delta: number) {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + delta * 7)
    const newWs = toISO(getMondayOf(d))
    setWeekStart(newWs)
    await loadMenu(newWs)
  }

  async function togglePublish() {
    if (!menu) return
    setPublishing(true)
    const newPublished = !menu.published
    await supabase.from('weekly_menus').update({ published: newPublished }).eq('id', menu.id)
    setMenu({ ...menu, published: newPublished })
    setPublishing(false)
  }

  function formatWeekLabel(ws: string): string {
    const m = new Date(ws + 'T00:00:00')
    const e = new Date(m); e.setDate(m.getDate() + 4)
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' }
    const isCurrentWeek = ws === initialWeekStart
    return `${m.toLocaleDateString('fi-FI', opts)} – ${e.toLocaleDateString('fi-FI', opts)}${isCurrentWeek ? ' (tämä viikko)' : ''}`
  }

  function jumpToDate(iso: string) {
    if (!iso) return
    const d = new Date(iso + 'T12:00:00')
    const newWs = toISO(getMondayOf(d))
    setWeekStart(newWs)
    loadMenu(newWs)
  }

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => shiftWeek(-1)}
          className="px-3 py-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors text-lg leading-none"
          aria-label="Edellinen viikko"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-stone-200 min-w-52 text-center">
          {formatWeekLabel(weekStart)}
        </span>
        <button
          onClick={() => shiftWeek(1)}
          className="px-3 py-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors text-lg leading-none"
          aria-label="Seuraava viikko"
        >
          ›
        </button>

        {/* Jump to any week via date picker */}
        <div className="flex items-center gap-1.5 ml-2 border-l border-stone-700 pl-3">
          <span className="text-xs text-stone-500 whitespace-nowrap">Hyppää päivään:</span>
          <input
            type="date"
            onChange={e => jumpToDate(e.target.value)}
            className="bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-300
                       focus:outline-none focus:border-accent transition-colors cursor-pointer"
            title="Valitse mikä tahansa päivä viikolta"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          {loading && <span className="text-xs text-stone-500">Ladataan…</span>}

          {/* Create menu if it doesn't exist */}
          {!menu && !loading && (
            <button
              onClick={() => ensureMenu()}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm rounded-lg transition-colors border border-stone-700"
            >
              + Luo ruokalista tälle viikolle
            </button>
          )}

          {menu && (
            <button
              onClick={togglePublish}
              disabled={publishing}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                menu.published
                  ? 'bg-emerald-800/40 text-emerald-400 hover:bg-emerald-800/60 border border-emerald-800'
                  : 'bg-accent text-stone-950 hover:bg-accent-hover'
              }`}
            >
              {publishing ? '…' : menu.published ? '✓ Julkaistu' : 'Julkaise'}
            </button>
          )}
        </div>
      </div>

      {/* 5-day grid */}
      {menu ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }, (_, i) => {
            const dayDate = toISO(addDays(monday, i))
            const menuDay = menu.menu_days?.find(d => d.day_of_week === i + 1) ?? null
            return (
              <MenuDayCard
                key={i}
                day={menuDay}
                dayIndex={i}
                dayDate={dayDate}
                menuId={menu.id}
                onRefresh={() => loadMenu(weekStart)}
              />
            )
          })}
        </div>
      ) : !loading ? (
        <div className="text-center py-20 text-stone-600 text-sm">
          Tälle viikolle ei ole vielä ruokalistaa.
        </div>
      ) : null}
    </div>
  )
}
