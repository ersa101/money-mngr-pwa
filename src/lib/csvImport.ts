'use client'

import { db } from './db'

export interface CSVRow {
  date?: string
  account?: string
  category?: string
  subcategory?: string
  note?: string
  amount?: string
  description?: string
  type?: string // 'Expense', 'Income', 'Transfer-Out', 'Transfer-In'
}

export async function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string
        
        // Robust CSV parser handling quoted fields and embedded newlines
        const parseCSVText = (text: string): string[][] => {
          const rows: string[][] = []
          let field = ''
          let row: string[] = []
          let inQuotes = false
          
          for (let i = 0; i < text.length; i++) {
            const ch = text[i]
            const next = text[i + 1]

            if (ch === '"') {
              if (inQuotes && next === '"') {
                field += '"'
                i++
              } else {
                inQuotes = !inQuotes
              }
              continue
            }

            if (ch === ',' && !inQuotes) {
              row.push(field)
              field = ''
              continue
            }

            if ((ch === '\n' || (ch === '\r' && next === '\n')) && !inQuotes) {
              if (ch === '\r' && next === '\n') i++
              row.push(field)
              rows.push(row)
              row = []
              field = ''
              continue
            }

            field += ch
          }

          if (field !== '' || row.length > 0) {
            row.push(field)
            rows.push(row)
          }

          return rows.map((r) => r.map((f) => f.trim().replace(/^"|"$/g, '')))
        }

        const lines = parseCSVText(csv).filter((r) => r.length > 0)
        if (lines.length === 0) return resolve([])
        
        // Normalize headers and map them to known keys
        const rawHeaders = lines[0]
        const normalize = (s: string) => s.replace(/[^a-z0-9]/gi, '').toLowerCase()

        const headerKeys: { [idx: number]: string } = {}
        const mapping: { [key: string]: string[] } = {
          date: ['date', 'datetime', 'timestamp'],
          account: ['account', 'accountname', 'fromaccount', 'acct'],
          category: ['category', 'maincategory'],
          subcategory: ['subcategory', 'subcategory', 'sub-category', 'sub_category'],
          note: ['note', 'memo', 'remarks'],
          amount: ['amount', 'inr', 'value', 'amt'],
          description: ['description', 'details'],
          type: ['incomeexpense', 'income', 'expense', 'type', 'transactiontype'],
          currency: ['currency']
        }

        for (let idx = 0; idx < rawHeaders.length; idx++) {
          const key = normalize(rawHeaders[idx])
          for (const mapKey of Object.keys(mapping)) {
            // Prefer exact alias match first
            if (mapping[mapKey].some((alias) => key === alias)) {
              headerKeys[idx] = mapKey
              break
            }
          }
          // If not matched exactly, fall back to substring match for longer aliases
          if (!headerKeys[idx]) {
            for (const mapKey of Object.keys(mapping)) {
              if (mapping[mapKey].some((alias) => alias.length > 3 && key.includes(alias))) {
                headerKeys[idx] = mapKey
                break
              }
            }
          }
        }

        const rows: CSVRow[] = []
        // helper to detect numeric-looking strings
        const looksNumeric = (v: string) => /^-?\d+(?:\.\d+)?$/.test(v.trim())

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i]
          const row: CSVRow = {}

          for (let idx = 0; idx < values.length; idx++) {
            const key = headerKeys[idx]
            const val = values[idx] ?? ''
            if (!key) continue

            if (key === 'date') row.date = val
            else if (key === 'account') {
              // avoid numeric-looking account names caused by bad CSV alignment
              if (!looksNumeric(val)) row.account = val
            }
            else if (key === 'category') row.category = val
            else if (key === 'subcategory') row.subcategory = val
            else if (key === 'amount') row.amount = val
            else if (key === 'description') row.description = val
            else if (key === 'note') row.note = val
            else if (key === 'type') row.type = val
            else if (key === 'currency') {
              // ignore for now, could be stored if needed
            }
          }

          // basic validation: require date and amount; account optional (some CSVs use separate columns)
          if (row.date && row.amount) {
            rows.push(row)
          }
        }

        resolve(rows)
      } catch (error) {
        reject(error)
      }
    }
    reader.readAsText(file)
  })
}

