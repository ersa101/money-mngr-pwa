// Server-side AI key utilities — no 'use client' directive
// Used by API routes (fain/chat, fain/insights, fain/alerts)
// Waterfall order: User-1 → User-2 → User-3 → Dev-1 → Dev-2 → Error

export type AIProvider = 'gemini' | 'claude' | 'openai'

export interface AIKeySlot {
  provider: AIProvider
  key: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ─── Provider detection ───────────────────────────────────────────────────────

export function detectProvider(key: string): AIProvider {
  const k = key.trim()
  if (k.startsWith('AIza')) return 'gemini'
  if (k.startsWith('sk-ant-')) return 'claude'
  if (k.startsWith('sk-')) return 'openai'
  return 'gemini'
}

// ─── Build waterfall ──────────────────────────────────────────────────────────

export function buildWaterfall(userSlots: AIKeySlot[]): AIKeySlot[] {
  const waterfall: AIKeySlot[] = []

  for (const slot of userSlots) {
    if (slot.key?.trim()) waterfall.push({ provider: slot.provider, key: slot.key.trim() })
  }

  const dev1 = process.env.AI_DEV_KEY_1?.trim()
  const dev2 = process.env.AI_DEV_KEY_2?.trim()
  if (dev1) waterfall.push({ provider: detectProvider(dev1), key: dev1 })
  if (dev2) waterfall.push({ provider: detectProvider(dev2), key: dev2 })

  return waterfall
}

// ─── Provider callers ─────────────────────────────────────────────────────────

export const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash']

async function callGeminiPrompt(prompt: string, key: string, maxTokens: number): Promise<string> {
  let lastError = ''
  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      }
    )
    if (res.status === 404) { lastError = `Model ${model} unavailable`; continue }
    if (!res.ok) throw new Error(`Gemini error ${res.status}`)
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (text) return text
    lastError = `No response from ${model}`
  }
  throw new Error(lastError || 'All Gemini models failed')
}

async function callGeminiChat(
  messages: ChatMessage[],
  systemPrompt: string,
  key: string,
  maxTokens: number
): Promise<string> {
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const lastMsg = messages[messages.length - 1]

  let lastError = ''
  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [...history, { role: 'user', parts: [{ text: lastMsg.content }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      }
    )
    if (res.status === 404) { lastError = `Model ${model} unavailable`; continue }
    if (!res.ok) throw new Error(`Gemini error ${res.status}`)
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (text) return text
    lastError = `No response from ${model}`
  }
  throw new Error(lastError || 'All Gemini models failed')
}

async function callClaudePrompt(prompt: string, key: string, maxTokens: number): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Claude error ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

async function callClaudeChat(
  messages: ChatMessage[],
  systemPrompt: string,
  key: string,
  maxTokens: number
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  })
  if (!res.ok) throw new Error(`Claude error ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

async function callOpenAIPrompt(prompt: string, key: string, maxTokens: number): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function callOpenAIChat(
  messages: ChatMessage[],
  systemPrompt: string,
  key: string,
  maxTokens: number
): Promise<string> {
  const allMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: allMessages,
      max_tokens: maxTokens,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ─── Waterfall runners ────────────────────────────────────────────────────────

export async function callWaterfallPrompt(
  prompt: string,
  waterfall: AIKeySlot[],
  maxTokens = 800
): Promise<string> {
  if (!waterfall.length) throw new Error('No AI keys configured. Add a key in Settings → AI Keys.')

  const errors: string[] = []
  for (const slot of waterfall) {
    try {
      let text = ''
      if (slot.provider === 'gemini') text = await callGeminiPrompt(prompt, slot.key, maxTokens)
      else if (slot.provider === 'claude') text = await callClaudePrompt(prompt, slot.key, maxTokens)
      else if (slot.provider === 'openai') text = await callOpenAIPrompt(prompt, slot.key, maxTokens)
      if (text) return text
    } catch (e: unknown) {
      errors.push(`[${slot.provider}] ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  throw new Error(errors.join(' | ') || 'All AI providers failed')
}

export async function callWaterfallChat(
  messages: ChatMessage[],
  systemPrompt: string,
  waterfall: AIKeySlot[],
  maxTokens = 500
): Promise<string> {
  if (!waterfall.length) throw new Error('No AI keys configured. Add a key in Settings → AI Keys.')

  const errors: string[] = []
  for (const slot of waterfall) {
    try {
      let text = ''
      if (slot.provider === 'gemini') text = await callGeminiChat(messages, systemPrompt, slot.key, maxTokens)
      else if (slot.provider === 'claude') text = await callClaudeChat(messages, systemPrompt, slot.key, maxTokens)
      else if (slot.provider === 'openai') text = await callOpenAIChat(messages, systemPrompt, slot.key, maxTokens)
      if (text) return text
    } catch (e: unknown) {
      errors.push(`[${slot.provider}] ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  throw new Error(errors.join(' | ') || 'All AI providers failed')
}
