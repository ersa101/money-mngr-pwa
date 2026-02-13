'use client'

import { db } from './db'

// Error log entry interface
export interface ErrorLogEntry {
  id?: number
  timestamp: Date
  type: 'IMPORT_ERROR' | 'TRANSACTION_ERROR' | 'VALIDATION_ERROR' | 'APP_ERROR'
  source: string // 'CSV_IMPORT', 'ADD_TRANSACTION', 'ACCOUNT_OPERATION', etc.
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  message: string
  details?: {
    rowIndex?: number
    rowData?: Record<string, unknown>
    csvRow?: Record<string, unknown>
    stack?: string
    [key: string]: unknown
  }
  userId?: string // For multi-user support in future
  resolved?: boolean
}

// Activity log entry interface
export interface ActivityLogEntry {
  id?: number
  timestamp: Date
  action: 'IMPORT_START' | 'IMPORT_COMPLETE' | 'IMPORT_FAILED' | 'TRANSACTION_CREATED' | 'ACCOUNT_UPDATED' | 'CATEGORY_CREATED' | string
  source: string // Component or function that triggered the action
  details?: {
    importedCount?: number
    errorCount?: number
    fileName?: string
    accountId?: number
    accountName?: string
    transactionId?: number
    [key: string]: unknown
  }
  userId?: string
}

// Create in-memory logs (can be persisted to IndexedDB later if needed)
const errorLogs: ErrorLogEntry[] = []
const activityLogs: ActivityLogEntry[] = []

// Add error log entry
export function logError(entry: Omit<ErrorLogEntry, 'id' | 'timestamp'>) {
  const errorEntry: ErrorLogEntry = {
    ...entry,
    timestamp: new Date(),
  }
  errorLogs.push(errorEntry)
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${entry.type}] ${entry.message}`, entry.details)
  }
  
  return errorEntry
}

// Add activity log entry
export function logActivity(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) {
  const activityEntry: ActivityLogEntry = {
    ...entry,
    timestamp: new Date(),
  }
  activityLogs.push(activityEntry)
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${entry.action}] ${entry.source}`, entry.details)
  }
  
  return activityEntry
}

// Get all error logs
export function getErrorLogs(): ErrorLogEntry[] {
  return [...errorLogs]
}

// Get all activity logs
export function getActivityLogs(): ActivityLogEntry[] {
  return [...activityLogs]
}

// Get error logs by type
export function getErrorLogsByType(type: ErrorLogEntry['type']): ErrorLogEntry[] {
  return errorLogs.filter((log) => log.type === type)
}

// Get error logs by severity
export function getErrorLogsBySeverity(severity: ErrorLogEntry['severity']): ErrorLogEntry[] {
  return errorLogs.filter((log) => log.severity === severity)
}

// Get activity logs by action
export function getActivityLogsByAction(action: string): ActivityLogEntry[] {
  return activityLogs.filter((log) => log.action === action)
}

// Get logs in a time range
export function getLogsInRange(startTime: Date, endTime: Date) {
  return {
    errors: errorLogs.filter((log) => log.timestamp >= startTime && log.timestamp <= endTime),
    activities: activityLogs.filter((log) => log.timestamp >= startTime && log.timestamp <= endTime),
  }
}

// Clear all logs (for testing/cleanup)
export function clearAllLogs() {
  errorLogs.length = 0
  activityLogs.length = 0
}

// Export logs as JSON for download
export function exportLogsAsJSON() {
  return {
    exported: new Date().toISOString(),
    summary: {
      totalErrors: errorLogs.length,
      totalActivities: activityLogs.length,
      errorsByType: Object.fromEntries(
        Array.from(new Set(errorLogs.map((l) => l.type))).map((type) => [
          type,
          errorLogs.filter((l) => l.type === type).length,
        ])
      ),
      errorsBySeverity: Object.fromEntries(
        Array.from(new Set(errorLogs.map((l) => l.severity))).map((severity) => [
          severity,
          errorLogs.filter((l) => l.severity === severity).length,
        ])
      ),
    },
    errors: errorLogs,
    activities: activityLogs,
  }
}

// Get recent errors (last N)
export function getRecentErrors(count: number = 10): ErrorLogEntry[] {
  return errorLogs.slice(-count).reverse()
}

// Get recent activities (last N)
export function getRecentActivities(count: number = 10): ActivityLogEntry[] {
  return activityLogs.slice(-count).reverse()
}