export async function importTransactionsFromCSV(
  rows: CSVRow[],
  onProgress?: (current: number, total: number) => void
) {
  const errors: string[] = []

  // Total steps: 10% for setup, 10% for accounts/categories, 70% for processing rows, 10% for saving
  const totalSteps = rows.length + Math.ceil(rows.length * 0.3) // Add 30% for overhead phases
  let currentStep = 0

  const reportProgress = () => {
    if (onProgress) {
      onProgress(Math.min(currentStep, rows.length), rows.length)
    }
  }

  // Phase 1: Pre-process all rows and collect unique accounts/categories
  reportProgress()

  // Cache for accounts and categories (name -> id)
  const accountCache = new Map<string, number>()
  const categoryCache = new Map<string, number>()

  // Loading existing data (5% progress)
  const existingAccounts = await db.accounts.toArray()
  currentStep = Math.ceil(rows.length * 0.02)
  reportProgress()

  const existingCategories = await db.categories.toArray()
  currentStep = Math.ceil(rows.length * 0.05)
  reportProgress()

  existingAccounts.forEach(a => accountCache.set(a.name, a.id!))
  existingCategories.forEach(c => categoryCache.set(c.name, c.id!))

  // Collect new accounts and categories to create
  const newAccounts: Array<{ name: string; type: string; balance: number; thresholdValue: number; color: string; icon: string }> = []
  const newCategories: Array<{ name: string; parentId?: number; type: string; icon: string }> = []
  const hasLetters = (s?: string) => !!(s && /[A-Za-z]/.test(s))

  // Phase 2: First pass - identify new accounts and categories (5-10% progress)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row.account && hasLetters(row.account) && !accountCache.has(row.account)) {
      accountCache.set(row.account, -1) // placeholder
      newAccounts.push({
        name: row.account,
        type: 'BANK',
        balance: 0,
        thresholdValue: 0,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        icon: 'bank',
      })
    }

    const typeStr = (row.type || '').toLowerCase()
    const isTransfer = typeStr.includes('transfer')
    const isIncome = typeStr.includes('income')

    if (isTransfer && row.category && hasLetters(row.category) && !accountCache.has(row.category)) {
      accountCache.set(row.category, -1)
      newAccounts.push({
        name: row.category,
        type: 'BANK',
        balance: 0,
        thresholdValue: 0,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        icon: 'bank',
      })
    } else if (!isTransfer && row.category && hasLetters(row.category) && !categoryCache.has(row.category)) {
      categoryCache.set(row.category, -1)
      newCategories.push({
        name: row.category,
        type: isIncome ? 'INCOME' : 'EXPENSE',
        icon: 'tag',
      })
    }

    // Update progress during scanning (5-10%)
    if (i % 500 === 0) {
      currentStep = Math.ceil(rows.length * 0.05) + Math.ceil((i / rows.length) * rows.length * 0.05)
      reportProgress()
    }
  }

  currentStep = Math.ceil(rows.length * 0.10)
  reportProgress()

  // Phase 3: Create accounts one by one (10-15% progress)
  for (let i = 0; i < newAccounts.length; i++) {
    const acc = newAccounts[i]
    const id = await db.accounts.add(acc as any)
    accountCache.set(acc.name, id)
    currentStep = Math.ceil(rows.length * 0.10) + Math.ceil((i / Math.max(newAccounts.length, 1)) * rows.length * 0.025)
    reportProgress()
  }

  // Phase 4: Create categories one by one (15-20% progress)
  for (let i = 0; i < newCategories.length; i++) {
    const cat = newCategories[i]
    const id = await db.categories.add(cat as any)
    categoryCache.set(cat.name, id)
    currentStep = Math.ceil(rows.length * 0.125) + Math.ceil((i / Math.max(newCategories.length, 1)) * rows.length * 0.025)
    reportProgress()
  }

  currentStep = Math.ceil(rows.length * 0.15)
  reportProgress()

  // Phase 5: Build all transactions (15-85% progress)
  const transactionsToAdd: any[] = []
  const accountBalanceDeltas = new Map<number, number>() // accountId -> balance change

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]

    try {
      // Parse amount - skip zero amounts silently (common in CSV exports)
      const amount = parseFloat(row.amount || '0')
      if (isNaN(amount) || amount < 0) {
        errors.push(`Invalid amount (${row.amount}) in row ${rowIndex + 2}`)
        continue
      }
      if (amount === 0) {
        // Skip zero-amount transactions silently - these are typically placeholders
        continue
      }

      // Parse date
      let date = new Date()
      if (row.date) {
        const dateStr = row.date.trim()
        let parsed: Date | null = null

        // Try various formats
        const patterns = [
          /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/, // dd-MM-yyyy HH:mm
          /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/, // dd/MM/yyyy HH:mm
          /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // dd-MM-yyyy
          /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // dd/MM/yyyy
        ]

        for (const pattern of patterns) {
          const match = dateStr.match(pattern)
          if (match) {
            const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = match
            parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds))
            if (!isNaN(parsed.getTime())) break
          }
        }

        // ISO format
        if (!parsed || isNaN(parsed.getTime())) {
          const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/)
          if (isoMatch) {
            const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = isoMatch
            parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds))
          }
        }

        // Fallback
        if (!parsed || isNaN(parsed.getTime())) {
          parsed = new Date(dateStr)
        }

        if (parsed && !isNaN(parsed.getTime())) {
          date = parsed
        }
      }

      // Transaction type
      const typeStr = (row.type || '').toLowerCase()
      let transactionType: 'EXPENSE' | 'INCOME' | 'TRANSFER' = 'EXPENSE'
      if (typeStr.includes('income')) transactionType = 'INCOME'
      else if (typeStr.includes('transfer')) transactionType = 'TRANSFER'

      // Get account ID
      if (!row.account || !hasLetters(row.account)) {
        errors.push(`Row ${rowIndex + 2} missing account`)
        continue
      }
      const fromAccountId = accountCache.get(row.account)
      if (!fromAccountId || fromAccountId <= 0) {
        errors.push(`Row ${rowIndex + 2} account not found: ${row.account}`)
        continue
      }

      let categoryId: number | undefined
      let toAccountId: number | undefined
      const isTransfer = transactionType === 'TRANSFER'

      if (isTransfer && row.category && hasLetters(row.category)) {
        toAccountId = accountCache.get(row.category)
      } else if (!isTransfer && row.category && hasLetters(row.category)) {
        categoryId = categoryCache.get(row.category)
      }

      const roundedAmount = Math.round(amount * 100) / 100

      transactionsToAdd.push({
        date: date.toISOString(),
        amount: roundedAmount,
        fromAccountId,
        toCategoryId: isTransfer ? undefined : categoryId,
        toAccountId: isTransfer ? toAccountId : undefined,
        description: row.description || row.note || row.category || 'Imported',
        isTransfer,
        transactionType,
        category: row.category,
        subCategory: row.subcategory,
        note: row.note,
        csvAccount: row.account,
        csvCategory: row.category,
        csvSubcategory: row.subcategory,
        csvIncomeExpense: row.type,
        csvDescription: row.description,
        csvCurrency: 'INR',
        importedAt: new Date().toISOString(),
      })

      // Track balance changes
      if (transactionType === 'EXPENSE') {
        accountBalanceDeltas.set(fromAccountId, (accountBalanceDeltas.get(fromAccountId) || 0) - roundedAmount)
      } else if (transactionType === 'INCOME') {
        accountBalanceDeltas.set(fromAccountId, (accountBalanceDeltas.get(fromAccountId) || 0) + roundedAmount)
      } else if (isTransfer && toAccountId) {
        accountBalanceDeltas.set(fromAccountId, (accountBalanceDeltas.get(fromAccountId) || 0) - roundedAmount)
        accountBalanceDeltas.set(toAccountId, (accountBalanceDeltas.get(toAccountId) || 0) + roundedAmount)
      }

    } catch (error) {
      errors.push(`Row ${rowIndex + 2}: ${error}`)
    }

    // Progress update (15-85% range)
    if (rowIndex % 100 === 0) {
      currentStep = Math.ceil(rows.length * 0.15) + Math.ceil((rowIndex / rows.length) * rows.length * 0.70)
      reportProgress()
    }
  }

  // Phase 6: Batch insert all transactions (85-95% progress)
  currentStep = Math.ceil(rows.length * 0.85)
  reportProgress()

  if (transactionsToAdd.length > 0) {
    await db.transactions.bulkAdd(transactionsToAdd)
  }

  currentStep = Math.ceil(rows.length * 0.95)
  reportProgress()

  // Phase 7: Update account balances (95-100% progress)
  const balanceEntries = Array.from(accountBalanceDeltas.entries())
  for (let i = 0; i < balanceEntries.length; i++) {
    const [accountId, delta] = balanceEntries[i]
    const account = await db.accounts.get(accountId)
    if (account) {
      const newBalance = Math.round((account.balance + delta) * 100) / 100
      await db.accounts.update(accountId, { balance: newBalance })
    }
    currentStep = Math.ceil(rows.length * 0.95) + Math.ceil((i / Math.max(balanceEntries.length, 1)) * rows.length * 0.05)
    reportProgress()
  }

  currentStep = rows.length
  reportProgress()

  return { imported: transactionsToAdd.length, errors }
}

// Convenience: import CSV by fetching from a public URL (e.g. '/sample-transactions.csv')
export async function importFromUrl(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch CSV from ${url}: ${res.statusText}`)
  const text = await res.text()
  // create a File so we can reuse parseCSV
  const file = new File([text], 'import.csv', { type: 'text/csv' })
  const rows = await parseCSV(file)
  return importTransactionsFromCSV(rows)
}
