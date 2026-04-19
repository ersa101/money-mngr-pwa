import type { MySubClassedDB } from './db'

/**
 * Compute a 16-char SHA-256 fingerprint for deduplication.
 * Inputs are normalized: amount → integer paise, account/type → lowercase+trim.
 * Date is always an ISO string (from parsed Date.toISOString()) to ensure
 * consistency between CSV imports and manual entries on the same machine.
 */
export async function computeSourceHash(
  isoDate: string,
  amount: number,
  accountName: string,
  transactionType: string
): Promise<string> {
  const paise = Math.round(amount * 100)
  const raw = `${isoDate}|${paise}|${accountName.toLowerCase().trim()}|${transactionType.toLowerCase().trim()}`
  const encoder = new TextEncoder()
  const data = encoder.encode(raw)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
}

/**
 * Return the earliest and latest transaction dates in the DB.
 * Returns { earliest: null, latest: null } when the DB is empty.
 */
export async function getDBDateRange(
  db: MySubClassedDB
): Promise<{ earliest: Date | null; latest: Date | null }> {
  const keys = await db.transactions.orderBy('date').keys()
  if (!keys.length) return { earliest: null, latest: null }
  return {
    earliest: new Date(keys[0] as string),
    latest: new Date(keys[keys.length - 1] as string),
  }
}

/**
 * Pull all sourceHash values for transactions whose date falls within [from, to].
 * Transactions with no sourceHash (pre-fix data) are excluded via filter(Boolean).
 * Returns a Set for O(1) membership testing.
 */
export async function getExistingHashesInRange(
  db: MySubClassedDB,
  from: Date,
  to: Date
): Promise<Set<string>> {
  const txns = await db.transactions
    .where('date')
    .between(from.toISOString(), to.toISOString(), true, true)
    .toArray()
  return new Set(txns.map(t => t.sourceHash).filter(Boolean) as string[])
}
