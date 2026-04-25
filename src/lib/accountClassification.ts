// V2.7.4 D040 — Tri-state account classification helpers.
//
// Storage stays as dual fields (`isLiability`, `includeInNetWorth`) on the
// Account record — no Dexie schema bump. UI exposes a single segmented
// control with mutual exclusion enforced at write time.
//
// Mapping:
//   Liability -> isLiability=true,  includeInNetWorth=false
//   Asset     -> isLiability=false, includeInNetWorth=true
//   Neither   -> isLiability=false, includeInNetWorth=false
//
// Migration tiebreaker for legacy "both ON" records: liability wins (D040).

import type { Account } from '@/types/database'

export type AccountClassification = 'liability' | 'asset' | 'neither'

/**
 * Read current classification from an account record.
 * Liability flag wins if both happen to be set (legacy records pre-migration).
 */
export function getAccountClassification(acc: Account): AccountClassification {
  if (acc.isLiability === true) return 'liability'
  if (acc.includeInNetWorth === true) return 'asset'
  return 'neither'
}

/**
 * Convert a classification choice to the dual-field write payload.
 */
export function classificationToFlags(c: AccountClassification): {
  isLiability: boolean
  includeInNetWorth: boolean
} {
  switch (c) {
    case 'liability':
      return { isLiability: true, includeInNetWorth: false }
    case 'asset':
      return { isLiability: false, includeInNetWorth: true }
    case 'neither':
      return { isLiability: false, includeInNetWorth: false }
  }
}

/**
 * Display label for sort + UI.
 */
export function classificationLabel(c: AccountClassification): string {
  return c === 'liability' ? 'Liability' : c === 'asset' ? 'Asset' : 'Neither'
}
