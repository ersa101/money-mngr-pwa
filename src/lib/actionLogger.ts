'use client'

// Client-side utility to log user actions to server
// All logs are persisted to .data/user_actions.log

export type ActionType =
  | 'PAGE_VIEW'
  | 'CSV_IMPORT_START'
  | 'CSV_IMPORT_SUCCESS'
  | 'CSV_IMPORT_ERROR'
  | 'TRANSACTION_CREATE'
  | 'TRANSACTION_UPDATE'
  | 'TRANSACTION_DELETE'
  | 'ACCOUNT_CREATE'
  | 'ACCOUNT_UPDATE'
  | 'ACCOUNT_DELETE'
  | 'CATEGORY_CREATE'
  | 'MAGIC_BOX_PARSE'
  | 'MAGIC_BOX_CONFIRM'
  | 'DATA_CLEAR'
  | 'SETTINGS_CHANGE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ERROR'

interface LogDetails {
  page?: string
  transactionId?: number
  accountId?: number
  categoryId?: number
  amount?: number
  count?: number
  fileName?: string
  error?: string
  [key: string]: string | number | boolean | undefined
}

// Log user action to server
export async function logAction(action: ActionType, details: LogDetails = {}): Promise<void> {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, details }),
    })
  } catch (err) {
    // Silent fail - don't break app if logging fails
    console.warn('Failed to log action:', err)
  }
}

// Convenience functions for common actions
export const ActionLogger = {
  pageView: (page: string) => logAction('PAGE_VIEW', { page }),

  csvImportStart: (fileName: string) => logAction('CSV_IMPORT_START', { fileName }),
  csvImportSuccess: (count: number, fileName: string) => logAction('CSV_IMPORT_SUCCESS', { count, fileName }),
  csvImportError: (error: string, fileName: string) => logAction('CSV_IMPORT_ERROR', { error, fileName }),

  transactionCreate: (id: number, amount: number, description?: string) =>
    logAction('TRANSACTION_CREATE', { transactionId: id, amount, description }),
  transactionUpdate: (id: number) => logAction('TRANSACTION_UPDATE', { transactionId: id }),
  transactionDelete: (id: number) => logAction('TRANSACTION_DELETE', { transactionId: id }),

  accountCreate: (id: number, name: string) => logAction('ACCOUNT_CREATE', { accountId: id, name }),
  accountUpdate: (id: number, name: string) => logAction('ACCOUNT_UPDATE', { accountId: id, name }),
  accountDelete: (id: number) => logAction('ACCOUNT_DELETE', { accountId: id }),

  categoryCreate: (id: number, name: string) => logAction('CATEGORY_CREATE', { categoryId: id, name }),

  magicBoxParse: (input: string) => logAction('MAGIC_BOX_PARSE', { input: input.substring(0, 50) }),
  magicBoxConfirm: (amount: number, category?: string) => logAction('MAGIC_BOX_CONFIRM', { amount, category }),

  dataClear: (table: string) => logAction('DATA_CLEAR', { table }),

  login: (email?: string) => logAction('LOGIN', { email }),
  logout: () => logAction('LOGOUT', {}),

  error: (error: string, source: string) => logAction('ERROR', { error: error.substring(0, 200), source }),
}
