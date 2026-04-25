'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import { useMemo } from 'react';
import type { Category } from '@/types/database';

/**
 * V2.7.4 D045 — Returns categories with account-name pollution filtered out.
 *
 * Background: CSV import (TRANSFER transactions) auto-creates Category rows
 * named after accounts (e.g., "AMEX", "Cash", "DB"). These pollute every
 * category dropdown and chart legend.
 *
 * Filter: case-insensitive exact match against db.accounts.name. Subcategories
 * are NOT filtered — they're mapped to real categories elsewhere; only top-level
 * polluted entries arise from TRANSFER txns (per user, S12).
 *
 * Trade-off: a legit category named the same as an account (e.g., "Cash" the
 * category coexisting with "Cash" the account) is hidden. Accepted.
 *
 * Returns `undefined` while DB is loading (matches useLiveQuery semantics).
 */
export function useCleanCategories(): Category[] | undefined {
  const db = useDb();
  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db]);
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db]);

  return useMemo(() => {
    if (!accounts || !categories) return undefined;
    const accountNamesLower = new Set(
      accounts.filter(Boolean).map((a) => a.name.toLowerCase())
    );
    return categories
      .filter(Boolean)
      .filter((c) => {
        // Top-level only — subcategories pass through (they map to real cats; pollution
        // arises from TRANSFER txns at top-level only).
        if (c.parentId) return true;
        return !accountNamesLower.has(c.name.toLowerCase());
      });
  }, [accounts, categories]);
}
