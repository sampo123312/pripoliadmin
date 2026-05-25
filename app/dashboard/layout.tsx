import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-stone-950">
      <Sidebar userEmail={session.user.email ?? ''} />
      <main className="flex-1 overflow-auto scrollbar-thin">
        {children}
      </main>
    </div>
  )
}
