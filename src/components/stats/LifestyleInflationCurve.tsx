'use client'

import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'
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

// ── Computation constants ────────────────────────────────────────────────────
const CACHE_KEY = 'lifestyle_inflation'
const CACHE_VERSION = 1
const CACHE_TTL_DAYS = 7

interface MonthPoint {
  month: string
  income: number
  expense: number
  incomeSmooth: number
  expenseSmooth: number
  gapGreen: [number, number] | null
  gapRed: [number, number] | null
}

interface CachedResult {
  points: MonthPoint[]
  expenseGrowth: number
  incomeGrowth: number
}

// 3-month rolling average
function rollingAvg(arr: number[], i: number): number {
  const from = Math.max(0, i - 2)
  const slice = arr.slice(from, i + 1)
  return slice.reduce((a, b) => a + b, 0) / slice.length
}

// CAGR from first non-zero to last value
function growthRate(values: number[]): number {
  const nonZero = values.filter((v) => v > 0)
  if (nonZero.length < 2) return 0
  const n = nonZero.length - 1
  return (Math.pow(nonZero[nonZero.length - 1] / nonZero[0], 1 / n) - 1) * 100 * 12
}

function formatMonth(m: string) {
  const [y, mo] = m.split('-')
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(mo) - 1]} ${y.slice(2)}`
}

function formatINR(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`
  return `₹${v.toFixed(0)}`
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-300 mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        p.value != null && p.value > 0 ? (
          <p key={p.name} style={{ color: p.name === 'Income' ? '#22c55e' : '#f87171' }}>
            {p.name}: {formatINR(p.value)}
          </p>
        ) : null
      ))}
    </div>
  )
}

export function LifestyleInflationCurve() {
  const db = useDb()
  const [computing, setComputing] = useState(false)

  const cached = useLiveQuery(async () => {
    if (!db) return null
    return db.computedInsights.get(CACHE_KEY)
  }, [db])

  const isFresh = cached &&
    ((Date.now() - new Date(cached.computedAt).getTime()) / 86400000) < CACHE_TTL_DAYS &&
    cached.version === CACHE_VERSION

  const compute = useCallback(async () => {
    if (!db) return
    setComputing(true)
    try {
      const txns = await db.transactions.toArray()
      const expense = txns.filter((t) => t.transactionType === 'EXPENSE')
      const income = txns.filter((t) => t.transactionType === 'INCOME')

      // Aggregate by month
      const monthMap = new Map<string, { inc: number; exp: number }>()
      for (const t of [...expense, ...income]) {
        const m = t.date.slice(0, 7)
        if (!monthMap.has(m)) monthMap.set(m, { inc: 0, exp: 0 })
        const entry = monthMap.get(m)!
        if (t.transactionType === 'INCOME') entry.inc += t.amount
        else entry.exp += t.amount
      }

      const months = Array.from(monthMap.keys()).sort()
      const incArr = months.map((m) => monthMap.get(m)!.inc)
      const expArr = months.map((m) => monthMap.get(m)!.exp)

      const points: MonthPoint[] = months.map((month, i) => {
        const is = rollingAvg(incArr, i)
        const es = rollingAvg(expArr, i)
        return {
          month,
          income: incArr[i],
          expense: expArr[i],
          incomeSmooth: is,
          expenseSmooth: es,
          gapGreen: is >= es ? [es, is] as [number, number] : null,
          gapRed: es > is ? [is, es] as [number, number] : null,
        }
      })

      const result: CachedResult = {
        points,
        expenseGrowth: growthRate(expArr),
        incomeGrowth: growthRate(incArr),
      }

      await db.computedInsights.put({
        key: CACHE_KEY,
        value: JSON.stringify(result),
        computedAt: new Date().toISOString(),
        version: CACHE_VERSION,
      })
    } finally {
      setComputing(false)
    }
  }, [db])

  const result: CachedResult | null = cached ? JSON.parse(cached.value) : null
  const daysAgo = cached
    ? Math.floor((Date.now() - new Date(cached.computedAt).getTime()) / 86400000)
    : null

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base md:text-lg font-semibold text-white">Lifestyle Inflation Curve</h2>
        </div>
        <span className="text-xs text-slate-500">Based on all available data</span>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Income vs expense growth over time. Green gap = healthy. Red gap = lifestyle inflation.
      </p>

      {/* Compute / recompute controls */}
      <div className="flex items-center gap-3 mb-4">
        {!isFresh ? (
          <button
            onClick={compute}
            disabled={computing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg transition"
          >
            {computing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {computing ? 'Computing…' : '▶ Compute'}
          </button>
        ) : (
          <button
            onClick={compute}
            disabled={computing}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-600 hover:border-slate-400 text-slate-400 hover:text-slate-200 text-xs rounded-lg transition"
          >
            <RefreshCw className={`w-3 h-3 ${computing ? 'animate-spin' : ''}`} />
            Computed {daysAgo === 0 ? 'today' : `${daysAgo}d ago`} · Recompute
          </button>
        )}
      </div>

      {/* Result */}
      {result && (
        <>
          {/* Summary numbers */}
          <div className="flex gap-6 mb-4 text-sm">
            <div>
              <span className="text-slate-400">Expense growth: </span>
              <span className="text-red-400 font-semibold">{result.expenseGrowth.toFixed(1)}%/yr</span>
            </div>
            <div>
              <span className="text-slate-400">Income growth: </span>
              <span className="text-emerald-400 font-semibold">{result.incomeGrowth.toFixed(1)}%/yr</span>
            </div>
          </div>

          {/* Legend pills */}
          <div className="flex flex-wrap gap-3 mb-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="inline-block w-8 h-2 rounded bg-emerald-500/30 border-t border-b border-emerald-500" />
              <span className="text-emerald-400">Healthy gap — income outpacing expenses</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-8 h-2 rounded bg-red-500/30 border-t border-b border-red-500" />
              <span className="text-red-400">Lifestyle inflation — expenses growing faster</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <div style={{ minWidth: 480 }}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={result.points} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={formatINR}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    width={52}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
                    formatter={(v) => (v === 'incomeSmooth' ? 'Income (3mo avg)' : 'Expense (3mo avg)')}
                  />
                  {/* Green gap: income > expense */}
                  <Area
                    type="monotone"
                    dataKey="gapGreen"
                    fill="#22c55e"
                    fillOpacity={0.2}
                    stroke="none"
                    legendType="none"
                  />
                  {/* Red gap: expense > income */}
                  <Area
                    type="monotone"
                    dataKey="gapRed"
                    fill="#ef4444"
                    fillOpacity={0.2}
                    stroke="none"
                    legendType="none"
                  />
                  <Line type="monotone" dataKey="incomeSmooth" stroke="#22c55e" strokeWidth={2} dot={false} name="incomeSmooth" />
                  <Line type="monotone" dataKey="expenseSmooth" stroke="#ef4444" strokeWidth={2} dot={false} name="expenseSmooth" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!result && !computing && (
        <p className="text-slate-500 text-sm text-center py-8">
          Press ▶ Compute to generate the lifestyle inflation curve.
        </p>
      )}
    </div>
  )
}
