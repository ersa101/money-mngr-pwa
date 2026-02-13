'use client'

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Transaction } from '@/lib/db';
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
  const [selectedSubCategories, setSelectedSubCategories] = useState<Set<string>>(
    new Set()
  )

  // Fetch all transactions and filter by date range
  const allTransactions = useLiveQuery(() => db.transactions.toArray(), [])

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

  // Fetch categories
  const categories = useLiveQuery(() => db.categories.toArray(), [])

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

  // Get unique sub-categories from transactions
  const subCategories = useMemo(() => {
    if (!transactions) return []
    const subCatSet = new Set<string>()
    transactions.forEach((tx: Transaction) => {
      if (tx.subCategory && tx.transactionType === 'EXPENSE') {
        subCatSet.add(tx.subCategory)
      }
    })
    return Array.from(subCatSet).sort()
  }, [transactions])

  // Calculate monthly trend data
  const trendData = useMemo(() => {
    if (!transactions) return []

    const data: any[] = months.map((month) => ({
      month: month.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      monthDate: month,
    }))

    // For each sub-category, calculate monthly values
    subCategories.forEach((subCat) => {
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
              tx.subCategory === subCat &&
              date.getMonth() === month.getMonth() &&
              date.getFullYear() === month.getFullYear()
            )
          })
          .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0)

        monthlyValues.set(monthKey, amount)
      })

      // Add to data
      data.forEach((d) => {
        const monthKey = d.monthDate.toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
        })
        const value = monthlyValues.get(monthKey) || 0
        d[`subcat-${subCat}`] = parseFloat(value.toFixed(2))
      })
    })

    return data
  }, [transactions, months, subCategories])

  // Calculate 12-month average
  const averageLine = useMemo(() => {
    if (!transactions || selectedSubCategories.size === 0) return null

    const selectedTxs = transactions.filter((tx: Transaction) =>
      selectedSubCategories.has(tx.subCategory || '')
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

  if (!transactions) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  if (subCategories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No sub-categories available in this period
      </div>
    )
  }

  const toggleSubCategory = (name: string) => {
    const newSet = new Set(selectedSubCategories)
    if (newSet.has(name)) {
      newSet.delete(name)
    } else {
      newSet.add(name)
    }
    setSelectedSubCategories(newSet)
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Sub-Category Trends</h3>

        {/* Sub-Category Selector */}
        <div className="flex flex-wrap gap-2">
          {subCategories.map((cat, idx) => (
            <button
              key={cat}
              onClick={() => toggleSubCategory(cat)}
              className={`px-3 py-1 rounded text-sm font-medium transition border ${
                selectedSubCategories.has(cat)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary/50 text-foreground'
              }`}
              style={{
                borderColor: selectedSubCategories.has(cat)
                  ? CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                  : undefined,
                backgroundColor: selectedSubCategories.has(cat)
                  ? CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                  : 'transparent',
              }}
            >
              {cat}
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
            {Array.from(selectedSubCategories).map((subCat, idx) => (
              <Line
                key={subCat}
                type="monotone"
                dataKey={`subcat-${subCat}`}
                stroke={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                name={subCat}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}

            {/* 12-month average line */}
            {averageLine && (
              <ReferenceLine
                y={averageLine}
                stroke="#999"
                strokeDasharray="5 5"
                label={{
                  value: `12mo Avg: ₹${averageLine.toLocaleString(undefined, {
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
          Click a category to view trends
        </div>
      )}
    </div>
  )
}
