import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `You are a menu management assistant for Ravintola Pripoli, a Finnish restaurant. Parse natural Finnish or English commands about the lunch menu into structured JSON.

MENU STRUCTURE:
- Weekly menus: Mon–Fri (day 1–5)
- Each day: soup (keitto), 1–3 mains (pääruoat), dessert (jälkiruoka)
- Allergens: G=Gluteeniton, L=Laktoositon, M=Maidoton, VE=Vegaani, VEG=Kasvis

Return ONLY a valid JSON object (no markdown, no extra text):
{
  "action": "set_day" | "update_soup" | "add_main" | "update_main" | "set_dessert" | "delete_item" | "publish" | "unpublish" | "unknown",
  "day": 1-5 (1=Ma,2=Ti,3=Ke,4=To,5=Pe) or null,
  "week_offset": 0 (this week) or 1 (next week) or null,
  "soup": {"name":"string","allergens":[]} or null,
  "mains": [{"name":"string","allergens":[],"is_featured":false}] or null,
  "dessert": "string" or null,
  "target_name": "name of item to update/delete" or null,
  "new_name": "new name for update" or null,
  "new_allergens": [] or null,
  "summary": "Finnish plain-text summary of what will happen",
  "confidence": 0.0-1.0
}

EXAMPLES:
"Lisää maanantain keitto: Lohikeitto L,G"
→ {"action":"update_soup","day":1,"week_offset":0,"soup":{"name":"Lohikeitto","allergens":["L","G"]},"summary":"Asetetaan maanantain keitto: Lohikeitto (L, G)","confidence":0.95}

"Vaihda perjantain keitto tomaattikeittoon VE"
→ {"action":"update_soup","day":5,"week_offset":0,"soup":{"name":"Tomaattikeitto","allergens":["VE"]},"summary":"Vaihdetaan perjantain keitto: Tomaattikeitto (VE)","confidence":0.90}

"Lisää tiistain pääruoka: Kana-pasta L"
→ {"action":"add_main","day":2,"week_offset":0,"mains":[{"name":"Kana-pasta","allergens":["L"],"is_featured":false}],"summary":"Lisätään tiistain pääruoka: Kana-pasta (L)","confidence":0.92}

"Poista maanantain lohikeitto"
→ {"action":"delete_item","day":1,"week_offset":0,"target_name":"Lohikeitto","summary":"Poistetaan maanantain Lohikeitto","confidence":0.88}

"Julkaise tämän viikon menu"
→ {"action":"publish","day":null,"week_offset":0,"summary":"Julkaistaan tämän viikon ruokalista","confidence":0.99}`

export async function POST(request: Request) {
  // Verify admin session — getUser() validates the JWT server-side (getSession() only reads cookies)
  const supabase = await createSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { prompt } = await request.json()
  if (!prompt || typeof prompt !== 'string' || prompt.length > 1000) {
    return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 })
  }

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 400,
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: prompt },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ''

    // Strip any accidental markdown fences
    const jsonStr = raw.replace(/```(?:json)?/g, '').trim()
    let parsed
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ error: 'AI palautti virheellisen vastauksen. Yritä uudelleen.' }, { status: 422 })
    }

    // Log the action
    await supabase.from('chatbot_logs').insert({
      user_id: user.id,
      prompt,
      parsed_action: parsed,
      confirmed: false,
    })

    return NextResponse.json({ action: parsed })
  } catch (err) {
    console.error('[admin/chat]', err)
    return NextResponse.json({ error: 'Palvelinvirhe' }, { status: 502 })
  }
}
