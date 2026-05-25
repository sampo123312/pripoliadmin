'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard',         label: 'Yleiskatsaus', icon: '◉' },
  { href: '/dashboard/menu',    label: 'Ruokalista',   icon: '☰' },
  { href: '/dashboard/chatbot', label: 'AI-avustaja',  icon: '✦' },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createSupabaseBrowser()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 bg-stone-900 border-r border-stone-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-stone-800">
        <div className="text-lg font-serif italic text-accent leading-none">Pripoli</div>
        <div className="text-xs text-stone-500 mt-1">Hallintapaneeli</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2.5 space-y-0.5">
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-accent/15 text-accent font-medium'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="p-2.5 border-t border-stone-800 space-y-0.5">
        <div className="px-3 py-2">
          <p className="text-xs text-stone-500 truncate">{userEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-stone-500
                     hover:text-stone-300 hover:bg-stone-800 transition-colors"
        >
          <span className="text-base w-5 text-center">↩</span>
          Kirjaudu ulos
        </button>
      </div>
    </aside>
  )
}
