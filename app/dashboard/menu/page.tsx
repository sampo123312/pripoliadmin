import { createSupabaseServer } from '@/lib/supabase/server'
import WeekMenuEditor from '@/components/WeekMenuEditor'
import { getMondayOf, toISO } from '@/lib/types'
import type { WeeklyMenu } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function MenuPage() {
  const supabase   = await createSupabaseServer()
  const weekStart  = toISO(getMondayOf(new Date()))

  // Fetch the current week's menu with all nested data
  const { data, error } = await supabase
    .from('weekly_menus')
    .select(`
      *,
      menu_days (
        *,
        menu_items (
          *,
          item_allergens ( code )
        )
      )
    `)
    .eq('week_start', weekStart)
    .maybeSingle()

  const menu = data as WeeklyMenu | null

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-widest mb-1">Hallinta</p>
          <h1 className="text-2xl font-semibold text-stone-100">Ruokalista</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-3">
          Virhe ladattaessa: {error.message}
        </div>
      )}

      <WeekMenuEditor initialMenu={menu} initialWeekStart={weekStart} />
    </div>
  )
}
