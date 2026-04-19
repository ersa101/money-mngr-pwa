'use client'

import type { MySubClassedDB } from './db'
import { validateCSV } from './csvValidator'
import { computeSourceHash, getDBDateRange, getExistingHashesInRange } from './importUtils'

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

// ─── Return types ────────────────────────────────────────────────────────────

/** A transaction that was in the overlap window but NOT found in the DB — shown in preview. */
export interface PendingMissedRow {
  txnObj: Record<string, unknown>
  balanceChanges: Array<{ accountId: number; delta: number }>
  display: {
    date: string       // ISO string for display
    amount: number
    account: string
    type: string       // 'EXPENSE' | 'INCOME' | 'TRANSFER'
    category: string
  }
}

export type ImportResult =
  | { status: 'COMPLETE'; imported: number; skipped: number; errors: string[] }
  | { status: 'PREVIEW_REQUIRED'; blindInserted: number; skipped: number; errors: string[]; missed: PendingMissedRow[] }

// ─── Caches ──────────────────────────────────────────────────────────────────

// Cache maps for async category/account creation
const categoryCache = new Map<string, number>()
const accountCache = new Map<string, number>()

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Helper to get or create a category with proper awaiting
async function getOrCreateCategory(
  db: MySubClassedDB,
  name: string,
  type: 'EXPENSE' | 'INCOME',
  parentId?: number
): Promise<number> {
  const cacheKey = `${type}:${name}:${parentId || 0}`

  // Check cache first
  if (categoryCache.has(cacheKey)) {
    const cachedId = categoryCache.get(cacheKey)!
    if (cachedId > 0) return cachedId
  }

  // Check database
  const existing = await db.categories
    .where('name')
    .equalsIgnoreCase(name)
    .filter(c => c && c.type === type && (c.parentId === parentId || (!c.parentId && !parentId)))
    .first()

  if (existing?.id) {
    categoryCache.set(cacheKey, existing.id)
    return existing.id
  }

  // Create new category - MUST AWAIT!
  const newId = await db.categories.add({
    name: name.trim(),
    type,
    parentId: parentId || undefined,
    icon: '',
    createdAt: new Date().toISOString(),
    updatedAt: Date.now(),
  })

  // Cache the ACTUAL ID, not a placeholder
  categoryCache.set(cacheKey, newId)
  return newId
}

