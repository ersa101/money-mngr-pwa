'use client'

import { useState, useCallback, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { Play, RefreshCw } from 'lucide-react'

const CACHE_KEY = 'seasonal_heatmap'
const CACHE_VERSION = 1
const CACHE_TTL_DAYS = 7
const TOP_N_CATEGORIES = 8

const CATEGORY_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
]

interface HeatmapCell {
  week: number    // 0-51
  weekLabel: string
  amount: number
}

interface HeatmapRow {
  category: string
  color: string
  cells: HeatmapCell[]
  maxAmount: number
}

interface HeatmapData {
  rows: HeatmapRow[]
}

function getWeekStart(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // Sunday
  return d.toISOString().slice(0, 10)
}

function formatINR(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`
  return `₹${v.toFixed(0)}`
}

export function SeasonalHeatmap() {
  const [computing, setComputing] = useState(false)
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null)
  const [computedAt, setComputedAt] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const cachedInsight = useLiveQuery(() => db.computedInsights.get(CACHE_KEY), [], undefined)

  useState(() => {
    if (cachedInsight) {
      const ageDays = (Date.now() - new Date(cachedInsight.computedAt).getTime()) / 86400000
      if (ageDays < CACHE_TTL_DAYS && cachedInsight.version === CACHE_VERSION) {
        setHeatmapData(JSON.parse(cachedInsight.value))
        setComputedAt(cachedInsight.computedAt)
      }
    }
  })

  const compute = useCallback(async () => {
    if (!transactions || !categories) return
    setComputing(true)

    const catMap = new Map(categories.map((c) => [c.id!, c.name]))

    // Build last-52-weeks array
    const now = new Date()
    const weeks: string[] = []
    for (let i = 51; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      weeks.push(getWeekStart(d))
    }
    const weekIndex = new Map(weeks.map((w, i) => [w, i]))

    // Aggregate expense by category + week
    const catWeekSpend = new Map<number, Map<number, number>>() // catId → weekIdx → amount
    const catTotal = new Map<number, number>()

    const cutoff = weeks[0]
    for (const t of transactions) {
      if (t.transactionType !== 'EXPENSE') continue
      if (!t.categoryId) continue
      if (t.date < cutoff) continue
      const ws = getWeekStart(new Date(t.date))
      const wi = weekIndex.get(ws)
      if (wi === undefined) continue
      if (!catWeekSpend.has(t.categoryId)) catWeekSpend.set(t.categoryId, new Map())
      const wm = catWeekSpend.get(t.categoryId)!
      wm.set(wi, (wm.get(wi) ?? 0) + t.amount)
      catTotal.set(t.categoryId, (catTotal.get(t.categoryId) ?? 0) + t.amount)
    }

    // Top N categories
    const topCats = Array.from(catTotal.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N_CATEGORIES)
      .map(([id]) => id)

    const rows: HeatmapRow[] = topCats.map((catId, idx) => {
      const wm = catWeekSpend.get(catId) ?? new Map()
      const cells: HeatmapCell[] = weeks.map((w, wi) => ({
        week: wi,
        weekLabel: w,
        amount: wm.get(wi) ?? 0,
      }))
      const maxAmount = Math.max(...cells.map((c) => c.amount), 1)
      return {
        category: catMap.get(catId) ?? `Cat ${catId}`,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        cells,
        maxAmount,
      }
    })

    const data: HeatmapData = { rows }
    const now2 = new Date().toISOString()

    await db.computedInsights.put({
      key: CACHE_KEY,
      value: JSON.stringify(data),
      computedAt: now2,
      version: CACHE_VERSION,
    })

    setHeatmapData(data)
    setComputedAt(now2)
    setComputing(false)
  }, [transactions, categories])

  const daysAgo = computedAt
    ? Math.floor((Date.now() - new Date(computedAt).getTime()) / 86400000)
    : null

  const CELL_SIZE = 11
  const CELL_GAP = 2
  const LABEL_WIDTH = 80

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-white">Seasonal Spending Heatmap</h3>
          <p className="text-xs text-slate-400 mt-0.5">Based on all available data · Last 52 weeks</p>
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
            ) : heatmapData ? (
              <RefreshCw className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {computing ? 'Computing…' : heatmapData ? 'Recompute' : 'Compute'}
          </button>
        </div>
      </div>

      {!heatmapData && !computing && (
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
          Press Compute to build the heatmap
        </div>
      )}

      {computing && (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
          Building heatmap…
        </div>
      )}

      {heatmapData && !computing && (
        <div ref={containerRef} className="mt-4 overflow-x-auto relative">
          <svg
            width={LABEL_WIDTH + 52 * (CELL_SIZE + CELL_GAP)}
            height={heatmapData.rows.length * (CELL_SIZE + CELL_GAP + 4) + 20}
          >
            {heatmapData.rows.map((row, rowIdx) => {
              const y = rowIdx * (CELL_SIZE + CELL_GAP + 4) + 16
              return (
                <g key={row.category}>
                  <text
                    x={LABEL_WIDTH - 6}
                    y={y + CELL_SIZE - 2}
                    textAnchor="end"
                    fontSize={9}
                    fill="#94a3b8"
                  >
                    {row.category.length > 11 ? row.category.slice(0, 10) + '…' : row.category}
                  </text>
                  {row.cells.map((cell) => {
                    const opacity = cell.amount > 0 ? 0.15 + (cell.amount / row.maxAmount) * 0.85 : 0.05
                    return (
                      <rect
                        key={cell.week}
                        x={LABEL_WIDTH + cell.week * (CELL_SIZE + CELL_GAP)}
                        y={y}
                        width={CELL_SIZE}
                        height={CELL_SIZE}
                        rx={2}
                        fill={row.color}
                        fillOpacity={opacity}
                        onMouseEnter={(e) => {
                          const rect = (e.target as SVGRectElement).getBoundingClientRect()
                          const container = containerRef.current?.getBoundingClientRect()
                          setTooltip({
                            x: rect.left - (container?.left ?? 0) + CELL_SIZE / 2,
                            y: rect.top - (container?.top ?? 0) - 36,
                            text: `${row.category} · Week of ${cell.weekLabel} · ${formatINR(cell.amount)}`,
                          })
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        style={{ cursor: 'default' }}
                      />
                    )
                  })}
                </g>
              )
            })}
          </svg>
          {tooltip && (
            <div
              className="absolute pointer-events-none bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white whitespace-nowrap z-10"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              {tooltip.text}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
