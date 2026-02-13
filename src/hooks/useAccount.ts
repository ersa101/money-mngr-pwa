import { useState, useCallback } from 'react'
import { db, Account } from '@/lib/db'

export function useAccount() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createAccount = useCallback(async (account: Omit<Account, 'id'>) => {
    setLoading(true)
    setError(null)
    try {
      const id = await db.accounts.add(account)
      return id
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create account'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateAccount = useCallback(async (id: number, updates: Partial<Account>) => {
    setLoading(true)
    setError(null)
    try {
      await db.accounts.update(id, updates)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update account'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteAccount = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      // Check if account has transactions
      const transactionCount = await db.transactions
        .where('fromAccountId')
        .equals(id)
        .count()

      if (transactionCount > 0) {
        throw new Error(
          `Cannot delete account with ${transactionCount} transaction(s). Delete transactions first.`
        )
      }

      await db.accounts.delete(id)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete account'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getAccountById = useCallback(async (id: number) => {
    try {
      return await db.accounts.get(id)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch account'
      setError(errorMsg)
      throw err
    }
  }, [])

  return {
    createAccount,
    updateAccount,
    deleteAccount,
    getAccountById,
    loading,
    error,
  }
}
