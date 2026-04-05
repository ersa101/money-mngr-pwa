'use client'

import { useState, useCallback, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { computeCorrelations, type CorrelationNode, type CorrelationEdge } from '@/lib/correlationUtils'
import { Play, RefreshCw } from 'lucide-react'

const CACHE_KEY = 'correlation_web'
const CACHE_VERSION = 1
const CACHE_TTL_DAYS = 7
const MIN_MONTHS = 6

interface NodePos {
  id: string
  x: number
  y: number
  totalSpend: number
  r: number // visual radius
}

function formatINR(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`
  return `₹${v.toFixed(0)}`
}

const W = 480
const H = 380
const CX = W / 2
const CY = H / 2

function layoutNodes(nodes: CorrelationNode[]): NodePos[] {
  if (nodes.length === 0) return []
  const maxSpend = Math.max(...nodes.map((n) => n.totalSpend))
  return nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
    const distance = 140
    const radius = 10 + (n.totalSpend / maxSpend) * 22
    return {
      id: n.id,
      x: CX + Math.cos(angle) * distance,
      y: CY + Math.sin(angle) * distance,
      totalSpend: n.totalSpend,
      r: radius,
    }
  })
}

export function CorrelationWeb() {
  const [computing, setComputing] = useState(false)
  const [nodes, setNodes] = useState<CorrelationNode[] | null>(null)
  const [edges, setEdges] = useState<CorrelationEdge[] | null>(null)
  const [computedAt, setComputedAt] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [insufficientData, setInsufficientData] = useState(false)

  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  useLiveQuery(async () => {
    const cached = await db.computedInsights.get(CACHE_KEY)
    if (!cached) return
    const ageDays = (Date.now() - new Date(cached.computedAt).getTime()) / 86400000
    if (ageDays < CACHE_TTL_DAYS && cached.version === CACHE_VERSION) {
      const { nodes: n, edges: e } = JSON.parse(cached.value)
      setNodes(n)
      setEdges(e)
      setComputedAt(cached.computedAt)
    }
  }, [])

  const compute = useCallback(async () => {
    if (!transactions || !categories) return
    setComputing(true)
    setInsufficientData(false)

    const catMap = new Map(categories.map((c) => [c.id!, c.name]))

    // Build subcategory monthly spend (use categoryId, or subCategoryId if present)
    const monthlyData = new Map<string, Map<string, number>>()
    const months = new Set<string>()

    for (const t of transactions) {
      if (t.transactionType !== 'EXPENSE') continue
      const catId = t.subCategoryId ?? t.categoryId
      if (!catId) continue
      const catName = catMap.get(catId) ?? `Cat ${catId}`
      const month = t.date.slice(0, 7)
      months.add(month)
      if (!monthlyData.has(catName)) monthlyData.set(catName, new Map())
      const mm = monthlyData.get(catName)!
      mm.set(month, (mm.get(month) ?? 0) + t.amount)
    }

    if (months.size < MIN_MONTHS) {
      setInsufficientData(true)
      setComputing(false)
      return
    }

    const result = computeCorrelations(monthlyData)
    const now = new Date().toISOString()

    await db.computedInsights.put({
      key: CACHE_KEY,
      value: JSON.stringify(result),
      computedAt: now,
      version: CACHE_VERSION,
    })

    setNodes(result.nodes)
    setEdges(result.edges)
    setComputedAt(now)
    setComputing(false)
  }, [transactions, categories])

  const nodePositions = useMemo<NodePos[]>(
    () => (nodes ? layoutNodes(nodes) : []),
    [nodes]
  )

  const posMap = useMemo(
    () => new Map(nodePositions.map((n) => [n.id, n])),
    [nodePositions]
  )

  const selectedEdges = useMemo(
    () =>
      selectedNode && edges
        ? new Set(
            edges
              .filter((e) => e.source === selectedNode || e.target === selectedNode)
              .flatMap((e) => [e.source, e.target])
          )
        : null,
    [selectedNode, edges]
  )

  const daysAgo = computedAt
    ? Math.floor((Date.now() - new Date(computedAt).getTime()) / 86400000)
    : null

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-white">Spending DNA — Correlation Web</h3>
          <p className="text-xs text-slate-400 mt-0.5">Based on all available data · Tap a node to explore</p>
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
            ) : nodes ? (
              <RefreshCw className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {computing ? 'Computing…' : nodes ? 'Recompute' : 'Compute'}
          </button>
        </div>
      </div>

      {!nodes && !computing && !insufficientData && (
        <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
          Press Compute to map spending correlations
        </div>
      )}

      {insufficientData && (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm text-center px-4">
          Need at least 6 months of data to compute correlations.
        </div>
      )}

      {computing && (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          Computing correlations…
        </div>
      )}

      {nodes && edges && !computing && (
        <>
          {selectedNode && (
            <div className="mt-2 mb-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600 text-xs text-slate-300">
              <span className="font-semibold text-white">{selectedNode}</span> moves together with:{' '}
              {edges
                .filter((e) => e.source === selectedNode || e.target === selectedNode)
                .map((e) => (e.source === selectedNode ? e.target : e.source))
                .join(', ') || 'no strong correlations'}
            </div>
          )}

          <div className="mt-3 overflow-x-auto">
            <svg
              width={W}
              height={H}
              className="mx-auto"
              onClick={(e) => {
                if ((e.target as SVGElement).tagName === 'svg') setSelectedNode(null)
              }}
            >
              {/* Edges */}
              {edges.map((edge, i) => {
                const src = posMap.get(edge.source)
                const tgt = posMap.get(edge.target)
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
                    stroke={edge.r > 0 ? '#f97316' : '#60a5fa'}
                    strokeWidth={1 + Math.abs(edge.r) * 3}
                    strokeOpacity={isHighlighted ? 0.8 : 0.15}
                  />
                )
              })}

              {/* Nodes */}
              {nodePositions.map((node) => {
                const isSelected = selectedNode === node.id
                const isDimmed = selectedNode && !selectedEdges?.has(node.id) && !isSelected
                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(isSelected ? null : node.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r}
                      fill={isSelected ? '#6366f1' : '#334155'}
                      stroke={isSelected ? '#818cf8' : '#475569'}
                      strokeWidth={isSelected ? 2 : 1}
                      opacity={isDimmed ? 0.3 : 1}
                    />
                    <text
                      x={node.x}
                      y={node.y + node.r + 11}
                      textAnchor="middle"
                      fontSize={8}
                      fill={isDimmed ? '#475569' : '#94a3b8'}
                    >
                      {node.id.length > 12 ? node.id.slice(0, 11) + '…' : node.id}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 3}
                      textAnchor="middle"
                      fontSize={7}
                      fill={isDimmed ? '#334155' : '#e2e8f0'}
                    >
                      {formatINR(node.totalSpend)}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="mt-3 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-6 h-0.5 bg-orange-400" /> Positive correlation
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-6 h-0.5 bg-blue-400" /> Negative correlation
            </span>
            <span className="text-slate-600">· Only |r| &gt; 0.4 shown · Node size = total spend</span>
          </div>
        </>
      )}
    </div>
  )
}
