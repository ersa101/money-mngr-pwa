'use client'

import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'
import type { Category, Transaction } from '@/types/database'
import {
  resolveCategorySync,
  buildCategoryMaps,
  type ResolvedCategory,
} from '@/lib/categoryUtils'

export type { ResolvedCategory }

/**
 * Provides live-reactive category lookup helpers.
 *
 * - `resolve(tx)` — returns display-ready category (name, icon, parentName)
 *   with fallback chain: categoryId → csvCategory → "Uncategorized"
 * - `lookupById(id)` — returns the raw Category object or undefined
 * - `categories` — the full live array of categories from the DB
 * - `categoriesMap` — Map<id, Category> for O(1) lookups
 */
export function useCategoryLookup() {
  const db = useDb()
  const categories = useLiveQuery(
    () => db?.categories.toArray() ?? [],
    [db]
  ) ?? [] as Category[]

  const { categoriesMap, categoriesByName } = useMemo(
    () => buildCategoryMaps(categories),
    [categories]
  )

  const resolve = (transaction: Transaction): ResolvedCategory =>
    resolveCategorySync(transaction, categoriesMap, categoriesByName)

  const lookupById = (id?: number): Category | undefined =>
    id != null ? categoriesMap.get(id) : undefined

  return { resolve, lookupById, categories, categoriesMap }
}
