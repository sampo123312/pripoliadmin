export type AllergenCode = 'G' | 'L' | 'M' | 'VE' | 'VEG'

export const ALLERGEN_LABELS: Record<AllergenCode, string> = {
  G:   'Gluteeniton',
  L:   'Laktoositon',
  M:   'Maidoton',
  VE:  'Vegaani',
  VEG: 'Kasvis',
}

export const ALL_ALLERGENS: AllergenCode[] = ['G', 'L', 'M', 'VE', 'VEG']

export const DAY_NAMES = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'] as const
export const DAY_SHORT = ['Ma', 'Ti', 'Ke', 'To', 'Pe'] as const

export interface ItemAllergen {
  code: AllergenCode
}

export interface MenuItem {
  id: string
  day_id: string
  type: 'soup' | 'main' | 'dessert'
  name: string
  description: string | null
  price: number | null
  is_featured: boolean
  image_url: string | null
  sort_order: number
  created_at: string
  item_allergens: ItemAllergen[]
}

export interface MenuDay {
  id: string
  menu_id: string
  day_of_week: number
  date: string
  menu_items: MenuItem[]
}

export interface WeeklyMenu {
  id: string
  week_start: string
  published: boolean
  created_at: string
  updated_at: string
  menu_days: MenuDay[]
}

/** Parsed action from the AI chatbot. */
export interface ParsedMenuAction {
  action:
    | 'set_day'
    | 'update_soup'
    | 'add_main'
    | 'update_main'
    | 'set_dessert'
    | 'delete_item'
    | 'publish'
    | 'unpublish'
    | 'unknown'
  day: number | null          // 1–5
  week_offset: number         // 0 = this week, 1 = next week
  soup: { name: string; allergens: AllergenCode[] } | null
  mains: Array<{ name: string; allergens: AllergenCode[]; is_featured: boolean }> | null
  dessert: string | null
  target_name: string | null  // item name to update or delete
  new_name: string | null
  new_allergens: AllergenCode[] | null
  summary: string
  confidence: number
}

/** Helper: Monday of the week containing a given date. */
export function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Format a Date as YYYY-MM-DD using LOCAL timezone (not UTC). */
export function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Add days to a date. */
export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
