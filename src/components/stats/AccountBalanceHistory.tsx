'use client'

import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import type { Transaction } from '@/types/database';
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
  Area,
  AreaChart,
} from 'recharts'

interface AccountBalanceHistoryProps {
  dateRange: { startDate: Date; endDate: Date }
}

type Granularity = '1D' | '1W' | '1M'

export function AccountBalanceHistory({
  dateRange,
}: AccountBalanceHistoryProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [granularity, setGranularity] = useState<Granularity>('1M')
  const db = useDb()

  // Fetch accounts
  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db])

  // Fetch all transactions
  const allTransactionsData = useLiveQuery(() => db?.transactions.toArray() ?? [], [db])

  // Get transactions for selected account
  const allTransactions = useMemo(() => {
    if (!allTransactionsData || !selectedAccountId) return []
    return allTransactionsData.filter(
      (tx) => tx.fromAccountId === selectedAccountId || tx.toAccountId === selectedAccountId
    )
  }, [allTransactionsData, selectedAccountId])

  // Helper to convert date to timestamp
  const getDateTs = (d: Date | string): number => {
    const date = d instanceof Date ? d : new Date(d)
    return isNaN(date.getTime()) ? 0 : date.getTime()
  }

  // Calculate balance history by replaying transactions
  const balanceHistory = useMemo(() => {
    if (
      !accounts ||
      !allTransactions ||
      selectedAccountId === null
    ) {
      return []
    }

    const account = accounts.filter(Boolean).find((a) => a.id === selectedAccountId)
    if (!account) return []

    // Get all days in range
    const days: Date[] = []
    const current = new Date(dateRange.startDate)
    while (current <= dateRange.endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    // Calculate balance at each day by replaying from current balance backward
    const history = days.map((day) => {
      const dayEndTs = new Date(day).setHours(23, 59, 59, 999)

      // Start with current balance
      let balance = account.balance

      // For each transaction after this day, reverse its effect
      allTransactions.forEach((tx) => {
        const txTs = getDateTs(tx.date)
        if (txTs > dayEndTs) {
          // This transaction happened after our target day, reverse it
          if (tx.fromAccountId === selectedAccountId) {
            // Money left this account
            if (tx.transactionType === 'EXPENSE' || tx.transactionType === 'TRANSFER') {
              balance += tx.amount // Add it back
            } else if (tx.transactionType === 'INCOME') {
              balance -= tx.amount // Remove the income
            }
          }
          if (tx.toAccountId === selectedAccountId && tx.transactionType === 'TRANSFER') {
            // Money came to this account via transfer
            balance -= tx.amount // Remove it
          }
        }
      })

      return {
        date: day.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        dateObj: day,
        balance: parseFloat(balance.toFixed(2)),
      }
    })

    return history
  }, [accounts, allTransactions, selectedAccountId, dateRange])

  const sampledHistory = useMemo(() => {
    if (!balanceHistory.length || granularity === '1D') return balanceHistory
    const bucketKey = (d: Date) => granularity === '1W'
      ? Math.floor((d.getTime() - dateRange.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
      : d.getFullYear() * 100 + d.getMonth()
    const map = new Map<number, typeof balanceHistory[0]>()
    balanceHistory.forEach(p => map.set(bucketKey(p.dateObj), p))
    return Array.from(map.values())
  }, [balanceHistory, granularity, dateRange.startDate])

  if (!accounts) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No accounts available
      </div>
    )
  }

  const selectedAccount = selectedAccountId
    ? accounts.filter(Boolean).find((a) => a.id === selectedAccountId)
    : null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Account Balance History</h3>
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

        {/* Account Selector */}
        <div className="flex flex-wrap gap-2">
          {accounts.filter(Boolean).map((account) => (
            <button
              key={`account-btn-${account.id}`}
              onClick={() => setSelectedAccountId(account.id || null)}
              className={`px-4 py-2 rounded font-medium transition border ${
                selectedAccountId === account.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary/50 text-foreground'
              }`}
            >
              {account.name}
            </button>
          ))}
        </div>
      </div>

      {selectedAccount && balanceHistory.length > 0 && (
        <div>
          {/* Current Balance */}
          <div className="mb-4 p-4 bg-muted rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">
              Current Balance ({selectedAccount.name})
            </p>
            <p className="text-2xl font-bold">
              ₹{selectedAccount.balance.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Threshold: ₹{selectedAccount.thresholdValue.toLocaleString()} | Safe Balance: ₹
              {(selectedAccount.balance - selectedAccount.thresholdValue).toLocaleString()}
            </p>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={sampledHistory}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
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
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorBalance)"
                name="Balance"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {selectedAccountId === null && (
        <div className="text-center py-8 text-muted-foreground">
          Select an account to view balance history
        </div>
      )}
    </div>
  )
}
