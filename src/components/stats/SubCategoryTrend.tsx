'use client'

import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import type { Transaction, Category } from '@/types/database';
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

interface SubCategoryTrendProps {
  dateRange: { startDate: Date; endDate: Date }
  selectedMainCategory?: number | null
}

const CATEGORY_COLORS = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
]

type Granularity = '1D' | '1W' | '1M'

function getBucketKey(date: Date, gran: Granularity): string {
  if (gran === '1D') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  if (gran === '1W') {
    const d = new Date(date)
    d.setDate(d.getDate() - d.getDay()) // align to Sunday
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

export function SubCategoryTrend({
  dateRange,
  selectedMainCategory,
}: SubCategoryTrendProps) {
  const [selectedSubCategories, setSelectedSubCategories] = useState<Set<number>>(new Set())
  const [granularity, setGranularity] = useState<Granularity>('1M')
  const db = useDb()

  const allTransactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db])
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db])

  // Auto-set granularity based on date range span
  const daysDiff = useMemo(() => {
    return Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
  }, [dateRange])

  useEffect(() => {
    if (daysDiff <= 35) setGranularity('1D')
    else if (daysDiff <= 120) setGranularity('1W')
    else setGranularity('1M')
  }, [daysDiff])

  // Build category lookup map
  const categoryMap = useMemo(() => {
    if (!categories) return new Map<number, Category>()
    return new Map(categories.map(c => [c.id!, c]))
  }, [categories])

  // Subcategories (categories with parentId)
  const subCategoriesList = useMemo(() => {
    if (!categories) return []
    return categories.filter(c => c.parentId !== undefined && c.parentId !== null)
  }, [categories])

  // Filter transactions by date range
  const transactions = useMemo(() => {
    if (!allTransactions) return []
    const startTs = dateRange.startDate.getTime()
    const endTs = dateRange.endDate.getTime()
    return allTransactions.filter((tx: Transaction) => {
      const txDate = new Date(tx.date)
      const txTs = txDate.getTime()
      if (isNaN(txTs)) return false
      return txTs >= startTs && txTs <= endTs
    })
  }, [allTransactions, dateRange])

  // Data points for x-axis based on granularity
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
      cur.setDate(cur.getDate() - cur.getDay()) // align to Sunday
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

  // Get subcategories that have expense transactions in this period
  const subCategoriesWithData = useMemo(() => {
    if (!transactions || !categories) return []
    const subCatIds = new Set<number>()
    transactions.forEach((tx: Transaction) => {
      if (tx.subCategoryId && tx.transactionType === 'EXPENSE') {
        subCatIds.add(tx.subCategoryId)
      }
    })
    return subCategoriesList
      .filter(c => c.id && subCatIds.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [transactions, categories, subCategoriesList])

  // Pre-aggregate: subCatId → bucketKey → amount
  const subcatBuckets = useMemo(() => {
    const result = new Map<number, Map<string, number>>()
    transactions.forEach((tx: Transaction) => {
      if (!tx.subCategoryId || tx.transactionType !== 'EXPENSE') return
      const txDate = new Date(tx.date)
      if (isNaN(txDate.getTime())) return
      const key = getBucketKey(txDate, granularity)
      if (!result.has(tx.subCategoryId)) result.set(tx.subCategoryId, new Map())
      const catMap = result.get(tx.subCategoryId)!
      catMap.set(key, (catMap.get(key) || 0) + tx.amount)
    })
    return result
  }, [transactions, granularity])

  // Build chart data points
  const trendData = useMemo(() => {
    return dataPoints.map(({ key, label }) => {
      const point: Record<string, any> = { month: label }
      subCategoriesWithData.forEach(subCat => {
        point[`subcat-${subCat.id}`] = parseFloat(
          (subcatBuckets.get(subCat.id!)?.get(key) || 0).toFixed(2)
        )
      })
      return point
    })
  }, [dataPoints, subCategoriesWithData, subcatBuckets])

  // Average line across selected subcategories
  const averageLine = useMemo(() => {
    if (!transactions || selectedSubCategories.size === 0) return null
    const selectedTxs = transactions.filter(
      (tx: Transaction) => tx.subCategoryId && selectedSubCategories.has(tx.subCategoryId) && tx.transactionType === 'EXPENSE'
    )
    if (selectedTxs.length === 0) return null
    const total = selectedTxs.reduce((sum: number, tx: Transaction) => sum + tx.amount, 0)
    const uniqueBuckets = new Set(
      selectedTxs.map((tx: Transaction) => {
        const d = new Date(tx.date)
        return isNaN(d.getTime()) ? '' : getBucketKey(d, granularity)
      }).filter(Boolean)
    ).size
    return total / Math.max(uniqueBuckets, 1)
  }, [transactions, selectedSubCategories, granularity])

  if (!transactions || !categories) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  if (subCategoriesWithData.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">Sub-Category Trends</h3>
        <div className="text-center py-8 text-muted-foreground">
          No sub-categories available in this period
        </div>
      </div>
    )
  }

  const toggleSubCategory = (id: number) => {
    const newSet = new Set(selectedSubCategories)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedSubCategories(newSet)
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-6">
        {/* Title row + granularity selector */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Sub-Category Trends</h3>
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

        {/* Sub-Category selector chips */}
        <div className="flex flex-wrap gap-2">
          {subCategoriesWithData.map((cat, idx) => (
            <button
              key={cat.id}
              onClick={() => toggleSubCategory(cat.id!)}
              className={`px-3 py-1 rounded text-sm font-medium transition border ${
                selectedSubCategories.has(cat.id!)
                  ? 'text-white border-transparent'
                  : 'border-border hover:border-primary/50 text-foreground'
              }`}
              style={{
                borderColor: selectedSubCategories.has(cat.id!)
                  ? CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                  : undefined,
                backgroundColor: selectedSubCategories.has(cat.id!)
                  ? CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                  : 'transparent',
              }}
            >
              {cat.icon || '📁'} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {selectedSubCategories.size > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any) => `₹${value.toLocaleString()}`}
              contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
            />
            <Legend />

            {subCategoriesWithData
              .filter(c => c.id && selectedSubCategories.has(c.id))
              .map((subCat, idx) => {
                const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                return (
                  <Area
                    key={subCat.id}
                    type="monotone"
                    dataKey={`subcat-${subCat.id}`}
                    stroke={color}
                    fill={color}
                    fillOpacity={0.12}
                    name={subCat.name}
                    strokeWidth={2}
                    dot={{ r: 3, fill: color }}
                    activeDot={{ r: 6 }}
                  />
                )
              })}

            {averageLine && (
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

      {selectedSubCategories.size === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Click a sub-category above to view its trend
        </div>
      )}
    </div>
  )
}
