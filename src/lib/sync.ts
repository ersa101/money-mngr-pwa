// Sync Engine for bidirectional synchronization between IndexedDB and Google Sheets
// Implements offline-first with background sync and conflict resolution

import {
  localDb,
  getPendingSyncItems,
  removeSyncItem,
  incrementSyncRetry,
  clearUserData,
  bulkInsert,
  now,
  type Account,
  type Category,
  type Transaction,
  type AccountType,
  type AccountGroup,
  type UserSetting,
  type SyncQueueItem,
} from './indexedDb'

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
const MAX_RETRY_COUNT = 3
const SYNC_INTERVAL_MS = 30000 // 30 seconds

// ============= State =============

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

// ============= State Management =============

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

// ============= Online/Offline Detection =============

export function initNetworkListeners(): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleOnline = () => {
    isOnline = true
    updateState({ status: 'idle' })
    // Trigger sync when coming back online
    debouncedSync()
  }

  const handleOffline = () => {
    isOnline = false
    updateState({ status: 'offline', error: null })
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Initial state
  isOnline = navigator.onLine
  if (!isOnline) {
    updateState({ status: 'offline' })
  }

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

// ============= Debounced Sync =============

export function debouncedSync(): void {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer)
  }

  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null
    processSyncQueue()
  }, SYNC_DEBOUNCE_MS)
}

// ============= Start/Stop Background Sync =============

export function startBackgroundSync(): void {
  if (syncIntervalTimer) return

  syncIntervalTimer = setInterval(() => {
    if (isOnline) {
      processSyncQueue()
    }
  }, SYNC_INTERVAL_MS)
}

export function stopBackgroundSync(): void {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer)
    syncIntervalTimer = null
  }
}

// ============= Process Sync Queue =============

export async function processSyncQueue(): Promise<void> {
  if (!isOnline) {
    updateState({ status: 'offline' })
    return
  }

  const pendingItems = await getPendingSyncItems()

  if (pendingItems.length === 0) {
    updateState({ status: 'idle', pendingCount: 0 })
    return
  }

  updateState({ status: 'syncing', pendingCount: pendingItems.length })

  for (const item of pendingItems) {
    if (item.retryCount >= MAX_RETRY_COUNT) {
      // Remove items that have exceeded max retries
      if (item.id) await removeSyncItem(item.id)
      continue
    }

    try {
      await syncItemToCloud(item)
      if (item.id) await removeSyncItem(item.id)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      if (item.id) await incrementSyncRetry(item.id, errorMsg)
      updateState({ status: 'error', error: errorMsg })
    }
  }

  const remainingItems = await getPendingSyncItems()
  updateState({
    status: remainingItems.length > 0 ? 'error' : 'idle',
    pendingCount: remainingItems.length,
    lastSyncedAt: remainingItems.length === 0 ? now() : syncState.lastSyncedAt,
  })

  if (remainingItems.length === 0) {
    callbacks.onSyncComplete?.()
  }
}

// ============= Sync Single Item to Cloud =============

async function syncItemToCloud(item: SyncQueueItem): Promise<void> {
  const response = await fetch('/api/sheets/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: item.table,
      action: item.action,
      data: item.data,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Sync failed: ${errorText}`)
  }
}

// ============= Pull Fresh Data from Cloud =============

export async function pullFromCloud(userId: string): Promise<void> {
  if (!isOnline) {
    throw new Error('Cannot pull from cloud while offline')
  }

  updateState({ status: 'syncing' })

  try {
    const response = await fetch(`/api/sheets/sync?userId=${encodeURIComponent(userId)}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch from cloud: ${response.statusText}`)
    }

    const data = await response.json()

    // Clear local data for this user and insert fresh data
    await clearUserData(userId)

    if (data.accounts?.length) {
      await bulkInsert(localDb.accounts, data.accounts)
    }
    if (data.categories?.length) {
      await bulkInsert(localDb.categories, data.categories)
    }
    if (data.transactions?.length) {
      await bulkInsert(localDb.transactions, data.transactions)
    }
    if (data.accountTypes?.length) {
      await bulkInsert(localDb.accountTypes, data.accountTypes)
    }
    if (data.accountGroups?.length) {
      await bulkInsert(localDb.accountGroups, data.accountGroups)
    }
    if (data.settings?.length) {
      await bulkInsert(localDb.settings, data.settings)
    }

    updateState({
      status: 'idle',
      lastSyncedAt: now(),
      pendingCount: 0,
      error: null,
    })

    callbacks.onSyncComplete?.()
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    updateState({ status: 'error', error: errorMsg })
    callbacks.onSyncError?.(errorMsg)
    throw error
  }
}

// ============= Force Full Sync =============

export async function forceFullSync(userId: string): Promise<void> {
  // First push all pending changes
  await processSyncQueue()

  // Then pull fresh data
  await pullFromCloud(userId)
}

// ============= Update Pending Count =============

export async function updatePendingCount(): Promise<void> {
  const items = await getPendingSyncItems()
  updateState({ pendingCount: items.length })
}

// ============= Export for React Hook =============

export function useSync() {
  return {
    getSyncState,
    setSyncCallbacks,
    initNetworkListeners,
    debouncedSync,
    processSyncQueue,
    pullFromCloud,
    forceFullSync,
    startBackgroundSync,
    stopBackgroundSync,
    updatePendingCount,
  }
}
