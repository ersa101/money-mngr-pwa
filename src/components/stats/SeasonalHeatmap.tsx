'use client'

import { useState, useCallback, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'
import { Play, RefreshCw, Grid3X3 } from 'lucide-react'

const CACHE_KEY = 'seasonal_heatmap'
const CACHE_VERSION = 1
const CACHE_TTL_DAYS = 7
const TOP_N = 8

// 10 distinct category colors (rotate through preset)
const CATEGORY_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6',
  '#f97316', '#84cc16',
]

interface HeatmapData {
  categories: string[]
  weeks: string[]   // ISO week-start dates (YYYY-MM-DD)
  cells: number[][] // [catIdx][weekIdx] = spend amount
  maxAmount: number
}

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function getLast52Weeks(): string[] {
  const weeks: string[] = []
  const now = new Date()
  // Round to current week start
  let cur = new Date(getWeekStart(now))
  for (let i = 0; i < 52; i++) {
    weeks.unshift(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() - 7)
  }
  return weeks
}

function formatWeek(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`
}

export function SeasonalHeatmap() {
  const db = useDb()
  const [computing, setComputing] = useState(false)
  const [tooltip, setTooltip] = useState<{ cat: string; week: string; amount: number; x: number; y: number } | null>(null)

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
      const categories = await db.categories.toArray()
      const catMap = new Map(categories.map((c) => [c.id!, c.name]))

      const expense = txns.filter((t) => t.transactionType === 'EXPENSE' && t.categoryId)

      // Aggregate spend per category
      const catTotals = new Map<string, number>()
      for (const t of expense) {
        const name = catMap.get(t.categoryId!) ?? 'Other'
        catTotals.set(name, (catTotals.get(name) ?? 0) + t.amount)
      }
      const topCats = Array.from(catTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_N)
        .map(([name]) => name)

      const weeks = getLast52Weeks()
      const weekSet = new Set(weeks)

      // Build cell matrix
      const cells: number[][] = topCats.map(() => new Array(weeks.length).fill(0))
      let maxAmount = 0

      for (const t of expense) {
        const ws = getWeekStart(new Date(t.date))
        if (!weekSet.has(ws)) continue
        const catName = catMap.get(t.categoryId!) ?? 'Other'
        const ci = topCats.indexOf(catName)
        if (ci === -1) continue
        const wi = weeks.indexOf(ws)
        if (wi === -1) continue
        cells[ci][wi] += t.amount
        if (cells[ci][wi] > maxAmount) maxAmount = cells[ci][wi]
      }

      const data: HeatmapData = { categories: topCats, weeks, cells, maxAmount }
      await db.computedInsights.put({
        key: CACHE_KEY,
        value: JSON.stringify(data),
        computedAt: new Date().toISOString(),
        version: CACHE_VERSION,
      })
    } finally {
      setComputing(false)
    }
  }, [db])

  const result: HeatmapData | null = useMemo(() => {
    if (!cached) return null
    return JSON.parse(cached.value)
  }, [cached])

  const daysAgo = cached
    ? Math.floor((Date.now() - new Date(cached.computedAt).getTime()) / 86400000)
    : null

  const CELL_W = 12
  const CELL_H = 18
  const CELL_GAP = 2
  const LEFT_PAD = 120
  const TOP_PAD = 28

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-6">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-violet-400" />
          <h2 className="text-base md:text-lg font-semibold text-white">Seasonal Spending Heatmap</h2>
        </div>
        <span className="text-xs text-slate-500">Based on all available data</span>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Spending intensity by category across 52 weeks. Darker = higher spend.
      </p>

      <div className="flex items-center gap-3 mb-4">
        {!isFresh ? (
          <button
            onClick={compute}
            disabled={computing}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm rounded-lg transition"
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

      {result && (
        <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative">
          <svg
            width={LEFT_PAD + result.weeks.length * (CELL_W + CELL_GAP) + 10}
            height={TOP_PAD + result.categories.length * (CELL_H + CELL_GAP) + 10}
          >
            {/* Month labels on X-axis */}
            {result.weeks.map((w, wi) => {
              const d = new Date(w)
              if (d.getDate() <= 7) {
                return (
                  <text
                    key={w}
                    x={LEFT_PAD + wi * (CELL_W + CELL_GAP) + CELL_W / 2}
                    y={TOP_PAD - 8}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#64748b"
                  >
                    {d.toLocaleString('default', { month: 'short' })}
                  </text>
                )
              }
              return null
            })}

            {/* Category labels on Y-axis + cells */}
            {result.categories.map((cat, ci) => {
              const color = CATEGORY_COLORS[ci % CATEGORY_COLORS.length]
              const y = TOP_PAD + ci * (CELL_H + CELL_GAP)
              return (
                <g key={cat}>
                  <text
                    x={LEFT_PAD - 6}
                    y={y + CELL_H / 2 + 4}
                    textAnchor="end"
                    fontSize={10}
                    fill="#94a3b8"
                  >
                    {cat.length > 14 ? cat.slice(0, 13) + '…' : cat}
                  </text>
                  {result.weeks.map((w, wi) => {
                    const amount = result.cells[ci][wi]
                    const opacity = result.maxAmount > 0 ? 0.08 + 0.92 * (amount / result.maxAmount) : 0
                    return (
                      <rect
                        key={w}
                        x={LEFT_PAD + wi * (CELL_W + CELL_GAP)}
                        y={y}
                        width={CELL_W}
                        height={CELL_H}
                        rx={2}
                        fill={color}
                        fillOpacity={amount === 0 ? 0.06 : opacity}
                        style={{ cursor: amount > 0 ? 'pointer' : 'default' }}
                        onMouseEnter={(e) => {
                          if (amount === 0) return
                          const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect()
                          setTooltip({
                            cat,
                            week: `Week of ${formatWeek(w)}`,
                            amount,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          })
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    )
                  })}
                </g>
              )
            })}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="fixed z-50 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-xl"
              style={{ left: tooltip.x, top: tooltip.y - 64, transform: 'translateX(-50%)' }}
            >
              <p className="text-white font-medium">{tooltip.cat}</p>
              <p className="text-slate-400">{tooltip.week}</p>
              <p className="text-emerald-400">
                ₹{tooltip.amount.toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </div>
      )}

      {!result && !computing && (
        <p className="text-slate-500 text-sm text-center py-8">
          Press ▶ Compute to generate the seasonal heatmap.
        </p>
      )}
    </div>
  )
}
