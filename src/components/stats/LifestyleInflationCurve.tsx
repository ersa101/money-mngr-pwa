'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDb } from '@/contexts/DbContext'
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
import { Play, RefreshCw, TrendingUp } from 'lucide-react'

interface CurvePoint {
  month: string
  income: number
  expense: number
  gap: number        // income - expense (positive = healthy)
  gapPos: number     // max(gap, 0) for green area
  gapNeg: number     // min(gap, 0) for red area (stored as negative)
}

interface CachedResult {
  data: CurvePoint[]
  incomeGrowthRate: number
  expenseGrowthRate: number
}

function formatINR(value: number) {
  return `₹${(value / 1000).toFixed(0)}k`
}

function rollingAverage(values: number[], window = 3): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

function annualGrowthRate(values: number[]): number {
  if (values.length < 2) return 0
  const n = values.length
  const mean = values.reduce((a, b) => a + b, 0) / n
  if (mean === 0) return 0
  let sumXY = 0, sumX2 = 0
  const meanX = (n - 1) / 2
  for (let i = 0; i < n; i++) {
    sumXY += i * values[i]
    sumX2 += i * i
  }
  const slope = (sumXY - n * meanX * mean) / (sumX2 - n * meanX * meanX)
  return ((slope * 12) / mean) * 100
}

export function LifestyleInflationCurve() {
  const db = useDb()
  const [computing, setComputing] = useState(false)
  const [result, setResult] = useState<CachedResult | null>(null)
  const [computedAt, setComputedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check for cached result on mount
  const cached = useLiveQuery(async () => {
    const row = await db.table('computedInsights').where('key').equals('lifestyle_inflation').first()
    return row ?? null
  }, [])

  const isCacheValid = useCallback(() => {
    if (!cached) return false
    const age = Date.now() - new Date(cached.computedAt).getTime()
    return age < 7 * 24 * 60 * 60 * 1000 && cached.version === 1
  }, [cached])

  const loadFromCache = useCallback(() => {
    if (cached) {
      setResult(JSON.parse(cached.value))
      setComputedAt(cached.computedAt)
    }
  }, [cached])

  const compute = useCallback(async () => {
    setComputing(true)
    setError(null)
    try {
      const transactions = await db.transactions.toArray()
      const monthMap = new Map<string, { income: number; expense: number }>()

      for (const t of transactions) {
        if (t.transactionType === 'TRANSFER') continue
        const month = t.date.slice(0, 7)
        if (!monthMap.has(month)) monthMap.set(month, { income: 0, expense: 0 })
        const entry = monthMap.get(month)!
        if (t.transactionType === 'INCOME') entry.income += t.amount
        else entry.expense += t.amount
      }

      const months = Array.from(monthMap.keys()).sort()
      const rawIncome = months.map((m) => monthMap.get(m)!.income)
      const rawExpense = months.map((m) => monthMap.get(m)!.expense)

      const smoothedIncome = rollingAverage(rawIncome, 3)
      const smoothedExpense = rollingAverage(rawExpense, 3)

      const data: CurvePoint[] = months.map((month, i) => {
        const gap = smoothedIncome[i] - smoothedExpense[i]
        return {
          month,
          income: Math.round(smoothedIncome[i]),
          expense: Math.round(smoothedExpense[i]),
          gap: Math.round(gap),
          gapPos: Math.round(Math.max(gap, 0)),
          gapNeg: Math.round(Math.min(gap, 0)),
        }
      })

      const computed: CachedResult = {
        data,
        incomeGrowthRate: annualGrowthRate(rawIncome),
        expenseGrowthRate: annualGrowthRate(rawExpense),
      }

      const now = new Date().toISOString()
      await db.table('computedInsights').put({
        key: 'lifestyle_inflation',
        value: JSON.stringify(computed),
        computedAt: now,
        version: 1,
      })

      setResult(computed)
      setComputedAt(now)
    } catch (e) {
      setError('Computation failed. Please try again.')
    } finally {
      setComputing(false)
    }
  }, [db])

  const daysAgo = computedAt
    ? Math.floor((Date.now() - new Date(computedAt).getTime()) / 86400000)
    : null

  const hasResult = result !== null

  // Load cache once when cached data arrives — must be in useEffect, never in render body
  // (calling setState during render causes an infinite loop)
  useEffect(() => {
    if (cached && isCacheValid() && !result && !computing) {
      loadFromCache()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cached])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-200 rounded p-3 text-xs shadow-lg">
        <p className="text-gray-700 mb-1 font-medium">{label}</p>
        {payload.map((p: any) => (
          p.name !== 'Gap+' && p.name !== 'Gap−' && (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}: ₹{p.value?.toLocaleString('en-IN')}
            </p>
          )
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-semibold text-gray-900">Lifestyle Inflation Curve</h3>
        </div>
        <span className="text-xs text-gray-400">Based on all available data</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">3-month smoothed income vs expense growth over your full history</p>

      {!hasResult && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <button
            onClick={compute}
            disabled={computing}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition"
          >
            {computing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {computing ? 'Computing…' : '▶ Compute'}
          </button>
          {error && <p className="text-red-600 text-xs">{error}</p>}
        </div>
      )}

      {hasResult && result && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Income growth</p>
              <p className={`text-lg font-bold ${result.incomeGrowthRate >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {result.incomeGrowthRate >= 0 ? '+' : ''}{result.incomeGrowthRate.toFixed(1)}%/yr
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Expense growth</p>
              <p className={`text-lg font-bold ${result.expenseGrowthRate <= result.incomeGrowthRate ? 'text-emerald-600' : 'text-red-600'}`}>
                {result.expenseGrowthRate >= 0 ? '+' : ''}{result.expenseGrowthRate.toFixed(1)}%/yr
              </p>
            </div>
          </div>

          {/* Insight label */}
          {result.expenseGrowthRate > result.incomeGrowthRate ? (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              ⚠ Lifestyle inflation — expenses growing faster than income
            </div>
          ) : (
            <div className="mb-4 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
              ✓ Healthy gap — income outpacing expenses
            </div>
          )}

          <div className="w-full overflow-x-auto">
            <div style={{ minWidth: Math.max(500, result.data.length * 12) }}>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={result.data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    tickFormatter={(v) => v.slice(2)}
                    interval={Math.floor(result.data.length / 8)}
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={formatINR} width={48} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
                  {/* Green gap (income > expense) */}
                  <Area
                    dataKey="gapPos"
                    name="Gap+"
                    fill="#10b981"
                    fillOpacity={0.15}
                    stroke="none"
                    legendType="none"
                  />
                  {/* Red gap (expense > income) — shown as negative, trick: use expense as base */}
                  <Area
                    dataKey="gapNeg"
                    name="Gap−"
                    fill="#ef4444"
                    fillOpacity={0.15}
                    stroke="none"
                    legendType="none"
                  />
                  <Line dataKey="income" name="Income" stroke="#10b981" dot={false} strokeWidth={2} />
                  <Line dataKey="expense" name="Expense" stroke="#ef4444" dot={false} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <p className="text-xs text-gray-500">
              Computed {daysAgo === 0 ? 'today' : `${daysAgo}d ago`}
            </p>
            <button
              onClick={compute}
              disabled={computing}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition"
            >
              <RefreshCw className="w-3 h-3" />
              Recompute
            </button>
          </div>
        </>
      )}
    </div>
  )
}
