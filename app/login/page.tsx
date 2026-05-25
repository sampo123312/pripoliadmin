'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const router   = useRouter()
  const supabase = createSupabaseBrowser()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Väärä sähköposti tai salasana.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 mb-4">
            <span className="font-serif italic text-accent text-xl">P</span>
          </div>
          <h1 className="text-xl font-semibold text-stone-100">Hallintapaneeli</h1>
          <p className="text-sm text-stone-500 mt-1">Ravintola Pripoli</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-stone-900 border border-stone-800 rounded-2xl p-8 space-y-5 shadow-2xl"
        >
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider">
              Sähköposti
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ravintolapripoli.fi"
              required
              autoComplete="email"
              className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100
                         text-sm placeholder:text-stone-600 focus:outline-none focus:border-accent
                         transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider">
              Salasana
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 pr-11 bg-stone-800 border border-stone-700 rounded-xl text-stone-100
                           text-sm placeholder:text-stone-600 focus:outline-none focus:border-accent
                           transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                aria-label={showPassword ? 'Piilota salasana' : 'Näytä salasana'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-stone-950
                       text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:cursor-default"
          >
            {loading ? 'Kirjaudutaan…' : 'Kirjaudu sisään'}
          </button>
        </form>

        <p className="text-center text-xs text-stone-600 mt-6">
          Vain valtuutetuille ylläpitäjille
        </p>
      </div>
    </main>
  )
}
