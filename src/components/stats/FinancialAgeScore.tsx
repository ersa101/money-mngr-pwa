'use client'

import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { computeFinancialAge, type FinancialAgeFactor } from '@/lib/financialAgeUtils'
import { ChevronDown, ChevronUp } from 'lucide-react'

function stddev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length)
}

function annualGrowthRate(values: number[]): number {
  const valid = values.filter((v) => v > 0)
  if (valid.length < 2) return 0
  const years = valid.length / 12
  return years > 0 ? (Math.pow(valid[valid.length - 1] / valid[0], 1 / years) - 1) * 100 : 0
}

export function FinancialAgeScore() {
  const [showFactors, setShowFactors] = useState(false)

  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const accounts = useLiveQuery(() => db.accounts.toArray(), [])
  const realAgeSetting = useLiveQuery(() => db.appSettings.get('user_real_age'), [])

  const result = useMemo(() => {
    if (!transactions || !accounts) return null

    const realAge = realAgeSetting ? parseInt(realAgeSetting.value, 10) : 28
    if (isNaN(realAge)) return null

    // Build monthly income/expense
    const monthlyIncome = new Map<string, number>()
    const monthlyExpense = new Map<string, number>()
    const monthlySavings = new Map<string, number>()

    for (const t of transactions) {
      const month = t.date.slice(0, 7)
      if (t.transactionType === 'INCOME') {
        monthlyIncome.set(month, (monthlyIncome.get(month) ?? 0) + t.amount)
      } else if (t.transactionType === 'EXPENSE') {
        monthlyExpense.set(month, (monthlyExpense.get(month) ?? 0) + t.amount)
      }
    }

    const months = Array.from(new Set([...monthlyIncome.keys(), ...monthlyExpense.keys()])).sort()
    months.forEach((m) => {
      const inc = monthlyIncome.get(m) ?? 0
      const exp = monthlyExpense.get(m) ?? 0
      monthlySavings.set(m, inc - exp)
    })

    const incomeVals = months.map((m) => monthlyIncome.get(m) ?? 0)
    const expenseVals = months.map((m) => monthlyExpense.get(m) ?? 0)
    const savingsVals = months.map((m) => monthlySavings.get(m) ?? 0)

    const totalIncome = incomeVals.reduce((s, v) => s + v, 0)
    const totalExpense = expenseVals.reduce((s, v) => s + v, 0)
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0

    const incomeGrowthRate = annualGrowthRate(incomeVals)
    const expenseGrowthRate = annualGrowthRate(expenseVals)

    // Investment ratio: transactions to accounts of type INVESTMENT
    const investmentAccountIds = new Set(
      accounts.filter((a) => a.type === 'INVESTMENT').map((a) => a.id!)
    )
    const investmentTotal = transactions
      .filter((t) => t.transactionType === 'TRANSFER' && investmentAccountIds.has(t.toAccountId ?? -1))
      .reduce((s, t) => s + t.amount, 0)
    const investmentRatio = totalIncome > 0 ? (investmentTotal / totalIncome) * 100 : 0

    // Debt accounts
    const debtAccountCount = accounts.filter((a) => a.isLiability && a.balance > 0).length

    // Safe-to-spend in months: use account threshold logic
    const avgMonthlyExpense = expenseVals.length > 0
      ? expenseVals.reduce((s, v) => s + v, 0) / expenseVals.length
      : 1
    const totalSafeBalance = accounts
      .filter((a) => !a.isLiability && a.includeInNetWorth !== false)
      .reduce((s, a) => s + Math.max(0, a.balance - a.thresholdValue), 0)
    const safeToSpendMonths = avgMonthlyExpense > 0 ? totalSafeBalance / avgMonthlyExpense : 0

    // Savings consistency (coefficient of variation)
    const savingsMean = savingsVals.reduce((s, v) => s + v, 0) / (savingsVals.length || 1)
    const savingsStd = stddev(savingsVals)
    const monthlySavingsVarianceCoeff = savingsMean !== 0 ? Math.abs(savingsStd / savingsMean) : 1

    return computeFinancialAge({
      realAge,
      savingsRate,
      expenseGrowthRate,
      incomeGrowthRate,
      investmentRatio,
      debtAccountCount,
      safeToSpendMonths,
      monthlySavingsVarianceCoeff,
    })
  }, [transactions, accounts, realAgeSetting])

  if (!result) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
          Loading…
        </div>
      </div>
    )
  }

  const younger = result.delta < 0
  const same = result.delta === 0

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">Financial Age Score</h3>
        <p className="text-xs text-slate-400 mt-0.5">Based on all available data</p>
      </div>

      <div className="flex items-center gap-8 mb-5">
        <div className="text-center">
          <div className="text-5xl font-bold text-white">{result.financialAge}</div>
          <div className="text-xs text-slate-400 mt-1">Financial Age</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-semibold text-slate-400">{result.realAge}</div>
          <div className="text-xs text-slate-500 mt-1">Real Age</div>
        </div>
        <div className="flex-1">
          {same ? (
            <p className="text-sm text-slate-300">Your financial age matches your real age.</p>
          ) : younger ? (
            <p className="text-sm">
              <span className="text-emerald-400 font-semibold">
                You think {Math.abs(result.delta)} years younger 🟢
              </span>
              <br />
              <span className="text-slate-400 text-xs">Your habits outpace your age</span>
            </p>
          ) : (
            <p className="text-sm">
              <span className="text-red-400 font-semibold">
                You think {result.delta} years older 🔴
              </span>
              <br />
              <span className="text-slate-400 text-xs">Your habits are ageing your finances</span>
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => setShowFactors(!showFactors)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
      >
        {showFactors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {showFactors ? 'Hide' : 'Show'} factor breakdown
      </button>

      {showFactors && (
        <div className="mt-3 space-y-1.5">
          {result.factors.map((f: FinancialAgeFactor, i: number) => (
            <div key={i} className="flex items-start justify-between gap-3 text-xs">
              <span className="text-slate-400 flex-1">{f.label}</span>
              <span className="text-slate-500 flex-1">{f.detail}</span>
              <span
                className={`font-semibold w-12 text-right ${
                  f.adjustment < 0 ? 'text-emerald-400' : f.adjustment > 0 ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                {f.adjustment > 0 ? `+${f.adjustment}` : f.adjustment} yr
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
