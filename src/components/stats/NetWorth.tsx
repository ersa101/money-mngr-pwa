'use client'

import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import { useMemo, useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

type PeriodType = 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'custom'

interface NetWorthProps {
  dateRange: { startDate: Date; endDate: Date }
  period?: PeriodType
}

export function NetWorth({ dateRange, period = 'monthly' }: NetWorthProps) {
  const db = useDb()

  // Fetch accounts
  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db])

  // Fetch all transactions
  const allTransactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db])

  // Calculate the number of days in the range to determine granularity
  const daysDiff = useMemo(() => {
    const diffTime = Math.abs(dateRange.endDate.getTime() - dateRange.startDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }, [dateRange])

  // X-axis granularity: user-selectable like a trading chart (1D, 1W, 1M)
  type Granularity = '1D' | '1W' | '1M'
  const [granularity, setGranularity] = useState<Granularity>('1W')

  // Auto-set a sensible default whenever the date range changes
  useEffect(() => {
    if (daysDiff <= 35) setGranularity('1D')
    else if (daysDiff <= 120) setGranularity('1W')
    else setGranularity('1M')
  }, [daysDiff])

  // Build the list of data-point dates based on the chosen granularity
  const getDataPoints = useMemo(() => {
    const points: Date[] = []
    const { startDate, endDate } = dateRange

    if (granularity === '1D') {
      // One point per calendar day
      const current = new Date(startDate)
      while (current <= endDate) {
        points.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
    } else if (granularity === '1W') {
      // One point per week
      const current = new Date(startDate)
      while (current <= endDate) {
        points.push(new Date(current))
        current.setDate(current.getDate() + 7)
      }
      // Always cap with the actual end date for accuracy
      if (points.length === 0 || points[points.length - 1].getTime() < endDate.getTime()) {
        points.push(new Date(endDate))
      }
    } else {
      // '1M': one point per calendar month (end-of-month)
      const current = new Date(startDate)
      points.push(new Date(current)) // start anchor

      // Advance to end of first month
      current.setMonth(current.getMonth() + 1)
      current.setDate(0)

      while (current < endDate) {
        points.push(new Date(current))
        current.setMonth(current.getMonth() + 2)
        current.setDate(0)
      }
      points.push(new Date(endDate)) // end anchor
    }

    return points
  }, [dateRange, granularity])

  // Helper to convert date to comparable timestamp
  const getDateTimestamp = (d: Date | string): number => {
    const date = d instanceof Date ? d : new Date(d)
    return isNaN(date.getTime()) ? 0 : date.getTime()
  }

  // Format x-axis label based on granularity
  const formatDateLabel = (date: Date): string => {
    if (granularity === '1D' || granularity === '1W') {
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    }
    // '1M': show month + 2-digit year
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
  }, [accounts, allTransactions, getDataPoints, granularity])

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
        {/* Title row + granularity picker */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Net Worth Trend</h3>
          {/* Scale selector — like trading chart intervals */}
          <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1">
            {(['1D', '1W', '1M'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  granularity === g
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

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
        <LineChart data={netWorthData}>
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
          <Legend />

          {/* Net Worth - Purple */}
          <Line
            type="monotone"
            dataKey="netWorth"
            name="Net Worth"
            stroke="#8B5CF6"
            strokeWidth={2}
            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={true}
          />

          {/* Assets - Green */}
          <Line
            type="monotone"
            dataKey="assets"
            name="Assets"
            stroke="#22C55E"
            strokeWidth={2}
            dot={{ fill: '#22C55E', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={true}
          />

          {/* Liabilities - Red */}
          <Line
            type="monotone"
            dataKey="liabilities"
            name="Liabilities"
            stroke="#EF4444"
            strokeWidth={2}
            dot={{ fill: '#EF4444', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={true}
          />
        </LineChart>
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
