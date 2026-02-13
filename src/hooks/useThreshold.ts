import { useMemo } from 'react'
import { Account, ThresholdWarning } from '../lib/db'

export function useThreshold(account: Account, proposedExpense?: number): ThresholdWarning {
  return useMemo(() => {
    const balance = account.balance
    const threshold = account.thresholdValue
    const afterExpense = proposedExpense ? balance - proposedExpense : balance
    const spendable = afterExpense - threshold

    const percentRemaining = (spendable / threshold) * 100

    let status: 'SAFE' | 'WARNING' | 'CRITICAL'
    let message: string

    if (percentRemaining > 50) {
      status = 'SAFE'
      message = `You have ₹${spendable.toLocaleString()} safe to spend`
    } else if (percentRemaining > 20) {
      status = 'WARNING'
      message = `⚠️ Only ₹${spendable.toLocaleString()} left above threshold`
    } else {
      status = 'CRITICAL'
      message = `🚨 This will put you ₹${Math.abs(spendable).toLocaleString()} below your threshold!`
    }

    return {
      accountId: account.id!,
      accountName: account.name,
      currentBalance: balance,
      threshold,
      spendableAmount: spendable,
      status,
      message
    }
  }, [account, proposedExpense])
}
