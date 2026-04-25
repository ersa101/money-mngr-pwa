'use client'

import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import { useMemo, useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

type PeriodType = 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'custom'
type Granularity = '1D' | '1W' | '1M'
type ChartType = 'line' | 'area' | 'stack'

interface NetWorthProps {
  dateRange: { startDate: Date; endDate: Date }
  period?: PeriodType
}

// Custom tooltip for stacked bar view
function StackTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const assets = payload.find((p: any) => p.dataKey === 'assets')?.value || 0
  const liabilities = payload.find((p: any) => p.dataKey === 'liabilities')?.value || 0
  const total = assets + liabilities
  const netWorth = assets - liabilities
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
      <p style={{ color: '#22C55E' }}>
        Assets: ₹{assets.toLocaleString()} ({total > 0 ? ((assets / total) * 100).toFixed(1) : '0'}%)
      </p>
      <p style={{ color: '#EF4444' }}>
        Liabilities: ₹{liabilities.toLocaleString()} ({total > 0 ? ((liabilities / total) * 100).toFixed(1) : '0'}%)
      </p>
      <p style={{ color: '#8B5CF6', fontWeight: 600, marginTop: 6 }}>
        Net Worth: ₹{netWorth.toLocaleString()}
      </p>
    </div>
  )
}

