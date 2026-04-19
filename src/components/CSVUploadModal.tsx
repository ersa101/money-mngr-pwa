'use client'

import React, { useState, useRef } from 'react'
import { Upload, AlertCircle, CheckCircle, Download } from 'lucide-react'
import { parseCSV, importTransactionsFromCSV, PendingMissedRow } from '@/lib/csvImport'
import { ImportPreviewModal } from '@/components/ImportPreviewModal'
import { useDb } from '@/contexts/DbContext'
import { ActionLogger } from '@/lib/actionLogger'

interface CSVUploadProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function CSVUploadModal({ onSuccess, trigger }: CSVUploadProps) {
  const db = useDb()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' })
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [previewData, setPreviewData] = useState<{
    blindInserted: number
    skipped: number
    errors: string[]
    missed: PendingMissedRow[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setProgress({ current: 0, total: 100, stage: 'Reading file...' })

    ActionLogger.csvImportStart(file.name)

    try {
      setProgress({ current: 10, total: 100, stage: 'Parsing CSV...' })
      const rows = await parseCSV(file)

      setProgress({ current: 30, total: 100, stage: `Importing ${rows.length} transactions...` })

      const importResult = await importTransactionsFromCSV(db, rows, (current, total) => {
        const percent = 30 + Math.floor((current / total) * 70)
        setProgress({ current: percent, total: 100, stage: `Importing ${current}/${total} transactions...` })
      })

      setProgress({ current: 100, total: 100, stage: 'Complete!' })

      if (importResult.status === 'PREVIEW_REQUIRED') {
        // Show missed-transaction preview before closing
        ActionLogger.csvImportSuccess(importResult.blindInserted, file.name)
        setPreviewData({
          blindInserted: importResult.blindInserted,
          skipped: importResult.skipped,
          errors: importResult.errors,
          missed: importResult.missed,
        })
      } else {
        // COMPLETE — no overlap surprises
        if (importResult.errors.length === 0) {
          ActionLogger.csvImportSuccess(importResult.imported, file.name)
        } else {
          ActionLogger.csvImportError(`${importResult.errors.length} errors`, file.name)
        }
        setResult({
          imported: importResult.imported,
          skipped: importResult.skipped,
          errors: importResult.errors,
        })
        if (onSuccess) onSuccess()
      }
    } catch (error) {
      ActionLogger.csvImportError(String(error), file.name)
      setResult({ imported: 0, skipped: 0, errors: [String(error)] })
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handlePreviewDone = (insertedCount: number) => {
    if (!previewData) return
    setResult({
      imported: previewData.blindInserted + insertedCount,
      skipped: previewData.skipped + (insertedCount === 0 ? previewData.missed.length : 0),
      errors: previewData.errors,
    })
    setPreviewData(null)
    if (onSuccess) onSuccess()
  }

  return (
    <>
      {trigger ? (
        <span style={{ display: 'contents' }} onClick={() => setIsOpen(true)}>
          {trigger}
        </span>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium hover:bg-green-700 transition-colors"
        >
          <Upload size={18} />
          Import CSV
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Import Transactions</h2>
              <p className="text-sm text-slate-400 mt-1">
                Upload a CSV file with columns: Account, Category, Subcategory, Amount, Description, Date
              </p>
            </div>

            {!result ? (
              <div className="space-y-4">
                {/* Download Template */}
                <div className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">Download Template</p>
                    <p className="text-xs text-slate-400">Use our template for correct format</p>
                  </div>
                  <a
                    href="/csv-template.csv"
                    download="money-mngr-template.csv"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
                  >
                    <Download size={14} />
                    Template
                  </a>
                </div>

                <div
                  className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-slate-500 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-white font-medium">Click to select file</p>
                  <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  disabled={isLoading}
                  className="hidden"
                />

                {isLoading && progress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">{progress.stage}</span>
                      <span className="text-slate-400">{progress.current}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-green-600 h-2.5 transition-all duration-300 ease-out"
                        style={{ width: `${progress.current}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? 'Importing...' : 'Select File'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-lg flex gap-3 ${
                    result.errors.length === 0
                      ? 'bg-green-900/30 border border-green-700'
                      : 'bg-yellow-900/30 border border-yellow-700'
                  }`}
                >
                  {result.errors.length === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-white">Import Complete</p>
                    <p className="text-sm text-slate-300 mt-1">
                      {result.imported} transaction{result.imported !== 1 ? 's' : ''} imported
                      {result.skipped > 0 ? `, ${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''} skipped` : ''}
                    </p>
                    {result.errors.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-yellow-400">{result.errors.length} error(s):</p>
                          <button
                            onClick={() => navigator.clipboard.writeText(result.errors.join('\n'))}
                            className="text-xs px-2 py-0.5 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
                          >
                            Copy all errors
                          </button>
                        </div>
                        <textarea
                          readOnly
                          value={result.errors.join('\n')}
                          rows={Math.min(result.errors.length + 1, 6)}
                          className="w-full text-xs text-slate-300 bg-slate-900 border border-slate-600 rounded p-2 resize-none font-mono select-all"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setResult(null); setIsOpen(false) }}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => setResult(null)}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-600 text-white hover:bg-slate-700 transition-colors"
                  >
                    Import Another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ImportPreviewModal — shown on top when import has missed transactions */}
      {previewData && (
        <ImportPreviewModal
          blindInserted={previewData.blindInserted}
          skipped={previewData.skipped}
          missed={previewData.missed}
          onDone={handlePreviewDone}
        />
      )}
    </>
  )
}
