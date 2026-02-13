'use client'

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Transaction } from '@/lib/db';
import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface IncomeVsExpenseProps {
  dateRange: { startDate: Date; endDate: Date }
}

export function IncomeVsExpense({ dateRange }: IncomeVsExpenseProps) {
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

  // Calculate monthly breakdown
  const monthlyData = useMemo(() => {
    if (!transactions || !categories) return []

    const monthMap = new Map<string, { income: number; expense: number }>()

    // Get all months in range
    const current = new Date(dateRange.startDate)
    while (current <= dateRange.endDate) {
      const key = current.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
      })
      monthMap.set(key, { income: 0, expense: 0 })
      current.setMonth(current.getMonth() + 1)
    }

    // Sum transactions by month and type (use transactionType field)
    transactions.forEach((tx: Transaction) => {
      const date = tx.date instanceof Date ? tx.date : new Date(tx.date)
      if (isNaN(date.getTime())) return

      const monthKey = date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
      })

      if (monthMap.has(monthKey)) {
        const data = monthMap.get(monthKey)!
        if (tx.transactionType === 'INCOME') {
          data.income += tx.amount
        } else if (tx.transactionType === 'EXPENSE') {
          data.expense += tx.amount
        }
        // Transfers don't count as income or expense
      }
    })

    // Convert to chart data
    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      Income: parseFloat(data.income.toFixed(2)),
      Expense: parseFloat(data.expense.toFixed(2)),
      Net: parseFloat((data.income - data.expense).toFixed(2)),
    }))
  }, [transactions, categories, dateRange])

  if (!transactions || !categories) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  if (monthlyData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No transaction data for this period
      </div>
    )
  }

  // Calculate totals
  const totalIncome = monthlyData.reduce((sum, m) => sum + m.Income, 0)
  const totalExpense = monthlyData.reduce((sum, m) => sum + m.Expense, 0)
  const netIncome = totalIncome - totalExpense

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Income vs Expense</h3>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 dark:bg-green-950 rounded p-3 border border-green-200 dark:border-green-800">
            <p className="text-xs text-muted-foreground">Total Income</p>
            <p className="text-lg font-bold text-green-600">
              ₹{totalIncome.toLocaleString()}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950 rounded p-3 border border-red-200 dark:border-red-800">
            <p className="text-xs text-muted-foreground">Total Expense</p>
            <p className="text-lg font-bold text-red-600">
              ₹{totalExpense.toLocaleString()}
            </p>
          </div>
          <div
            className={`rounded p-3 border ${
              netIncome >= 0
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
            }`}
          >
            <p className="text-xs text-muted-foreground">Net Income</p>
            <p
              className={`text-lg font-bold ${
                netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}
            >
              ₹{netIncome.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={monthlyData}>
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
          <Bar dataKey="Income" fill="#10B981" radius={[8, 8, 0, 0]} />
          <Bar dataKey="Expense" fill="#EF4444" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
