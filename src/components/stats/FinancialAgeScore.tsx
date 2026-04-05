'use client'

import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { computeFinancialAge } from '@/lib/financialAgeUtils'

// ── Helpers ─────────────────────────────────────────────────────────────────
function cagr(values: number[]): number {
  const nonZero = values.filter((v) => v > 0)
  if (nonZero.length < 2) return 0
  const n = nonZero.length - 1
  return (Math.pow(nonZero[n] / nonZero[0], 12 / n) - 1) * 100
}

function coefficientOfVariation(values: number[]): number {
  const nonZero = values.filter((v) => v !== 0)
  if (nonZero.length < 2) return 100
  const mean = nonZero.reduce((a, b) => a + b, 0) / nonZero.length
  if (mean === 0) return 100
  const variance = nonZero.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / nonZero.length
  return (Math.sqrt(variance) / Math.abs(mean)) * 100
}

export function FinancialAgeScore() {
  const db = useDb()
  const [realAge, setRealAge] = useState<number | ''>('')
  const [ageInput, setAgeInput] = useState('')
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [ageSaved, setAgeSaved] = useState(false)

  // Load saved age
  useEffect(() => {
    if (!db) return
    db.appSettings.get('user_real_age').then((s) => {
      if (s?.value) {
        const n = Number(s.value)
        setRealAge(n)
        setAgeInput(String(n))
      }
    })
  }, [db])

  const saveAge = async () => {
    if (!db || !ageInput) return
    const n = Number(ageInput)
    if (isNaN(n) || n < 1 || n > 120) return
    await db.appSettings.put({ key: 'user_real_age', value: String(n) })
    setRealAge(n)
    setAgeSaved(true)
    setTimeout(() => setAgeSaved(false), 1500)
  }

  const transactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db])
  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db])

  const result = useMemo(() => {
    if (!realAge || !transactions?.length || !accounts) return null

    const now = new Date()
    const last12Start = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10)
    const recent = transactions.filter((t) => t.date >= last12Start)

    const monthMap = new Map<string, { inc: number; exp: number }>()
    for (const t of recent) {
      const m = t.date.slice(0, 7)
      if (!monthMap.has(m)) monthMap.set(m, { inc: 0, exp: 0 })
      const e = monthMap.get(m)!
      if (t.transactionType === 'INCOME') e.inc += t.amount
      else if (t.transactionType === 'EXPENSE') e.exp += t.amount
    }
    const months = Array.from(monthMap.keys()).sort()
    const incomes = months.map((m) => monthMap.get(m)!.inc)
    const expenses = months.map((m) => monthMap.get(m)!.exp)
    const savings = months.map((m, i) => incomes[i] - expenses[i])

    const totalInc = incomes.reduce((a, b) => a + b, 0)
    const totalExp = expenses.reduce((a, b) => a + b, 0)
    const savingsRate = totalInc > 0 ? ((totalInc - totalExp) / totalInc) * 100 : 0

    // Investment spend — detect by description keywords
    const investmentKeywords = ['investment', 'stock', 'mf', 'mutual fund', 'insurance', 'sip', 'epf']
    const investmentTxns = recent.filter((t) => {
      if (t.transactionType !== 'EXPENSE') return false
      const desc = (t.description ?? t.notes ?? '').toLowerCase()
      return investmentKeywords.some((kw) => desc.includes(kw))
    })
    const investmentTotal = investmentTxns.reduce((s, t) => s + t.amount, 0)
    const investmentRatio = totalInc > 0 ? (investmentTotal / totalInc) * 100 : 0

    // Debt accounts (CREDIT_CARD or PERSON with positive balance)
    const debtAccounts = (accounts ?? []).filter(
      (a) => (a.type === 'CREDIT_CARD' || a.type === 'PERSON') && a.balance > 0
    )

    // Safe to spend in months
    const avgMonthlyExp = expenses.length > 0 ? totalExp / expenses.length : 1
    const safeAccounts = (accounts ?? []).filter(
      (a) => a.type === 'BANK' || a.type === 'CASH' || a.type === 'WALLET'
    )
    const safeBalance = safeAccounts.reduce((s, a) => s + a.balance, 0)
    const safeMonths = avgMonthlyExp > 0 ? safeBalance / avgMonthlyExp : 0

    const savingsVariance = coefficientOfVariation(savings)
    const expGrowth = cagr(expenses)
    const incGrowth = cagr(incomes)

    return computeFinancialAge({
      realAge: Number(realAge),
      savingsRatePct: savingsRate,
      expenseGrowthPct: expGrowth,
      incomeGrowthPct: incGrowth,
      investmentRatioPct: investmentRatio,
      debtAccountCount: debtAccounts.length,
      safeToSpendMonths: safeMonths,
      savingsVariancePct: savingsVariance,
    })
  }, [realAge, transactions, accounts])

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-pink-400" />
        <h2 className="text-base md:text-lg font-semibold text-white">Financial Age Score</h2>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Your &quot;financial age&quot; based on savings rate, investment habits, and spending behaviour.
      </p>

      {/* Age input */}
      {!realAge && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="number"
            value={ageInput}
            onChange={(e) => setAgeInput(e.target.value)}
            placeholder="Enter your real age"
            className="w-40 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500"
          />
          <button
            onClick={saveAge}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-sm rounded-lg transition"
          >
            {ageSaved ? '✓ Saved' : 'Set Age'}
          </button>
        </div>
      )}

      {realAge && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">Real age: {realAge}</span>
          <button
            onClick={() => setRealAge('')}
            className="text-xs text-slate-600 hover:text-slate-400 underline"
          >
            Change
          </button>
        </div>
      )}

      {result && (
        <>
          {/* Main score display */}
          <div className="flex flex-wrap items-center gap-6 mb-4">
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-1">Financial Age</p>
              <p className={`text-5xl font-bold ${result.delta <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.financialAge}
              </p>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-1">Real Age</p>
              <p className="text-5xl font-bold text-slate-400">{result.realAge}</p>
            </div>
            <div className="flex-1 min-w-[160px]">
              <p className={`text-sm font-medium ${result.delta <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.delta === 0
                  ? 'Right on track 🟡'
                  : result.delta < 0
                  ? `You think ${Math.abs(result.delta)} years younger than you are 🟢`
                  : `You think ${result.delta} years older than you are 🔴`}
              </p>
            </div>
          </div>

          {/* Breakdown toggle */}
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition mb-2"
          >
            {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showBreakdown ? 'Hide' : 'Show'} factor breakdown
          </button>

          {showBreakdown && (
            <div className="space-y-1.5 mt-2">
              {result.adjustments.map((adj, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-16 text-right font-mono ${adj.delta < 0 ? 'text-emerald-400' : adj.delta > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                    {adj.delta > 0 ? `+${adj.delta}` : adj.delta} yrs
                  </span>
                  <span className="text-slate-400">{adj.factor}</span>
                  <span className="text-slate-600 italic">— {adj.condition}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!realAge && (
        <p className="text-slate-500 text-sm py-4">
          Enter your real age above to compute your Financial Age Score.
        </p>
      )}
    </div>
  )
}
