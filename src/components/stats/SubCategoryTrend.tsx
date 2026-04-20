'use client'

import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import type { Transaction, Category } from '@/types/database';
import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { SubCategorySelector } from './SubCategorySelector'

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
]

type Granularity = '1D' | '1W' | '1M'

const getWeekMonday = (d: Date) => {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

export function SubCategoryTrend({
  dateRange,
  selectedMainCategory,
}: SubCategoryTrendProps) {
  const [selectedSubCategories, setSelectedSubCategories] = useState<Set<number>>(
    new Set()
  )
  const [granularity, setGranularity] = useState<Granularity>('1M')
  const db = useDb()

  // Fetch all transactions and filter by date range
  const allTransactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db])

  // Fetch categories
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db])

  // Build category lookup map
  const categoryMap = useMemo(() => {
    if (!categories) return new Map<number, Category>()
    return new Map(categories.map(c => [c.id!, c]))
  }, [categories])

  // Get subcategories (categories with parentId)
  const subCategoriesList = useMemo(() => {
    if (!categories) return []
    return categories.filter(Boolean).filter(c => c.parentId !== undefined && c.parentId !== null)
  }, [categories])

  // Filter transactions by date range
  const transactions = useMemo(() => {
    if (!allTransactions) return []
    const startTs = dateRange.startDate.getTime()
    const endTs = dateRange.endDate.getTime()

    return allTransactions.filter(Boolean).filter((tx: Transaction) => {
      const txDate = new Date(tx.date)
      const txTs = txDate.getTime()
      if (isNaN(txTs)) return false
      return txTs >= startTs && txTs <= endTs
    })
  }, [allTransactions, dateRange])

  // Get buckets in range based on granularity
  const buckets = useMemo(() => {
    const result: Date[] = []
    if (granularity === '1D') {
      const cur = new Date(dateRange.startDate); cur.setHours(0, 0, 0, 0)
      const end = new Date(dateRange.endDate)
      while (cur <= end) { result.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
    } else if (granularity === '1W') {
      const cur = getWeekMonday(dateRange.startDate)
      const end = new Date(dateRange.endDate)
      while (cur <= end) { result.push(new Date(cur)); cur.setDate(cur.getDate() + 7) }
    } else {
      const cur = new Date(dateRange.startDate)
      while (cur <= dateRange.endDate) { result.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1) }
    }
    return result
  }, [dateRange, granularity])

  // Get unique sub-categories from transactions that have subCategoryId
  const subCategoriesWithData = useMemo(() => {
    if (!transactions || !categories) return []

    const subCatIds = new Set<number>()
    transactions.forEach((tx: Transaction) => {
      if (tx.subCategoryId && tx.transactionType === 'EXPENSE') {
        subCatIds.add(tx.subCategoryId)
      }
    })

    // Return categories that have transaction data
    return subCategoriesList
      .filter(c => c.id && subCatIds.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [transactions, categories, subCategoriesList])

  // Calculate trend data bucketed by granularity
  const trendData = useMemo(() => {
    if (!transactions || !categories) return []

    const bucketIso = (d: Date) => {
      if (granularity === '1D') return d.toISOString().slice(0, 10)
      if (granularity === '1W') return getWeekMonday(d).toISOString().slice(0, 10)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }

    const bucketLabel = (d: Date) => {
      if (granularity === '1D') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      if (granularity === '1W') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    }

    const data: any[] = buckets.map((b) => ({
      month: bucketLabel(b),
      bucketIso: bucketIso(b),
    }))

    // Pre-build a map of bucketIso -> row index
    const isoToIdx = new Map(data.map((d, i) => [d.bucketIso, i]))

    subCategoriesWithData.forEach((subCat) => {
      // Init all rows to 0
      data.forEach(d => { d[`subcat-${subCat.id}`] = 0 })

      transactions
        .filter((tx: Transaction) => tx.subCategoryId === subCat.id)
        .forEach((tx: Transaction) => {
          const date = new Date(tx.date)
          if (isNaN(date.getTime())) return
          const iso = bucketIso(date)
          const idx = isoToIdx.get(iso)
          if (idx !== undefined) {
            data[idx][`subcat-${subCat.id}`] = parseFloat(
              (data[idx][`subcat-${subCat.id}`] + tx.amount).toFixed(2)
            )
          }
        })
    })

    return data
  }, [transactions, categories, buckets, subCategoriesWithData, granularity])

  // Calculate average line
  const averageLine = useMemo(() => {
    if (!transactions || selectedSubCategories.size === 0) return null

    const selectedTxs = transactions.filter((tx: Transaction) =>
      tx.subCategoryId && selectedSubCategories.has(tx.subCategoryId)
    )

    if (selectedTxs.length === 0) return null

    const total = selectedTxs.reduce((sum: number, tx: Transaction) => sum + tx.amount, 0)
    const uniqueMonths = new Set(
      selectedTxs.map((tx: Transaction) => {
        const date = new Date(tx.date)
        return granularity === '1D'
          ? date.toISOString().slice(0, 10)
          : granularity === '1W'
            ? getWeekMonday(date).toISOString().slice(0, 10)
            : `${date.getFullYear()}-${date.getMonth()}`
      })
    ).size

    return total / Math.max(uniqueMonths, 1)
  }, [transactions, selectedSubCategories, granularity])

  if (!transactions || !categories) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  if (subCategoriesWithData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 ">Sub-Category Trends</h3>
        <div className="text-center py-8 text-muted-foreground">
          No sub-categories available in this period
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Sub-Category Trends</h3>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['1D', '1W', '1M'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  granularity === g
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-Category Selector — searchable multi-select */}
        <SubCategorySelector
          subCategories={subCategoriesWithData}
          parentCategories={(categories ?? []).filter(c => !c.parentId)}
          selected={selectedSubCategories}
          onChange={setSelectedSubCategories}
        />
      </div>

      {selectedSubCategories.size > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any) => `₹${value.toLocaleString()}`}
              contentStyle={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--border)',
              }}
            />
            <Legend />

            {/* Render lines for selected sub-categories */}
            {subCategoriesWithData
              .filter(c => c.id && selectedSubCategories.has(c.id))
              .map((subCat, idx) => (
                <Line
                  key={subCat.id}
                  type="monotone"
                  dataKey={`subcat-${subCat.id}`}
                  stroke={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                  name={subCat.name}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}

            {/* Average line */}
            {averageLine && (
              <ReferenceLine
                y={averageLine}
                stroke="#999"
                strokeDasharray="5 5"
                label={{
                  value: `Avg: ₹${averageLine.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}`,
                  position: 'right',
                  fill: '#666',
                  fontSize: 12,
                }}
              />
            )}
          </LineChart>
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
