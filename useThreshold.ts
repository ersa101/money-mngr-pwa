/**
 * useThreshold Hook
 * 
 * Calculates real-time threshold warnings for account balance management.
 * Prevents accidental overspending by showing spendable amount after accounting for threshold.
 * 
 * @module hooks/useThreshold
 * @priority CRITICAL - Phase 1, Sprint 2
 */

import { useMemo } from 'react'

/**
 * Account interface (import from your types file)
 * 
 * NOTE TO CLAUDE CODE: Import this from your actual types file
 * Example: import { Account } from '@/types'
 */
export interface Account {
  id?: number
  name: string
  type: 'BANK' | 'CASH' | 'WALLET' | 'INVESTMENT'
  balance: number
  thresholdValue: number
  icon?: string
  color?: string
  group?: string
  isHeader?: boolean
}

/**
 * Threshold warning status
 */
export type ThresholdStatus = 'SAFE' | 'WARNING' | 'CRITICAL'

/**
 * Threshold warning result
 */
export interface ThresholdWarning {
  /** Account ID */
  accountId: number
  
  /** Account name (for display) */
  accountName: string
  
  /** Current account balance */
  currentBalance: number
  
  /** Minimum safe balance threshold */
  threshold: number
  
  /** Spendable amount (balance - threshold - proposedExpense) */
  spendableAmount: number
  
  /** Balance after proposed expense (if any) */
  balanceAfterExpense: number
  
  /** Warning status */
  status: ThresholdStatus
  
  /** User-friendly message */
  message: string
  
  /** Color code for UI */
  color: {
    text: string
    bg: string
    border: string
  }
  
  /** Icon emoji for status */
  icon: string
  
  /** Percentage of threshold remaining (for progress bars) */
  percentRemaining: number
  
  /** Whether transaction should be blocked */
  shouldBlock: boolean
}

/**
 * Hook for real-time threshold calculations
 * 
 * @param account - Account object
 * @param proposedExpense - Optional expense amount to factor in (default: 0)
 * @returns Threshold warning with status and messages
 * 
 * @example
 * ```tsx
 * const account = { id: 1, name: 'HDFC', balance: 10000, thresholdValue: 2000 }
 * const warning = useThreshold(account, 5000)
 * 
 * console.log(warning.spendableAmount) // 3000 (10000 - 5000 - 2000)
 * console.log(warning.status) // 'WARNING'
 * console.log(warning.message) // '⚠️ Only ₹3,000 left above threshold'
 * ```
 */
