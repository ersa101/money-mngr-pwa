'use client'

import { useMemo, useState } from 'react'
import { useDb } from '@/contexts/DbContext'
import { useLiveQuery } from 'dexie-react-hooks'
import { computeFinancialAge } from '@/lib/financialAgeUtils'
import type { FinancialAgeInput } from '@/lib/financialAgeUtils'
import { ChevronDown, ChevronUp, Brain } from 'lucide-react'

function getLastNMonths(n: number): string[] {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now)
    d.setMonth(d.getMonth() - (n - 1 - i))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

export function FinancialAgeScore() {
  const db = useDb()
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [realAgeInput, setRealAgeInput] = useState('')
  const [savedRealAge, setSavedRealAge] = useState<number | null>(null)

  // Load saved real age from IndexedDB
  const ageSetting = useLiveQuery(async () => {
    return db.appSettings.get('user_real_age')
  }, [])

  const realAge = useMemo(() => {
    if (savedRealAge !== null) return savedRealAge
    if (ageSetting?.value) return parseInt(ageSetting.value, 10)
    return null
  }, [ageSetting, savedRealAge])

  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const accounts = useLiveQuery(() => db.accounts.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const result = useMemo(() => {
    if (!transactions || !accounts || !categories || realAge === null) return null

    const last12 = new Set(getLastNMonths(12))
    const allMonths = Array.from(new Set(transactions.filter(Boolean).map((t) => t.date.slice(0, 7)))).sort()

    // Build monthly income/expense for last 12 months
    const monthlyIncome: number[] = []
    const monthlyExpense: number[] = []
    const incomeByMonth = new Map<string, number>()
    const expenseByMonth = new Map<string, number>()

    // Build all-time monthly for lifestyle inflation
    const allIncomeByMonth = new Map<string, number>()
    const allExpenseByMonth = new Map<string, number>()

    // Find invest categories
    const investKeywords = ['investment', 'invest', 'stock', 'mutual fund', 'mf', 'sip', 'nps', 'ppf', 'fd']
    const catMap = new Map(categories.map((c) => [c.id!, c.name.toLowerCase()]))

    for (const t of transactions.filter(Boolean)) {
      const month = t.date.slice(0, 7)
      if (t.transactionType === 'TRANSFER') continue

      if (t.transactionType === 'INCOME') {
        allIncomeByMonth.set(month, (allIncomeByMonth.get(month) ?? 0) + t.amount)
        if (last12.has(month)) incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + t.amount)
      } else {
        allExpenseByMonth.set(month, (allExpenseByMonth.get(month) ?? 0) + t.amount)
        if (last12.has(month)) expenseByMonth.set(month, (expenseByMonth.get(month) ?? 0) + t.amount)
      }
    }

    const last12Sorted = getLastNMonths(12)
    for (const m of last12Sorted) {
      monthlyIncome.push(incomeByMonth.get(m) ?? 0)
      monthlyExpense.push(expenseByMonth.get(m) ?? 0)
    }

    const allMonthsSorted = allMonths
    const allMonthlyIncome = allMonthsSorted.map((m) => allIncomeByMonth.get(m) ?? 0)
    const allMonthlyExpense = allMonthsSorted.map((m) => allExpenseByMonth.get(m) ?? 0)

    const totalIncome = monthlyIncome.reduce((a, b) => a + b, 0)
    const avgMonthlyExpense = monthlyExpense.reduce((a, b) => a + b, 0) / 12

    // Investment amount — transactions where category name matches invest keywords
    let investmentAmount = 0
    for (const t of transactions.filter(Boolean)) {
      if (t.transactionType !== 'EXPENSE' || !last12.has(t.date.slice(0, 7))) continue
      const catName = t.categoryId ? catMap.get(t.categoryId) ?? '' : ''
      if (investKeywords.some((kw) => catName.includes(kw))) {
        investmentAmount += t.amount
      }
    }

    // Debt accounts — CREDIT_CARD or LOAN type with balance > 0
    const debtAccountCount = accounts.filter(Boolean).filter(
      (a) => (a.type === 'CREDIT_CARD' || (a.type as string) === 'LOAN') && a.balance > 0
    ).length

    // Safe-to-spend: sum of BANK + CASH + WALLET accounts above threshold
    const safeToSpend = accounts
      .filter(Boolean)
      .filter((a) => ['BANK', 'CASH', 'WALLET'].includes(a.type))
      .reduce((sum, a) => sum + Math.max(0, a.balance - (a.thresholdValue ?? 0)), 0)

    const input: FinancialAgeInput = {
      realAge,
      monthlyIncome,
      monthlyExpense,
      investmentAmount,
      totalIncome,
      debtAccountCount,
      safeToSpend,
      avgMonthlyExpense,
      allMonthlyIncome,
      allMonthlyExpense,
    }

    return computeFinancialAge(input)
  }, [transactions, accounts, categories, realAge])

  const saveRealAge = async () => {
    const age = parseInt(realAgeInput, 10)
    if (isNaN(age) || age < 10 || age > 100) return
    await db.appSettings.put({ key: 'user_real_age', value: String(age) })
    setSavedRealAge(age)
  }

  // Prompt for real age if not set
  if (realAge === null) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="text-base font-semibold text-gray-900">Financial Age Score</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">Enter your real age to compute your Financial Age.</p>
        <div className="flex gap-2 max-w-xs">
          <input
            type="number"
            value={realAgeInput}
            onChange={(e) => setRealAgeInput(e.target.value)}
            placeholder="Your age"
            min={10}
            max={100}
            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={saveRealAge}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  if (!result) {
    return <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse h-48" />
  }

  const isOlder = result.delta > 0
  const isYounger = result.delta < 0
  const deltaAbs = Math.abs(result.delta)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-600" />
        <h3 className="text-base font-semibold text-gray-900">Financial Age Score</h3>
      </div>

      <div className="flex items-end gap-8 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Financial Age</p>
          <p className={`text-5xl font-bold ${isOlder ? 'text-red-600' : isYounger ? 'text-emerald-600' : 'text-gray-900'}`}>
            {result.financialAge}
          </p>
        </div>
        <div className="pb-1">
          <p className="text-xs text-gray-400">Real Age</p>
          <p className="text-2xl font-semibold text-gray-600">{result.realAge}</p>
        </div>
      </div>

      {deltaAbs === 0 ? (
        <p className="text-sm text-gray-500 mb-4">Your financial behaviour matches your real age. ✅</p>
      ) : isOlder ? (
        <p className="text-sm text-gray-500 mb-4">
          You&apos;re thinking <span className="text-red-600 font-semibold">{deltaAbs} years older</span> than you are. 🔴
        </p>
      ) : (
        <p className="text-sm text-gray-500 mb-4">
          You&apos;re thinking <span className="text-emerald-600 font-semibold">{deltaAbs} years younger</span> than you are. 🟢
        </p>
      )}

      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition mb-3"
      >
        {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {showBreakdown ? 'Hide' : 'Show'} factor breakdown
      </button>

      {showBreakdown && (
        <div className="space-y-2">
          {result.factors.map((f, i) => (
            <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
              <span className={`text-sm font-bold w-12 flex-shrink-0 ${
                f.adjustment < 0 ? 'text-emerald-600' : f.adjustment > 0 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {f.adjustment > 0 ? `+${f.adjustment}y` : f.adjustment < 0 ? `${f.adjustment}y` : '±0'}
              </span>
              <div>
                <p className="text-xs font-medium text-gray-800">{f.label}</p>
                <p className="text-xs text-gray-500">{f.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
