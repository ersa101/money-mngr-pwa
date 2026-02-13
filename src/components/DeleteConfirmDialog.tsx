'use client'

import { Account } from '@/lib/db'
import { Button } from './ui/button'
import { AlertCircle, X } from 'lucide-react'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  account: Account | null
  loading?: boolean
  error?: string | null
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  account,
  loading = false,
  error = null,
}: DeleteConfirmDialogProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      // Error handled in parent
    }
  }

  if (!isOpen || !account) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card rounded-lg shadow-lg border border-border z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-semibold">Delete Account?</h2>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{account.name}</strong>?
          </p>

          <div className="bg-muted rounded p-3 text-sm">
            <p className="font-medium mb-1">Account Details:</p>
            <p className="text-muted-foreground">
              Type: <span className="text-foreground">{account.type}</span>
            </p>
            <p className="text-muted-foreground">
              Balance: <span className="text-foreground">₹{account.balance.toLocaleString()}</span>
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ This action cannot be undone. Make sure this account has no active transactions.
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
