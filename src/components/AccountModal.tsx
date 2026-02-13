'use client'

import { useState, useEffect } from 'react'
import { Account } from '@/lib/db'
import { Button } from './ui/button'
import {
  Building2,
  Wallet,
  Smartphone,
  TrendingUp,
  CreditCard,
  User,
  X,
} from 'lucide-react'

interface AccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<Account, 'id'>) => Promise<void>
  initialData?: Account
  loading?: boolean
}

const getDefaultFormData = (): Omit<Account, 'id'> => ({
  name: '',
  type: 'BANK',
  balance: 0,
  thresholdValue: 0,
  icon: '',
  color: '#000000',
  includeInNetWorth: true,
  isLiability: false,
})

export function AccountModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: AccountModalProps) {
  const [formData, setFormData] = useState<Omit<Account, 'id'>>(getDefaultFormData())

  // Update form data when initialData changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          type: initialData.type || 'BANK',
          balance: initialData.balance || 0,
          thresholdValue: initialData.thresholdValue || 0,
          icon: initialData.icon || '',
          color: initialData.color || '#000000',
          group: initialData.group || '',
          includeInNetWorth: initialData.includeInNetWorth !== false, // default true
          isLiability: initialData.isLiability || false,
        })
      } else {
        setFormData(getDefaultFormData())
      }
    }
  }, [isOpen, initialData])

  const accountTypes = [
    { value: 'BANK', label: '🏦 Bank' },
    { value: 'CASH', label: '💵 Cash' },
    { value: 'WALLET', label: '👛 Digital Wallet' },
    { value: 'INVESTMENT', label: '📈 Investment' },
    { value: 'CREDIT_CARD', label: '💳 Credit Card' },
    { value: 'PERSON', label: '👤 Person' },
  ];

  const isEditing = !!initialData

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await onSubmit(formData)
      onClose()
      // Reset form (will be reset by useEffect when modal closes)
    } catch (err) {
      // Error handled in parent
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-lg shadow-lg border border-border z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Account' : 'Add Account'}
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Account Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., HDFC Bank"
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <select
              required
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as Account['type'],
                })
              }
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {accountTypes.map(accType => (
                <option key={accType.value} value={accType.value}>
                  {accType.label}
                </option>
              ))}
            </select>
          </div>

          {/* Current Balance */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Current Balance (₹) *
            </label>
            <input
              type="number"
              required
              step="0.01"
              value={formData.balance}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  balance: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
            />
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Threshold Value (₹) *
            </label>
            <input
              type="number"
              required
              step="0.01"
              value={formData.thresholdValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  thresholdValue: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="5000"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum safe balance below which you'll get a warning
            </p>
          </div>

          {/* Group (optional) */}
          <div>
            <label className="block text-sm font-medium mb-1">Group</label>
            <input
              type="text"
              value={formData.group || ''}
              onChange={(e) =>
                setFormData({ ...formData, group: e.target.value })
              }
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Primary Banking, Digital Wallets"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional: Group accounts together on the accounts page
            </p>
          </div>

          {/* Color (optional) */}
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <input
              type="color"
              value={formData.color || '#000000'}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              className="w-full h-10 border border-border rounded-md cursor-pointer"
            />
          </div>

          {/* Include in Net Worth */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="includeInNetWorth"
              checked={formData.includeInNetWorth !== false}
              onChange={(e) =>
                setFormData({ ...formData, includeInNetWorth: e.target.checked })
              }
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="includeInNetWorth" className="text-sm font-medium">
              Include in Net Worth calculation
            </label>
          </div>

          {/* Is Liability */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isLiability"
              checked={formData.isLiability || false}
              onChange={(e) =>
                setFormData({ ...formData, isLiability: e.target.checked })
              }
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="isLiability" className="text-sm font-medium">
              This is a liability (e.g., credit card debt, loan)
            </label>
          </div>

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
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}