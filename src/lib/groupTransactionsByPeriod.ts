import type { Transaction } from '@/types/database'

export type PeriodGrouping =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semi-annual'
  | 'annual'
  | 'none'

export interface TransactionGroup {
  /** Sortable string key (e.g. "2026-03", "2026-Q1", "2026") */
  key: string
  /** Human-readable label (e.g. "March 2026", "Q1 2026") */
  label: string
  transactions: Transaction[]
  totalIncome: number
  totalExpense: number
  /** net = totalIncome - totalExpense (transfers are excluded) */
  net: number
}

/**
 * Returns the sort key and display label for a date under the given grouping.
 * Exported so that components can derive labels without re-grouping.
 */
export function getGroupKeyAndLabel(
  date: Date,
  grouping: PeriodGrouping
): { key: string; label: string } {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  switch (grouping) {
    case 'daily': {
      const key = date.toISOString().split('T')[0] // YYYY-MM-DD
      const today = new Date()
      const todayKey = today.toISOString().split('T')[0]
      const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
      const yesterdayKey = yesterday.toISOString().split('T')[0]

      let label: string
      if (key === todayKey) {
        label = 'Today'
      } else if (key === yesterdayKey) {
        label = 'Yesterday'
      } else {
        label = date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: year !== today.getFullYear() ? 'numeric' : undefined,
        })
      }
      return { key, label }
    }

    case 'weekly': {
      // Week starts on Sunday
      const weekStart = new Date(year, month, day - date.getDay())
      const weekEnd = new Date(year, month, day - date.getDay() + 6)
      const key = weekStart.toISOString().split('T')[0]
      const label = `${weekStart.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} – ${weekEnd.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
      return { key, label }
    }

    case 'monthly': {
      const key = `${year}-${String(month + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
      return { key, label }
    }

    case 'quarterly': {
      const quarter = Math.floor(month / 3) + 1
      const key = `${year}-Q${quarter}`
      const label = `Q${quarter} ${year}`
      return { key, label }
    }

    case 'semi-annual': {
      const half = month < 6 ? 1 : 2
      const key = `${year}-H${half}`
      const label = `H${half} ${year}`
      return { key, label }
    }

    case 'annual': {
      const key = String(year)
      const label = String(year)
      return { key, label }
    }

    default:
      return { key: 'all', label: 'All Transactions' }
  }
}

/**
 * Groups an array of transactions by the given period.
 * Transactions with invalid dates are silently skipped.
 * Returns an array of groups in insertion order (chronological if transactions
 * are sorted, which they typically are from Dexie's orderBy('date')).
 *
 * Returns an empty array when grouping is 'none'.
 */
export function groupTransactionsByPeriod(
  transactions: Transaction[],
  grouping: PeriodGrouping
): TransactionGroup[] {
  if (grouping === 'none' || transactions.length === 0) return []

  const groups = new Map<string, TransactionGroup>()

  for (const txn of transactions) {
    const date = new Date(txn.date)
    if (isNaN(date.getTime())) continue

    const { key, label } = getGroupKeyAndLabel(date, grouping)

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label,
        transactions: [],
        totalIncome: 0,
        totalExpense: 0,
        net: 0,
      })
    }

    const group = groups.get(key)!
    group.transactions.push(txn)

    if (txn.transactionType === 'INCOME') {
      group.totalIncome += txn.amount
      group.net += txn.amount
    } else if (txn.transactionType === 'EXPENSE') {
      group.totalExpense += txn.amount
      group.net -= txn.amount
    }
    // TRANSFER: counted in neither income nor expense totals
  }

  return Array.from(groups.values())
}
