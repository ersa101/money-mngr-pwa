'use client'

import { useState, useCallback } from 'react'
import { useDb } from '@/contexts/DbContext'
import { useLiveQuery } from 'dexie-react-hooks'
import { resolveAIKey } from '@/lib/resolveAIKey'
import { Eye, RefreshCw, ThumbsUp, Minus, ThumbsDown, AlertTriangle } from 'lucide-react'

// ── Emotional conversion table ────────────────────────────────────────────────
const CONVERSIONS = [
  { amount: 15000, label: 'a weekend Goa trip' },
  { amount: 80000, label: 'a Bali trip' },
  { amount: 150000, label: 'a Europe trip' },
  { amount: 25000, label: 'an iPhone SE' },
  { amount: 120000, label: 'a MacBook Air' },
  { amount: 8000, label: '1 month gym membership' },
  { amount: 12000, label: '1 month of family groceries' },
]

function bestConversion(amount: number): string {
  const sorted = [...CONVERSIONS].sort((a, b) => b.amount - a.amount)
  const match = sorted.find((c) => amount >= c.amount)
  if (!match) return ''
  const times = Math.floor(amount / match.amount)
  return times === 1 ? match.label : `${times}× ${match.label}`
}

interface TruthStatement {
  category: string
  totalAmount: number
  narrative: string
}

interface ComputedNumbers {
  topCategories: { name: string; total: number; years: number }[]
  expenseGrowthPct: number
  incomeGrowthPct: number
  topGrowingCategory: string
}

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

async function generateNarratives(
  numbers: ComputedNumbers,
  provider: 'gemini' | 'claude' | 'openai',
  apiKey: string
): Promise<string[]> {
  const prompt = `You are a brutally honest personal finance advisor. Based on the real spending data below, write 4-6 short, emotionally direct statements (1-2 sentences each). Use the numbers exactly as given — do not change them. Be candid but not cruel. No markdown, no bullet points, just plain numbered statements like "1. ..."

Data:
${numbers.topCategories
  .map(
    (c) =>
      `- ${c.name}: ${formatINR(c.total)} over ${c.years} year(s). That's roughly ${bestConversion(c.total)}.`
  )
  .join('\n')}
- Expense growth rate: ${numbers.expenseGrowthPct.toFixed(1)}% per year
- Income growth rate: ${numbers.incomeGrowthPct.toFixed(1)}% per year
- Fastest growing spending category: ${numbers.topGrowingCategory}

