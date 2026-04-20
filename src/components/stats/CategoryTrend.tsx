'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'
import type { Transaction } from '@/types/database'
import { useState, useMemo, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { resolveCategorySync, buildCategoryMaps } from '@/lib/categoryUtils'

interface CategoryTrendProps {
  dateRange: { startDate: Date; endDate: Date }
  categoryClick?: { name: string; type: 'EXPENSE' | 'INCOME'; _t: number } | null
}

const CATEGORY_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#84CC16', '#F43F5E', '#0EA5E9',
]

type Granularity = '1D' | '1W' | '1M'

function getBucketKey(date: Date, gran: Granularity): string {
  if (gran === '1D') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  if (gran === '1W') {
    const d = new Date(date)
    d.setDate(d.getDate() - d.getDay())
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getLabel(date: Date, gran: Granularity): string {
  if (gran === '1D' || gran === '1W') {
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

function colorForName(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h) + name.charCodeAt(i)
    h |= 0
  }
  return CATEGORY_COLORS[Math.abs(h) % CATEGORY_COLORS.length]
}

function dataKeyFor(name: string): string {
  return 'cat_' + name.replace(/[^a-zA-Z0-9]/g, '_')
}

export function CategoryTrend({ dateRange, categoryClick }: CategoryTrendProps) {
  const db = useDb()
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [granularity, setGranularity] = useState<Granularity>('1M')

  const allTransactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db])
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db])

  const daysDiff = useMemo(() => {
    return Math.ceil(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  }, [dateRange])

  useEffect(() => {
    if (daysDiff <= 35) setGranularity('1D')
    else if (daysDiff <= 120) setGranularity('1W')
    else setGranularity('1M')
  }, [daysDiff])

  // React to clicks from composition pie charts
  useEffect(() => {
    if (!categoryClick) return
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryClick.name)) next.delete(categoryClick.name)
      else next.add(categoryClick.name)
      return next
    })
  }, [categoryClick])

  const { categoriesMap, categoriesByName } = useMemo(() => {
    if (!categories) return { categoriesMap: new Map(), categoriesByName: new Map() }
    return buildCategoryMaps(categories)
  }, [categories])

  const transactions = useMemo(() => {
    if (!allTransactions) return []
    const startTs = dateRange.startDate.getTime()
    const endTs = dateRange.endDate.getTime()
    return allTransactions.filter(Boolean).filter((tx: Transaction) => {
      const ts = new Date(tx.date).getTime()
      if (isNaN(ts)) return false
      return ts >= startTs && ts <= endTs
    })
  }, [allTransactions, dateRange])

  const dataPoints = useMemo(() => {
    const { startDate, endDate } = dateRange
    const points: { key: string; label: string }[] = []

    if (granularity === '1D') {
      const cur = new Date(startDate)
      cur.setHours(0, 0, 0, 0)
      while (cur <= endDate) {
        points.push({ key: getBucketKey(cur, '1D'), label: getLabel(cur, '1D') })
        cur.setDate(cur.getDate() + 1)
      }
    } else if (granularity === '1W') {
      const cur = new Date(startDate)
      cur.setDate(cur.getDate() - cur.getDay())
      cur.setHours(0, 0, 0, 0)
      const seen = new Set<string>()
      while (cur <= endDate) {
        const key = getBucketKey(cur, '1W')
        if (!seen.has(key)) {
          seen.add(key)
          points.push({ key, label: getLabel(cur, '1W') })
        }
        cur.setDate(cur.getDate() + 7)
      }
    } else {
      const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      while (cur <= endDate) {
        points.push({ key: getBucketKey(cur, '1M'), label: getLabel(cur, '1M') })
        cur.setMonth(cur.getMonth() + 1)
      }
    }

    return points
  }, [dateRange, granularity])

  // Aggregate all expense + income transactions per category name
  const catBuckets = useMemo(() => {
    const result = new Map<string, Map<string, number>>()
    transactions
      .filter((tx: Transaction) => tx.transactionType === 'EXPENSE' || tx.transactionType === 'INCOME')
      .forEach((tx: Transaction) => {
        const resolved = resolveCategorySync(tx, categoriesMap, categoriesByName)
        const name = resolved.name
        const txDate = new Date(tx.date)
        if (isNaN(txDate.getTime())) return
        const key = getBucketKey(txDate, granularity)
        if (!result.has(name)) result.set(name, new Map())
        const m = result.get(name)!
        m.set(key, (m.get(key) || 0) + tx.amount)
      })
    return result
  }, [transactions, granularity, categoriesMap, categoriesByName])

  // Track which transaction type each category primarily belongs to
  const categoryTypeMap = useMemo(() => {
    const map = new Map<string, 'EXPENSE' | 'INCOME' | 'BOTH'>()
    transactions.forEach((tx: Transaction) => {
      if (tx.transactionType !== 'EXPENSE' && tx.transactionType !== 'INCOME') return
      const resolved = resolveCategorySync(tx, categoriesMap, categoriesByName)
      const type = tx.transactionType as 'EXPENSE' | 'INCOME'
      const existing = map.get(resolved.name)
      if (!existing) map.set(resolved.name, type)
      else if (existing !== type) map.set(resolved.name, 'BOTH')
    })
    return map
  }, [transactions, categoriesMap, categoriesByName])

  const categoriesWithData = useMemo(() => Array.from(catBuckets.keys()).sort(), [catBuckets])

  const expenseCategories = useMemo(
    () => categoriesWithData.filter(n => categoryTypeMap.get(n) === 'EXPENSE'),
    [categoriesWithData, categoryTypeMap]
  )
  const incomeCategories = useMemo(
    () => categoriesWithData.filter(n => categoryTypeMap.get(n) === 'INCOME'),
    [categoriesWithData, categoryTypeMap]
  )
  const bothCategories = useMemo(
    () => categoriesWithData.filter(n => categoryTypeMap.get(n) === 'BOTH'),
    [categoriesWithData, categoryTypeMap]
  )

  const trendData = useMemo(() => {
    return dataPoints.map(({ key, label }) => {
      const point: Record<string, any> = { label }
      selectedCategories.forEach(name => {
        point[dataKeyFor(name)] = parseFloat(
          (catBuckets.get(name)?.get(key) || 0).toFixed(2)
        )
      })
      return point
    })
  }, [dataPoints, selectedCategories, catBuckets])

  const averageLine = useMemo(() => {
    if (selectedCategories.size === 0) return null
    let total = 0
    const bucketsSeen = new Set<string>()
    transactions
      .filter((tx: Transaction) => tx.transactionType === 'EXPENSE' || tx.transactionType === 'INCOME')
      .forEach((tx: Transaction) => {
        const resolved = resolveCategorySync(tx, categoriesMap, categoriesByName)
        if (!selectedCategories.has(resolved.name)) return
        const txDate = new Date(tx.date)
        if (isNaN(txDate.getTime())) return
        total += tx.amount
        bucketsSeen.add(getBucketKey(txDate, granularity))
      })
    if (total === 0) return null
    return total / Math.max(bucketsSeen.size, 1)
  }, [transactions, selectedCategories, granularity, categoriesMap, categoriesByName])

  if (!allTransactions || !categories) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  const renderGroup = (names: string[], label: string, labelClass: string) => {
    if (names.length === 0) return null
    return (
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${labelClass}`}>{label}</span>
        {names.map(name => {
          const color = colorForName(name)
          const selected = selectedCategories.has(name)
          return (
            <button
              key={name}
              onClick={() =>
                setSelectedCategories(prev => {
                  const next = new Set(prev)
                  if (next.has(name)) next.delete(name)
                  else next.add(name)
                  return next
                })
              }
              className={`px-3 py-1 rounded text-sm font-medium transition border ${
                selected
                  ? 'text-white border-transparent'
                  : 'border-border hover:border-primary/50 text-foreground'
              }`}
              style={{
                borderColor: selected ? color : undefined,
                backgroundColor: selected ? color : 'transparent',
              }}
            >
              {name}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold">Category Trends</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select categories below, or click a slice in the Expense / Income Composition charts above.
          </p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['1D', '1W', '1M'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                granularity === g
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Category chips grouped by type */}
      {categoriesWithData.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No transactions in this period
        </div>
      ) : (
        <div className="space-y-2 mb-5">
          {renderGroup(expenseCategories, 'Expense', 'bg-red-100 text-red-700')}
          {renderGroup(incomeCategories, 'Income', 'bg-green-100 text-green-700')}
          {renderGroup(bothCategories, 'Both', 'bg-blue-100 text-blue-700')}
        </div>
      )}

      {categoriesWithData.length > 0 && selectedCategories.size === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Select one or more categories above to plot their trend.
        </div>
      )}

      {selectedCategories.size > 0 && (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any, name: string) => [`₹${Number(value).toLocaleString()}`, name]}
              contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
            />
            <Legend />
            {categoriesWithData
              .filter(name => selectedCategories.has(name))
              .map(name => {
                const color = colorForName(name)
                return (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={dataKeyFor(name)}
                    stroke={color}
                    fill={color}
                    fillOpacity={0.12}
                    name={name}
                    strokeWidth={2}
                    dot={{ r: 3, fill: color }}
                    activeDot={{ r: 6 }}
                  />
                )
              })}
            {averageLine != null && (
              <ReferenceLine
                y={averageLine}
                stroke="#999"
                strokeDasharray="5 5"
                label={{
                  value: `Avg: ₹${averageLine.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                  position: 'right',
                  fill: '#666',
                  fontSize: 12,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
