'use client'

import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'
import type { Transaction, Account, Category } from '@/types/database'
import { buildCategoryMaps, resolveCategorySync } from '@/lib/categoryUtils'

export interface TransactionDisplay {
  /** Name of the source account (fromAccountId), with fallback to 'Unknown' */
  fromAccountName: string
  /** Name of the destination account (toAccountId) — present for TRANSFER only */
  toAccountName?: string
  /** Display name for the category (resolved with csvCategory fallback) */
  categoryName: string
  /** Emoji/icon for the category */
  categoryIcon: string
  /** Parent category name (e.g. "Food" when subcat is "Restaurant") */
  parentCategoryName?: string
  /** Sign character: '+' for income, '-' for expense, '' for transfer */
  sign: '+' | '-' | ''
  /** Tailwind text-color class for the amount */
  colorClass: string
  /** Amount formatted as ₹1,23,456 (en-IN locale) */
  formattedAmount: string
  /** Date formatted as "3 Mar 2026" (en-IN locale) */
  formattedDate: string
}

/**
 * Returns display-ready fields for one transaction.
 * Subscribes to accounts and categories via useLiveQuery so updates
 * are reflected automatically.
 *
 * Returns null if transaction is null.
 */
export function useTransactionDisplay(
  transaction: Transaction | null
): TransactionDisplay | null {
  const db = useDb()
  const accounts = useLiveQuery(
    () => db?.accounts.toArray() ?? [],
    [db]
  ) ?? [] as Account[]
  const categories = useLiveQuery(
    () => db?.categories.toArray() ?? [],
    [db]
  ) ?? [] as Category[]

  return useMemo(() => {
    if (!transaction) return null

    const { categoriesMap, categoriesByName } = buildCategoryMaps(categories)

    const fromAccount = accounts.find((a) => a.id === transaction.fromAccountId)
    const toAccount =
      transaction.toAccountId != null
        ? accounts.find((a) => a.id === transaction.toAccountId)
        : undefined

    const resolved = resolveCategorySync(transaction, categoriesMap, categoriesByName)

    const isIncome = transaction.transactionType === 'INCOME'
    const isTransfer = transaction.transactionType === 'TRANSFER'

    const txDate = new Date(transaction.date)

    return {
      fromAccountName: fromAccount?.name ?? 'Unknown',
      toAccountName: toAccount?.name,
      categoryName: resolved.name,
      categoryIcon: resolved.icon,
      parentCategoryName: resolved.parentName,
      sign: isIncome ? '+' : isTransfer ? '' : '-',
      colorClass: isIncome
        ? 'text-green-600'
        : isTransfer
        ? 'text-blue-600'
        : 'text-red-600',
      formattedAmount: `₹${transaction.amount.toLocaleString('en-IN')}`,
      formattedDate: isNaN(txDate.getTime())
        ? '—'
        : txDate.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
    }
  }, [transaction, accounts, categories])
}
