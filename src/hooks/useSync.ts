// React hook for sync state and operations
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
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
  type SyncState,
} from '@/lib/sync'

export type { SyncState }

export interface UseSyncReturn {
  syncState: SyncState
  isOnline: boolean
  sync: () => Promise<void>
  pullData: () => Promise<void>
  forceSync: () => Promise<void>
  triggerSync: () => void
}

export function useSync(userId: string | null | undefined): UseSyncReturn {
  const [syncState, setSyncState] = useState<SyncState>(getSyncState())
  const [isOnline, setIsOnline] = useState(true)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setSyncCallbacks({
      onStatusChange: (state) => {
        setSyncState(state)
        setIsOnline(state.status !== 'offline')
      },
      onSyncComplete: () => {},
      onSyncError: (error) => {
        console.error('Sync error:', error)
      },
    })

    cleanupRef.current = initNetworkListeners()
    startBackgroundSync()
    updatePendingCount()

    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine)
    }

    return () => {
      cleanupRef.current?.()
      stopBackgroundSync()
    }
  }, [])

  const sync = useCallback(async () => {
    await processSyncQueue()
  }, [])

  const pullData = useCallback(async () => {
    if (!userId) return
    await pullFromCloud(userId)
  }, [userId])

  const forceSync = useCallback(async () => {
    if (!userId) return
    await forceFullSync(userId)
  }, [userId])

  const triggerSync = useCallback(() => {
    debouncedSync()
  }, [])

  return { syncState, isOnline, sync, pullData, forceSync, triggerSync }
}

export default useSync
