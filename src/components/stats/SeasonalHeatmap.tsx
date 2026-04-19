'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDb } from '@/contexts/DbContext'
import { useLiveQuery } from 'dexie-react-hooks'
import { Play, RefreshCw, Grid3x3 } from 'lucide-react'

const CATEGORY_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
  '#84cc16', '#e879f9', '#38bdf8', '#fb923c',
  '#a3e635', '#f472b6', '#34d399',
]

interface HeatmapData {
  categories: string[]
  weeks: string[]
  cells: number[][]
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

// Returns [{weekIdx, label}] for month boundaries
function buildMonthLabels(weeks: string[]): { weekIdx: number; label: string }[] {
  const labels: { weekIdx: number; label: string }[] = []
  let lastMonth = -1
  weeks.forEach((w, i) => {
    const d = new Date(w)
    const m = d.getMonth()
    if (m !== lastMonth) {
      labels.push({ weekIdx: i, label: d.toLocaleString('default', { month: 'short' }) })
      lastMonth = m
    }
  })
  return labels
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
    return Date.now() - new Date(cached.computedAt).getTime() < 7 * 24 * 60 * 60 * 1000 && cached.version === 2
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
      const subCatMap = new Map(categories.map((c) => [c.id!, c.name]))

      // Build last 52 week starts (Mondays)
      const now = new Date()
      const weeks: string[] = []
      for (let i = 51; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i * 7)
        weeks.push(getMonday(d).toISOString().split('T')[0])
      }

      // Top 15 expense sub-categories by total spend
      const totalBySubCat = new Map<string, number>()
      for (const t of transactions) {
        if (t.transactionType !== 'EXPENSE' || !t.subCategoryId) continue
        const name = subCatMap.get(t.subCategoryId) ?? 'Other'
        totalBySubCat.set(name, (totalBySubCat.get(name) ?? 0) + t.amount)
      }
      const top15 = Array.from(totalBySubCat.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name]) => name)

      // Build cells [catIdx][weekIdx]
      const cells: number[][] = top15.map(() => new Array(52).fill(0))

      for (const t of transactions) {
        if (t.transactionType !== 'EXPENSE' || !t.subCategoryId) continue
        const name = subCatMap.get(t.subCategoryId) ?? 'Other'
        const catIdx = top15.indexOf(name)
        if (catIdx === -1) continue
        const monday = getMonday(new Date(t.date)).toISOString().split('T')[0]
        const weekIdx = weeks.indexOf(monday)
        if (weekIdx === -1) continue
        cells[catIdx][weekIdx] += t.amount
      }

      const maxAmount = Math.max(...cells.flat(), 1)
      const computed: HeatmapData = { categories: top15, weeks, cells, maxAmount }
      const now2 = new Date().toISOString()

      await db.table('computedInsights').put({
        key: 'seasonal_heatmap',
        value: JSON.stringify(computed),
        computedAt: now2,
        version: 2,
      })

      setResult(computed)
      setComputedAt(now2)
    } catch {
      setError('Computation failed. Please try again.')
    } finally {
      setComputing(false)
    }
  }, [db])

  useEffect(() => {
    if (cached && isCacheValid() && !result && !computing) {
      loadFromCache()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cached])

  const daysAgo = computedAt
    ? Math.floor((Date.now() - new Date(computedAt).getTime()) / 86400000)
    : null

  const CELL_W = 12
  const CELL_H = 18
  const CELL_GAP = 2
  const LABEL_W = 110
  const HEADER_H = 20
  const WEEK_COUNT = 52

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-5 h-5 text-violet-600" />
          <h3 className="text-base font-semibold text-gray-900">Seasonal Heatmap</h3>
        </div>
        <span className="text-xs text-gray-400">Based on all available data</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">Weekly spend intensity per sub-category — last 52 weeks, top 15</p>

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
                height={HEADER_H + result.categories.length * (CELL_H + CELL_GAP) + 4}
              >
                {/* Month column labels */}
                {buildMonthLabels(result.weeks).map(({ weekIdx, label }) => (
                  <text
                    key={`month-${weekIdx}`}
                    x={LABEL_W + weekIdx * (CELL_W + CELL_GAP)}
                    y={14}
                    fill="#9ca3af"
                    fontSize={9}
                  >
                    {label}
                  </text>
                ))}

                {result.categories.map((cat, catIdx) => {
                  const color = CATEGORY_COLORS[catIdx % CATEGORY_COLORS.length]
                  const y = HEADER_H + catIdx * (CELL_H + CELL_GAP)
                  return (
                    <g key={cat}>
                      <text
                        x={LABEL_W - 6}
                        y={y + CELL_H / 2 + 4}
                        textAnchor="end"
                        fill="#6b7280"
                        fontSize={10}
                      >
                        {cat.length > 14 ? cat.slice(0, 14) + '…' : cat}
                      </text>
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

              {tooltip && (
                <div
                  className="fixed z-50 bg-white border border-gray-200 rounded px-3 py-2 text-xs pointer-events-none shadow-lg"
                  style={{ left: tooltip.x + 14, top: tooltip.y - 8 }}
                >
                  <p className="font-medium text-gray-900">{tooltip.category}</p>
                  <p className="text-gray-500">Week of {tooltip.week}</p>
                  <p className="text-emerald-600 font-semibold">₹{tooltip.amount.toLocaleString('en-IN')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pattern guide */}
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Spend intensity:</span>
              {[0.06, 0.25, 0.5, 0.75, 1].map((op, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: '#6366f1', opacity: op }}
                />
              ))}
              <span className="text-xs text-gray-400 ml-1">Low → High</span>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <p className="text-xs text-gray-500">
                Computed {daysAgo === 0 ? 'today' : `${daysAgo}d ago`}
              </p>
              <button
                onClick={compute}
                disabled={computing}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition ml-2"
              >
                <RefreshCw className="w-3 h-3" />
                Recompute
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
