// React hook for managing sync state and operations
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

  // Initialize network listeners and callbacks
  useEffect(() => {
    // Set up callbacks
    setSyncCallbacks({
      onStatusChange: (state) => {
        setSyncState(state)
        setIsOnline(state.status !== 'offline')
      },
      onSyncComplete: () => {
        console.log('Sync completed successfully')
      },
      onSyncError: (error) => {
        console.error('Sync error:', error)
      },
    })

    // Initialize network listeners
    cleanupRef.current = initNetworkListeners()

    // Start background sync
    startBackgroundSync()

    // Initial pending count update
    updatePendingCount()

    // Set initial online state
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine)
    }

    return () => {
      cleanupRef.current?.()
      stopBackgroundSync()
    }
  }, [])

  // Process sync queue (push local changes to cloud)
  const sync = useCallback(async () => {
    await processSyncQueue()
  }, [])

  // Pull fresh data from cloud
  const pullData = useCallback(async () => {
    if (!userId) {
      console.warn('Cannot pull data without userId')
      return
    }
    await pullFromCloud(userId)
  }, [userId])

  // Force full sync (push then pull)
  const forceSync = useCallback(async () => {
    if (!userId) {
      console.warn('Cannot force sync without userId')
      return
    }
    await forceFullSync(userId)
  }, [userId])

  // Trigger debounced sync
  const triggerSync = useCallback(() => {
    debouncedSync()
  }, [])

  return {
    syncState,
    isOnline,
    sync,
    pullData,
    forceSync,
    triggerSync,
  }
}

export default useSync
