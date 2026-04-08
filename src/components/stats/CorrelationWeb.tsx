'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useDb } from '@/contexts/DbContext'
import { useLiveQuery } from 'dexie-react-hooks'
import { buildSubCategoryMonthlySeries, computeCorrelations } from '@/lib/correlationUtils'
import type { CorrelationEdge } from '@/lib/correlationUtils'
import { Play, RefreshCw, Network } from 'lucide-react'

interface NodeData {
  name: string
  total: number
  x: number
  y: number
}

interface WebResult {
  nodes: { name: string; total: number }[]
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

function nodeRadius(total: number, maxTotal: number): number {
  return 8 + 22 * Math.sqrt(total / maxTotal)
}

function edgeWidth(r: number): number {
  return 1 + Math.abs(r) * 5
}

export function CorrelationWeb() {
  const db = useDb()
  const [computing, setComputing] = useState(false)
  const [result, setResult] = useState<WebResult | null>(null)
  const [computedAt, setComputedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const cached = useLiveQuery(async () => {
    return db.table('computedInsights').where('key').equals('correlation_web').first()
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
      const subCatMap = new Map(categories.map((c) => [c.id!, c.name]))

      // Check if we have at least 6 distinct months of data
      const months = new Set(transactions.map((t) => t.date.slice(0, 7)))
      if (months.size < 6) {
        const res: WebResult = { nodes: [], edges: [], hasEnoughData: false }
        setResult(res)
        setComputing(false)
        return
      }

      // Build raw transactions with sub-category names
      const raw = transactions
        .filter((t) => t.transactionType === 'EXPENSE')
        .map((t) => ({
          date: t.date,
          amount: t.amount,
          transactionType: 'EXPENSE' as const,
          subCategoryName: t.subCategoryId ? subCatMap.get(t.subCategoryId) : undefined,
        }))
        .filter((t) => t.subCategoryName)

      const series = buildSubCategoryMonthlySeries(raw, 15)
      const edges = computeCorrelations(series, 0.4)

      // Compute totals per sub-category
      const totals = new Map<string, number>()
      for (const s of series) {
        totals.set(s.subCategoryName, s.monthly.reduce((a, m) => a + m.amount, 0))
      }

      const nodes = series.map((s) => ({
        name: s.subCategoryName,
        total: totals.get(s.subCategoryName) ?? 0,
      }))

      const webResult: WebResult = { nodes, edges, hasEnoughData: true }
      const now = new Date().toISOString()

      await db.table('computedInsights').put({
        key: 'correlation_web',
        value: JSON.stringify(webResult),
        computedAt: now,
        version: 1,
      })

      setResult(webResult)
      setComputedAt(now)
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

  const positions = useMemo(() => {
    if (!result?.nodes.length) return []
    return circlePositions(result.nodes.length)
  }, [result])

  const nodeMap = useMemo(() => {
    if (!result?.nodes.length || !positions.length) return new Map<string, NodeData>()
    const maxTotal = Math.max(...result.nodes.map((n) => n.total), 1)
    return new Map(
      result.nodes.map((n, i) => [
        n.name,
        { ...n, x: positions[i].x, y: positions[i].y },
      ])
    )
  }, [result, positions])

  const selectedEdges = useMemo(() => {
    if (!selectedNode || !result) return new Set<string>()
    return new Set(
      result.edges
        .filter((e) => e.source === selectedNode || e.target === selectedNode)
        .flatMap((e) => [e.source, e.target])
    )
  }, [selectedNode, result])

  const maxTotal = result?.nodes.length
    ? Math.max(...result.nodes.map((n) => n.total), 1)
    : 1

  const connectedToSelected = selectedNode
    ? result?.edges
        .filter((e) => e.source === selectedNode || e.target === selectedNode)
        .map((e) => (e.source === selectedNode ? e.target : e.source)) ?? []
    : []

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-orange-400" />
          <h3 className="text-base font-semibold text-white">Spending DNA — Correlation Web</h3>
        </div>
        <span className="text-xs text-slate-500">Based on all available data</span>
      </div>
      <p className="text-xs text-slate-400 mb-4">How your sub-category spending patterns move together (Pearson r &gt; 0.4)</p>

      {!result && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <button
            onClick={compute}
            disabled={computing}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition"
          >
            {computing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {computing ? 'Computing…' : '▶ Compute'}
          </button>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      )}

      {result && !result.hasEnoughData && (
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-400 text-sm text-center max-w-xs">
            Need at least 6 months of data to compute correlations.
          </p>
        </div>
      )}

      {result && result.hasEnoughData && (
        <>
          <div className="flex gap-3 text-xs mb-3">
            <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-orange-400 inline-block" /> Positive correlation</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-blue-400 inline-block" /> Negative correlation</span>
          </div>

          <div className="overflow-x-auto">
            <svg width={SVG_W} height={SVG_H} className="mx-auto block" style={{ maxWidth: '100%' }}>
              {/* Edges */}
              {result.edges.map((edge, i) => {
                const src = nodeMap.get(edge.source)
                const tgt = nodeMap.get(edge.target)
                if (!src || !tgt) return null
                const isHighlighted =
                  !selectedNode ||
                  edge.source === selectedNode ||
                  edge.target === selectedNode
                return (
                  <line
                    key={i}
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={edge.r > 0 ? '#fb923c' : '#60a5fa'}
                    strokeWidth={edgeWidth(edge.r)}
                    strokeOpacity={isHighlighted ? 0.85 : 0.12}
                  />
                )
              })}

              {/* Nodes */}
              {result.nodes.map((node, i) => {
                const pos = positions[i]
                const r = nodeRadius(node.total, maxTotal)
                const isSelected = selectedNode === node.name
                const isDimmed = selectedNode && !selectedEdges.has(node.name) && !isSelected
                return (
                  <g
                    key={node.name}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedNode(isSelected ? null : node.name)}
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r}
                      fill="#6366f1"
                      fillOpacity={isDimmed ? 0.2 : isSelected ? 1 : 0.7}
                      stroke={isSelected ? '#fff' : '#6366f1'}
                      strokeWidth={isSelected ? 2 : 0}
                    />
                    <text
                      x={pos.x}
                      y={pos.y + r + 11}
                      textAnchor="middle"
                      fill={isDimmed ? '#475569' : '#cbd5e1'}
                      fontSize={9}
                    >
                      {node.name.length > 10 ? node.name.slice(0, 10) + '…' : node.name}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {selectedNode && connectedToSelected.length > 0 && (
            <div className="mt-3 bg-slate-900 rounded-lg p-3 text-xs">
              <p className="text-white font-medium mb-1">
                When <span className="text-indigo-400">{selectedNode}</span> is high, these tend to move together:
              </p>
              <p className="text-slate-300">{connectedToSelected.join(', ')}</p>
            </div>
          )}

          {selectedNode && connectedToSelected.length === 0 && (
            <div className="mt-3 bg-slate-900 rounded-lg p-3 text-xs text-slate-400">
              No strong correlations found for <span className="text-indigo-400">{selectedNode}</span>.
            </div>
          )}

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
