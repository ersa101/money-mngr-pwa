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
  Area,
  AreaChart,
} from 'recharts'

interface AccountBalanceHistoryProps {
  dateRange: { startDate: Date; endDate: Date }
}

export function AccountBalanceHistory({
  dateRange,
}: AccountBalanceHistoryProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)

  // Fetch accounts
  const accounts = useLiveQuery(() => db.accounts.toArray(), [])

  // Fetch all transactions
  const allTransactionsData = useLiveQuery(() => db.transactions.toArray(), [])

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

    const account = accounts.find((a) => a.id === selectedAccountId)
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
    ? accounts.find((a) => a.id === selectedAccountId)
    : null

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Account Balance History</h3>

        {/* Account Selector */}
        <div className="flex flex-wrap gap-2">
          {accounts.map((account) => (
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
            <AreaChart data={balanceHistory}>
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
