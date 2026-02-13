// Sync Status Indicator Component
// Shows sync status in the navbar with appropriate icons and colors
'use client'

import { useState } from 'react'
import {
  Cloud,
  CloudOff,
  Check,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { type SyncState } from '@/lib/sync'

interface SyncStatusIndicatorProps {
  syncState: SyncState
  isOnline: boolean
  onRetry?: () => void
  onForceSync?: () => void
}

export function SyncStatusIndicator({
  syncState,
  isOnline,
  onRetry,
  onForceSync,
}: SyncStatusIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getStatusDisplay = () => {
    if (!isOnline || syncState.status === 'offline') {
      return {
        icon: CloudOff,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        label: 'Offline',
        description: syncState.pendingCount > 0
          ? `${syncState.pendingCount} change${syncState.pendingCount > 1 ? 's' : ''} pending`
          : 'Changes will sync when online',
      }
    }

    switch (syncState.status) {
      case 'syncing':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          label: 'Syncing',
          description: 'Syncing your data...',
          animate: true,
        }
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          label: 'Sync Error',
          description: syncState.error || 'Failed to sync. Tap to retry.',
        }
      case 'idle':
      default:
        if (syncState.pendingCount > 0) {
          return {
            icon: RefreshCw,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10',
            label: 'Pending',
            description: `${syncState.pendingCount} change${syncState.pendingCount > 1 ? 's' : ''} to sync`,
          }
        }
        return {
          icon: Check,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          label: 'Synced',
          description: syncState.lastSyncedAt
            ? `Last synced ${formatTimeAgo(syncState.lastSyncedAt)}`
            : 'All changes synced',
        }
    }
  }

  const status = getStatusDisplay()
  const Icon = status.icon

  const handleClick = () => {
    if (syncState.status === 'error' && onRetry) {
      onRetry()
    } else {
      setShowDetails(!showDetails)
    }
  }

  return (
    <div className="relative">
      {/* Main indicator button */}
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${status.bgColor} hover:opacity-80`}
        title={status.description}
      >
        <Icon
          className={`w-4 h-4 ${status.color} ${status.animate ? 'animate-spin' : ''}`}
        />
        <span className={`text-xs font-medium ${status.color} hidden sm:inline`}>
          {status.label}
        </span>
        {syncState.pendingCount > 0 && syncState.status !== 'syncing' && (
          <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-yellow-500 rounded-full">
            {syncState.pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown details */}
      {showDetails && (
        <div className="absolute right-0 z-50 w-64 p-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${status.bgColor}`}>
              <Icon className={`w-5 h-5 ${status.color}`} />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-white">{status.label}</h4>
              <p className="text-sm text-slate-400 mt-1">{status.description}</p>

              {syncState.lastSyncedAt && (
                <p className="text-xs text-slate-500 mt-2">
                  Last synced: {formatTimeAgo(syncState.lastSyncedAt)}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            {syncState.status === 'error' && onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            )}
            {onForceSync && isOnline && (
              <button
                onClick={() => {
                  setShowDetails(false)
                  onForceSync()
                }}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Force Sync
              </button>
            )}
          </div>

          {/* Close on click outside */}
          <button
            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white"
            onClick={() => setShowDetails(false)}
          >
            &times;
          </button>
        </div>
      )}

      {/* Click outside overlay */}
      {showDetails && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  )
}

// Helper function to format time ago
function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

export default SyncStatusIndicator
