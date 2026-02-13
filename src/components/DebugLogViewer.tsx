'use client'

import { useState } from 'react'
import { getRecentErrors, getRecentActivities, exportLogsAsJSON, clearAllLogs } from '@/lib/logger'
import { Button } from './ui/button'
import { X, Download, Trash2 } from 'lucide-react'

export function DebugLogViewer() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'errors' | 'activities'>('errors')

  const recentErrors = getRecentErrors(20)
  const recentActivities = getRecentActivities(20)

  const handleExportLogs = () => {
    const logs = exportLogsAsJSON()
    const dataStr = JSON.stringify(logs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `logs-${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      clearAllLogs()
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-32 right-4 px-3 py-2 bg-gray-800 text-white text-xs rounded-md hover:bg-gray-700 z-50 cursor-pointer"
        title="Debug logs"
      >
        🐛 Logs
      </button>
    )
  }

  return (
    <div className="fixed bottom-32 right-4 w-96 h-96 bg-white border border-gray-300 rounded-lg shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-bold text-sm">Debug Logs</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pt-3 border-b border-gray-200">
        <button
          onClick={() => setTab('errors')}
          className={`px-3 py-1 text-xs font-medium rounded ${
            tab === 'errors'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Errors ({recentErrors.length})
        </button>
        <button
          onClick={() => setTab('activities')}
          className={`px-3 py-1 text-xs font-medium rounded ${
            tab === 'activities'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Activities ({recentActivities.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 text-xs font-mono bg-gray-50">
        {tab === 'errors' && (
          <div className="space-y-2">
            {recentErrors.length === 0 ? (
              <div className="text-gray-400">No errors logged</div>
            ) : (
              recentErrors.map((err, idx) => (
                <div key={idx} className="bg-white p-2 border-l-4 border-red-500 rounded">
                  <div className="font-bold text-red-700">{err.message}</div>
                  <div className="text-gray-600">
                    {err.timestamp.toLocaleTimeString()} • {err.type}
                  </div>
                  {err.details && (
                    <div className="text-gray-500 mt-1">
                      {JSON.stringify(err.details, null, 2).split('\n').slice(0, 3).join('\n')}
                      {JSON.stringify(err.details, null, 2).split('\n').length > 3 && '...'}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'activities' && (
          <div className="space-y-2">
            {recentActivities.length === 0 ? (
              <div className="text-gray-400">No activities logged</div>
            ) : (
              recentActivities.map((act, idx) => (
                <div key={idx} className="bg-white p-2 border-l-4 border-blue-500 rounded">
                  <div className="font-bold text-blue-700">{act.action}</div>
                  <div className="text-gray-600">
                    {act.timestamp.toLocaleTimeString()} • {act.source}
                  </div>
                  {act.details && (
                    <div className="text-gray-500 mt-1">
                      {JSON.stringify(act.details, null, 2).split('\n').slice(0, 3).join('\n')}
                      {JSON.stringify(act.details, null, 2).split('\n').length > 3 && '...'}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
        <button
          onClick={handleExportLogs}
          className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
          title="Export logs as JSON"
        >
          <Download className="w-3 h-3" />
          Export
        </button>
        <button
          onClick={handleClearLogs}
          className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
          title="Clear all logs"
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
      </div>
    </div>
  )
}
