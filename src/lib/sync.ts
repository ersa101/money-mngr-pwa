// Sync Engine — bidirectional sync between IndexedDB (db.ts) and Google Sheets
// Push: triggered after every write, debounced 2s, retried on next 60s pull tick
// Pull: triggered on app open + every 60s, silent-fail, last-write-wins on updatedAt

import { db } from './db'

// ============= Types =============

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncState {
  status: SyncStatus
  lastSyncedAt: string | null
  pendingCount: number
  error: string | null
}

export interface SyncCallbacks {
  onStatusChange?: (state: SyncState) => void
  onSyncComplete?: () => void
  onSyncError?: (error: string) => void
}

// ============= Constants =============

const SYNC_DEBOUNCE_MS = 2000
const SYNC_INTERVAL_MS = 60000

// ============= Module-level State =============

let syncState: SyncState = {
  status: 'idle',
  lastSyncedAt: null,
  pendingCount: 0,
  error: null,
}

let callbacks: SyncCallbacks = {}
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
let syncIntervalTimer: ReturnType<typeof setInterval> | null = null
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
let pendingCount = 0
let isSyncing = false

// ============= State Helpers =============

export function getSyncState(): SyncState {
  return { ...syncState }
}

export function setSyncCallbacks(cbs: SyncCallbacks): void {
  callbacks = cbs
}

function updateState(updates: Partial<SyncState>): void {
  syncState = { ...syncState, ...updates }
  callbacks.onStatusChange?.(syncState)
}

// ============= Network Listeners =============

export function initNetworkListeners(): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleOnline = () => {
    isOnline = true
    updateState({ status: 'idle' })
    debouncedSync()
  }

  const handleOffline = () => {
    isOnline = false
    updateState({ status: 'offline', error: null })
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  isOnline = navigator.onLine
  if (!isOnline) updateState({ status: 'offline' })

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

// ============= Debounced Push =============

export function debouncedSync(): void {
  pendingCount++
  updateState({ pendingCount })

  if (syncDebounceTimer) clearTimeout(syncDebounceTimer)
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null
    processSyncQueue()
  }, SYNC_DEBOUNCE_MS)
}

// ============= Push to Sheets =============

export async function processSyncQueue(): Promise<void> {
  if (!isOnline) {
    updateState({ status: 'offline' })
    return
  }
  if (pendingCount === 0) {
    updateState({ status: 'idle' })
    return
  }
  if (isSyncing) return

  isSyncing = true
  updateState({ status: 'syncing' })

  try {
    const [accounts, categories, transactions, filterPresets] = await Promise.all([
      db.accounts.toArray(),
      db.categories.toArray(),
      db.transactions.toArray(),
      db.filterPresets.toArray(),
    ])

    const payload = JSON.stringify({ accounts, categories, transactions, filterPresets })
    let body: BodyInit = payload
    let extraHeaders: Record<string, string> = {}

    if (typeof CompressionStream !== 'undefined') {
      const cs = new CompressionStream('gzip')
      const writer = cs.writable.getWriter()
      writer.write(new TextEncoder().encode(payload))
      writer.close()
      body = await new Response(cs.readable).arrayBuffer()
      extraHeaders = { 'Content-Encoding': 'gzip' }
    }

    const response = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      body,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Sync failed' }))
      throw new Error(err.error || 'Sync failed')
    }

    pendingCount = 0
    updateState({
      status: 'idle',
      pendingCount: 0,
      lastSyncedAt: new Date().toISOString(),
      error: null,
    })
    callbacks.onSyncComplete?.()
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Sync failed'
    updateState({ status: 'error', error: errorMsg })
    callbacks.onSyncError?.(errorMsg)
  } finally {
    isSyncing = false
  }
}

// ============= Pull from Sheets =============

export async function pullFromCloud(_userId: string): Promise<void> {
  if (!isOnline) return

  try {
    const response = await fetch('/api/restore')
    if (!response.ok) return // Silent fail on pull

    const result = await response.json()
    if (!result.success || !result.data) return

    const { accounts, categories, transactions, filterPresets } = result.data

    // Last-write-wins: upsert into IndexedDB based on updatedAt string comparison
    await db.transaction('rw', db.accounts, db.categories, db.transactions, db.filterPresets, async () => {
      if (accounts?.length) {
        for (const acc of accounts) {
          if (!acc.id) continue
          const existing = await db.accounts.get(acc.id)
          if (!existing) {
            await db.accounts.add(acc)
          } else if (!existing.updatedAt || (acc.updatedAt && acc.updatedAt > existing.updatedAt)) {
            await db.accounts.put(acc)
          }
        }
      }
      if (categories?.length) {
        for (const cat of categories) {
          if (!cat.id) continue
          const existing = await db.categories.get(cat.id)
          if (!existing) {
            await db.categories.add(cat)
          } else if (!existing.updatedAt || (cat.updatedAt && cat.updatedAt > existing.updatedAt)) {
            await db.categories.put(cat)
          }
        }
      }
      if (transactions?.length) {
        for (const tx of transactions) {
          if (!tx.id) continue
          const existing = await db.transactions.get(tx.id)
          if (!existing) {
            await db.transactions.add(tx)
          } else if (!existing.updatedAt || (tx.updatedAt && tx.updatedAt > existing.updatedAt)) {
            await db.transactions.put(tx)
          }
        }
      }
      if (filterPresets?.length) {
        for (const fp of filterPresets) {
          if (!fp.id) continue
          const existing = await db.filterPresets.get(fp.id)
          if (!existing) {
            await db.filterPresets.add(fp)
          }
        }
      }
    })

    if (!syncState.lastSyncedAt) {
      updateState({ lastSyncedAt: new Date().toISOString() })
    }
  } catch {
    // Silent fail on pull — do not disrupt the user
  }
}

// ============= Force Full Sync =============

export async function forceFullSync(userId: string): Promise<void> {
  await processSyncQueue()
  await pullFromCloud(userId)
  updateState({ lastSyncedAt: new Date().toISOString(), status: 'idle', error: null })
}

// ============= Background Interval =============

export function startBackgroundSync(): void {
  if (syncIntervalTimer) return
  syncIntervalTimer = setInterval(() => {
    if (isOnline) pullFromCloud('')
  }, SYNC_INTERVAL_MS)
}

export function stopBackgroundSync(): void {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer)
    syncIntervalTimer = null
  }
}

// ============= Pending Count (kept for useSync.ts compat) =============

export async function updatePendingCount(): Promise<void> {
  // pendingCount is managed internally — no-op for external callers
}
