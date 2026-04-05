'use client'

import { useState, useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { resolveAIKey } from '@/lib/resolveAIKey'
import { AlertTriangle, Eye } from 'lucide-react'

const LAST_VIEWED_KEY = 'uncomfortable_truth_last_viewed'
const FEEDBACK_KEY = 'uncomfortable_truth_feedback'

// Emotional anchor table
const ANCHORS = [
  { amount: 15000,   label: 'a weekend Goa trip' },
  { amount: 80000,   label: 'a Bali trip' },
  { amount: 150000,  label: 'a Europe trip' },
  { amount: 25000,   label: 'an iPhone SE' },
  { amount: 120000,  label: 'a MacBook Air' },
  { amount: 8000,    label: '1 month gym membership' },
  { amount: 12000,   label: '1 month groceries for family' },
]

function closestAnchor(amount: number): string {
  const sorted = [...ANCHORS].sort(
    (a, b) => Math.abs(a.amount - amount) - Math.abs(b.amount - amount)
  )
  return sorted[0].label
}

function formatINR(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`
  return `₹${v.toFixed(0)}`
}

function monthDiff(a: string, b: string): number {
  const da = new Date(a)
  const db2 = new Date(b)
  return (db2.getFullYear() - da.getFullYear()) * 12 + (db2.getMonth() - da.getMonth())
}

function annualGrowthPct(old: number, current: number): number {
  if (old === 0) return 0
  return Math.round(((current - old) / old) * 100)
}

export function UncomfortableTruth() {
  const [step, setStep] = useState<'idle' | 'confirm' | 'loading' | 'revealed' | 'feedback_done'>('idle')
  const [statements, setStatements] = useState<string[]>([])
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null)

  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const lastViewedSetting = useLiveQuery(() => db.appSettings.get(LAST_VIEWED_KEY), [])

  const lastViewedMonthsAgo = useMemo(() => {
    if (!lastViewedSetting) return null
    const months = monthDiff(lastViewedSetting.value, new Date().toISOString())
    return months
  }, [lastViewedSetting])

  // Compute raw numbers for AI narration
  const computedNumbers = useMemo(() => {
    if (!transactions || !categories) return null
    const catMap = new Map(categories.map((c) => [c.id!, c.name]))

    const expenses = transactions.filter((t) => t.transactionType === 'EXPENSE')

    // Total per category (all time)
    const catTotal = new Map<string, number>()
    for (const t of expenses) {
      const name = t.categoryId ? catMap.get(t.categoryId) ?? 'Other' : 'Other'
      catTotal.set(name, (catTotal.get(name) ?? 0) + t.amount)
    }

    const topCats = Array.from(catTotal.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Date range
    const allDates = transactions.map((t) => t.date).sort()
    const firstDate = allDates[0] ?? new Date().toISOString().slice(0, 10)
    const lastDate = allDates[allDates.length - 1] ?? firstDate
    const totalMonths = Math.max(1, monthDiff(firstDate, lastDate))
    const years = (totalMonths / 12).toFixed(1)

    // Monthly totals for growth calc
    const now = new Date()
    const threeYearsAgo = new Date(now)
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

    const recentCatTotal = new Map<string, number>()
    const oldCatTotal = new Map<string, number>()

    for (const t of expenses) {
      const name = t.categoryId ? catMap.get(t.categoryId) ?? 'Other' : 'Other'
      const d = new Date(t.date)
      if (d >= threeYearsAgo) recentCatTotal.set(name, (recentCatTotal.get(name) ?? 0) + t.amount)
      else oldCatTotal.set(name, (oldCatTotal.get(name) ?? 0) + t.amount)
    }

    // Monthly income growth (first vs last year)
    const firstYearIncome = transactions
      .filter((t) => t.transactionType === 'INCOME' && t.date.slice(0, 4) === firstDate.slice(0, 4))
      .reduce((s, t) => s + t.amount, 0)
    const lastYearIncome = transactions
      .filter((t) => t.transactionType === 'INCOME' && t.date.slice(0, 4) === lastDate.slice(0, 4))
      .reduce((s, t) => s + t.amount, 0)
    const incomeGrowthPct = annualGrowthPct(firstYearIncome, lastYearIncome)

    // Top eating-out / social spend
    const eatingKeywords = ['eating out', 'restaurant', 'dining', 'food', 'zomato', 'swiggy']
    const eatingTotal = Array.from(catTotal.entries())
      .filter(([name]) => eatingKeywords.some((k) => name.toLowerCase().includes(k)))
      .reduce((s, [, v]) => s + v, 0)
    const eatingGrowthPct = annualGrowthPct(
      Array.from(oldCatTotal.entries())
        .filter(([name]) => eatingKeywords.some((k) => name.toLowerCase().includes(k)))
        .reduce((s, [, v]) => s + v, 0),
      Array.from(recentCatTotal.entries())
        .filter(([name]) => eatingKeywords.some((k) => name.toLowerCase().includes(k)))
        .reduce((s, [, v]) => s + v, 0)
    )

    // Rent equivalent
    const rentTotal = catTotal.get('Rent') ?? catTotal.get('rent') ?? 0
    const avgMonthlyExpense = expenses.reduce((s, t) => s + t.amount, 0) / totalMonths

    return {
      topCats,
      years,
      totalMonths,
      incomeGrowthPct,
      eatingTotal,
      eatingGrowthPct,
      rentTotal,
      avgMonthlyExpense,
    }
  }, [transactions, categories])

  const generateTruths = useCallback(async () => {
    if (!computedNumbers) return
    setStep('loading')

    const {
      topCats, years, incomeGrowthPct, eatingTotal,
      eatingGrowthPct, rentTotal, avgMonthlyExpense,
    } = computedNumbers

    const resolvedKey = await resolveAIKey()

    if (!resolvedKey) {
      // Fall back to rule-based statements
      const fallbackStatements: string[] = []

      if (topCats[0]) {
        const [name, total] = topCats[0]
        const anchor = closestAnchor(total)
        fallbackStatements.push(
          `In ${years} years, you spent ${formatINR(total)} on ${name}. That could have been ${anchor}.`
        )
      }
      if (eatingTotal > 0 && eatingGrowthPct > 10) {
        fallbackStatements.push(
          `Your eating out spend grew ${eatingGrowthPct}% in 3 years, while your income grew ${incomeGrowthPct}%.`
        )
      }
      if (rentTotal > 0) {
        const months = Math.round(topCats[1]?.[1] / (avgMonthlyExpense / 12) ?? 0)
        fallbackStatements.push(
          `You spent ${formatINR(topCats[1]?.[1] ?? 0)} on ${topCats[1]?.[0] ?? 'your second category'}. That's ~${months} months of rent.`
        )
      }
      if (topCats[2]) {
        const [name, total] = topCats[2]
        fallbackStatements.push(
          `${formatINR(total)} on ${name} over ${years} years — ${closestAnchor(total / parseFloat(years))} per year.`
        )
      }

      setStatements(fallbackStatements.slice(0, 6))
      await saveLastViewed()
      setStep('revealed')
      return
    }

    // Build prompt with numbers only — AI writes narrative around them
    const facts = topCats.map(([name, total]) => `${name}: ${formatINR(total)} over ${years} years`).join('\n')
    const prompt = `You are writing The Uncomfortable Truth — emotionally honest financial facts for a user.

Given these computed spending facts, write 4-6 short, emotionally resonant statements (1-2 sentences each).
Use the exact amounts provided. Do NOT invent numbers. Convert amounts to relatable comparisons where useful.

Spending data:
${facts}

Eating out growth: ${eatingGrowthPct}% in 3 years vs income growth ${incomeGrowthPct}%
Rent equivalent: ${formatINR(rentTotal)}/yr

Conversion anchors: ₹15,000 = weekend Goa trip, ₹80,000 = Bali trip, ₹1,50,000 = Europe trip, ₹25,000 = iPhone SE, ₹1,20,000 = MacBook Air

Write only the statements, one per line. No bullets. No headers.`

    try {
      let text = ''

      if (resolvedKey.provider === 'gemini') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${resolvedKey.key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        )
        const json = await res.json()
        text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      } else {
        const res = await fetch('/api/fain/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt, context: {} }),
        })
        const json = await res.json()
        text = json.reply ?? ''
      }

      const lines = text
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 10)
        .slice(0, 6)

      setStatements(lines.length >= 2 ? lines : [text])
    } catch {
      setStatements([`In ${years} years, your top spend was ${formatINR(topCats[0]?.[1] ?? 0)} on ${topCats[0]?.[0] ?? 'expenses'}. That could have been ${closestAnchor(topCats[0]?.[1] ?? 0)}.`])
    }

    await saveLastViewed()
    setStep('revealed')
  }, [computedNumbers])

  const saveLastViewed = async () => {
    await db.appSettings.put({ key: LAST_VIEWED_KEY, value: new Date().toISOString() })
  }

  const handleFeedback = async (response: string) => {
    setFeedbackGiven(response)
    await db.feedbackLog.add({
      timestamp: new Date().toISOString(),
      featureId: 'uncomfortable_truth',
      insightType: 'truth_reveal',
      insightSummary: statements.join(' | '),
      userResponse: response as 'POSITIVE' | 'NEGATIVE',
      monthYear: new Date().toISOString().slice(0, 7),
      syncedToSheet: false,
    })
    setStep('feedback_done')
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-white">The Uncomfortable Truth</h3>
          <p className="text-xs text-slate-400 mt-0.5">Based on all available data · Manual trigger only</p>
        </div>
        {lastViewedMonthsAgo !== null && (
          <span className="text-xs text-slate-500">
            Last viewed: {lastViewedMonthsAgo === 0 ? 'this month' : `${lastViewedMonthsAgo}mo ago`}
          </span>
        )}
      </div>

      {step === 'idle' && (
        <div className="mt-5 text-center">
          <p className="text-sm text-slate-400 mb-4">
            This will show honest, unfiltered facts about your spending. Ready?
          </p>
          <button
            onClick={() => setStep('confirm')}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-xl transition"
          >
            <Eye className="w-4 h-4" />
            Show My Truth
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="mt-5 bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-white font-medium mb-2">Are you sure?</p>
          <p className="text-xs text-slate-400 mb-4">
            This will show honest, unfiltered facts about your spending. No judgment, just data.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setStep('idle')}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded-lg transition"
            >
              Not yet
            </button>
            <button
              onClick={generateTruths}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition"
            >
              Yes, show me
            </button>
          </div>
        </div>
      )}

      {step === 'loading' && (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
          Analysing your financial history…
        </div>
      )}

      {(step === 'revealed' || step === 'feedback_done') && (
        <>
          <div className="mt-4 space-y-3">
            {statements.map((s, i) => (
              <div
                key={i}
                className="p-4 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 leading-relaxed"
              >
                {s}
              </div>
            ))}
          </div>

          {step === 'revealed' && (
            <div className="mt-5 border-t border-slate-700 pt-4">
              <p className="text-xs text-slate-400 mb-3 text-center">
                Did this change how you think about your spending?
              </p>
              <div className="flex gap-3 justify-center">
                {['Yes', 'Somewhat', 'No'].map((label) => (
                  <button
                    key={label}
                    onClick={() => handleFeedback(label)}
                    className="px-4 py-1.5 text-xs border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white rounded-lg transition"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'feedback_done' && (
            <p className="mt-4 text-center text-xs text-slate-500">
              Thanks for the feedback · {feedbackGiven}
            </p>
          )}
        </>
      )}
    </div>
  )
}
