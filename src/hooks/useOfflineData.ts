// Hook for offline-first data access
// Reads from IndexedDB first, syncs with cloud in background
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  localDb,
  createEntity,
  updateEntity,
  deleteEntity,
  getByUserId,
  type Account,
  type Category,
  type Transaction,
  type AccountType,
  type AccountGroup,
} from '@/lib/indexedDb'
import { debouncedSync } from '@/lib/sync'

// ============= Accounts =============

export function useOfflineAccounts(userId: string | null | undefined) {
  const accounts = useLiveQuery(
    async () => {
      if (!userId) return []
      return localDb.accounts
        .where('userId')
        .equals(userId)
        .filter(a => !a.deletedAt)
        .toArray()
    },
    [userId],
    []
  )

  const addAccount = useCallback(
    async (data: Omit<Account, 'id' | 'localId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'syncStatus' | 'lastSyncedAt' | 'userId'>) => {
      if (!userId) throw new Error('User ID required')
      const account = await createEntity(localDb.accounts, 'accounts', data as any, userId)
      debouncedSync()
      return account
    },
    [userId]
  )

  const updateAccount = useCallback(
    async (id: string, updates: Partial<Account>) => {
      const updated = await updateEntity(localDb.accounts, 'accounts', id, updates)
      debouncedSync()
      return updated
    },
    []
  )

  const deleteAccount = useCallback(
    async (id: string) => {
      const result = await deleteEntity(localDb.accounts, 'accounts', id)
      debouncedSync()
      return result
    },
    []
  )

  return {
    accounts: accounts || [],
    addAccount,
    updateAccount,
    deleteAccount,
    isLoading: accounts === undefined,
  }
}

// ============= Categories =============

export function useOfflineCategories(userId: string | null | undefined) {
  const categories = useLiveQuery(
    async () => {
      if (!userId) return []
      return localDb.categories
        .where('userId')
        .equals(userId)
        .filter(c => !c.deletedAt)
        .toArray()
    },
    [userId],
    []
  )

  const addCategory = useCallback(
    async (data: Omit<Category, 'id' | 'localId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'syncStatus' | 'lastSyncedAt' | 'userId'>) => {
      if (!userId) throw new Error('User ID required')
      const category = await createEntity(localDb.categories, 'categories', data as any, userId)
      debouncedSync()
      return category
    },
    [userId]
  )

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Category>) => {
      const updated = await updateEntity(localDb.categories, 'categories', id, updates)
      debouncedSync()
      return updated
    },
    []
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      const result = await deleteEntity(localDb.categories, 'categories', id)
      debouncedSync()
      return result
    },
    []
  )

  // Get expense and income categories separately
  const expenseCategories = (categories || []).filter(c => c.type === 'EXPENSE')
  const incomeCategories = (categories || []).filter(c => c.type === 'INCOME')

  return {
    categories: categories || [],
    expenseCategories,
    incomeCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    isLoading: categories === undefined,
  }
}

// ============= Transactions =============

