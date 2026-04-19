'use client'

// SyncStatusIndicator — Phase 1.5
// Minimal colored-dot indicator wired to syncService state.
// 🟢 synced  🟡 pending  🔴 offline/error

import { useState, useEffect } from 'react'
import {
  getSyncStatus,
  getLastSyncedAt,
  onSyncStatusChange,
} from '@/lib/syncService'

function formatTimeAgo(ts: number): string {
  const diffS = Math.floor((Date.now() - ts) / 1000)
  if (diffS < 60) return 'just now'
  const diffM = Math.floor(diffS / 60)
  if (diffM < 60) return `${diffM}m ago`
  const diffH = Math.floor(diffM / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

export function SyncStatusIndicator() {
  const [status, setStatus] = useState(getSyncStatus())
  const [lastSync, setLastSync] = useState(getLastSyncedAt())
  const [open, setOpen] = useState(false)

  useEffect(() => {
    return onSyncStatusChange(() => {
      setStatus(getSyncStatus())
      setLastSync(getLastSyncedAt())
    })
  }, [])

  const dotColor =
    status === 'synced'
      ? 'bg-green-500'
      : status === 'pending'
      ? 'bg-yellow-500 animate-pulse'
      : 'bg-red-500'

  const label =
    status === 'synced' ? 'Synced' : status === 'pending' ? 'Pending' : 'Offline'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-700/50 transition-colors"
        title={`Sync: ${label}`}
      >
        <span className={`w-3 h-3 rounded-full ${dotColor}`} />
      </button>

      {open && (
        <>
          {/* Click-away overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Popover */}
          <div className="absolute right-0 top-full mt-2 w-48 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
            <button
              className="absolute top-2 right-2 text-slate-400 hover:text-white text-sm leading-none"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <p className="text-sm font-medium text-white">{label}</p>
            <p className="text-xs text-slate-400 mt-1">
              {lastSync ? `Last synced ${formatTimeAgo(lastSync)}` : 'Not yet synced'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default SyncStatusIndicator
