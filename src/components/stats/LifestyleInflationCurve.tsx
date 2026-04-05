'use client'

import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { db } from '@/lib/db'
import { Play, RefreshCw } from 'lucide-react'

interface DataPoint {
  month: string
  income: number
  expense: number
  gap: number
  gapGreen: number
  gapRed: number
}

const CACHE_KEY = 'lifestyle_inflation'
const CACHE_VERSION = 1
const CACHE_TTL_DAYS = 7

function rolling3(values: number[]): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - 2), i + 1)
    return slice.reduce((s, v) => s + v, 0) / slice.length
  })
}

function formatINR(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`
  return `₹${v.toFixed(0)}`
}

function annualGrowthRate(values: number[]): number {
  const valid = values.filter((v) => v > 0)
  if (valid.length < 2) return 0
  const first = valid[0]
  const last = valid[valid.length - 1]
  const years = valid.length / 12
  return years > 0 ? (Math.pow(last / first, 1 / years) - 1) * 100 : 0
}

export function LifestyleInflationCurve() {
  const [computing, setComputing] = useState(false)
  const [chartData, setChartData] = useState<DataPoint[] | null>(null)
  const [computedAt, setComputedAt] = useState<string | null>(null)
  const [incomeGrowth, setIncomeGrowth] = useState(0)
  const [expenseGrowth, setExpenseGrowth] = useState(0)

  const transactions = useLiveQuery(() => db.transactions.toArray(), [])

  const cachedInsight = useLiveQuery(
    () => db.computedInsights.get(CACHE_KEY),
    [],
    undefined
  )

  // Auto-load from cache on mount
  useState(() => {
    if (cachedInsight) {
      const ageDays = (Date.now() - new Date(cachedInsight.computedAt).getTime()) / 86400000
      if (ageDays < CACHE_TTL_DAYS && cachedInsight.version === CACHE_VERSION) {
        const parsed = JSON.parse(cachedInsight.value)
        setChartData(parsed.chartData)
        setIncomeGrowth(parsed.incomeGrowth)
        setExpenseGrowth(parsed.expenseGrowth)
        setComputedAt(cachedInsight.computedAt)
      }
    }
  })

  const compute = useCallback(async () => {
    if (!transactions) return
    setComputing(true)

    const monthlyIncome = new Map<string, number>()
    const monthlyExpense = new Map<string, number>()

    for (const t of transactions) {
      const month = t.date.slice(0, 7)
      if (t.transactionType === 'INCOME') {
        monthlyIncome.set(month, (monthlyIncome.get(month) ?? 0) + t.amount)
      } else if (t.transactionType === 'EXPENSE') {
        monthlyExpense.set(month, (monthlyExpense.get(month) ?? 0) + t.amount)
      }
    }

    const months = Array.from(
      new Set([...monthlyIncome.keys(), ...monthlyExpense.keys()])
    ).sort()

    const rawIncome = months.map((m) => monthlyIncome.get(m) ?? 0)
    const rawExpense = months.map((m) => monthlyExpense.get(m) ?? 0)
    const smoothIncome = rolling3(rawIncome)
    const smoothExpense = rolling3(rawExpense)

    const ig = annualGrowthRate(smoothIncome)
    const eg = annualGrowthRate(smoothExpense)

    const data: DataPoint[] = months.map((m, i) => {
      const inc = smoothIncome[i]
      const exp = smoothExpense[i]
      const gap = inc - exp
      return {
        month: m,
        income: Math.round(inc),
        expense: Math.round(exp),
        gap,
        gapGreen: gap >= 0 ? Math.round(gap) : 0,
        gapRed: gap < 0 ? Math.round(Math.abs(gap)) : 0,
      }
    })

    const payload = { chartData: data, incomeGrowth: ig, expenseGrowth: eg }
    const now = new Date().toISOString()

    await db.computedInsights.put({
      key: CACHE_KEY,
      value: JSON.stringify(payload),
      computedAt: now,
      version: CACHE_VERSION,
    })

    setChartData(data)
    setIncomeGrowth(ig)
    setExpenseGrowth(eg)
    setComputedAt(now)
    setComputing(false)
  }, [transactions])

  const daysAgo = computedAt
    ? Math.floor((Date.now() - new Date(computedAt).getTime()) / 86400000)
    : null

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-white">Lifestyle Inflation Curve</h3>
          <p className="text-xs text-slate-400 mt-0.5">Based on all available data</p>
        </div>
        <div className="flex items-center gap-2">
          {daysAgo !== null && (
            <span className="text-xs text-slate-500">
              Computed {daysAgo === 0 ? 'today' : `${daysAgo}d ago`}
            </span>
          )}
          <button
            onClick={compute}
            disabled={computing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition disabled:opacity-50"
          >
            {computing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : chartData ? (
              <RefreshCw className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {computing ? 'Computing…' : chartData ? 'Recompute' : 'Compute'}
          </button>
        </div>
      </div>

      {!chartData && !computing && (
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
          Press Compute to analyse your full transaction history
        </div>
      )}

      {computing && (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
          Analysing transactions…
        </div>
      )}

      {chartData && !computing && (
        <>
          <div className="flex gap-6 mb-4 mt-3">
            <div className="text-sm">
              <span className="text-slate-400">Income growth: </span>
              <span className="text-emerald-400 font-semibold">{incomeGrowth.toFixed(1)}%/yr</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-400">Expense growth: </span>
              <span className={`font-semibold ${expenseGrowth > incomeGrowth ? 'text-red-400' : 'text-emerald-400'}`}>
                {expenseGrowth.toFixed(1)}%/yr
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(v) => v.slice(2)}
                interval={Math.floor(chartData.length / 8)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={formatINR}
                width={55}
              />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                formatter={(v: number, name: string) => [formatINR(v), name]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
              />
              {/* Green gap: income > expense */}
              <Area
                type="monotone"
                dataKey="gapGreen"
                fill="#10b98120"
                stroke="none"
                name="Healthy gap"
                stackId="gap"
              />
              {/* Red gap: expense > income */}
              <Area
                type="monotone"
                dataKey="gapRed"
                fill="#ef444420"
                stroke="none"
                name="Lifestyle inflation"
                stackId="gap2"
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                dot={false}
                strokeWidth={2}
                name="Income (3mo avg)"
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="#f87171"
                dot={false}
                strokeWidth={2}
                name="Expense (3mo avg)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