export function useOfflineTransactions(userId: string | null | undefined) {
  const transactions = useLiveQuery(
    async () => {
      if (!userId) return []
      return localDb.transactions
        .where('userId')
        .equals(userId)
        .filter(t => !t.deletedAt)
        .toArray()
    },
    [userId],
    []
  )

  const addTransaction = useCallback(
    async (data: Omit<Transaction, 'id' | 'localId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'syncStatus' | 'lastSyncedAt' | 'userId'>) => {
      if (!userId) throw new Error('User ID required')

      // Start a transaction for atomicity
      return localDb.transaction('rw', [localDb.transactions, localDb.accounts], async () => {
        // Create the transaction record
        const transaction = await createEntity(localDb.transactions, 'transactions', data as any, userId)

        // Update account balances based on transaction type
        if (data.transactionType === 'EXPENSE' && data.fromAccountId) {
          const account = await localDb.accounts.where('id').equals(data.fromAccountId).first()
          if (account) {
            await updateEntity(localDb.accounts, 'accounts', data.fromAccountId, {
              balance: account.balance - data.amount,
            })
          }
        } else if (data.transactionType === 'INCOME' && data.toAccountId) {
          const account = await localDb.accounts.where('id').equals(data.toAccountId).first()
          if (account) {
            await updateEntity(localDb.accounts, 'accounts', data.toAccountId, {
              balance: account.balance + data.amount,
            })
          }
        } else if (data.transactionType === 'TRANSFER' && data.fromAccountId && data.toAccountId) {
          const fromAccount = await localDb.accounts.where('id').equals(data.fromAccountId).first()
          const toAccount = await localDb.accounts.where('id').equals(data.toAccountId).first()

          if (fromAccount) {
            await updateEntity(localDb.accounts, 'accounts', data.fromAccountId, {
              balance: fromAccount.balance - data.amount,
            })
          }
          if (toAccount) {
            await updateEntity(localDb.accounts, 'accounts', data.toAccountId, {
              balance: toAccount.balance + data.amount,
            })
          }
        }

        debouncedSync()
        return transaction
      })
    },
    [userId]
  )

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>) => {
      const updated = await updateEntity(localDb.transactions, 'transactions', id, updates)
      debouncedSync()
      return updated
    },
    []
  )

  const deleteTransaction = useCallback(
    async (id: string) => {
      // Get the transaction first to reverse balance changes
      const transaction = await localDb.transactions.where('id').equals(id).first()

      if (transaction) {
        return localDb.transaction('rw', [localDb.transactions, localDb.accounts], async () => {
          // Reverse balance changes
          if (transaction.transactionType === 'EXPENSE' && transaction.fromAccountId) {
            const account = await localDb.accounts.where('id').equals(transaction.fromAccountId).first()
            if (account) {
              await updateEntity(localDb.accounts, 'accounts', transaction.fromAccountId, {
                balance: account.balance + transaction.amount,
              })
            }
          } else if (transaction.transactionType === 'INCOME' && transaction.toAccountId) {
            const account = await localDb.accounts.where('id').equals(transaction.toAccountId).first()
            if (account) {
              await updateEntity(localDb.accounts, 'accounts', transaction.toAccountId, {
                balance: account.balance - transaction.amount,
              })
            }
          } else if (transaction.transactionType === 'TRANSFER' && transaction.fromAccountId && transaction.toAccountId) {
            const fromAccount = await localDb.accounts.where('id').equals(transaction.fromAccountId).first()
            const toAccount = await localDb.accounts.where('id').equals(transaction.toAccountId).first()

            if (fromAccount) {
              await updateEntity(localDb.accounts, 'accounts', transaction.fromAccountId, {
                balance: fromAccount.balance + transaction.amount,
              })
            }
            if (toAccount) {
              await updateEntity(localDb.accounts, 'accounts', transaction.toAccountId, {
                balance: toAccount.balance - transaction.amount,
              })
            }
          }

          // Delete the transaction
          const result = await deleteEntity(localDb.transactions, 'transactions', id)
          debouncedSync()
          return result
        })
      }

      return false
    },
    []
  )

  // Sort by date descending
  const sortedTransactions = [...(transactions || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return {
    transactions: sortedTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    isLoading: transactions === undefined,
  }
}

// ============= Account Types =============

export function useOfflineAccountTypes(userId: string | null | undefined) {
  const accountTypes = useLiveQuery(
    async () => {
      if (!userId) return []
      return localDb.accountTypes
        .where('userId')
        .equals(userId)
        .filter(at => !at.deletedAt)
        .toArray()
    },
    [userId],
    []
  )

  const addAccountType = useCallback(
    async (data: Omit<AccountType, 'id' | 'localId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'syncStatus' | 'lastSyncedAt' | 'userId'>) => {
      if (!userId) throw new Error('User ID required')
      const accountType = await createEntity(localDb.accountTypes, 'accountTypes', data as any, userId)
      debouncedSync()
      return accountType
    },
    [userId]
  )

  return {
    accountTypes: accountTypes || [],
    addAccountType,
    isLoading: accountTypes === undefined,
  }
}

// ============= Account Groups =============

export function useOfflineAccountGroups(userId: string | null | undefined) {
  const accountGroups = useLiveQuery(
    async () => {
      if (!userId) return []
      return localDb.accountGroups
        .where('userId')
        .equals(userId)
        .filter(ag => !ag.deletedAt)
        .toArray()
    },
    [userId],
    []
  )

  const addAccountGroup = useCallback(
    async (data: Omit<AccountGroup, 'id' | 'localId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'syncStatus' | 'lastSyncedAt' | 'userId'>) => {
      if (!userId) throw new Error('User ID required')
      const accountGroup = await createEntity(localDb.accountGroups, 'accountGroups', data as any, userId)
      debouncedSync()
      return accountGroup
    },
    [userId]
  )

  return {
    accountGroups: accountGroups || [],
    addAccountGroup,
    isLoading: accountGroups === undefined,
  }
}