export function useThreshold(
  account: Account,
  proposedExpense: number = 0
): ThresholdWarning {
  return useMemo(() => {
    // Extract values
    const balance = account.balance
    const threshold = account.thresholdValue
    const balanceAfterExpense = balance - proposedExpense
    const spendableAmount = balanceAfterExpense - threshold
    
    // Calculate percentage remaining
    // percentRemaining > 100% means very safe (balance >> threshold)
    // percentRemaining = 100% means exactly at threshold
    // percentRemaining < 100% means below threshold
    const percentRemaining = threshold > 0 
      ? (spendableAmount / threshold) * 100 
      : 100
    
    // Determine status based on percentage remaining
    let status: ThresholdStatus
    let message: string
    let color: { text: string; bg: string; border: string }
    let icon: string
    let shouldBlock: boolean = false
    
    if (spendableAmount < 0) {
      // CRITICAL: Would go below threshold
      status = 'CRITICAL'
      icon = '🚨'
      shouldBlock = true
      
      const deficit = Math.abs(spendableAmount)
      message = proposedExpense > 0
        ? `This will put you ₹${deficit.toLocaleString()} below your threshold!`
        : `You are ₹${deficit.toLocaleString()} below your threshold`
      
      color = {
        text: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500'
      }
      
    } else if (percentRemaining <= 20) {
      // CRITICAL: Very close to threshold (0-20% remaining)
      status = 'CRITICAL'
      icon = '🚨'
      shouldBlock = true
      
      message = proposedExpense > 0
        ? `Only ₹${spendableAmount.toLocaleString()} left above threshold! This is too close.`
        : `Only ₹${spendableAmount.toLocaleString()} above threshold (${Math.round(percentRemaining)}%)`
      
      color = {
        text: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500'
      }
      
    } else if (percentRemaining <= 50) {
      // WARNING: Approaching threshold (20-50% remaining)
      status = 'WARNING'
      icon = '⚠️'
      shouldBlock = false
      
      message = proposedExpense > 0
        ? `Only ₹${spendableAmount.toLocaleString()} left above threshold (${Math.round(percentRemaining)}%)`
        : `Getting close to threshold: ₹${spendableAmount.toLocaleString()} spendable`
      
      color = {
        text: 'text-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500'
      }
      
    } else {
      // SAFE: Well above threshold (>50% remaining)
      status = 'SAFE'
      icon = '✅'
      shouldBlock = false
      
      message = proposedExpense > 0
        ? `You'll have ₹${spendableAmount.toLocaleString()} safe to spend after this`
        : `You have ₹${spendableAmount.toLocaleString()} safe to spend`
      
      color = {
        text: 'text-green-500',
        bg: 'bg-green-500/10',
        border: 'border-green-500'
      }
    }
    
    return {
      accountId: account.id!,
      accountName: account.name,
      currentBalance: balance,
      threshold,
      spendableAmount,
      balanceAfterExpense,
      status,
      message,
      color,
      icon,
      percentRemaining,
      shouldBlock
    }
  }, [account, proposedExpense])
}

/**
 * Utility function to format currency
 * 
 * NOTE TO CLAUDE CODE: Move this to src/lib/utils.ts if it doesn't exist
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Utility function to calculate spendable amount
 * Standalone function for use outside React components
 */
export function calculateSpendable(
  balance: number,
  threshold: number,
  proposedExpense: number = 0
): number {
  return balance - proposedExpense - threshold
}

/**
 * Utility function to get status color classes
 * Returns Tailwind CSS classes for given status
 */
export function getStatusColors(status: ThresholdStatus): {
  text: string
  bg: string
  border: string
} {
  switch (status) {
    case 'CRITICAL':
      return {
        text: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500'
      }
    case 'WARNING':
      return {
        text: 'text-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500'
      }
    case 'SAFE':
    default:
      return {
        text: 'text-green-500',
        bg: 'bg-green-500/10',
        border: 'border-green-500'
      }
  }
}

/**
 * USAGE EXAMPLES
 * 
 * Example 1: In transaction entry modal
 * ```tsx
 * function AddTransactionModal() {
 *   const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
 *   const [amount, setAmount] = useState(0)
 *   
 *   const warning = useThreshold(selectedAccount, amount)
 *   
 *   return (
 *     <div>
 *       <input
 *         type="number"
 *         value={amount}
 *         onChange={(e) => setAmount(Number(e.target.value))}
 *       />
 *       
 *       <div className={warning.color.bg + ' ' + warning.color.border}>
 *         {warning.icon} {warning.message}
 *       </div>
 *       
 *       <button disabled={warning.shouldBlock}>
 *         {warning.shouldBlock ? 'Cannot Proceed' : 'Record Transaction'}
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 * 
 * Example 2: In account card
 * ```tsx
 * function AccountCard({ account }: { account: Account }) {
 *   const warning = useThreshold(account)
 *   
 *   return (
 *     <div className={`border-l-4 ${warning.color.border}`}>
 *       <h3>{account.name}</h3>
 *       <p>Balance: {formatCurrency(account.balance)}</p>
 *       <p className={warning.color.text}>
 *         {warning.icon} Spendable: {formatCurrency(warning.spendableAmount)}
 *       </p>
 *       
 *       <ProgressBar
 *         value={warning.percentRemaining}
 *         color={warning.status}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