export function NetWorth({ dateRange, period = 'monthly' }: NetWorthProps) {
  const db = useDb()
  const [granularity, setGranularity] = useState<Granularity>('1M')
  const [chartType, setChartType] = useState<ChartType>('line')

  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db])
  const allTransactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db])

  const daysDiff = useMemo(() => {
    const diffTime = Math.abs(dateRange.endDate.getTime() - dateRange.startDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }, [dateRange])

  useEffect(() => {
    if (daysDiff <= 35) setGranularity('1D')
    else if (daysDiff <= 120) setGranularity('1W')
    else setGranularity('1M')
  }, [daysDiff])

  const getDataPoints = useMemo(() => {
    const points: Date[] = []
    const { startDate, endDate } = dateRange

    if (granularity === '1D') {
      const current = new Date(startDate)
      while (current <= endDate) {
        points.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
    } else if (granularity === '1W') {
      const current = new Date(startDate)
      while (current <= endDate) {
        points.push(new Date(current))
        current.setDate(current.getDate() + 7)
      }
      if (points.length === 0 || points[points.length - 1].getTime() < endDate.getTime()) {
        points.push(new Date(endDate))
      }
    } else {
      const current = new Date(startDate)
      points.push(new Date(current))
      current.setMonth(current.getMonth() + 1)
      current.setDate(0)
      while (current < endDate) {
        points.push(new Date(current))
        current.setMonth(current.getMonth() + 2)
        current.setDate(0)
      }
      points.push(new Date(endDate))
    }

    return points
  }, [dateRange, granularity])

  const getDateTimestamp = (d: Date | string): number => {
    const date = d instanceof Date ? d : new Date(d)
    return isNaN(date.getTime()) ? 0 : date.getTime()
  }

  const formatDateLabel = (date: Date): string => {
    if (granularity === '1D' || granularity === '1W') {
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    }
    return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
  }

  const netWorthData = useMemo(() => {
    if (!accounts || !allTransactions) return []

    const includedAccounts = accounts.filter(Boolean).filter(acc => acc.includeInNetWorth !== false)

    const getDayEnd = (day: Date): number => {
      const d = new Date(day)
      d.setHours(23, 59, 59, 999)
      return d.getTime()
    }

    const safeTransactions = allTransactions.filter(Boolean)

    return getDataPoints.map((day) => {
      let totalAssets = 0
      let totalLiabilities = 0
      const dayEndTs = getDayEnd(day)

      includedAccounts.forEach((account) => {
        let balance = account.balance

        safeTransactions.forEach((tx) => {
          const txTs = getDateTimestamp(tx.date)
          if (txTs > dayEndTs) {
            if (tx.fromAccountId === account.id) {
              if (tx.transactionType === 'EXPENSE' || tx.transactionType === 'TRANSFER') {
                balance += tx.amount
              } else if (tx.transactionType === 'INCOME') {
                balance -= tx.amount
              }
            }
            if (tx.toAccountId === account.id && tx.transactionType === 'TRANSFER') {
              balance -= tx.amount
            }
          }
        })

        if (account.isLiability) {
          totalLiabilities += Math.abs(balance)
        } else if (balance < 0) {
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

  const hasIncludedAccounts = useMemo(() => {
    if (!accounts) return true
    return accounts.filter(Boolean).some(acc => acc.includeInNetWorth !== false)
  }, [accounts])

  if (!accounts || !allTransactions) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  if (!hasIncludedAccounts) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Net Worth Trend</h3>
        <div className="text-center py-8 space-y-2">
          <p className="text-muted-foreground">No accounts are included in the net worth calculation.</p>
          <p className="text-sm text-muted-foreground">
            Go to <strong>Accounts</strong> and enable the net worth toggle for at least one account.
          </p>
        </div>
      </div>
    )
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
    previousNetWorth !== 0 ? ((netWorthChange / previousNetWorth) * 100).toFixed(1) : '0'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        {/* Title row + controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold">Net Worth Trend</h3>
          <div className="flex gap-2">
            {/* Chart type toggle */}
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
            {/* Granularity selector */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['1D', '1W', '1M'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    granularity === g
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 dark:bg-blue-950 rounded p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-muted-foreground mb-1">Current Net Worth</p>
            <p className={`text-2xl font-bold ${currentNetWorth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ₹{currentNetWorth.toLocaleString()}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded p-4 border border-green-200 dark:border-green-800">
            <p className="text-xs text-muted-foreground mb-1">Total Assets</p>
            <p className="text-2xl font-bold text-green-600">₹{currentAssets.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950 rounded p-4 border border-red-200 dark:border-red-800">
            <p className="text-xs text-muted-foreground mb-1">Total Liabilities</p>
            <p className="text-2xl font-bold text-red-600">₹{currentLiabilities.toLocaleString()}</p>
          </div>
          <div
            className={`rounded p-4 border ${
              netWorthChange >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
                : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
            }`}
          >
            <p className="text-xs text-muted-foreground mb-1">Period Change</p>
            <p className={`text-2xl font-bold ${netWorthChange >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
              {netWorthChange >= 0 ? '+' : ''}₹{netWorthChange.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">({changePercent}%)</p>
          </div>
        </div>
      </div>

      {/* Line chart: liabilities on secondary Y-axis so it stays visible at scale */}
      {chartType === 'line' && (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={netWorthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any, name: string) => [`₹${Number(value).toLocaleString()}`, name]}
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
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="netWorth"
              name="Net Worth"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={true}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="assets"
              name="Assets"
              stroke="#22C55E"
              strokeWidth={2}
              dot={{ fill: '#22C55E', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive={true}
            />
            <Line
              yAxisId="right"
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
      )}

      {/* Area chart: filled areas — assets (green) and net worth (purple) on left axis, liabilities (red) on right */}
      {chartType === 'area' && (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={netWorthData}>
            <defs>
              <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any, name: string) => [`₹${Number(value).toLocaleString()}`, name]}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload
                return item?.fullDate ? `Date: ${item.fullDate}` : `Date: ${label}`
              }}
              contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
            />
            <Legend />
            <Area yAxisId="left" type="monotone" dataKey="assets" name="Assets"
              stroke="#22C55E" strokeWidth={2} fill="url(#colorAssets)" dot={false} activeDot={{ r: 5 }} />
            <Area yAxisId="left" type="monotone" dataKey="netWorth" name="Net Worth"
              stroke="#8B5CF6" strokeWidth={2} fill="url(#colorNetWorth)" dot={false} activeDot={{ r: 5 }} />
            <Area yAxisId="right" type="monotone" dataKey="liabilities" name="Liabilities"
              stroke="#EF4444" strokeWidth={2} fill="url(#colorLiabilities)" dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Stack chart: assets + liabilities stacked to show composition vs time */}
      {chartType === 'stack' && (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={netWorthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<StackTooltip />} />
            <Legend />
            <Bar dataKey="assets" name="Assets" stackId="a" fill="#22C55E" />
            <Bar dataKey="liabilities" name="Liabilities" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="mt-6 p-4 bg-muted rounded border border-border">
        <p className="text-sm text-muted-foreground">
          <strong>Net Worth</strong> = Assets − Liabilities. In Stack view, bar height shows the combined gross scale;
          hover to see each value and its percentage contribution.
        </p>
      </div>
    </div>
  )
}
