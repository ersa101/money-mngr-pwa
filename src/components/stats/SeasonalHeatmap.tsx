'use client'

import { useState, useCallback, useRef } from 'react'
import { useDb } from '@/contexts/DbContext'
import { useLiveQuery } from 'dexie-react-hooks'
import { Play, RefreshCw, Grid3x3 } from 'lucide-react'

const CATEGORY_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
]

interface HeatmapData {
  categories: string[]
  weeks: string[]          // ISO date string of Monday of each week
  cells: number[][]        // [categoryIdx][weekIdx] = amount
  maxAmount: number
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeek(isoDate: string): string {
  const d = new Date(isoDate)
  return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}, ${d.getFullYear()}`
}

export function SeasonalHeatmap() {
  const db = useDb()
  const [computing, setComputing] = useState(false)
  const [result, setResult] = useState<HeatmapData | null>(null)
  const [computedAt, setComputedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; category: string; week: string; amount: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const cached = useLiveQuery(async () => {
    return db.table('computedInsights').where('key').equals('seasonal_heatmap').first()
  }, [])

  const isCacheValid = useCallback(() => {
    if (!cached) return false
    return Date.now() - new Date(cached.computedAt).getTime() < 7 * 24 * 60 * 60 * 1000 && cached.version === 1
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
      const categories = await db.categories.toArray()
      const catMap = new Map(categories.map((c) => [c.id!, c.name]))

      // Build last 52 week starts (Mondays)
      const now = new Date()
      const weeks: string[] = []
      for (let i = 51; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i * 7)
        weeks.push(getMonday(d).toISOString().split('T')[0])
      }
      const weekSet = new Set(weeks)

      // Find top 8 expense categories by total spend
      const totalByCat = new Map<string, number>()
      for (const t of transactions) {
        if (t.transactionType !== 'EXPENSE' || !t.categoryId) continue
        const name = catMap.get(t.categoryId) ?? 'Other'
        totalByCat.set(name, (totalByCat.get(name) ?? 0) + t.amount)
      }
      const top8 = Array.from(totalByCat.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name]) => name)

      // Build cells [catIdx][weekIdx]
      const cells: number[][] = top8.map(() => new Array(52).fill(0))

      for (const t of transactions) {
        if (t.transactionType !== 'EXPENSE' || !t.categoryId) continue
        const name = catMap.get(t.categoryId) ?? 'Other'
        const catIdx = top8.indexOf(name)
        if (catIdx === -1) continue

        const monday = getMonday(new Date(t.date)).toISOString().split('T')[0]
        const weekIdx = weeks.indexOf(monday)
        if (weekIdx === -1) continue
        cells[catIdx][weekIdx] += t.amount
      }

      const maxAmount = Math.max(...cells.flat(), 1)

      const computed: HeatmapData = { categories: top8, weeks, cells, maxAmount }
      const now2 = new Date().toISOString()

      await db.table('computedInsights').put({
        key: 'seasonal_heatmap',
        value: JSON.stringify(computed),
        computedAt: now2,
        version: 1,
      })

      setResult(computed)
      setComputedAt(now2)
    } catch {
      setError('Computation failed. Please try again.')
    } finally {
      setComputing(false)
    }
  }, [db])

  if (cached && isCacheValid() && !result && !computing) {
    loadFromCache()
  }

  const daysAgo = computedAt
    ? Math.floor((Date.now() - new Date(computedAt).getTime()) / 86400000)
    : null

  const CELL_W = 12
  const CELL_H = 18
  const CELL_GAP = 2
  const LABEL_W = 100
  const WEEK_COUNT = 52

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-5 h-5 text-violet-400" />
          <h3 className="text-base font-semibold text-white">Seasonal Heatmap</h3>
        </div>
        <span className="text-xs text-slate-500">Based on all available data</span>
      </div>
      <p className="text-xs text-slate-400 mb-4">Weekly spend intensity per category — last 52 weeks</p>

      {!result && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <button
            onClick={compute}
            disabled={computing}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition"
          >
            {computing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {computing ? 'Computing…' : '▶ Compute'}
          </button>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      )}

      {result && (
        <>
          <div className="overflow-x-auto" ref={containerRef}>
            <div style={{ position: 'relative', display: 'inline-block', minWidth: LABEL_W + WEEK_COUNT * (CELL_W + CELL_GAP) }}>
              <svg
                width={LABEL_W + WEEK_COUNT * (CELL_W + CELL_GAP)}
                height={result.categories.length * (CELL_H + CELL_GAP) + 20}
              >
                {result.categories.map((cat, catIdx) => {
                  const color = CATEGORY_COLORS[catIdx % CATEGORY_COLORS.length]
                  const y = catIdx * (CELL_H + CELL_GAP) + 10
                  return (
                    <g key={cat}>
                      {/* Category label */}
                      <text
                        x={LABEL_W - 6}
                        y={y + CELL_H / 2 + 4}
                        textAnchor="end"
                        fill="#94a3b8"
                        fontSize={10}
                      >
                        {cat.length > 12 ? cat.slice(0, 12) + '…' : cat}
                      </text>
                      {/* Cells */}
                      {result.weeks.map((week, weekIdx) => {
                        const amount = result.cells[catIdx][weekIdx]
                        const opacity = amount === 0 ? 0.06 : 0.15 + 0.85 * (amount / result.maxAmount)
                        const x = LABEL_W + weekIdx * (CELL_W + CELL_GAP)
                        return (
                          <rect
                            key={week}
                            x={x}
                            y={y}
                            width={CELL_W}
                            height={CELL_H}
                            rx={2}
                            fill={color}
                            fillOpacity={opacity}
                            style={{ cursor: amount > 0 ? 'pointer' : 'default' }}
                            onMouseEnter={(e) => {
                              if (amount === 0) return
                              const rect = (e.target as SVGElement).getBoundingClientRect()
                              setTooltip({
                                x: rect.left + window.scrollX,
                                y: rect.top + window.scrollY,
                                category: cat,
                                week: formatWeek(week),
                                amount,
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

              {/* Floating tooltip */}
              {tooltip && (
                <div
                  className="fixed z-50 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-xs pointer-events-none shadow-lg"
                  style={{ left: tooltip.x + 14, top: tooltip.y - 8 }}
                >
                  <p className="font-medium text-white">{tooltip.category}</p>
                  <p className="text-slate-400">Week of {tooltip.week}</p>
                  <p className="text-emerald-400 font-semibold">₹{tooltip.amount.toLocaleString('en-IN')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <p className="text-xs text-slate-500">
              Computed {daysAgo === 0 ? 'today' : `${daysAgo}d ago`}
            </p>
            <button
              onClick={compute}
              disabled={computing}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
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
