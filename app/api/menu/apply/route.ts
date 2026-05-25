import { NextResponse } from 'next/server'
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server'
import { getMondayOf, toISO, addDays } from '@/lib/types'
import type { ParsedMenuAction } from '@/lib/types'

export async function POST(request: Request) {
  // Verify admin session — getUser() validates the JWT server-side
  const supabase = await createSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action }: { action: ParsedMenuAction } = await request.json()
  if (!action) return NextResponse.json({ error: 'No action' }, { status: 400 })

  const admin = createSupabaseAdmin()

  try {
    const weekOffset = action.week_offset ?? 0
    const baseDate   = new Date()
    baseDate.setDate(baseDate.getDate() + weekOffset * 7)
    const monday     = getMondayOf(baseDate)
    const weekStart  = toISO(monday)

    // Ensure weekly_menu exists
    let { data: menu } = await admin
      .from('weekly_menus')
      .select('id, published')
      .eq('week_start', weekStart)
      .maybeSingle()

    if (!menu) {
      const { data: created, error } = await admin
        .from('weekly_menus')
        .insert({ week_start: weekStart, published: false })
        .select('id, published')
        .single()
      if (error) throw error
      menu = created
    }

    // Publish / Unpublish
    if (action.action === 'publish' || action.action === 'unpublish') {
      await admin
        .from('weekly_menus')
        .update({ published: action.action === 'publish' })
        .eq('id', menu!.id)
      return NextResponse.json({ ok: true })
    }

    if (!action.day) {
      return NextResponse.json({ error: 'Päivää ei määritelty' }, { status: 400 })
    }

    // Ensure menu_day exists for this day
    const dayDate = toISO(addDays(monday, action.day - 1))
    let { data: menuDay } = await admin
      .from('menu_days')
      .select('id')
      .eq('menu_id', menu!.id)
      .eq('day_of_week', action.day)
      .maybeSingle()

    if (!menuDay) {
      const { data: created, error } = await admin
        .from('menu_days')
        .insert({ menu_id: menu!.id, day_of_week: action.day, date: dayDate })
        .select('id')
        .single()
      if (error) throw error
      menuDay = created
    }

    const dayId = menuDay!.id

    switch (action.action) {

      case 'update_soup': {
        if (!action.soup) break
        // Delete existing soup for this day
        const { data: existing } = await admin
          .from('menu_items')
          .select('id')
          .eq('day_id', dayId)
          .eq('type', 'soup')
        if (existing?.length) {
          await admin.from('menu_items').delete().in('id', existing.map(e => e.id))
        }
        // Insert new soup
        const { data: item, error } = await admin
          .from('menu_items')
          .insert({ day_id: dayId, type: 'soup', name: action.soup.name, sort_order: 0 })
          .select('id')
          .single()
        if (error) throw error
        if (action.soup.allergens.length) {
          await admin.from('item_allergens').insert(
            action.soup.allergens.map(code => ({ item_id: item.id, code }))
          )
        }
        break
      }

      case 'add_main': {
        if (!action.mains?.length) break
        const { data: existing } = await admin
          .from('menu_items')
          .select('sort_order')
          .eq('day_id', dayId)
          .eq('type', 'main')
          .order('sort_order', { ascending: false })
          .limit(1)
        const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

        for (const [i, main] of action.mains.entries()) {
          const { data: item, error } = await admin
            .from('menu_items')
            .insert({
              day_id: dayId,
              type: 'main',
              name: main.name,
              is_featured: main.is_featured,
              sort_order: nextOrder + i,
            })
            .select('id')
            .single()
          if (error) throw error
          if (main.allergens.length) {
            await admin.from('item_allergens').insert(
              main.allergens.map(code => ({ item_id: item.id, code }))
            )
          }
        }
        break
      }

      case 'set_dessert': {
        if (!action.dessert) break
        const { data: existing } = await admin
          .from('menu_items')
          .select('id')
          .eq('day_id', dayId)
          .eq('type', 'dessert')
        if (existing?.length) {
          await admin.from('menu_items').delete().in('id', existing.map(e => e.id))
        }
        await admin.from('menu_items').insert({ day_id: dayId, type: 'dessert', name: action.dessert, sort_order: 99 })
        break
      }

      case 'delete_item': {
        if (!action.target_name) break
        const { data: items } = await admin
          .from('menu_items')
          .select('id, name')
          .eq('day_id', dayId)
        const match = items?.find(i =>
          i.name.toLowerCase().includes(action.target_name!.toLowerCase())
        )
        if (match) {
          await admin.from('menu_items').delete().eq('id', match.id)
        }
        break
      }

      case 'update_main': {
        if (!action.target_name) break
        const { data: items } = await admin
          .from('menu_items')
          .select('id, name')
          .eq('day_id', dayId)
          .eq('type', 'main')
        const match = items?.find(i =>
          i.name.toLowerCase().includes(action.target_name!.toLowerCase())
        )
        if (match) {
          const updates: Record<string, unknown> = {}
          if (action.new_name) updates.name = action.new_name
          if (Object.keys(updates).length) {
            await admin.from('menu_items').update(updates).eq('id', match.id)
          }
          if (action.new_allergens) {
            await admin.from('item_allergens').delete().eq('item_id', match.id)
            if (action.new_allergens.length) {
              await admin.from('item_allergens').insert(
                action.new_allergens.map(code => ({ item_id: match.id, code }))
              )
            }
          }
        }
        break
      }
    }

    // Update chatbot log to confirmed
    await supabase
      .from('chatbot_logs')
      .update({ confirmed: true })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    return NextResponse.json({ ok: true, weekStart, day: action.day })
  } catch (err: unknown) {
    console.error('[menu/apply]', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
