export interface CSVValidationResult {
  isValid: boolean
  headers: {
    valid: boolean
    missing: string[]
    extra: string[]
  }
  rows: {
    valid: CSVRow[]
    invalid: CSVRowError[]
  }
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
  }
}

export interface CSVRow {
  rowNumber: number
  date: string
  account: string
  category: string
  subcategory: string
  note: string
  type: 'Expense' | 'Income' | 'Transfer-Out' | 'Transfer-In'
  description: string
  amount: number
  currency: string
}

export interface CSVRowError {
  rowNumber: number
  rawData: string
  errors: string[]
}

const REQUIRED_HEADERS = [
  'Date',
  'Account',
  'Category',
  'Subcategory',
  'Note',
  'Type',
  'Description',
  'Amount',
  'Currency',
]

const VALID_TYPES = ['Expense', 'Income', 'Transfer-Out', 'Transfer-In']

// Date formats we accept
const DATE_FORMATS = [
  /^\d{2}\/\d{2}\/\d{4}$/, // dd/MM/yyyy
  /^\d{2}-\d{2}-\d{4}$/, // dd-MM-yyyy
  /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/, // dd/MM/yyyy HH:mm
  /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/, // dd-MM-yyyy HH:mm
  /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/, // dd/MM/yyyy HH:mm:ss
  /^\d{4}-\d{2}-\d{2}$/, // yyyy-MM-dd (ISO)
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO with time
]

export function validateCSV(csvContent: string): CSVValidationResult {
  const lines = csvContent.trim().split(/\r?\n/)

  if (lines.length < 2) {
    return {
      isValid: false,
      headers: { valid: false, missing: REQUIRED_HEADERS, extra: [] },
      rows: { valid: [], invalid: [] },
      summary: { totalRows: 0, validRows: 0, invalidRows: 0 },
    }
  }

  // Parse and validate headers
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine).map((h) => h.trim())
  const headersLower = headers.map((h) => h.toLowerCase())
  const requiredLower = REQUIRED_HEADERS.map((h) => h.toLowerCase())

  const missing = REQUIRED_HEADERS.filter(
    (h) => !headersLower.includes(h.toLowerCase())
  )
  const extra = headers.filter((h) => !requiredLower.includes(h.toLowerCase()))

  const headersValid = missing.length === 0

  if (!headersValid) {
    return {
      isValid: false,
      headers: { valid: false, missing, extra },
      rows: { valid: [], invalid: [] },
      summary: {
        totalRows: lines.length - 1,
        validRows: 0,
        invalidRows: lines.length - 1,
      },
    }
  }

  // Build header index map (case-insensitive)
  const headerIndex: Record<string, number> = {}
  headers.forEach((h, i) => {
    const key = h.toLowerCase()
    headerIndex[key] = i
  })

  // Validate each row
  const validRows: CSVRow[] = []
  const invalidRows: CSVRowError[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    const rowNumber = i + 1 // 1-indexed for user display
    const values = parseCSVLine(line)
    const errors: string[] = []

    // Get values by header name
    const getValue = (header: string): string => {
      const idx = headerIndex[header.toLowerCase()]
      return idx !== undefined ? (values[idx] || '').trim() : ''
    }

    const dateStr = getValue('Date')
    const account = getValue('Account')
    const category = getValue('Category')
    const subcategory = getValue('Subcategory')
    const note = getValue('Note')
    const typeStr = getValue('Type')
    const description = getValue('Description')
    const amountStr = getValue('Amount')
    const currency = getValue('Currency') || 'INR'

    // Validate Date
    if (!dateStr) {
      errors.push('Date is required')
    } else if (!DATE_FORMATS.some((fmt) => fmt.test(dateStr))) {
      errors.push(
        `Invalid date format '${dateStr}'. Use: dd/MM/yyyy or dd/MM/yyyy HH:mm`
      )
    }

    // Validate Account
    if (!account) {
      errors.push('Account is required')
    }

    // Validate Type
    if (!typeStr) {
      errors.push('Type is required')
    } else if (
      !VALID_TYPES.some((t) => t.toLowerCase() === typeStr.toLowerCase())
    ) {
      errors.push(
        `Invalid Type '${typeStr}'. Use: Expense, Income, Transfer-Out, Transfer-In`
      )
    }

    // Validate Note
    if (!note) {
      errors.push('Note is required')
    }

    // Validate Amount
    const amount = parseFloat(amountStr.replace(/,/g, ''))
    if (!amountStr || isNaN(amount)) {
      errors.push('Amount is required and must be a number')
    } else if (amount <= 0) {
      errors.push('Amount must be greater than 0')
    }

    // Validate Category (required for Expense/Income, not for Transfer)
    const isTransfer = typeStr.toLowerCase().includes('transfer')
    if (!isTransfer && !category) {
      errors.push('Category is required for Expense/Income transactions')
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber,
        rawData: line,
        errors,
      })
    } else {
      validRows.push({
        rowNumber,
        date: dateStr,
        account,
        category,
        subcategory,
        note,
        type: normalizeType(typeStr),
        description,
        amount,
        currency,
      })
    }
  }

  return {
    isValid: invalidRows.length === 0,
    headers: { valid: true, missing: [], extra },
    rows: { valid: validRows, invalid: invalidRows },
    summary: {
      totalRows: lines.length - 1,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
    },
  }
}

function normalizeType(
  type: string
): 'Expense' | 'Income' | 'Transfer-Out' | 'Transfer-In' {
  const lower = type.toLowerCase()
  if (lower === 'expense') return 'Expense'
  if (lower === 'income') return 'Income'
  if (lower === 'transfer-out' || lower === 'transferout') return 'Transfer-Out'
  if (lower === 'transfer-in' || lower === 'transferin') return 'Transfer-In'
  return 'Expense' // Default
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

// Generate copiable text for failed rows
export function generateFailedRowsText(errors: CSVRowError[]): string {
  const header = REQUIRED_HEADERS.join(',')
  const rows = errors.map((e) => e.rawData)
  return [header, ...rows].join('\n')
}
