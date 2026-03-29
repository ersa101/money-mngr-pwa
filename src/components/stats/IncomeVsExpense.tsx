'use client'

import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import type { Transaction } from '@/types/database';
import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type ChartType = 'line' | 'area' | 'stack'

interface IncomeVsExpenseProps {
  dateRange: { startDate: Date; endDate: Date }
}

function StackTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const income = payload.find((p: any) => p.dataKey === 'Income')?.value || 0
  const expense = payload.find((p: any) => p.dataKey === 'Expense')?.value || 0
  const total = income + expense
  const net = income - expense
  return (
    <div
      style={{
        backgroundColor: 'var(--background)',
        border: '1px solid var(--border)',
        padding: '12px',
        borderRadius: '8px',
        fontSize: 13,
      }}
    >
      <p className="font-semibold mb-2">{label}</p>
      <p style={{ color: '#10B981' }}>
        Income: ₹{income.toLocaleString()} ({total > 0 ? ((income / total) * 100).toFixed(1) : '0'}%)
      </p>
      <p style={{ color: '#EF4444' }}>
        Expense: ₹{expense.toLocaleString()} ({total > 0 ? ((expense / total) * 100).toFixed(1) : '0'}%)
      </p>
      <p style={{ color: net >= 0 ? '#3B82F6' : '#F97316', fontWeight: 600, marginTop: 6 }}>
        Net: {net >= 0 ? '+' : ''}₹{net.toLocaleString()}
      </p>
    </div>
  )
}

export function IncomeVsExpense({ dateRange }: IncomeVsExpenseProps) {
  const db = useDb()
  const [chartType, setChartType] = useState<ChartType>('stack')

  const allTransactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db])
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db])

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

  const monthlyData = useMemo(() => {
    if (!transactions || !categories) return []

    const monthMap = new Map<string, { income: number; expense: number }>()

    const current = new Date(dateRange.startDate)
    while (current <= dateRange.endDate) {
      const key = current.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
      monthMap.set(key, { income: 0, expense: 0 })
      current.setMonth(current.getMonth() + 1)
    }

    transactions.forEach((tx: Transaction) => {
      const date = new Date(tx.date)
      if (isNaN(date.getTime())) return
      const monthKey = date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
      if (monthMap.has(monthKey)) {
        const data = monthMap.get(monthKey)!
        if (tx.transactionType === 'INCOME') data.income += tx.amount
        else if (tx.transactionType === 'EXPENSE') data.expense += tx.amount
      }
    })

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

  const totalIncome = monthlyData.reduce((sum, m) => sum + m.Income, 0)
  const totalExpense = monthlyData.reduce((sum, m) => sum + m.Expense, 0)
  const netIncome = totalIncome - totalExpense

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-6">
        {/* Title + chart type toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold">Income vs Expense</h3>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(['line', 'area', 'stack'] as const).map(ct => (
              <button
                key={ct}
                onClick={() => setChartType(ct)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  chartType === ct
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {ct === 'line' ? 'Line' : ct === 'area' ? 'Area' : 'Stack'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 dark:bg-green-950 rounded p-3 border border-green-200 dark:border-green-800">
            <p className="text-xs text-muted-foreground">Total Income</p>
            <p className="text-lg font-bold text-green-600">₹{totalIncome.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950 rounded p-3 border border-red-200 dark:border-red-800">
            <p className="text-xs text-muted-foreground">Total Expense</p>
            <p className="text-lg font-bold text-red-600">₹{totalExpense.toLocaleString()}</p>
          </div>
          <div
            className={`rounded p-3 border ${
              netIncome >= 0
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
            }`}
          >
            <p className="text-xs text-muted-foreground">Net Income</p>
            <p className={`text-lg font-bold ${netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {netIncome >= 0 ? '' : '-'}₹{Math.abs(netIncome).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Line chart */}
      {chartType === 'line' && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
              contentStyle={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--border)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Income"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Expense"
              stroke="#EF4444"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Net"
              stroke="#3B82F6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Area chart: income and expense as filled areas — overlap shows surplus/deficit */}
      {chartType === 'area' && (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
              contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
            />
            <Legend />
            <Area type="monotone" dataKey="Income" name="Income"
              stroke="#10B981" strokeWidth={2} fill="url(#colorIncome)" dot={false} activeDot={{ r: 5 }} />
            <Area type="monotone" dataKey="Expense" name="Expense"
              stroke="#EF4444" strokeWidth={2} fill="url(#colorExpense)" dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Stack chart */}
      {chartType === 'stack' && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<StackTooltip />} />
            <Legend />
            <Bar dataKey="Income" name="Income" stackId="a" fill="#10B981" />
            <Bar dataKey="Expense" name="Expense" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