// Helper to get or create subcategory
async function getOrCreateSubCategory(
  db: MySubClassedDB,
  name: string,
  parentName: string,
  type: 'EXPENSE' | 'INCOME'
): Promise<{ categoryId: number; subCategoryId: number }> {
  const parentId = await getOrCreateCategory(db, parentName, type)
  const subCategoryId = await getOrCreateCategory(db, name, type, parentId)
  return { categoryId: parentId, subCategoryId }
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

export async function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string

        // ✅ P1.1 Strict header validation — reject entire file if required columns missing
        const headerValidation = validateCSV(csv)
        if (!headerValidation.headers.valid) {
          const missing = headerValidation.headers.missing
          reject(new Error(
            `CSV header error: Missing required column(s): ${missing.join(', ')}.\n` +
            `Required columns: Date, Account, Category, Subcategory, Note, Type, Description, Amount, Currency.\n` +
            `Tip: Download the CSV template from the import dialog for the correct format.`
          ))
          return
        }

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

          // Only require date — amount can be blank (treated as 0) or zero
          if (row.date) {
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

// ─── Insert confirmed missed rows (called from UI after user confirms preview) ──

export async function insertConfirmedMissedRows(
  db: MySubClassedDB,
  rows: PendingMissedRow[]
): Promise<number> {
  if (!rows.length) return 0

  await db.transactions.bulkAdd(rows.map(r => r.txnObj) as any[])

  // Aggregate and apply balance changes
  const deltas = new Map<number, number>()
  for (const row of rows) {
    for (const ch of row.balanceChanges) {
      deltas.set(ch.accountId, (deltas.get(ch.accountId) || 0) + ch.delta)
    }
  }
  for (const [accountId, delta] of deltas.entries()) {
    const account = await db.accounts.get(accountId)
    if (account) {
      await db.accounts.update(accountId, {
        balance: Math.round((account.balance + delta) * 100) / 100,
      })
    }
  }

  return rows.length
}

// ─── Main import function ─────────────────────────────────────────────────────

export async function importTransactionsFromCSV(
  db: MySubClassedDB,
  rows: CSVRow[],
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
  const errors: string[] = []

  // Clear caches at start of each import
  categoryCache.clear()
  accountCache.clear()

  let currentStep = 0
  const reportProgress = () => {
    if (onProgress) onProgress(Math.min(currentStep, rows.length), rows.length)
  }

  // Phase 1: Load existing accounts/categories
  reportProgress()
  const existingAccounts = await db.accounts.toArray()
  currentStep = Math.ceil(rows.length * 0.02)
  reportProgress()

  const existingCategories = await db.categories.toArray()
  currentStep = Math.ceil(rows.length * 0.05)
  reportProgress()

  // Populate caches with null safety
  for (const a of existingAccounts) {
    if (a && a.name && a.id) accountCache.set(a.name, a.id)
  }
  for (const c of existingCategories) {
    if (c && c.name && c.type && c.id) {
      categoryCache.set(`${c.type}:${c.name}:${c.parentId || 0}`, c.id)
    }
  }

  // Get DB date range for zone classification (BEFORE Phase 2 so we don't count new accounts)
  const { earliest: dbEarliest, latest: dbLatest } = await getDBDateRange(db)
  const isEmptyDB = !dbEarliest || !dbLatest

  // Phase 2: First pass - identify new accounts
  const newAccounts: Array<{ name: string; type: string; balance: number; thresholdValue: number; color: string; icon: string }> = []
  const hasLetters = (s?: string) => !!(s && /[A-Za-z]/.test(s))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    if (row.account && hasLetters(row.account) && !accountCache.has(row.account)) {
      accountCache.set(row.account, -1)
      newAccounts.push({
        name: row.account,
        type: 'BANK',
        balance: 0,
        thresholdValue: 0,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        icon: 'bank',
      })
    }

    const typeStr = (row.type || '').toLowerCase()
    const isTransfer = typeStr.includes('transfer')

    if (isTransfer && row.category && hasLetters(row.category) && !accountCache.has(row.category)) {
      accountCache.set(row.category, -1)
      newAccounts.push({
        name: row.category,
        type: 'BANK',
        balance: 0,
        thresholdValue: 0,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        icon: 'bank',
      })
    }

    if (i % 500 === 0) {
      currentStep = Math.ceil(rows.length * 0.05) + Math.ceil((i / rows.length) * rows.length * 0.05)
      reportProgress()
    }
  }

  currentStep = Math.ceil(rows.length * 0.10)
  reportProgress()

  // Phase 3: Create new accounts
  for (let i = 0; i < newAccounts.length; i++) {
    const acc = newAccounts[i]
    const id = await db.accounts.add(acc as any)
    accountCache.set(acc.name, id)
    currentStep = Math.ceil(rows.length * 0.10) + Math.ceil((i / Math.max(newAccounts.length, 1)) * rows.length * 0.05)
    reportProgress()
  }

  currentStep = Math.ceil(rows.length * 0.15)
  reportProgress()

  // Phase 5: Build all transaction objects with sourceHash + zone classification
  type Zone = 'BEFORE' | 'AFTER' | 'OVERLAP'
  type BuiltEntry = {
    txnObj: Record<string, unknown>
    sourceHash: string
    zone: Zone
    balanceChanges: Array<{ accountId: number; delta: number }>
    display: PendingMissedRow['display']
  }
  const builtEntries: BuiltEntry[] = []

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    if (!row) continue

    try {
      // Parse amount
      const amount = parseFloat(row.amount || '0')
      if (isNaN(amount) || amount < 0) {
        errors.push(`Invalid amount (${row.amount}) in row ${rowIndex + 2}`)
        continue
      }

      // Parse date
      let date = new Date()
      if (row.date) {
        const dateStr = row.date.trim()
        let parsed: Date | null = null

        const patterns = [
          /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
          /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
          /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
          /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        ]

        for (const pattern of patterns) {
          const match = dateStr.match(pattern)
          if (match) {
            const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = match
            parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds))
            if (!isNaN(parsed.getTime())) break
          }
        }

        if (!parsed || isNaN(parsed.getTime())) {
          const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/)
          if (isoMatch) {
            const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = isoMatch
            parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds))
          }
        }

        if (!parsed || isNaN(parsed.getTime())) parsed = new Date(dateStr)
        if (parsed && !isNaN(parsed.getTime())) date = parsed
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
      let subCategoryId: number | undefined
      let toAccountId: number | undefined
      const isTransfer = transactionType === 'TRANSFER'

      if (isTransfer && row.category && hasLetters(row.category)) {
        toAccountId = accountCache.get(row.category)
      } else if (!isTransfer && row.category && hasLetters(row.category)) {
        const catType = transactionType === 'INCOME' ? 'INCOME' : 'EXPENSE'
        if (row.subcategory && hasLetters(row.subcategory)) {
          const result = await getOrCreateSubCategory(db, row.subcategory, row.category, catType)
          categoryId = result.categoryId
          subCategoryId = result.subCategoryId
        } else {
          categoryId = await getOrCreateCategory(db, row.category, catType)
        }
      }

      const roundedAmount = Math.round(amount * 100) / 100

      // Compute sourceHash — uses parsed ISO date for cross-import consistency
      const sourceHash = await computeSourceHash(
        date.toISOString(),
        roundedAmount,
        row.account,
        transactionType
      )

      // Zone classification
      let zone: Zone
      if (isEmptyDB) {
        zone = 'BEFORE' // treat all as blind when DB is empty
      } else if (date < dbEarliest!) {
        zone = 'BEFORE'
      } else if (date > dbLatest!) {
        zone = 'AFTER'
      } else {
        zone = 'OVERLAP'
      }

      // Per-row balance changes (applied only for the rows we actually insert)
      const balanceChanges: Array<{ accountId: number; delta: number }> = []
      if (transactionType === 'EXPENSE') {
        balanceChanges.push({ accountId: fromAccountId, delta: -roundedAmount })
      } else if (transactionType === 'INCOME') {
        balanceChanges.push({ accountId: fromAccountId, delta: +roundedAmount })
      } else if (isTransfer && toAccountId) {
        balanceChanges.push({ accountId: fromAccountId, delta: -roundedAmount })
        balanceChanges.push({ accountId: toAccountId, delta: +roundedAmount })
      }

      builtEntries.push({
        txnObj: {
          date: date.toISOString(),
          amount: roundedAmount,
          fromAccountId,
          categoryId: isTransfer ? undefined : categoryId,
          subCategoryId: isTransfer ? undefined : subCategoryId,
          toAccountId: isTransfer ? toAccountId : undefined,
          description: row.note || undefined,
          notes: row.description || undefined,
          transactionType,
          status: 'CONFIRMED',
          source: 'CSV_IMPORT',
          currency: 'INR',
          csvCategory: row.category || undefined,
          csvSubcategory: row.subcategory || undefined,
          sourceHash,
          createdAt: new Date().toISOString(),
          updatedAt: Date.now(),
        },
        sourceHash,
        zone,
        balanceChanges,
        display: {
          date: date.toISOString(),
          amount: roundedAmount,
          account: row.account,
          type: transactionType,
          category: row.category || '',
        },
      })

    } catch (error) {
      errors.push(`Row ${rowIndex + 2}: ${error}`)
    }

    if (rowIndex % 100 === 0) {
      currentStep = Math.ceil(rows.length * 0.15) + Math.ceil((rowIndex / rows.length) * rows.length * 0.70)
      reportProgress()
    }
  }

  // Phase 5.5: Dedup classification for OVERLAP zone
  const blindEntries = isEmptyDB
    ? builtEntries
    : builtEntries.filter(e => e.zone !== 'OVERLAP')
  const overlapEntries = isEmptyDB ? [] : builtEntries.filter(e => e.zone === 'OVERLAP')

  let skipped = 0
  const missedEntries: BuiltEntry[] = []

  if (overlapEntries.length > 0) {
    // Single batch DB call — O(n) not O(n²)
    const existingHashes = await getExistingHashesInRange(db, dbEarliest!, dbLatest!)
    for (const entry of overlapEntries) {
      if (existingHashes.has(entry.sourceHash)) {
        skipped++
      } else {
        missedEntries.push(entry)
      }
    }
  }

  currentStep = Math.ceil(rows.length * 0.85)
  reportProgress()

  // Phase 6: Insert blind entries (BEFORE + AFTER zones)
  if (blindEntries.length > 0) {
    await db.transactions.bulkAdd(blindEntries.map(e => e.txnObj) as any[])
  }

  currentStep = Math.ceil(rows.length * 0.95)
  reportProgress()

  // Phase 7: Apply balance deltas for blind entries only
  const blindDeltas = new Map<number, number>()
  for (const entry of blindEntries) {
    for (const ch of entry.balanceChanges) {
      blindDeltas.set(ch.accountId, (blindDeltas.get(ch.accountId) || 0) + ch.delta)
    }
  }
  for (const [accountId, delta] of blindDeltas.entries()) {
    const account = await db.accounts.get(accountId)
    if (account) {
      await db.accounts.update(accountId, {
        balance: Math.round((account.balance + delta) * 100) / 100,
      })
    }
  }

  currentStep = rows.length
  reportProgress()

  // Return PREVIEW_REQUIRED if there are overlap rows not in DB (missed transactions)
  if (missedEntries.length > 0) {
    return {
      status: 'PREVIEW_REQUIRED',
      blindInserted: blindEntries.length,
      skipped,
      errors,
      missed: missedEntries.map(e => ({
        txnObj: e.txnObj,
        balanceChanges: e.balanceChanges,
        display: e.display,
      })),
    }
  }

  return {
    status: 'COMPLETE',
    imported: blindEntries.length,
    skipped,
    errors,
  }
}
