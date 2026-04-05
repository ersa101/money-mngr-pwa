'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'
import { Play, RefreshCw, Share2 } from 'lucide-react'
import { buildMonthlySubCategorySpend, computeCorrelationWeb } from '@/lib/correlationUtils'
import type { CorrelationWebData } from '@/lib/correlationUtils'

const CACHE_KEY = 'correlation_web'
const CACHE_VERSION = 1
const CACHE_TTL_DAYS = 7

const CORRELATION_THRESHOLD = 0.4
const NODE_RADIUS_BASE = 14
const NODE_RADIUS_MAX = 40
const SVG_W = 560
const SVG_H = 380
const CX = SVG_W / 2
const CY = SVG_H / 2

interface NodePos {
  name: string
  totalSpend: number
  x: number
  y: number
}

function circleLayout(nodes: CorrelationWebData['nodes']): NodePos[] {
  const r = Math.min(CX, CY) * 0.65
  return nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
    return { ...n, x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
  })
}

function nodeRadius(spend: number, maxSpend: number): number {
  if (maxSpend === 0) return NODE_RADIUS_BASE
  return NODE_RADIUS_BASE + (NODE_RADIUS_MAX - NODE_RADIUS_BASE) * Math.sqrt(spend / maxSpend)
}

export function CorrelationWeb() {
  const db = useDb()
  const [computing, setComputing] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

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

      // Check data sufficiency (need ≥ 6 months)
      const months = new Set(txns.map((t) => t.date.slice(0, 7)))
      if (months.size < 6) {
        await db.computedInsights.put({
          key: CACHE_KEY,
          value: JSON.stringify({ insufficient: true }),
          computedAt: new Date().toISOString(),
          version: CACHE_VERSION,
        })
        return
      }

      const subCatMap = new Map(
        categories
          .filter((c) => c.parentId != null)
          .map((c) => [c.id!, c.name])
      )

      const monthlySpend = buildMonthlySubCategorySpend(txns, subCatMap, 15)
      const webData = computeCorrelationWeb(monthlySpend, CORRELATION_THRESHOLD)

      await db.computedInsights.put({
        key: CACHE_KEY,
        value: JSON.stringify({ insufficient: false, ...webData }),
        computedAt: new Date().toISOString(),
        version: CACHE_VERSION,
      })
    } finally {
      setComputing(false)
    }
  }, [db])

  const raw: (CorrelationWebData & { insufficient?: boolean }) | null = useMemo(() => {
    if (!cached) return null
    return JSON.parse(cached.value)
  }, [cached])

  const positions = useMemo(() => {
    if (!raw?.nodes?.length) return []
    return circleLayout(raw.nodes)
  }, [raw])

  const maxSpend = useMemo(() => {
    return positions.reduce((m, n) => Math.max(m, n.totalSpend), 0)
  }, [positions])

  const daysAgo = cached
    ? Math.floor((Date.now() - new Date(cached.computedAt).getTime()) / 86400000)
    : null

  const selectedEdges = useMemo(() => {
    if (!selected || !raw?.edges) return new Set<string>()
    return new Set(
      raw.edges
        .filter((e) => e.source === selected || e.target === selected)
        .flatMap((e) => [`${e.source}__${e.target}`, `${e.target}__${e.source}`])
    )
  }, [selected, raw])

  const selectedConnections = useMemo(() => {
    if (!selected || !raw?.edges) return []
    return raw.edges
      .filter((e) => e.source === selected || e.target === selected)
      .map((e) => ({
        other: e.source === selected ? e.target : e.source,
        r: e.r,
      }))
      .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
  }, [selected, raw])

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-6">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-orange-400" />
          <h2 className="text-base md:text-lg font-semibold text-white">Spending DNA / Correlation Web</h2>
        </div>
        <span className="text-xs text-slate-500">Based on all available data</span>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Node size = total spend. Lines = how categories move together (|r| &gt; 0.4). Tap a node to explore.
      </p>

      <div className="flex items-center gap-3 mb-4">
        {!isFresh ? (
          <button
            onClick={compute}
            disabled={computing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm rounded-lg transition"
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

      {/* Insufficient data */}
      {raw?.insufficient && (
        <p className="text-slate-400 text-sm text-center py-8 border border-slate-700 rounded-lg">
          Need at least 6 months of data to compute correlations.
        </p>
      )}

      {/* Web visualization */}
      {raw && !raw.insufficient && positions.length > 0 && (
        <>
          <div className="flex gap-4 text-xs mb-3">
            <span className="flex items-center gap-1">
              <span className="inline-block w-6 h-0.5 bg-orange-400" />
              <span className="text-slate-400">Positive correlation</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-6 h-0.5 bg-blue-400" />
              <span className="text-slate-400">Negative correlation</span>
            </span>
          </div>

          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              width="100%"
              style={{ maxWidth: SVG_W }}
              className="touch-manipulation"
            >
              {/* Edges */}
              {raw.edges.map((edge) => {
                const src = positions.find((p) => p.name === edge.source)
                const tgt = positions.find((p) => p.name === edge.target)
                if (!src || !tgt) return null
                const edgeKey = `${edge.source}__${edge.target}`
                const isHighlighted = selected ? selectedEdges.has(edgeKey) : true
                const opacity = selected ? (isHighlighted ? 0.9 : 0.07) : 0.5
                const strokeW = 1 + 3 * Math.abs(edge.r)
                return (
                  <line
                    key={edgeKey}
                    x1={src.x} y1={src.y}
                    x2={tgt.x} y2={tgt.y}
                    stroke={edge.r > 0 ? '#fb923c' : '#60a5fa'}
                    strokeWidth={strokeW}
                    strokeOpacity={opacity}
                  />
                )
              })}

              {/* Nodes */}
              {positions.map((n) => {
                const r = nodeRadius(n.totalSpend, maxSpend)
                const isSelected = n.name === selected
                const dimmed = selected && !isSelected && !selectedEdges.has(n.name)
                return (
                  <g
                    key={n.name}
                    onClick={() => setSelected(isSelected ? null : n.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={n.x} cy={n.y} r={r}
                      fill={isSelected ? '#f97316' : '#6366f1'}
                      fillOpacity={dimmed ? 0.15 : isSelected ? 1 : 0.75}
                      stroke={isSelected ? '#fff' : '#818cf8'}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    <text
                      x={n.x} y={n.y + r + 12}
                      textAnchor="middle"
                      fontSize={9}
                      fill={dimmed ? '#475569' : '#cbd5e1'}
                    >
                      {n.name.length > 10 ? n.name.slice(0, 9) + '…' : n.name}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Selected node info */}
          {selected && selectedConnections.length > 0 && (
            <div className="mt-4 p-3 bg-slate-900 rounded-lg border border-slate-700">
              <p className="text-sm text-white font-medium mb-2">
                When <span className="text-orange-400">{selected}</span> is high, these tend to move together:
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedConnections.map((c) => (
                  <span key={c.other} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-slate-600">
                    <span className={c.r > 0 ? 'text-orange-400' : 'text-blue-400'}>
                      {c.r > 0 ? '↑' : '↓'}
                    </span>
                    <span className="text-slate-200">{c.other}</span>
                    <span className="text-slate-500">r={c.r.toFixed(2)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {selected && selectedConnections.length === 0 && (
            <p className="mt-3 text-xs text-slate-500">
              No strong correlations found for {selected}.
            </p>
          )}
        </>
      )}

      {!raw && !computing && (
        <p className="text-slate-500 text-sm text-center py-8">
          Press ▶ Compute to generate the correlation web.
        </p>
      )}
    </div>
  )
}
