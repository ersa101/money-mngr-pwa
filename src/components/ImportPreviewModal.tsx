'use client'

import React, { useState } from 'react'
import { CheckCircle, SkipForward, AlertTriangle, Loader2 } from 'lucide-react'
import { insertConfirmedMissedRows, PendingMissedRow } from '@/lib/csvImport'
import { useDb } from '@/contexts/DbContext'
import { formatCurrency } from '@/lib/currency-utils'
import toast from 'react-hot-toast'

interface ImportPreviewModalProps {
  blindInserted: number
  skipped: number
  missed: PendingMissedRow[]
  onDone: (insertedCount: number) => void   // called after user confirms or skips
}

export function ImportPreviewModal({
  blindInserted,
  skipped,
  missed,
  onDone,
}: ImportPreviewModalProps) {
  const db = useDb()
  const [isInserting, setIsInserting] = useState(false)

  const handleInsertAll = async () => {
    if (!db) return
    setIsInserting(true)
    try {
      const inserted = await insertConfirmedMissedRows(db, missed)
      toast.success(
        `Import complete. ${blindInserted + inserted} new transaction${(blindInserted + inserted) !== 1 ? 's' : ''} added. ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped.`
      )
      onDone(inserted)
    } catch (err) {
      toast.error('Failed to insert missed transactions.')
      console.error(err)
    } finally {
      setIsInserting(false)
    }
  }

  const handleSkipAll = () => {
    toast.success(
      `Import complete. ${blindInserted} new transaction${blindInserted !== 1 ? 's' : ''} added. ${skipped + missed.length} duplicate${(skipped + missed.length) !== 1 ? 's' : ''} skipped.`
    )
    onDone(0)
  }

  return (
    /* Full-screen overlay — sits on top of CSVUploadModal */
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Import Summary</h2>
        </div>

        {/* Summary counts */}
        <div className="px-5 py-4 space-y-2 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Already imported (skipped): <strong>{skipped}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span>New transactions inserted: <strong>{blindInserted}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>Possibly missed transactions: <strong>{missed.length}</strong></span>
          </div>
        </div>

        {/* Explanation */}
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            These {missed.length} row{missed.length !== 1 ? 's' : ''} fall within your existing date range but
            are not in your current data. They may be transactions you missed.
          </p>
        </div>

        {/* Missed transactions table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-5 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Account</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {missed.map((row, i) => {
                const d = new Date(row.display.date)
                const dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
                const typeColor =
                  row.display.type === 'INCOME'
                    ? 'text-emerald-600'
                    : row.display.type === 'TRANSFER'
                    ? 'text-blue-600'
                    : 'text-red-500'

                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5 text-gray-700 whitespace-nowrap">{dateLabel}</td>
                    <td className="px-3 py-2.5 text-gray-600 truncate max-w-[100px]">{row.display.account}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(row.display.amount)}
                    </td>
                    <td className={`px-3 py-2.5 text-xs font-medium ${typeColor}`}>
                      {row.display.type}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleSkipAll}
            disabled={isInserting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <SkipForward size={15} />
            Skip all
          </button>
          <button
            onClick={handleInsertAll}
            disabled={isInserting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isInserting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CheckCircle size={15} />
            )}
            Insert all {missed.length}
          </button>
        </div>
      </div>
    </div>
  )
}
