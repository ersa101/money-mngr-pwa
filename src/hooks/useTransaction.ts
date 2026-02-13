import { useCallback, useState } from 'react'
import { db, type Account, type Transaction } from '../lib/db'
import { ActionLogger } from '../lib/actionLogger'

export type CreateTransactionInput = {
  fromAccountId: number
  toCategoryId?: number
  toAccountId?: number
  amount: number
  description: string
  date: Date
  isTransfer: boolean
  transactionType?: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  smsRaw?: string
  category?: string
  subCategory?: string
  note?: string
}

export type TransactionPreview = {
  fromAccount: Account | null
  newBalance: number
  safeBalance: number
  isAboveThreshold: boolean
  thresholdValue: number
}

export function useTransaction() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTransaction = useCallback(
    async (input: CreateTransactionInput): Promise<{ success: boolean; id?: number; error?: string }> => {
      setLoading(true)
      setError(null)

      try {
        // Get the source account
        const fromAccount = await db.accounts.get(input.fromAccountId)
        if (!fromAccount) {
          throw new Error('Source account not found')
        }

        // Validate recipient
        const txType = input.transactionType || (input.isTransfer ? 'TRANSFER' : 'EXPENSE')

        if (input.isTransfer && !input.toAccountId) {
          throw new Error('Destination account must be specified for transfers')
        }

        if (!input.isTransfer && txType === 'EXPENSE' && !input.toCategoryId) {
          throw new Error('Category must be specified for expenses')
        }

        // Create the transaction record
        const transaction: Transaction = {
          date: input.date.toISOString(), // Store as ISO string for CSV serialization
          amount: input.amount,
          fromAccountId: input.fromAccountId,
          toCategoryId: input.toCategoryId,
          toAccountId: input.toAccountId,
          description: input.description,
          isTransfer: input.isTransfer,
          transactionType: txType,
          smsRaw: input.smsRaw,
          category: input.category,
          subCategory: input.subCategory,
          note: input.note
        }

        let txId: number | undefined

        // Use a Dexie transaction for ACID guarantees
        await db.transaction('rw', db.accounts, db.transactions, async () => {
          // 1. Insert the transaction
          txId = await db.transactions.add(transaction)

          // 2. Update balances depending on transaction type
          if (input.isTransfer) {
            // Debit source
            const updatedBalance = fromAccount.balance - input.amount
            await db.accounts.update(input.fromAccountId, { balance: updatedBalance })

            // Credit destination
            if (input.toAccountId) {
              const toAccount = await db.accounts.get(input.toAccountId)
              if (!toAccount) {
                throw new Error('Destination account not found')
              }
              const toUpdatedBalance = toAccount.balance + input.amount
              await db.accounts.update(input.toAccountId, { balance: toUpdatedBalance })
            }
          } else if (txType === 'INCOME') {
            // Credit source account for income
            const updatedBalance = fromAccount.balance + input.amount
            await db.accounts.update(input.fromAccountId, { balance: updatedBalance })
          } else {
            // Expense: debit source account
            const updatedBalance = fromAccount.balance - input.amount
            await db.accounts.update(input.fromAccountId, { balance: updatedBalance })
          }
        })

        setLoading(false)
        // Log transaction creation
        if (txId) {
          ActionLogger.transactionCreate(txId, input.amount, input.description)
        }
        return { success: true, id: txId }
      } catch (err: any) {
        const errorMsg = err?.message || String(err)
        setError(errorMsg)
        setLoading(false)
        return { success: false, error: errorMsg }
      }
    },
    []
  )

  const getThresholdPreview = useCallback(async (accountId: number, spendAmount: number): Promise<TransactionPreview | null> => {
    try {
      const account = await db.accounts.get(accountId)
      if (!account) return null

      const newBalance = account.balance - spendAmount
      const safeBalance = newBalance - account.thresholdValue
      const isAboveThreshold = newBalance >= account.thresholdValue

      return {
        fromAccount: account,
        newBalance,
        safeBalance,
        isAboveThreshold,
        thresholdValue: account.thresholdValue
      }
    } catch (err) {
      console.error('Error getting threshold preview:', err)
      return null
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { createTransaction, getThresholdPreview, loading, error, clearError }
}

export default useTransaction
