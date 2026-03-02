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

export function SubCategoryTrend({
  dateRange,
  selectedMainCategory,
}: SubCategoryTrendProps) {
  const [selectedSubCategories, setSelectedSubCategories] = useState<Set<number>>(
    new Set()
  )
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
    return categories.filter(c => c.parentId !== undefined && c.parentId !== null)
  }, [categories])

  // Filter transactions by date range
  const transactions = useMemo(() => {
    if (!allTransactions) return []
    const startTs = dateRange.startDate.getTime()
    const endTs = dateRange.endDate.getTime()

    return allTransactions.filter((tx: Transaction) => {
      const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date)
      const txTs = txDate.getTime()
      if (isNaN(txTs)) return false
      return txTs >= startTs && txTs <= endTs
    })
  }, [allTransactions, dateRange])

  // Get months in range
  const months = useMemo(() => {
    const m = []
    const current = new Date(dateRange.startDate)
    while (current <= dateRange.endDate) {
      m.push(new Date(current))
      current.setMonth(current.getMonth() + 1)
    }
    return m
  }, [dateRange])

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

  // Calculate monthly trend data
  const trendData = useMemo(() => {
    if (!transactions || !categories) return []

    const data: any[] = months.map((month) => ({
      month: month.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      monthDate: month,
    }))

    // For each sub-category, calculate monthly values
    subCategoriesWithData.forEach((subCat) => {
      const monthlyValues = new Map<string, number>()

      data.forEach((d) => {
        const month = d.monthDate
        const monthKey = month.toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
        })

        const amount = transactions
          .filter((tx: Transaction) => {
            const date = tx.date instanceof Date ? tx.date : new Date(tx.date)
            if (isNaN(date.getTime())) return false
            return (
              tx.subCategoryId === subCat.id &&
              date.getMonth() === month.getMonth() &&
              date.getFullYear() === month.getFullYear()
            )
          })
          .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0)

        monthlyValues.set(monthKey, amount)
      })

      // Add to data using category ID as key
      data.forEach((d) => {
        const monthKey = d.monthDate.toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
        })
        const value = monthlyValues.get(monthKey) || 0
        d[`subcat-${subCat.id}`] = parseFloat(value.toFixed(2))
      })
    })

    return data
  }, [transactions, categories, months, subCategoriesWithData])

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
        const date = tx.date instanceof Date ? tx.date : new Date(tx.date)
        return `${date.getFullYear()}-${date.getMonth()}`
      })
    ).size

    return total / Math.max(uniqueMonths, 1)
  }, [transactions, selectedSubCategories])

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
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedSubCategories(newSet)
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Sub-Category Trends</h3>

        {/* Sub-Category Selector */}
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
