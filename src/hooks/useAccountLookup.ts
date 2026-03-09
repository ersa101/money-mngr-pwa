'use client'

import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'
import type { Account } from '@/types/database'

/**
 * Provides live-reactive account lookup helpers.
 *
 * - `lookupById(id)` — returns the Account object or undefined
 * - `lookupByName(name)` — case-insensitive name lookup (useful for CSV imports)
 * - `accounts` — the full live array of accounts from the DB
 * - `accountsMap` — Map<id, Account> for O(1) lookups
 */
export function useAccountLookup() {
  const db = useDb()
  const accounts = useLiveQuery(
    () => db?.accounts.toArray() ?? [],
    [db]
  ) ?? [] as Account[]

  const accountsMap = useMemo(() => {
    const map = new Map<number, Account>()
    for (const acc of accounts) {
      if (acc.id != null) map.set(acc.id, acc)
    }
    return map
  }, [accounts])

  const accountsByName = useMemo(() => {
    const map = new Map<string, Account>()
    for (const acc of accounts) {
      map.set(acc.name.toLowerCase(), acc)
    }
    return map
  }, [accounts])

  const lookupById = (id?: number): Account | undefined =>
    id != null ? accountsMap.get(id) : undefined

  const lookupByName = (name?: string): Account | undefined =>
    name ? accountsByName.get(name.toLowerCase()) : undefined

  return { lookupById, lookupByName, accounts, accountsMap }
}
