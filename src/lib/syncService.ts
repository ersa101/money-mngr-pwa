// syncService.ts — Phase 1.5 Auto-Sync
// Bidirectional sync: IndexedDB (db.ts) ↔ Google Sheets (per-user tabs)
// Client-side only. Never import this in API routes or server components.

// ─── State ────────────────────────────────────────────────────────────────────

type SyncStatusValue = 'synced' | 'pending' | 'offline'

let _userId: string | null = null
let _status: SyncStatusValue = 'synced'
let _lastSyncedAt: number | null = null
let _pendingPush = false
let _debounceTimer: ReturnType<typeof setTimeout> | null = null
let _intervalTimer: ReturnType<typeof setInterval> | null = null
let _listeners: Array<() => void> = []

// ─── Public read API ──────────────────────────────────────────────────────────

export function getSyncStatus(): SyncStatusValue {
  return _status
}

export function getLastSyncedAt(): number | null {
  return _lastSyncedAt
}

/** Subscribe to status changes. Returns an unsubscribe function. */
export function onSyncStatusChange(listener: () => void): () => void {
  _listeners.push(listener)
  return () => {
    _listeners = _listeners.filter((l) => l !== listener)
  }
}

// ─── Init / teardown ─────────────────────────────────────────────────────────

/**
 * Call once when the user authenticates.
 * Performs an initial pull, then starts the 60-second background interval.
 * Returns a cleanup function to call on logout / unmount.
 */
export function initSync(userId: string): () => void {
  _userId = userId

  // Initial pull on auth
  pullFromSheets().catch(() => {})

  // 60-second interval: pull (and retry any pending push)
  if (_intervalTimer) clearInterval(_intervalTimer)
  _intervalTimer = setInterval(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      _setStatus('offline')
      return
    }
    pullFromSheets().catch(() => {})
    if (_pendingPush) _executePush().catch(() => {})
  }, 60_000)

  return () => {
    if (_intervalTimer) {
      clearInterval(_intervalTimer)
      _intervalTimer = null
    }
    _userId = null
  }
}

// ─── Push ─────────────────────────────────────────────────────────────────────

/**
 * Debounced push — safe to call after every write.
 * Waits 2 s before actually sending to batch rapid operations.
 */
export function pushToSheets(): void {
  if (!_userId) return

  _pendingPush = true
  _setStatus('pending')

  if (_debounceTimer) clearTimeout(_debounceTimer)
  _debounceTimer = setTimeout(() => {
    _debounceTimer = null
    _executePush().catch(() => {})
  }, 2000)
}

async function _executePush(): Promise<void> {
  if (!_userId) return
  try {
    // Dynamic import avoids importing Dexie on the server
    const { db } = await import('./db')
    const [transactions, accounts, categories] = await Promise.all([
      db.transactions.toArray(),
      db.accounts.toArray(),
      db.categories.toArray(),
    ])

    const res = await fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: _userId, transactions, accounts, categories }),
    })

    if (!res.ok) throw new Error(await res.text())

    _pendingPush = false
    _lastSyncedAt = Date.now()
    _setStatus('synced')
  } catch {
    // Keep _pendingPush = true so the 60-s interval retries
    const { default: toast } = await import('react-hot-toast')
    toast('Sync pending...', { icon: '🔄', duration: 3000 })
    _setStatus('pending')
  }
}

// ─── Pull ─────────────────────────────────────────────────────────────────────

/**
 * Pull latest data from Google Sheets and upsert into IndexedDB.
 * Conflict resolution: last-write-wins on `updatedAt` (unix ms).
 * On failure: sets status to 'offline', does not throw.
 */
export async function pullFromSheets(): Promise<void> {
  if (!_userId) return
  try {
    const res = await fetch(
      `/api/sheets/sync?email=${encodeURIComponent(_userId)}`,
    )
    if (!res.ok) throw new Error(res.statusText)

    const data: { transactions: any[]; accounts: any[]; categories: any[] } =
      await res.json()

    const { db } = await import('./db')

    if (data.transactions?.length) {
      await db.transaction('rw', db.transactions, async () => {
        for (const remote of data.transactions) {
          if (!remote.id) continue
          const local = await db.transactions.get(remote.id)
          if (!local || (remote.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
            await db.transactions.put(remote)
          }
        }
      })
    }

    if (data.accounts?.length) {
      await db.transaction('rw', db.accounts, async () => {
        for (const remote of data.accounts) {
          if (!remote.id) continue
          const local = await db.accounts.get(remote.id)
          if (!local || (remote.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
            await db.accounts.put(remote)
          }
        }
      })
    }

    if (data.categories?.length) {
      await db.transaction('rw', db.categories, async () => {
        for (const remote of data.categories) {
          if (!remote.id) continue
          const local = await db.categories.get(remote.id)
          if (!local || (remote.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
            await db.categories.put(remote)
          }
        }
      })
    }

    _lastSyncedAt = Date.now()
    if (!_pendingPush) _setStatus('synced')
  } catch {
    _setStatus('offline')
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _setStatus(s: SyncStatusValue): void {
  _status = s
  _listeners.forEach((l) => l())
}
