'use client'

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Transaction } from '@/lib/db';
import { useState, useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

interface CategoryCompositionProps {
  dateRange: { startDate: Date; endDate: Date }
}

const COLORS = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
]

export function CategoryComposition({ dateRange }: CategoryCompositionProps) {
  const [transactionType, setTransactionType] = useState<'EXPENSE' | 'INCOME'>(
    'EXPENSE'
  )
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  // Fetch all transactions and filter by date range
  const allTransactions = useLiveQuery(() => db.transactions.toArray(), [])

  // Fetch categories
  const categories = useLiveQuery(() => db.categories.toArray(), [])

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

  // Calculate category breakdown using transactionType and category field
  const categoryData = useMemo(() => {
    if (!transactions || !categories) return []

    const categoryMap = new Map<string, number>()

    // Sum amounts by category where transaction type matches
    transactions.forEach((tx: Transaction) => {
      // Use transactionType field for filtering
      if (tx.transactionType === transactionType) {
        // Use category field from CSV import, or fall back to toCategoryId
        const categoryName = tx.category || (tx.toCategoryId ? categories.find((c) => c.id === tx.toCategoryId)?.name : 'Unknown') || 'Unknown'
        const current = categoryMap.get(categoryName) || 0
        categoryMap.set(categoryName, current + tx.amount)
      }
    })

    // Convert to chart data
    return Array.from(categoryMap.entries())
      .map(([name, amount], index) => ({
        id: index,
        name,
        value: parseFloat(amount.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value)
  }, [transactions, categories, transactionType])

  if (!transactions || !categories) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  if (categoryData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No {transactionType.toLowerCase()} data for this period
      </div>
    )
  }

  const total = categoryData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Category Composition</h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setTransactionType('EXPENSE')
              setSelectedCategory(null)
            }}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              transactionType === 'EXPENSE'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => {
              setTransactionType('INCOME')
              setSelectedCategory(null)
            }}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              transactionType === 'INCOME'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Income
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={categoryData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            onClick={(entry) =>
              setSelectedCategory(
                selectedCategory === entry.id ? null : entry.id
              )
            }
          >
            {categoryData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                opacity={
                  selectedCategory === null || selectedCategory === entry.id
                    ? 1
                    : 0.3
                }
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any) => `₹${value.toLocaleString()}`}
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Category List */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2">
        {categoryData.map((cat, index) => (
          <div
            key={`cat-${cat.id}-${index}`}
            onClick={() =>
              setSelectedCategory(
                selectedCategory === cat.id ? null : cat.id
              )
            }
            className={`p-3 rounded border cursor-pointer transition ${
              selectedCategory === cat.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{cat.name}</p>
                <p className="text-xs text-muted-foreground">
                  ₹{cat.value.toLocaleString()} (
                  {((cat.value / total) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
