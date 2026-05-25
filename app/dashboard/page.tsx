import { createSupabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createSupabaseServer()

  // Fetch stats
  const { data: menus } = await supabase
    .from('weekly_menus')
    .select('id, week_start, published')
    .order('week_start', { ascending: false })
    .limit(5)

  const { count: itemCount } = await supabase
    .from('menu_items')
    .select('id', { count: 'exact', head: true })

  const publishedMenu = menus?.find(m => m.published)
  const today = new Date().toLocaleDateString('fi-FI', { weekday:'long', day:'numeric', month:'long' })

  return (
    <div className="p-8 max-w-4xl">

      <div className="mb-8">
        <p className="text-xs text-stone-500 uppercase tracking-widest mb-1">{today}</p>
        <h1 className="text-2xl font-semibold text-stone-100">Yleiskatsaus</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard
          label="Julkaistu ruokalista"
          value={publishedMenu ? formatWeek(publishedMenu.week_start) : 'Ei julkaisua'}
          sub={publishedMenu ? 'Julkaistu' : 'Ei julkaisua'}
          accent={!!publishedMenu}
        />
        <StatCard
          label="Ruokalistat yhteensä"
          value={String(menus?.length ?? 0)}
          sub="viikkoa tallennettu"
        />
        <StatCard
          label="Ruoka-annoksia"
          value={String(itemCount ?? 0)}
          sub="kaikki viikot"
        />
      </div>

      {/* Quick links */}
      <h2 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3">Pikavalinnat</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <QuickLink
          href="/dashboard/menu"
          icon="☰"
          title="Muokkaa ruokalistaa"
          desc="Lisää tai muokkaa viikoittaisia lounaita"
        />
        <QuickLink
          href="/dashboard/chatbot"
          icon="✦"
          title="AI-avustaja"
          desc="Muokkaa ruokalistaa luonnollisella kielellä"
        />
      </div>

      {/* Recent menus */}
      {menus && menus.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3">
            Viimeisimmät ruokalistat
          </h2>
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
            {menus.map((m, i) => (
              <div
                key={m.id}
                className={`flex items-center justify-between px-5 py-3.5 ${
                  i < menus.length - 1 ? 'border-b border-stone-800' : ''
                }`}
              >
                <span className="text-sm text-stone-300">{formatWeek(m.week_start)}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  m.published
                    ? 'bg-emerald-900/40 text-emerald-400'
                    : 'bg-stone-800 text-stone-500'
                }`}>
                  {m.published ? 'Julkaistu' : 'Luonnos'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, accent = false }: {
  label: string; value: string; sub: string; accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-5 ${
      accent ? 'bg-accent/10 border-accent/30' : 'bg-stone-900 border-stone-800'
    }`}>
      <p className="text-xs text-stone-500 mb-2">{label}</p>
      <p className={`text-2xl font-semibold ${accent ? 'text-accent' : 'text-stone-100'}`}>{value}</p>
      <p className="text-xs text-stone-500 mt-1">{sub}</p>
    </div>
  )
}

function QuickLink({ href, icon, title, desc }: {
  href: string; icon: string; title: string; desc: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 bg-stone-900 hover:bg-stone-800 border border-stone-800
                 hover:border-stone-700 rounded-xl p-5 transition-colors group"
    >
      <span className="text-xl text-accent mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-medium text-stone-200 group-hover:text-white transition-colors">{title}</p>
        <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
      </div>
    </Link>
  )
}

function formatWeek(weekStart: string): string {
  const d = new Date(weekStart)
  const end = new Date(d)
  end.setDate(d.getDate() + 4)
  return `${d.getDate()}.${d.getMonth()+1}–${end.getDate()}.${end.getMonth()+1}`
}
