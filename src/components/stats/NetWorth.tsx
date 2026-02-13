'use client'

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type PeriodType = 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'custom'

interface NetWorthProps {
  dateRange: { startDate: Date; endDate: Date }
  period?: PeriodType
}

export function NetWorth({ dateRange, period = 'monthly' }: NetWorthProps) {
  // Fetch accounts
  const accounts = useLiveQuery(() => db.accounts.toArray(), [])

  // Fetch all transactions
  const allTransactions = useLiveQuery(() => db.transactions.toArray(), [])

  // Calculate the number of days in the range to determine granularity
  const daysDiff = useMemo(() => {
    const diffTime = Math.abs(dateRange.endDate.getTime() - dateRange.startDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }, [dateRange])

  // Determine data point granularity based on period
  // Monthly: show by month (if range spans multiple months) or by week
  // Quarterly: show by month
  // Semi-annual: show by month
  // Annual: show by month
  const getDataPoints = useMemo(() => {
    const points: Date[] = []
    const current = new Date(dateRange.startDate)

    // For monthly period with small range (< 35 days), show weekly points
    if (period === 'monthly' && daysDiff <= 35) {
      // Show weekly data points
      while (current <= dateRange.endDate) {
        points.push(new Date(current))
        current.setDate(current.getDate() + 7)
      }
      // Always include the end date
      if (points.length === 0 || points[points.length - 1].getTime() < dateRange.endDate.getTime()) {
        points.push(new Date(dateRange.endDate))
      }
    } else {
      // Show monthly data points (last day of each month or range endpoints)
      // Start with the first day
      points.push(new Date(current))

      // Move to end of first month
      current.setMonth(current.getMonth() + 1)
      current.setDate(0) // Last day of previous month

      while (current < dateRange.endDate) {
        points.push(new Date(current))
        // Move to end of next month
        current.setMonth(current.getMonth() + 2)
        current.setDate(0)
      }

      // Always include the end date
      points.push(new Date(dateRange.endDate))
    }

    return points
  }, [dateRange, period, daysDiff])

  // Helper to convert date to comparable timestamp
  const getDateTimestamp = (d: Date | string): number => {
    const date = d instanceof Date ? d : new Date(d)
    return isNaN(date.getTime()) ? 0 : date.getTime()
  }

  // Format date label based on period
  const formatDateLabel = (date: Date): string => {
    if (period === 'monthly' && daysDiff <= 35) {
      // For weekly view within a month, show day
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    }
    // For longer periods, show month and year
    return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
  }

  // Calculate net worth history
  const netWorthData = useMemo(() => {
    if (!accounts || !allTransactions) return []

    // Filter accounts that should be included in net worth
    const includedAccounts = accounts.filter(acc => acc.includeInNetWorth !== false)

    // Set day end timestamp for comparison (end of day)
    const getDayEnd = (day: Date): number => {
      const d = new Date(day)
      d.setHours(23, 59, 59, 999)
      return d.getTime()
    }

    return getDataPoints.map((day) => {
      let totalAssets = 0
      let totalLiabilities = 0
      const dayEndTs = getDayEnd(day)

      // Calculate balance for each account as of this day
      includedAccounts.forEach((account) => {
        let balance = account.balance

        // Replay transactions backward from current balance
        allTransactions.forEach((tx) => {
          const txTs = getDateTimestamp(tx.date)
          if (txTs > dayEndTs) {
            // This transaction happened after our day, so we need to reverse it
            // For expense: fromAccount decreased, so we add back
            // For income: fromAccount increased, so we subtract back
            if (tx.fromAccountId === account.id) {
              if (tx.transactionType === 'EXPENSE' || tx.transactionType === 'TRANSFER') {
                balance += tx.amount // Reverse the deduction
              } else if (tx.transactionType === 'INCOME') {
                balance -= tx.amount // Reverse the addition
              }
            }
            // If it went to this account as a transfer, reverse the credit
            if (tx.toAccountId === account.id && tx.transactionType === 'TRANSFER') {
              balance -= tx.amount // Reverse the addition
            }
          }
        })

        // Categorize as asset or liability based on isLiability flag or negative balance
        if (account.isLiability) {
          // For liability accounts, the balance represents what you owe
          totalLiabilities += Math.abs(balance)
        } else if (balance < 0) {
          // Negative balance on non-liability account is also a liability
          totalLiabilities += Math.abs(balance)
        } else {
          totalAssets += balance
        }
      })

      return {
        date: formatDateLabel(day),
        fullDate: day.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
        netWorth: parseFloat((totalAssets - totalLiabilities).toFixed(2)),
        assets: parseFloat(totalAssets.toFixed(2)),
        liabilities: parseFloat(totalLiabilities.toFixed(2)),
      }
    })
  }, [accounts, allTransactions, getDataPoints, period, daysDiff])

  if (!accounts || !allTransactions) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  if (netWorthData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    )
  }

  const currentNetWorth = netWorthData[netWorthData.length - 1]?.netWorth || 0
  const currentAssets = netWorthData[netWorthData.length - 1]?.assets || 0
  const currentLiabilities = netWorthData[netWorthData.length - 1]?.liabilities || 0
  const previousNetWorth = netWorthData[0]?.netWorth || 0
  const netWorthChange = currentNetWorth - previousNetWorth
  const changePercent =
    previousNetWorth !== 0
      ? ((netWorthChange / previousNetWorth) * 100).toFixed(1)
      : '0'

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Net Worth Trend</h3>

        {/* Net Worth Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 dark:bg-blue-950 rounded p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-muted-foreground mb-1">Current Net Worth</p>
            <p className={`text-2xl font-bold ${currentNetWorth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ₹{currentNetWorth.toLocaleString()}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded p-4 border border-green-200 dark:border-green-800">
            <p className="text-xs text-muted-foreground mb-1">Total Assets</p>
            <p className="text-2xl font-bold text-green-600">
              ₹{currentAssets.toLocaleString()}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950 rounded p-4 border border-red-200 dark:border-red-800">
            <p className="text-xs text-muted-foreground mb-1">Total Liabilities</p>
            <p className="text-2xl font-bold text-red-600">
              ₹{currentLiabilities.toLocaleString()}
            </p>
          </div>
          <div
            className={`rounded p-4 border ${
              netWorthChange >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
                : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
            }`}
          >
            <p className="text-xs text-muted-foreground mb-1">Period Change</p>
            <p
              className={`text-2xl font-bold ${
                netWorthChange >= 0 ? 'text-emerald-600' : 'text-orange-600'
              }`}
            >
              {netWorthChange >= 0 ? '+' : ''}₹{netWorthChange.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">({changePercent}%)</p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={netWorthData}>
          <defs>
            <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: any) => `₹${value.toLocaleString()}`}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload
              return item?.fullDate ? `Date: ${item.fullDate}` : `Date: ${label}`
            }}
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
            }}
          />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="#10B981"
            fillOpacity={1}
            fill="url(#colorNetWorth)"
            name="Net Worth"
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Explanation */}
      <div className="mt-6 p-4 bg-muted rounded border border-border">
        <p className="text-sm text-muted-foreground">
          <strong>Net Worth</strong> is the sum of all your account balances. It's the single most important metric for long-term financial health. A steadily increasing net worth indicates you're building wealth over time.
        </p>
      </div>
    </div>
  )
}
