'use client'

import { useState, useRef, useEffect } from 'react'
import type { ParsedMenuAction } from '@/lib/types'
import { DAY_NAMES, ALLERGEN_LABELS } from '@/lib/types'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  action?: ParsedMenuAction
  confirmed?: boolean
}

const WELCOME: Message = {
  role: 'assistant',
  content: 'Hei! Olen Pripolin ruokalista-avustaja. Kirjoita komento suomeksi ja parsaan sen automaattisesti.\n\nEsimerkkejä:\n• "Lisää maanantain keitto: Lohikeitto G,L"\n• "Vaihda perjantain keitto tomaattikeittoon VE"\n• "Lisää tiistain pääruoka: Kana-pasta L"\n• "Julkaise tämän viikon menu"',
}

export default function AdminChatbot() {
  const [messages, setMessages]   = useState<Message[]>([WELCOME])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [applying, setApplying]   = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessages(m => [...m, { role: 'assistant', content: data.error ?? 'Virhe.' }])
        return
      }

      const action: ParsedMenuAction = data.action

      if (action.action === 'unknown') {
        setMessages(m => [...m, {
          role: 'assistant',
          content: `En ymmärtänyt komentoa. ${action.summary}`,
        }])
        return
      }

      setMessages(m => [...m, {
        role: 'assistant',
        content: `Parsed: ${action.summary}`,
        action,
      }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Verkkovirhe. Yritä uudelleen.' }])
    } finally {
      setLoading(false)
    }
  }

  async function confirmAction(index: number, action: ParsedMenuAction) {
    setApplying(index)
    try {
      const res  = await fetch('/api/menu/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessages(m => m.map((msg, i) =>
          i === index ? { ...msg, confirmed: false, content: `❌ Virhe: ${data.error}` } : msg
        ))
        return
      }

      setMessages(m => m.map((msg, i) =>
        i === index ? { ...msg, confirmed: true } : msg
      ))
      setMessages(m => [...m, { role: 'system', content: '✓ Tallennettu onnistuneesti.' }])
    } finally {
      setApplying(null)
    }
  }

  function rejectAction(index: number) {
    setMessages(m => m.map((msg, i) =>
      i === index ? { ...msg, confirmed: false, action: undefined, content: '↩ Peruttu.' } : msg
    ))
  }

  return (
    <div className="flex flex-col h-full bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-lg rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-accent text-stone-950 rounded-br-md'
                : msg.role === 'system'
                ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 rounded-xl'
                : 'bg-stone-800 text-stone-200 rounded-bl-md'
            }`}>
              {msg.content}
            </div>

            {/* Action preview card */}
            {msg.action && msg.confirmed === undefined && (
              <div className="mt-2 bg-stone-800 border border-stone-700 rounded-xl p-4 max-w-lg w-full space-y-3">
                <p className="text-xs text-stone-400 uppercase tracking-wider">Esikatselu</p>
                <ActionPreview action={msg.action} />
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmAction(i, msg.action!)}
                    disabled={applying === i}
                    className="px-4 py-1.5 bg-accent text-stone-950 text-xs font-semibold rounded-lg transition-opacity disabled:opacity-50"
                  >
                    {applying === i ? 'Tallennetaan…' : '✓ Vahvista'}
                  </button>
                  <button
                    onClick={() => rejectAction(i)}
                    className="px-4 py-1.5 text-stone-500 text-xs hover:text-stone-300 transition-colors"
                  >
                    Hylkää
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start">
            <div className="bg-stone-800 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-2 h-2 bg-stone-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        className="border-t border-stone-800 p-3 flex gap-2"
        onSubmit={e => { e.preventDefault(); sendMessage() }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Kirjoita komento suomeksi…"
          disabled={loading}
          maxLength={500}
          className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-100
                     placeholder:text-stone-600 focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-accent text-stone-950 text-sm font-semibold rounded-xl transition-opacity disabled:opacity-40"
        >
          →
        </button>
      </form>
    </div>
  )
}

function ActionPreview({ action }: { action: ParsedMenuAction }) {
  const dayName = action.day ? DAY_NAMES[action.day - 1] : null

  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-stone-500 text-xs w-20">Toiminto</span>
        <span className="text-accent font-medium">{ACTION_LABELS[action.action] ?? action.action}</span>
      </div>
      {dayName && (
        <div className="flex items-center gap-2">
          <span className="text-stone-500 text-xs w-20">Päivä</span>
          <span className="text-stone-200">{dayName}</span>
        </div>
      )}
      {action.soup && (
        <div className="flex items-center gap-2">
          <span className="text-stone-500 text-xs w-20">Keitto</span>
          <span className="text-stone-200">
            {action.soup.name}
            {action.soup.allergens.length > 0 && (
              <span className="ml-2 text-xs text-stone-400">{action.soup.allergens.join(', ')}</span>
            )}
          </span>
        </div>
      )}
      {action.mains?.map((m, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-stone-500 text-xs w-20">{i === 0 ? 'Pääruoka' : ''}</span>
          <span className="text-stone-200">
            {m.name}
            {m.allergens.length > 0 && (
              <span className="ml-2 text-xs text-stone-400">{m.allergens.join(', ')}</span>
            )}
          </span>
        </div>
      ))}
      {action.dessert && (
        <div className="flex items-center gap-2">
          <span className="text-stone-500 text-xs w-20">Jälkiruoka</span>
          <span className="text-stone-200">{action.dessert}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-stone-500 text-xs w-20">Varmuus</span>
        <span className={`text-xs ${action.confidence >= 0.8 ? 'text-emerald-400' : 'text-amber-400'}`}>
          {Math.round(action.confidence * 100)} %
        </span>
      </div>
    </div>
  )
}

const ACTION_LABELS: Record<string, string> = {
  update_soup:  'Päivitä keitto',
  add_main:     'Lisää pääruoka',
  update_main:  'Päivitä pääruoka',
  set_dessert:  'Aseta jälkiruoka',
  set_day:      'Aseta päivän menu',
  delete_item:  'Poista annos',
  publish:      'Julkaise viikko',
  unpublish:    'Piilota viikko',
}
