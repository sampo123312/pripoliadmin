import type { AllergenCode } from '@/lib/types'
import { ALLERGEN_LABELS, ALL_ALLERGENS } from '@/lib/types'

interface BadgeProps { code: AllergenCode; className?: string }

export function AllergenBadge({ code, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
                  bg-stone-700 text-stone-300 ${className}`}
      title={ALLERGEN_LABELS[code]}
    >
      {code}
    </span>
  )
}

interface SelectorProps {
  value: AllergenCode[]
  onChange: (v: AllergenCode[]) => void
}

export function AllergenSelector({ value, onChange }: SelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_ALLERGENS.map(code => {
        const active = value.includes(code)
        return (
          <button
            key={code}
            type="button"
            onClick={() =>
              onChange(active ? value.filter(a => a !== code) : [...value, code])
            }
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              active
                ? 'bg-accent text-stone-950'
                : 'bg-stone-700 text-stone-400 hover:bg-stone-600 hover:text-stone-200'
            }`}
            title={ALLERGEN_LABELS[code]}
          >
            {code}
          </button>
        )
      })}
    </div>
  )
}
