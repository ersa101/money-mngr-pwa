'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useDb } from '@/contexts/DbContext'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  buildSubCategoryMonthlySeries,
  computeCorrelations,
  computeFullMatrix,
} from '@/lib/correlationUtils'
import type { CorrelationEdge } from '@/lib/correlationUtils'
import { Network } from 'lucide-react'

type ViewMode = 'matrix' | 'chord' | 'bubble'

interface MatrixResult {
  names: string[]
  totals: number[]
  avgMonthlys: number[]
  matrix: number[][]
  edges: CorrelationEdge[]
  hasEnoughData: boolean
}

const SVG_W = 500
const SVG_H = 420
const CX = SVG_W / 2
const CY = SVG_H / 2
const RADIUS = 170

function circlePositions(n: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => ({
    x: CX + RADIUS * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
    y: CY + RADIUS * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
  }))
}

function rToColor(r: number): string {
  if (r >= 0) {
    const g = Math.round(60 + 135 * r)
    return `rgb(34,${g},94)`
  } else {
    const intensity = Math.round(180 * Math.abs(r))
    return `rgb(${180 + intensity},40,40)`
  }
}

function rToOpacity(r: number): number {
  return 0.08 + 0.92 * Math.abs(r)
}

export function CorrelationWeb() {
  const db = useDb()
  const [computing, setComputing] = useState(false)
  const [result, setResult] = useState<MatrixResult | null>(null)
  const [computedAt, setComputedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('matrix')
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string[] } | null>(null)

  const txCount = useLiveQuery(() => db?.transactions.count() ?? 0, [db])
  const lastTxCountRef = useRef<number | null>(null)

  const cached = useLiveQuery(async () => {
    return db?.table('computedInsights').where('key').equals('correlation_web').first()
  }, [db])

  const isCacheValid = useCallback(() => {
    if (!cached) return false
    return (
      Date.now() - new Date(cached.computedAt).getTime() < 7 * 24 * 60 * 60 * 1000 &&
      cached.version === 2
    )
  }, [cached])

  const loadFromCache = useCallback(() => {
    if (cached) {
      setResult(JSON.parse(cached.value))
      setComputedAt(cached.computedAt)
    }
  }, [cached])

  const compute = useCallback(async () => {
    if (!db) return
    setComputing(true)
    setError(null)
    try {
      const transactions = await db.transactions.toArray()
      const categories = await db.categories.toArray()
      const subCatMap = new Map(categories.map((c) => [c.id!, c.name]))

      const months = new Set(transactions.map((t) => t.date.slice(0, 7)))
      if (months.size < 6) {
        const res: MatrixResult = { names: [], totals: [], avgMonthlys: [], matrix: [], edges: [], hasEnoughData: false }
        setResult(res)
        return
      }

      const raw = transactions
        .filter((t) => t.transactionType === 'EXPENSE')
        .map((t) => ({
          date: t.date,
          amount: t.amount,
          transactionType: 'EXPENSE' as const,
          subCategoryName: t.subCategoryId ? subCatMap.get(t.subCategoryId) : undefined,
        }))
        .filter((t) => !!t.subCategoryName)

      const series = buildSubCategoryMonthlySeries(raw, 15)
      const matrix = computeFullMatrix(series)
      const edges = computeCorrelations(series, 0.3)

      const monthCount = months.size || 1
      const totals = series.map((s) => s.monthly.reduce((a, m) => a + m.amount, 0))
      const avgMonthlys = totals.map((t) => t / monthCount)
      const names = series.map((s) => s.subCategoryName)

      const webResult: MatrixResult = { names, totals, avgMonthlys, matrix, edges, hasEnoughData: true }
      const now = new Date().toISOString()

      await db.table('computedInsights').put({
        key: 'correlation_web',
        value: JSON.stringify(webResult),
        computedAt: now,
        version: 2,
      })

      setResult(webResult)
      setComputedAt(now)
    } catch {
      setError('Computation failed. Please try again.')
    } finally {
      setComputing(false)
    }
  }, [db])

  // Load cache on mount; auto-compute if no valid cache
  useEffect(() => {
    if (cached === undefined) return
    if (cached && isCacheValid() && !result && !computing) {
      loadFromCache()
    } else if (!result && !computing && txCount !== undefined && txCount > 0) {
      compute()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cached])

  // Auto-recompute when transaction count changes (after initial load)
  useEffect(() => {
    if (txCount === undefined) return
    if (lastTxCountRef.current !== null && lastTxCountRef.current !== txCount && !computing) {
      compute()
    }
    lastTxCountRef.current = txCount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txCount])

  const daysAgo = computedAt
    ? Math.floor((Date.now() - new Date(computedAt).getTime()) / 86400000)
    : null

  // --- Matrix view ---
  const matrixView = useMemo(() => {
    if (!result?.hasEnoughData || !result.names.length) return null
    const n = result.names.length
    const cellSize = Math.min(28, Math.floor(300 / n))
    const labelW = 90
    const headerH = 70
    const svgW = labelW + n * cellSize
    const svgH = headerH + n * cellSize

    return (
      <div className="overflow-x-auto">
        <svg width={svgW} height={svgH} className="block">
          {/* Column headers (rotated) */}
          {result.names.map((name, j) => (
            <text
              key={`col-${j}`}
              x={labelW + j * cellSize + cellSize / 2}
              y={headerH - 4}
              textAnchor="start"
              fill="#6b7280"
              fontSize={9}
              transform={`rotate(-45, ${labelW + j * cellSize + cellSize / 2}, ${headerH - 4})`}
            >
              {name.length > 10 ? name.slice(0, 10) + '…' : name}
            </text>
          ))}

          {/* Row labels */}
          {result.names.map((name, i) => (
            <text
              key={`row-${i}`}
              x={labelW - 4}
              y={headerH + i * cellSize + cellSize / 2 + 4}
              textAnchor="end"
              fill="#6b7280"
              fontSize={9}
            >
              {name.length > 12 ? name.slice(0, 12) + '…' : name}
            </text>
          ))}

          {/* Cells */}
          {result.matrix.map((row, i) =>
            row.map((r, j) => {
              if (i === j) {
                return (
                  <rect
                    key={`${i}-${j}`}
                    x={labelW + j * cellSize}
                    y={headerH + i * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill="#e5e7eb"
                  />
                )
              }
              const color = rToColor(r)
              const opacity = rToOpacity(r)
              return (
                <rect
                  key={`${i}-${j}`}
                  x={labelW + j * cellSize}
                  y={headerH + i * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={color}
                  fillOpacity={opacity}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    const rect = (e.target as SVGElement).getBoundingClientRect()
                    setTooltip({
                      x: rect.left + window.scrollX + cellSize,
                      y: rect.top + window.scrollY,
                      text: [
                        `${result.names[i]} × ${result.names[j]}`,
                        `r = ${r >= 0 ? '+' : ''}${r.toFixed(2)}`,
                        r > 0.3 ? 'Positive correlation' : r < -0.3 ? 'Negative correlation' : 'Weak / no correlation',
                      ],
                    })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })
          )}
        </svg>
      </div>
    )
  }, [result])

  // --- Chord view ---
  const positions = useMemo(() => {
    if (!result?.names.length) return []
    return circlePositions(result.names.length)
  }, [result])

  const maxTotal = result?.totals.length ? Math.max(...result.totals, 1) : 1

  const selectedEdges = useMemo(() => {
    if (!selectedNode || !result) return new Set<string>()
    return new Set(
      result.edges
        .filter((e) => e.source === selectedNode || e.target === selectedNode)
        .flatMap((e) => [e.source, e.target])
    )
  }, [selectedNode, result])

  const chordView = useMemo(() => {
    if (!result?.hasEnoughData || !result.names.length) return null
    const nodeMap = new Map(
      result.names.map((name, i) => [name, { name, total: result.totals[i], ...positions[i] }])
    )
    return (
      <div className="overflow-x-auto">
        <svg width={SVG_W} height={SVG_H} className="mx-auto block" style={{ maxWidth: '100%' }}>
          {result.edges.filter((e) => e.r > 0.3).map((edge, i) => {
            const src = nodeMap.get(edge.source)
            const tgt = nodeMap.get(edge.target)
            if (!src || !tgt) return null
            const isHighlighted = !selectedNode || edge.source === selectedNode || edge.target === selectedNode
            return (
              <line
                key={i}
                x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                stroke={edge.r > 0 ? '#fb923c' : '#60a5fa'}
                strokeWidth={1 + edge.r * 5}
                strokeOpacity={isHighlighted ? 0.8 : 0.1}
              />
            )
          })}
          {result.names.map((name, i) => {
            const pos = positions[i]
            const r = 8 + 22 * Math.sqrt(result.totals[i] / maxTotal)
            const isSelected = selectedNode === name
            const isDimmed = !!selectedNode && !selectedEdges.has(name) && !isSelected
            return (
              <g key={name} style={{ cursor: 'pointer' }} onClick={() => setSelectedNode(isSelected ? null : name)}>
                <circle
                  cx={pos.x} cy={pos.y} r={r}
                  fill="#6366f1" fillOpacity={isDimmed ? 0.15 : isSelected ? 1 : 0.65}
                  stroke={isSelected ? '#fff' : '#6366f1'} strokeWidth={isSelected ? 2 : 0}
                />
                <text x={pos.x} y={pos.y + r + 11} textAnchor="middle" fill={isDimmed ? '#9ca3af' : '#374151'} fontSize={9}>
                  {name.length > 10 ? name.slice(0, 10) + '…' : name}
                </text>
              </g>
            )
          })}
        </svg>
        {selectedNode && (
          <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs">
            <p className="text-gray-900 font-medium mb-1">
              <span className="text-indigo-600">{selectedNode}</span> correlates with:
            </p>
            <p className="text-gray-700">
              {result.edges
                .filter((e) => e.source === selectedNode || e.target === selectedNode)
                .map((e) => (e.source === selectedNode ? e.target : e.source))
                .join(', ') || 'No strong correlations found.'}
            </p>
          </div>
        )}
      </div>
    )
  }, [result, positions, selectedNode, selectedEdges, maxTotal])

  // --- Bubble view ---
  const bubbleView = useMemo(() => {
    if (!result?.hasEnoughData || !result.edges.length) return null
    const filtered = result.edges.filter((e) => Math.abs(e.r) > 0.3)
    if (!filtered.length) return (
      <p className="text-gray-400 text-xs text-center py-8">No pairs with |r| &gt; 0.3 to display.</p>
    )

    const nameIdx = new Map(result.names.map((n, i) => [n, i]))
    const PAD = 50
    const BSVG_W = 400
    const BSVG_H = 320

    const getAvg = (name: string) => result.avgMonthlys[nameIdx.get(name) ?? 0] ?? 0

    const allX = filtered.map((e) => getAvg(e.source))
    const allY = filtered.map((e) => getAvg(e.target))
    const maxX = Math.max(...allX, 1)
    const maxY = Math.max(...allY, 1)

    const toSvgX = (v: number) => PAD + (v / maxX) * (BSVG_W - PAD * 2)
    const toSvgY = (v: number) => BSVG_H - PAD - (v / maxY) * (BSVG_H - PAD * 2)

    const sorted = [...filtered].sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
    const labelTop = 5

    return (
      <div className="overflow-x-auto">
        <svg width={BSVG_W} height={BSVG_H} className="block mx-auto">
          {/* Axis lines */}
          <line x1={PAD} y1={PAD} x2={PAD} y2={BSVG_H - PAD} stroke="#e5e7eb" strokeWidth={1} />
          <line x1={PAD} y1={BSVG_H - PAD} x2={BSVG_W - PAD} y2={BSVG_H - PAD} stroke="#e5e7eb" strokeWidth={1} />
          <text x={BSVG_W / 2} y={BSVG_H - 6} textAnchor="middle" fontSize={9} fill="#9ca3af">Avg monthly spend (source)</text>
          <text x={12} y={BSVG_H / 2} textAnchor="middle" fontSize={9} fill="#9ca3af" transform={`rotate(-90, 12, ${BSVG_H / 2})`}>Avg monthly spend (target)</text>

          {sorted.map((edge, i) => {
            const x = toSvgX(getAvg(edge.source))
            const y = toSvgY(getAvg(edge.target))
            const bubbleR = 5 + Math.abs(edge.r) * 18
            const color = edge.r > 0 ? '#fb923c' : '#60a5fa'
            const showLabel = i < labelTop
            return (
              <g key={i}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
                  setTooltip({
                    x: rect.left + window.scrollX + bubbleR,
                    y: rect.top + window.scrollY,
                    text: [
                      `${edge.source} × ${edge.target}`,
                      `r = ${edge.r >= 0 ? '+' : ''}${edge.r.toFixed(2)}`,
                    ],
                  })
                }}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={x} cy={y} r={bubbleR} fill={color} fillOpacity={0.55} />
                {showLabel && (
                  <text x={x} y={y - bubbleR - 3} textAnchor="middle" fontSize={8} fill="#374151">
                    {edge.source.slice(0, 8)} + {edge.target.slice(0, 8)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        <div className="flex gap-3 justify-center mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> Positive</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Negative</span>
          <span className="text-gray-400">Bubble size = |r|</span>
        </div>
      </div>
    )
  }, [result])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-orange-600" />
          <h3 className="text-base font-semibold text-gray-900">Spending DNA — Correlation</h3>
        </div>
        <span className="text-xs text-gray-400">Based on all available data</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">How sub-category spending patterns move together — top 15 sub-categories, Pearson r</p>

      {computing && (
        <div className="flex items-center justify-center py-8 gap-2 text-gray-500 text-sm">
          <span className="animate-spin">⟳</span> Computing…
        </div>
      )}

      {!computing && !result && error && (
        <p className="text-red-400 text-xs text-center py-4">{error}</p>
      )}

      {!computing && result && !result.hasEnoughData && (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 text-sm text-center max-w-xs">
            Need at least 6 months of data to compute correlations.
          </p>
        </div>
      )}

      {!computing && result?.hasEnoughData && (
        <>
          {/* View toggle */}
          <div className="flex gap-1 mb-4">
            {(['matrix', 'chord', 'bubble'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1 rounded text-xs font-medium transition capitalize ${
                  viewMode === v
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {v === 'matrix' ? 'Heatmap' : v === 'chord' ? 'Chord' : 'Bubble'}
              </button>
            ))}
          </div>

          {/* Legend for matrix */}
          {viewMode === 'matrix' && (
            <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-4 h-3 rounded-sm inline-block bg-red-600 opacity-80" /> Negative
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-3 rounded-sm inline-block bg-gray-200" /> ~0
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-3 rounded-sm inline-block" style={{ backgroundColor: 'rgb(34,145,94)' }} /> Positive
              </span>
            </div>
          )}

          {viewMode === 'chord' && (
            <div className="flex gap-3 mb-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-orange-400 inline-block" /> Positive</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-blue-400 inline-block" /> Negative</span>
            </div>
          )}

          {viewMode === 'matrix' && matrixView}
          {viewMode === 'chord' && chordView}
          {viewMode === 'bubble' && bubbleView}

          {/* Floating tooltip */}
          {tooltip && (
            <div
              className="fixed z-50 bg-white border border-gray-200 rounded px-3 py-2 text-xs pointer-events-none shadow-lg"
              style={{ left: tooltip.x + 8, top: tooltip.y - 8 }}
            >
              {tooltip.text.map((line, i) => (
                <p key={i} className={i === 0 ? 'font-medium text-gray-900' : 'text-gray-500'}>{line}</p>
              ))}
            </div>
          )}

          <div className="mt-3 text-xs text-gray-400">
            {daysAgo !== null ? `Computed ${daysAgo === 0 ? 'today' : `${daysAgo}d ago`}` : ''}
            {computing ? ' · Updating…' : ''}
          </div>
        </>
      )}
    </div>
  )
}