Write 4-6 numbered statements. Each must include the real ₹ figure from the data above. Keep them under 40 words each.`

  const parseLines = (text: string) =>
    text.split('\n').filter((l: string) => /^\d+\./.test(l.trim())).map((l: string) => l.replace(/^\d+\.\s*/, '').trim())

  if (provider === 'gemini') {
    const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash']
    for (const model of GEMINI_MODELS) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
          }),
        }
      )
      if (res.status === 404) continue
      const data = await res.json()
      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      if (text) return parseLines(text)
    }
    return []
  } else if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
      }),
    })
    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    return parseLines(text)
  } else {
    // claude
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    const text: string = data.content?.[0]?.text ?? ''
    return parseLines(text)
  }
}

export function UncomfortableTruth() {
  const db = useDb()
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'loading' | 'revealed' | 'feedback-done'>('idle')
  const [statements, setStatements] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [noKey, setNoKey] = useState(false)
  const [feedback, setFeedback] = useState<'YES' | 'SOMEWHAT' | 'NO' | null>(null)

  const lastShown = useLiveQuery(async () => {
    const s = await db.appSettings.get('uncomfortable_truth_last_shown')
    return s?.value ?? null
  }, [])

  const monthsAgo = lastShown
    ? Math.floor((Date.now() - new Date(lastShown).getTime()) / (30 * 24 * 60 * 60 * 1000))
    : null

  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const computeNumbers = useCallback((): ComputedNumbers | null => {
    if (!transactions || !categories) return null
    const catMap = new Map(categories.filter(Boolean).map((c) => [c.id!, c.name]))

    const totalByCat = new Map<string, number>()
    const yearSet = new Set<number>()

    for (const t of transactions.filter(Boolean)) {
      if (t.transactionType !== 'EXPENSE') continue
      const catName = t.categoryId ? catMap.get(t.categoryId) ?? 'Other' : 'Other'
      totalByCat.set(catName, (totalByCat.get(catName) ?? 0) + t.amount)
      yearSet.add(new Date(t.date).getFullYear())
    }

    const yearsSpan = Math.max(yearSet.size, 1)
    const topCats = Array.from(totalByCat.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total, years: yearsSpan }))

    // Growth rates (simplified: compare first year avg vs last year avg)
    const allYears = Array.from(yearSet).sort()
    const firstYear = allYears[0]
    const lastYear = allYears[allYears.length - 1]

    let firstExpense = 0, lastExpense = 0, firstIncome = 0, lastIncome = 0
    for (const t of transactions.filter(Boolean)) {
      const yr = new Date(t.date).getFullYear()
      if (t.transactionType === 'EXPENSE') {
        if (yr === firstYear) firstExpense += t.amount
        if (yr === lastYear) lastExpense += t.amount
      } else if (t.transactionType === 'INCOME') {
        if (yr === firstYear) firstIncome += t.amount
        if (yr === lastYear) lastIncome += t.amount
      }
    }

    const yearsElapsed = Math.max(lastYear - firstYear, 1)
    const expenseGrowthPct = firstExpense > 0
      ? ((lastExpense - firstExpense) / firstExpense / yearsElapsed) * 100
      : 0
    const incomeGrowthPct = firstIncome > 0
      ? ((lastIncome - firstIncome) / firstIncome / yearsElapsed) * 100
      : 0

    // Fastest growing category (year-over-year last available)
    const catFirstYear = new Map<string, number>()
    const catLastYear = new Map<string, number>()
    for (const t of transactions.filter(Boolean)) {
      if (t.transactionType !== 'EXPENSE') continue
      const yr = new Date(t.date).getFullYear()
      const name = t.categoryId ? catMap.get(t.categoryId) ?? 'Other' : 'Other'
      if (yr === firstYear) catFirstYear.set(name, (catFirstYear.get(name) ?? 0) + t.amount)
      if (yr === lastYear) catLastYear.set(name, (catLastYear.get(name) ?? 0) + t.amount)
    }
    let topGrowingCategory = 'N/A'
    let maxGrowth = -Infinity
    for (const [name, lastAmt] of catLastYear.entries()) {
      const firstAmt = catFirstYear.get(name) ?? 0
      if (firstAmt === 0) continue
      const growth = (lastAmt - firstAmt) / firstAmt
      if (growth > maxGrowth) { maxGrowth = growth; topGrowingCategory = name }
    }

    return { topCategories: topCats, expenseGrowthPct, incomeGrowthPct, topGrowingCategory }
  }, [transactions, categories])

  const handleReveal = useCallback(async () => {
    setPhase('loading')
    setError(null)

    const numbers = computeNumbers()
    if (!numbers) {
      setError('Not enough data to compute.')
      setPhase('idle')
      return
    }

    const { key, provider, showSettingsPrompt } = await resolveAIKey()
    if (showSettingsPrompt || !key || !provider) {
      setNoKey(true)
      // Fallback: generate rule-based statements without AI
      const fallback = numbers.topCategories.slice(0, 4).map((c) => {
        const conv = bestConversion(c.total)
        return `You spent ${formatINR(c.total)} on ${c.name} over ${c.years} year(s).${conv ? ` That could have been ${conv}.` : ''}`
      })
      setStatements(fallback)
      await db.appSettings.put({ key: 'uncomfortable_truth_last_shown', value: new Date().toISOString() })
      setPhase('revealed')
      return
    }

    try {
      const narratives = await generateNarratives(numbers, provider, key)
      setStatements(narratives.length > 0 ? narratives : ['Could not generate statements. Try again.'])
    } catch {
      // Fallback to rule-based
      const fallback = numbers.topCategories.slice(0, 4).map((c) => {
        const conv = bestConversion(c.total)
        return `You spent ${formatINR(c.total)} on ${c.name} over ${c.years} year(s).${conv ? ` That could have been ${conv}.` : ''}`
      })
      setStatements(fallback)
    }

    await db.appSettings.put({ key: 'uncomfortable_truth_last_shown', value: new Date().toISOString() })
    setPhase('revealed')
  }, [computeNumbers, db])

  const saveFeedback = useCallback(async (response: 'YES' | 'SOMEWHAT' | 'NO') => {
    setFeedback(response)
    // Map to FeedbackLog's userResponse type: YES→POSITIVE, NO→NEGATIVE, SOMEWHAT→0
    const mapped: 'POSITIVE' | 'NEGATIVE' | number =
      response === 'YES' ? 'POSITIVE' : response === 'NO' ? 'NEGATIVE' : 0
    await db.feedbackLog.add({
      timestamp: new Date().toISOString(),
      featureId: 'uncomfortable_truth',
      insightType: 'spending_truth',
      insightSummary: statements.join(' | '),
      userResponse: mapped,
      userReason: response === 'SOMEWHAT' ? 'Somewhat' : undefined,
      monthYear: new Date().toISOString().slice(0, 7),
      syncedToSheet: false,
    })
    setPhase('feedback-done')
  }, [db, statements])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h3 className="text-base font-semibold text-gray-900">The Uncomfortable Truth</h3>
        </div>
        {monthsAgo !== null && phase === 'idle' && (
          <span className="text-xs text-gray-400">Last viewed: {monthsAgo}mo ago</span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-5">Honest, unfiltered facts about your spending over all available history.</p>

      {/* IDLE */}
      {phase === 'idle' && (
        <button
          onClick={() => setPhase('confirm')}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium text-white transition"
        >
          <Eye className="w-4 h-4" />
          Show My Truth
        </button>
      )}

      {/* CONFIRM */}
      {phase === 'confirm' && (
        <div className="bg-gray-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm text-gray-700 mb-4">
            This will show honest, unfiltered facts about your spending. Ready?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReveal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium text-white transition"
            >
              Yes, show me
            </button>
            <button
              onClick={() => setPhase('idle')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* LOADING */}
      {phase === 'loading' && (
        <div className="flex items-center gap-3 py-8 text-gray-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Analysing your full history…
        </div>
      )}

      {/* REVEALED */}
      {phase === 'revealed' && (
        <>
          {noKey && (
            <p className="text-xs text-amber-600 mb-3">No AI key found — showing rule-based insights. Add a key in Settings for richer narratives.</p>
          )}
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

          <div className="space-y-3 mb-6">
            {statements.map((s, i) => (
              <div key={i} className="bg-gray-50 border-l-2 border-amber-500 rounded-r-lg px-4 py-3">
                <p className="text-sm text-gray-800 leading-relaxed">{s}</p>
              </div>
            ))}
          </div>

          {/* Feedback */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-500 mb-3">Did this change how you think about your spending?</p>
            <div className="flex gap-2">
              {(['YES', 'SOMEWHAT', 'NO'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => saveFeedback(opt)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                    feedback === opt
                      ? 'bg-amber-600 border-amber-600 text-white'
                      : 'border-gray-300 text-gray-500 hover:border-amber-500 hover:text-gray-900'
                  }`}
                >
                  {opt === 'YES' && <ThumbsUp className="w-3.5 h-3.5" />}
                  {opt === 'SOMEWHAT' && <Minus className="w-3.5 h-3.5" />}
                  {opt === 'NO' && <ThumbsDown className="w-3.5 h-3.5" />}
                  {opt === 'YES' ? 'Yes' : opt === 'SOMEWHAT' ? 'Somewhat' : 'No'}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* FEEDBACK DONE */}
      {phase === 'feedback-done' && (
        <>
          <div className="space-y-3 mb-4">
            {statements.map((s, i) => (
              <div key={i} className="bg-gray-50 border-l-2 border-amber-500 rounded-r-lg px-4 py-3">
                <p className="text-sm text-gray-800 leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">Feedback saved. Thanks for being honest with yourself.</p>
          <button
            onClick={() => setPhase('idle')}
            className="mt-3 text-xs text-gray-500 hover:text-gray-900 transition"
          >
            Close
          </button>
        </>
      )}
    </div>
  )
}
