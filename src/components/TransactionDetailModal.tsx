'use client'

import { type Transaction, type Account, type Category } from '@/lib/db'
import { Button } from './ui/button'
import { X, Calendar, Clock, Tag, Landmark, FileText, ArrowRight } from 'lucide-react'

interface TransactionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  accounts: Account[]
  categories: Category[]
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  transaction,
  accounts,
  categories,
}: TransactionDetailModalProps) {
  if (!isOpen || !transaction) return null

  const txDate = transaction.date instanceof Date
    ? transaction.date
    : new Date(transaction.date)

  const isValidDate = !isNaN(txDate.getTime())

  const fromAccount = accounts.find((a) => a.id === transaction.fromAccountId)
  const toAccount = transaction.toAccountId
    ? accounts.find((a) => a.id === transaction.toAccountId)
    : null
  const category = transaction.toCategoryId
    ? categories.find((c) => c.id === transaction.toCategoryId)
    : null

  const isIncome = transaction.transactionType === 'INCOME'
  const isTransfer = transaction.transactionType === 'TRANSFER'
  const isExpense = transaction.transactionType === 'EXPENSE'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-lg shadow-lg border border-border z-50 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Transaction Details</h2>
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
          {/* Amount Badge */}
          <div className="text-center py-4">
            <p
              className={`text-4xl font-bold ${
                isIncome
                  ? 'text-green-600'
                  : isTransfer
                  ? 'text-blue-600'
                  : 'text-red-600'
              }`}
            >
              {isIncome ? '+' : isTransfer ? '' : '-'}₹{transaction.amount.toLocaleString()}
            </p>
            <p
              className={`text-sm mt-1 px-3 py-1 rounded-full inline-block ${
                isIncome
                  ? 'bg-green-100 text-green-800'
                  : isTransfer
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {transaction.transactionType || 'EXPENSE'}
            </p>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Date</span>
              </div>
              <p className="font-medium">
                {isValidDate
                  ? txDate.toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Invalid date'}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Time</span>
              </div>
              <p className="font-medium">
                {isValidDate
                  ? txDate.toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : '--:--'}
              </p>
            </div>
          </div>

          {/* Account Flow */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Landmark className="w-4 h-4" />
              <span className="text-xs">
                {isTransfer ? 'Transfer' : isIncome ? 'Received In' : 'Paid From'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="font-medium">{fromAccount?.name || transaction.csvAccount || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{fromAccount?.type || 'Account'}</p>
              </div>
              {isTransfer && (
                <>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{toAccount?.name || transaction.category || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{toAccount?.type || 'Account'}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Category */}
          {!isTransfer && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Tag className="w-4 h-4" />
                <span className="text-xs">Category</span>
              </div>
              <p className="font-medium">
                {transaction.category || category?.name || 'Unknown'}
                {transaction.subCategory && (
                  <span className="text-muted-foreground"> / {transaction.subCategory}</span>
                )}
              </p>
            </div>
          )}

          {/* Description */}
          {transaction.description && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="w-4 h-4" />
                <span className="text-xs">Description</span>
              </div>
              <p className="font-medium">{transaction.description}</p>
            </div>
          )}

          {/* Note */}
          {transaction.note && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="w-4 h-4" />
                <span className="text-xs">Note</span>
              </div>
              <p className="text-sm text-muted-foreground">{transaction.note}</p>
            </div>
          )}

          {/* Raw Data (for CSV imports) */}
          {transaction.csvDescription && transaction.csvDescription !== transaction.description && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="w-4 h-4" />
                <span className="text-xs">CSV Description</span>
              </div>
              <p className="text-sm text-muted-foreground">{transaction.csvDescription}</p>
            </div>
          )}

          {/* Transaction ID */}
          <div className="text-center pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Transaction ID: {transaction.id}
              {transaction.importedAt && (
                <>
                  {' | '}Imported: {new Date(transaction.importedAt).toLocaleString('en-IN')}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </>
  )
}
