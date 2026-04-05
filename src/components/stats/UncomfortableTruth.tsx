'use client'

import { useState, useCallback, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { resolveAIKeyClient } from '@/lib/resolveAIKey'

// ── Emotional conversion table ───────────────────────────────────────────────
const EMOTIONAL_ANCHORS: { amount: number; label: string }[] = [
  { amount: 15000,  label: 'a weekend Goa trip' },
  { amount: 80000,  label: 'a Bali trip' },
  { amount: 150000, label: 'a Europe trip' },
  { amount: 25000,  label: 'an iPhone SE' },
  { amount: 120000, label: 'a MacBook Air' },
  { amount: 8000,   label: '1 month gym membership' },
  { amount: 12000,  label: '1 month groceries for family' },
]

function closestAnchor(amount: number): string {
  const sorted = [...EMOTIONAL_ANCHORS].sort(
    (a, b) => Math.abs(a.amount - amount) - Math.abs(b.amount - amount)
  )
  const best = sorted[0]
  if (!best) return ''
  const ratio = Math.round(amount / best.amount)
  if (ratio <= 1) return best.label
  return `${ratio}× ${best.label}`
}

interface DataPoint {
  category: string
  totalSpend: number
  spendYears?: number
  growthPct?: number
  incomeGrowthPct?: number
  monthsOfRent?: number
}

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n.toFixed(0)}`
}

type FeedbackOption = 'YES' | 'SOMEWHAT' | 'NO' | null

export function UncomfortableTruth() {
  const db = useDb()
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'loading' | 'result'>('idle')
  const [narratives, setNarratives] = useState<string[]>([])
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([])
  const [feedback, setFeedback] = useState<FeedbackOption>(null)
  const [error, setError] = useState<string | null>(null)

  const lastViewed = useLiveQuery(async () => {
    if (!db) return null
    return db.appSettings.get('uncomfortable_truth_last_viewed')
  }, [db])

  const transactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db])
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db])

  const daysAgo = useMemo(() => {
    if (!lastViewed?.value) return null
    return Math.floor((Date.now() - new Date(lastViewed.value).getTime()) / 86400000)
  }, [lastViewed])

  // Compute data points from full history
  const computeDataPoints = useCallback((): DataPoint[] => {
    if (!transactions?.length || !categories) return []

    const catMap = new Map(categories.map((c) => [c.id!, c.name]))
    const expense = transactions.filter((t) => t.transactionType === 'EXPENSE' && t.categoryId)

    // Total spend per category across all history
    const catTotals = new Map<string, number>()
    for (const t of expense) {
      const name = catMap.get(t.categoryId!) ?? 'Other'
      catTotals.set(name, (catTotals.get(name) ?? 0) + t.amount)
    }

    // Top 6 categories
    const top = Array.from(catTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)

    // Find rent amount for "months of rent" comparison
    const rentTotal = catTotals.get('Rent') ?? catTotals.get('rent') ?? 0
    const monthsOfData = new Set(expense.map((t) => t.date.slice(0, 7))).size
    const avgMonthlyRent = monthsOfData > 0 ? rentTotal / monthsOfData : 0

    // Category growth: compare first half vs second half of history
    const sortedDates = expense.map((t) => t.date).sort()
    const midDate = sortedDates[Math.floor(sortedDates.length / 2)]

    const firstHalf = expense.filter((t) => t.date < midDate)
    const secondHalf = expense.filter((t) => t.date >= midDate)

    const firstHalfTotals = new Map<string, number>()
    const secondHalfTotals = new Map<string, number>()
    for (const t of firstHalf) {
      const name = catMap.get(t.categoryId!) ?? 'Other'
      firstHalfTotals.set(name, (firstHalfTotals.get(name) ?? 0) + t.amount)
    }
    for (const t of secondHalf) {
      const name = catMap.get(t.categoryId!) ?? 'Other'
      secondHalfTotals.set(name, (secondHalfTotals.get(name) ?? 0) + t.amount)
    }

    // Income growth
    const incomeByMonth = new Map<string, number>()
    for (const t of transactions.filter((t) => t.transactionType === 'INCOME')) {
      const m = t.date.slice(0, 7)
      incomeByMonth.set(m, (incomeByMonth.get(m) ?? 0) + t.amount)
    }
    const incomeMonths = Array.from(incomeByMonth.keys()).sort()
    const incFirstHalf = incomeMonths.slice(0, Math.ceil(incomeMonths.length / 2))
      .reduce((s, m) => s + (incomeByMonth.get(m) ?? 0), 0)
    const incSecondHalf = incomeMonths.slice(Math.ceil(incomeMonths.length / 2))
      .reduce((s, m) => s + (incomeByMonth.get(m) ?? 0), 0)
    const incomeGrowthPct = incFirstHalf > 0 ? ((incSecondHalf - incFirstHalf) / incFirstHalf) * 100 : 0

    const spendYears = monthsOfData > 0 ? monthsOfData / 12 : 1

    return top.map(([category, totalSpend]) => {
      const firstSpend = firstHalfTotals.get(category) ?? 0
      const secondSpend = secondHalfTotals.get(category) ?? 0
      const growthPct = firstSpend > 0 ? ((secondSpend - firstSpend) / firstSpend) * 100 : 0
      const monthsOfRent = avgMonthlyRent > 0 ? totalSpend / avgMonthlyRent : undefined

      return {
        category,
        totalSpend,
        spendYears,
        growthPct,
        incomeGrowthPct,
        monthsOfRent,
      }
    })
  }, [transactions, categories])

  const handleShow = useCallback(async () => {
    if (!db) return
    setPhase('loading')
    setError(null)

    const points = computeDataPoints()
    setDataPoints(points)

    // Build prompt-friendly data (no sensitive formatting needed — server handles)
    const promptPoints = points.map((p) => ({
      category: p.category,
      total: formatINR(p.totalSpend),
      equivalent: closestAnchor(p.totalSpend),
      years: p.spendYears?.toFixed(1),
      growthPct: p.growthPct != null ? `${p.growthPct.toFixed(0)}%` : undefined,
      incomeGrowthPct: p.incomeGrowthPct != null ? `${p.incomeGrowthPct.toFixed(0)}%` : undefined,
      monthsOfRent: p.monthsOfRent != null ? p.monthsOfRent.toFixed(1) : undefined,
    }))

    const { geminiKey, claudeKey } = await resolveAIKeyClient(db)

    try {
      const res = await fetch('/api/ai/uncomfortable-truth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataPoints: promptPoints, geminiKey, claudeKey }),
      })
      const json = await res.json()

      if (!res.ok || json.error) {
        setError(json.error ?? 'AI generation failed.')
        // Fallback: generate simple statements without AI
        setNarratives(points.map((p) => {
          const equiv = closestAnchor(p.totalSpend)
          return `You spent ${formatINR(p.totalSpend)} on ${p.category} — that could have been ${equiv}.`
        }))
      } else {
        setNarratives(json.narratives ?? [])
      }

      // Save last-viewed timestamp
      await db.appSettings.put({
        key: 'uncomfortable_truth_last_viewed',
        value: new Date().toISOString(),
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      setError(msg)
      setNarratives(points.map((p) => {
        const equiv = closestAnchor(p.totalSpend)
        return `You spent ${formatINR(p.totalSpend)} on ${p.category} — that could have been ${equiv}.`
      }))
    }

    setPhase('result')
  }, [db, computeDataPoints])

  const saveFeedback = useCallback(async (option: FeedbackOption) => {
    if (!db || !option) return
    setFeedback(option)
    // Store in feedback log
    await db.feedbackLog.add({
      timestamp: new Date().toISOString(),
      featureId: 'uncomfortable_truth',
      insightType: 'spending_truth',
      insightSummary: 'Uncomfortable Truth viewed',
      userResponse: option === 'YES' ? 1 : option === 'SOMEWHAT' ? 0.5 : 0,
      monthYear: new Date().toISOString().slice(0, 7),
      syncedToSheet: false,
    })
  }, [db])

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 md:p-6">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        <h2 className="text-base md:text-lg font-semibold text-white">The Uncomfortable Truth</h2>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Honest, unfiltered facts about your spending over all available history.
      </p>

      {daysAgo !== null && (
        <p className="text-xs text-slate-500 mb-3">
          Last viewed: {daysAgo === 0 ? 'today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`}
        </p>
      )}

      {/* Idle state */}
      {phase === 'idle' && (
        <button
          onClick={() => setPhase('confirm')}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition"
        >
          Show My Truth
        </button>
      )}

      {/* Confirm state */}
      {phase === 'confirm' && (
        <div className="border border-amber-700/40 bg-amber-900/20 rounded-lg p-4 mb-4">
          <p className="text-amber-300 text-sm font-medium mb-3">
            ⚠️ This will show honest, unfiltered facts about your spending. Ready?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleShow}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg transition"
            >
              Yes, show me
            </button>
            <button
              onClick={() => setPhase('idle')}
              className="px-4 py-2 border border-slate-600 hover:border-slate-400 text-slate-400 hover:text-slate-200 text-sm rounded-lg transition"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {phase === 'loading' && (
        <div className="flex items-center gap-3 py-6">
          <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
          <span className="text-slate-400 text-sm">Analysing your full history…</span>
        </div>
      )}

      {/* Result */}
      {phase === 'result' && (
        <>
          {error && (
            <p className="text-xs text-amber-600 mb-3">AI unavailable — showing data-only statements.</p>
          )}

          <div className="space-y-4 mb-6">
            {narratives.map((n, i) => {
              const dp = dataPoints[i]
              return (
                <div key={i} className="border-l-2 border-amber-500/50 pl-4">
                  <p className="text-white text-sm leading-relaxed">{n}</p>
                  {dp && (
                    <p className="text-slate-500 text-xs mt-1">
                      Total: {formatINR(dp.totalSpend)}
                      {dp.growthPct != null && Math.abs(dp.growthPct) > 5
                        ? ` · ${dp.growthPct > 0 ? '↑' : '↓'} ${Math.abs(dp.growthPct).toFixed(0)}% growth`
                        : ''}
                      {dp.monthsOfRent != null
                        ? ` · = ${dp.monthsOfRent.toFixed(1)} months of rent`
                        : ''}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Feedback */}
          {!feedback ? (
            <div className="border border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-300 mb-3">
                Did this change how you think about your spending?
              </p>
              <div className="flex gap-2">
                {(['YES', 'SOMEWHAT', 'NO'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => saveFeedback(opt)}
                    className="px-3 py-1.5 border border-slate-600 hover:border-amber-500 text-slate-400 hover:text-amber-400 text-xs rounded-lg transition"
                  >
                    {opt === 'YES' ? '✓ Yes' : opt === 'SOMEWHAT' ? '~ Somewhat' : '✗ No'}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Thanks for your feedback{feedback === 'YES' ? ' — glad it resonated 🙏' : '.'}
            </p>
          )}

          <button
            onClick={() => { setPhase('idle'); setNarratives([]); setFeedback(null); setError(null) }}
            className="mt-4 text-xs text-slate-600 hover:text-slate-400 underline"
          >
            Close
          </button>
        </>
      )}
    </div>
  )
}
