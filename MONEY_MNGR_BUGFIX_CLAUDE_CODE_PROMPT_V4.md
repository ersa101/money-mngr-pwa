# 💰 Money Mngr PWA — Bug Fixes & Enhancements Prompt

> **Repository:** https://github.com/ersa101/money-mngr-pwa
> **Date:** February 24, 2026
> **Context:** Post-deployment fixes based on user testing
> **Priority:** Fix critical bugs first, then implement missing features

---

## 📋 CURRENT STATE

### What's Working
- Basic transaction CRUD
- Account management with types (including PERSON)
- PWA installed and running
- Google OAuth authentication
- Stats page with charts (partially working)

### What's Broken/Missing
| Issue | Severity | Root Cause |
|-------|----------|------------|
| Category shows "Unknown" in Stats | **CRITICAL** | categoryId race condition in CSV import |
| No date filters on Transactions page | HIGH | Feature not implemented |
| Sub-category not selectable | HIGH | Explicitly filtered out in code |
| CSV import creates invalid data | HIGH | Flexible parsing causes errors |
| Net Worth chart missing lines | MEDIUM | Only 1 Line component rendered |
| Account group not autocompleting | MEDIUM | Free text input only |
| Service worker cache issues | **CRITICAL** | Old cache incompatible with new code |

---

## 🔧 P0 — CRITICAL FIXES (Do First)

### P0.1: Fix Service Worker Cache

**Problem:** "Content unavailable. Resource was not cached" error.

**File:** `next.config.js`

**Solution:**
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest.json$/],
  // Add cache versioning to force refresh on new deploys
  cacheId: 'money-mngr-v2',  // INCREMENT THIS ON EACH DEPLOY
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-data',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-assets',
      },
    },
    {
      urlPattern: /\.(?:css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-style-assets',
      },
    },
    {
      // API routes should always go to network
      urlPattern: /\/api\/.*/i,
      handler: 'NetworkOnly',
    },
    {
      // Default: Network first for HTML pages
      urlPattern: /.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'others',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
```

**Additional Step:** Add cache-busting to layout.tsx:
```typescript
// src/app/layout.tsx - Add to metadata
export const metadata: Metadata = {
  // ... existing metadata
  other: {
    'cache-control': 'no-cache, no-store, must-revalidate',
    'pragma': 'no-cache',
    'expires': '0',
  },
};
```

---

### P0.2: Fix CSV Import categoryId Race Condition

**Problem:** Categories created but categoryId not properly assigned to transactions.

**File:** `src/lib/csvImport.ts`

**Root Cause:**
```typescript
// BROKEN: Placeholder used before actual ID available
categoryCache.set(row.category, -1);  // placeholder
db.categories.add({...});  // async, not awaited
categoryId = categoryCache.get(row.category);  // gets -1!
```

**Solution:**

Find the section where categories are created and ensure proper await:

```typescript
// When creating a new category
async function getOrCreateCategory(
  name: string, 
  type: 'EXPENSE' | 'INCOME',
  parentId?: number
): Promise<number> {
  // Check cache first
  const cacheKey = `${type}:${name}`;
  if (categoryCache.has(cacheKey)) {
    return categoryCache.get(cacheKey)!;
  }
  
  // Check database
  const existing = await db.categories
    .where('name')
    .equalsIgnoreCase(name)
    .and(c => c.type === type)
    .first();
  
  if (existing?.id) {
    categoryCache.set(cacheKey, existing.id);
    return existing.id;
  }
  
  // Create new category - MUST AWAIT!
  const newId = await db.categories.add({
    name: name.trim(),
    type,
    parentId: parentId || undefined,
    icon: type === 'INCOME' ? '💰' : '📦',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Cache the ACTUAL ID, not a placeholder
  categoryCache.set(cacheKey, newId);
  return newId;
}

// Similarly for sub-categories
async function getOrCreateSubCategory(
  name: string,
  parentName: string,
  type: 'EXPENSE' | 'INCOME'
): Promise<number> {
  const parentId = await getOrCreateCategory(parentName, type);
  return await getOrCreateCategory(name, type, parentId);
}
```

**Update transaction creation to use these functions:**

```typescript
// In the row processing loop
for (const row of rows) {
  try {
    let categoryId: number | undefined;
    let subCategoryId: number | undefined;
    
    const txnType = parseTransactionType(row.type);
    
    if (txnType !== 'TRANSFER' && row.category) {
      const catType = txnType === 'INCOME' ? 'INCOME' : 'EXPENSE';
      
      if (row.subcategory) {
        // Has sub-category: create both
        categoryId = await getOrCreateCategory(row.category, catType);
        subCategoryId = await getOrCreateSubCategory(row.subcategory, row.category, catType);
      } else {
        // No sub-category
        categoryId = await getOrCreateCategory(row.category, catType);
      }
    }
    
    // Create transaction with VALID categoryId
    await db.transactions.add({
      // ... other fields
      categoryId,
      subCategoryId,
      // Store original CSV values as fallback
      csvCategory: row.category,
      csvSubcategory: row.subcategory,
    });
    
    validCount++;
  } catch (error) {
    errors.push({ row: rowIndex, error: error.message, data: row });
  }
}
```

---

### P0.3: Fix Stats Category Lookup with Fallback

**Problem:** Stats shows "Unknown" when categoryId lookup fails.

**File:** `src/components/stats/CategoryComposition.tsx` (and similar stats components)

**Solution:** Add fallback to csvCategory field:

```typescript
// Create a reusable utility function
// File: src/lib/categoryUtils.ts

import { db } from './db';
import { Transaction, Category } from '@/types/database';

export interface ResolvedCategory {
  id: number | undefined;
  name: string;
  icon: string;
  parentName?: string;
}

export async function resolveCategory(
  transaction: Transaction,
  categories: Category[]
): Promise<ResolvedCategory> {
  // Try lookup by categoryId first
  if (transaction.categoryId) {
    const category = categories.find(c => c.id === transaction.categoryId);
    if (category) {
      let parentName: string | undefined;
      if (category.parentId) {
        const parent = categories.find(c => c.id === category.parentId);
        parentName = parent?.name;
      }
      return {
        id: category.id,
        name: category.name,
        icon: category.icon || '📦',
        parentName,
      };
    }
  }
  
  // Fallback to csvCategory
  if (transaction.csvCategory) {
    // Try to find matching category by name
    const byName = categories.find(
      c => c.name.toLowerCase() === transaction.csvCategory?.toLowerCase()
    );
    if (byName) {
      return {
        id: byName.id,
        name: byName.name,
        icon: byName.icon || '📦',
      };
    }
    
    // Return csvCategory as-is
    return {
      id: undefined,
      name: transaction.csvCategory,
      icon: '📦',
    };
  }
  
  // Last resort
  return {
    id: undefined,
    name: 'Uncategorized',
    icon: '❓',
  };
}

// Batch version for performance
export function resolveCategorySync(
  transaction: Transaction,
  categoriesMap: Map<number, Category>,
  categoriesByName: Map<string, Category>
): ResolvedCategory {
  // Try by ID
  if (transaction.categoryId) {
    const category = categoriesMap.get(transaction.categoryId);
    if (category) {
      const parent = category.parentId ? categoriesMap.get(category.parentId) : undefined;
      return {
        id: category.id,
        name: category.name,
        icon: category.icon || '📦',
        parentName: parent?.name,
      };
    }
  }
  
  // Fallback to csvCategory
  if (transaction.csvCategory) {
    const byName = categoriesByName.get(transaction.csvCategory.toLowerCase());
    if (byName) {
      return {
        id: byName.id,
        name: byName.name,
        icon: byName.icon || '📦',
      };
    }
    return {
      id: undefined,
      name: transaction.csvCategory,
      icon: '📦',
    };
  }
  
  return { id: undefined, name: 'Uncategorized', icon: '❓' };
}
```

**Update CategoryComposition.tsx to use fallback:**

```typescript
// In CategoryComposition.tsx

const categoryData = useMemo(() => {
  if (!transactions.length || !categories.length) return [];
  
  // Build lookup maps for performance
  const categoriesMap = new Map(categories.map(c => [c.id!, c]));
  const categoriesByName = new Map(
    categories.map(c => [c.name.toLowerCase(), c])
  );
  
  // Aggregate by category
  const categoryTotals = new Map<string, { amount: number; icon: string }>();
  
  for (const txn of transactions) {
    if (txn.transactionType !== 'EXPENSE') continue;
    
    const resolved = resolveCategorySync(txn, categoriesMap, categoriesByName);
    const key = resolved.name;
    
    const existing = categoryTotals.get(key) || { amount: 0, icon: resolved.icon };
    existing.amount += txn.amount;
    categoryTotals.set(key, existing);
  }
  
  // Convert to array for chart
  return Array.from(categoryTotals.entries())
    .map(([name, data]) => ({
      name,
      value: data.amount,
      icon: data.icon,
    }))
    .sort((a, b) => b.value - a.value);
}, [transactions, categories]);
```

---

## 🔧 P1 — HIGH PRIORITY FEATURES

### P1.1: Create Strict CSV Template & Validator

**File:** `public/csv-template.csv`

```csv
Date,Account,Category,Subcategory,Note,Type,Description,Amount,Currency
24/02/2026 14:30,HDFC Bank,Food,Restaurant,Lunch with team,Expense,Swiggy order,250.00,INR
24/02/2026 10:00,SBI Savings,Salary,,February salary,Income,Monthly salary,50000.00,INR
23/02/2026 18:00,HDFC Bank,,,Transfer to savings,Transfer-Out,Monthly savings,10000.00,INR
23/02/2026 18:00,SBI Savings,,,Transfer from HDFC,Transfer-In,,10000.00,INR
```

**File:** `src/lib/csvValidator.ts`

```typescript
export interface CSVValidationResult {
  isValid: boolean;
  headers: {
    valid: boolean;
    missing: string[];
    extra: string[];
  };
  rows: {
    valid: CSVRow[];
    invalid: CSVRowError[];
  };
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
}

export interface CSVRow {
  rowNumber: number;
  date: string;
  account: string;
  category: string;
  subcategory: string;
  note: string;
  type: 'Expense' | 'Income' | 'Transfer-Out' | 'Transfer-In';
  description: string;
  amount: number;
  currency: string;
}

export interface CSVRowError {
  rowNumber: number;
  rawData: string;
  errors: string[];
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
  'Currency'
];

const VALID_TYPES = ['Expense', 'Income', 'Transfer-Out', 'Transfer-In'];

// Date formats we accept
const DATE_FORMATS = [
  /^\d{2}\/\d{2}\/\d{4}$/,           // dd/MM/yyyy
  /^\d{2}-\d{2}-\d{4}$/,             // dd-MM-yyyy
  /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/,    // dd/MM/yyyy HH:mm
  /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/,      // dd-MM-yyyy HH:mm
  /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/, // dd/MM/yyyy HH:mm:ss
  /^\d{4}-\d{2}-\d{2}$/,             // yyyy-MM-dd (ISO)
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO with time
];

export function validateCSV(csvContent: string): CSVValidationResult {
  const lines = csvContent.trim().split(/\r?\n/);
  
  if (lines.length < 2) {
    return {
      isValid: false,
      headers: { valid: false, missing: REQUIRED_HEADERS, extra: [] },
      rows: { valid: [], invalid: [] },
      summary: { totalRows: 0, validRows: 0, invalidRows: 0 },
    };
  }
  
  // Parse and validate headers
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.trim());
  const headersLower = headers.map(h => h.toLowerCase());
  const requiredLower = REQUIRED_HEADERS.map(h => h.toLowerCase());
  
  const missing = REQUIRED_HEADERS.filter(
    h => !headersLower.includes(h.toLowerCase())
  );
  const extra = headers.filter(
    h => !requiredLower.includes(h.toLowerCase())
  );
  
  const headersValid = missing.length === 0;
  
  if (!headersValid) {
    return {
      isValid: false,
      headers: { valid: false, missing, extra },
      rows: { valid: [], invalid: [] },
      summary: { totalRows: lines.length - 1, validRows: 0, invalidRows: lines.length - 1 },
    };
  }
  
  // Build header index map (case-insensitive)
  const headerIndex: Record<string, number> = {};
  headers.forEach((h, i) => {
    const key = h.toLowerCase();
    headerIndex[key] = i;
  });
  
  // Validate each row
  const validRows: CSVRow[] = [];
  const invalidRows: CSVRowError[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const rowNumber = i + 1; // 1-indexed for user display
    const values = parseCSVLine(line);
    const errors: string[] = [];
    
    // Get values by header name
    const getValue = (header: string): string => {
      const idx = headerIndex[header.toLowerCase()];
      return idx !== undefined ? (values[idx] || '').trim() : '';
    };
    
    const dateStr = getValue('Date');
    const account = getValue('Account');
    const category = getValue('Category');
    const subcategory = getValue('Subcategory');
    const note = getValue('Note');
    const typeStr = getValue('Type');
    const description = getValue('Description');
    const amountStr = getValue('Amount');
    const currency = getValue('Currency') || 'INR';
    
    // Validate Date
    if (!dateStr) {
      errors.push('Date is required');
    } else if (!DATE_FORMATS.some(fmt => fmt.test(dateStr))) {
      errors.push(`Invalid date format '${dateStr}'. Use: dd/MM/yyyy or dd/MM/yyyy HH:mm`);
    }
    
    // Validate Account
    if (!account) {
      errors.push('Account is required');
    }
    
    // Validate Type
    if (!typeStr) {
      errors.push('Type is required');
    } else if (!VALID_TYPES.some(t => t.toLowerCase() === typeStr.toLowerCase())) {
      errors.push(`Invalid Type '${typeStr}'. Use: Expense, Income, Transfer-Out, Transfer-In`);
    }
    
    // Validate Note
    if (!note) {
      errors.push('Note is required');
    }
    
    // Validate Amount
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    if (!amountStr || isNaN(amount)) {
      errors.push('Amount is required and must be a number');
    } else if (amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    // Validate Category (required for Expense/Income, not for Transfer)
    const isTransfer = typeStr.toLowerCase().includes('transfer');
    if (!isTransfer && !category) {
      errors.push('Category is required for Expense/Income transactions');
    }
    
    // Check if parent category requires sub-category
    // This will be validated during import against actual DB
    
    if (errors.length > 0) {
      invalidRows.push({
        rowNumber,
        rawData: line,
        errors,
      });
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
      });
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
  };
}

function normalizeType(type: string): 'Expense' | 'Income' | 'Transfer-Out' | 'Transfer-In' {
  const lower = type.toLowerCase();
  if (lower === 'expense') return 'Expense';
  if (lower === 'income') return 'Income';
  if (lower === 'transfer-out' || lower === 'transferout') return 'Transfer-Out';
  if (lower === 'transfer-in' || lower === 'transferin') return 'Transfer-In';
  return 'Expense'; // Default
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Generate copiable text for failed rows
export function generateFailedRowsText(errors: CSVRowError[]): string {
  const header = REQUIRED_HEADERS.join(',');
  const rows = errors.map(e => e.rawData);
  return [header, ...rows].join('\n');
}
```

**File:** `src/components/CSVImportModal.tsx` (Updated)

```typescript
'use client';

import { useState, useCallback } from 'react';
import { validateCSV, CSVValidationResult, generateFailedRowsText } from '@/lib/csvValidator';
import { importValidatedCSV } from '@/lib/csvImport';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Download, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Copy, 
  Loader2,
  AlertTriangle 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export function CSVImportModal({ isOpen, onClose, onSuccess }: CSVImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [validation, setValidation] = useState<CSVValidationResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [copiedRow, setCopiedRow] = useState<number | null>(null);

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/csv-template.csv';
    link.download = 'money-mngr-template.csv';
    link.click();
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    const result = validateCSV(content);
    setValidation(result);
    setStep('preview');
  }, []);

  const handleCopyRow = (rowData: string, rowNumber: number) => {
    navigator.clipboard.writeText(rowData);
    setCopiedRow(rowNumber);
    setTimeout(() => setCopiedRow(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleCopyAllFailed = () => {
    if (!validation) return;
    const text = generateFailedRowsText(validation.rows.invalid);
    navigator.clipboard.writeText(text);
    toast.success('All failed rows copied');
  };

  const handleImport = async () => {
    if (!validation || validation.rows.valid.length === 0) return;

    setStep('importing');
    
    try {
      await importValidatedCSV(validation.rows.valid, (progress) => {
        setImportProgress(progress);
      });
      
      setStep('complete');
      toast.success(`Imported ${validation.rows.valid.length} transactions`);
    } catch (error: any) {
      toast.error(error.message || 'Import failed');
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setValidation(null);
    setImportProgress(0);
    onClose();
    if (step === 'complete') {
      onSuccess();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Transactions from CSV</DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6 py-4">
            {/* Step 1: Download Template */}
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <Download className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">Step 1: Download Template</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Use our template to ensure correct format
                  </p>
                  <Button
                    onClick={handleDownloadTemplate}
                    variant="outline"
                    size="sm"
                    className="mt-3 border-blue-500/50 text-blue-400"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2: Fill Data */}
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <span className="text-purple-400 font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-white">Step 2: Fill Your Data</h3>
                  <ul className="text-sm text-slate-400 mt-2 space-y-1">
                    <li>• Open template in Excel or Google Sheets</li>
                    <li>• Delete example rows and add your data</li>
                    <li>• Keep the header row exactly as is</li>
                    <li>• Save as CSV</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 3: Upload */}
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <Upload className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">Step 3: Upload CSV</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Upload your filled CSV file
                  </p>
                  <label className="mt-3 inline-block">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <span className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Required Columns Info */}
            <div className="bg-slate-800/50 rounded-lg p-4 text-sm">
              <h4 className="font-medium text-slate-300 mb-2">Required Columns:</h4>
              <div className="grid grid-cols-3 gap-2 text-slate-400">
                <span>• Date</span>
                <span>• Account</span>
                <span>• Category</span>
                <span>• Subcategory</span>
                <span>• Note</span>
                <span>• Type</span>
                <span>• Description</span>
                <span>• Amount</span>
                <span>• Currency</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Errors */}
        {step === 'preview' && validation && (
          <div className="space-y-4 py-4">
            {/* Header Validation */}
            {!validation.headers.valid && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400 font-medium">
                  <XCircle className="w-5 h-5" />
                  Invalid CSV Headers
                </div>
                {validation.headers.missing.length > 0 && (
                  <p className="text-sm text-red-300 mt-2">
                    Missing: {validation.headers.missing.join(', ')}
                  </p>
                )}
                {validation.headers.extra.length > 0 && (
                  <p className="text-sm text-slate-400 mt-1">
                    Extra (ignored): {validation.headers.extra.join(', ')}
                  </p>
                )}
                <p className="text-sm text-slate-400 mt-3">
                  Please download the template and use exact column headers.
                </p>
              </div>
            )}

            {/* Summary */}
            {validation.headers.valid && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-medium">
                        {validation.rows.valid.length} rows valid
                      </span>
                    </div>
                  </div>
                  
                  {validation.rows.invalid.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-400 font-medium">
                          {validation.rows.invalid.length} rows have errors
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error Details */}
                {validation.rows.invalid.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-slate-300">
                        Failed Rows (copy & fix in your CSV):
                      </h4>
                      <Button
                        onClick={handleCopyAllFailed}
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy All Failed
                      </Button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {validation.rows.invalid.map((row) => (
                        <div
                          key={row.rowNumber}
                          className="bg-slate-800 rounded-lg p-3 border border-red-500/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-red-400 font-medium">
                                Row {row.rowNumber}: {row.errors[0]}
                                {row.errors.length > 1 && ` (+${row.errors.length - 1} more)`}
                              </div>
                              <code className="block mt-2 text-xs text-slate-400 bg-slate-900 p-2 rounded overflow-x-auto whitespace-nowrap">
                                {row.rawData}
                              </code>
                            </div>
                            <Button
                              onClick={() => handleCopyRow(row.rawData, row.rowNumber)}
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0 text-slate-400"
                            >
                              {copiedRow === row.rowNumber ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                          
                          {row.errors.length > 1 && (
                            <ul className="mt-2 text-xs text-red-300 space-y-1">
                              {row.errors.map((err, i) => (
                                <li key={i}>• {err}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-700">
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="flex-1 border-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={validation.rows.valid.length === 0}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Import {validation.rows.valid.length} Valid Rows
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="py-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto text-purple-400 animate-spin" />
            <p className="mt-4 text-slate-300">Importing transactions...</p>
            <div className="mt-4 w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-400">{importProgress}%</p>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-400" />
            <h3 className="mt-4 text-xl font-medium text-white">Import Complete!</h3>
            <p className="mt-2 text-slate-400">
              Successfully imported {validation?.rows.valid.length} transactions
            </p>
            <Button onClick={handleClose} className="mt-6 bg-green-600 hover:bg-green-700">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

### P1.2: Add Date Filters with Grouped Sections to Transactions Page

**File:** `src/app/transactions/page.tsx`

**Solution:** Add date filter bar and group transactions by selected period.

```typescript
'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Transaction } from '@/types/database';
import { TransactionCard } from '@/components/transactions/TransactionCard';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';

type DateFilter = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'custom';

interface TransactionGroup {
  key: string;
  label: string;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  net: number;
}

export default function TransactionsPage() {
  const transactions = useLiveQuery(() => 
    db.transactions.orderBy('date').reverse().toArray()
  ) || [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('daily');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter transactions by search
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    
    const query = searchQuery.toLowerCase();
    return transactions.filter(txn => 
      txn.note?.toLowerCase().includes(query) ||
      txn.description?.toLowerCase().includes(query) ||
      txn.csvCategory?.toLowerCase().includes(query)
    );
  }, [transactions, searchQuery]);

  // Group transactions by selected period
  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, TransactionGroup>();
    
    for (const txn of filteredTransactions) {
      const date = new Date(txn.date);
      const { key, label } = getGroupKeyAndLabel(date, dateFilter);
      
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label,
          transactions: [],
          totalIncome: 0,
          totalExpense: 0,
          net: 0,
        });
      }
      
      const group = groups.get(key)!;
      group.transactions.push(txn);
      
      if (txn.transactionType === 'INCOME') {
        group.totalIncome += txn.amount;
      } else if (txn.transactionType === 'EXPENSE') {
        group.totalExpense += txn.amount;
      }
      group.net = group.totalIncome - group.totalExpense;
    }
    
    // Sort groups by key (most recent first)
    return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [filteredTransactions, dateFilter]);

  // Auto-expand first group
  useMemo(() => {
    if (groupedTransactions.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set([groupedTransactions[0].key]));
    }
  }, [groupedTransactions]);

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  const dateFilterOptions: { value: DateFilter; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'semi-annual', label: 'Semi-Annual' },
    { value: 'annual', label: 'Annual' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-4">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions..."
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>

        {/* Date Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {dateFilterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setDateFilter(option.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                dateFilter === option.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped Transaction List */}
      <div className="p-4 space-y-3">
        {groupedTransactions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No transactions found
          </div>
        ) : (
          groupedTransactions.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            
            return (
              <div key={group.key} className="bg-slate-800 rounded-lg overflow-hidden">
                {/* Group Header (Clickable) */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                    <div className="text-left">
                      <div className="font-medium text-white">{group.label}</div>
                      <div className="text-sm text-slate-400">
                        {group.transactions.length} transaction{group.transactions.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-right font-medium ${
                    group.net >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {group.net >= 0 ? '+' : ''}{formatCurrency(group.net)}
                  </div>
                </button>

                {/* Expanded Transactions */}
                {isExpanded && (
                  <div className="border-t border-slate-700 divide-y divide-slate-700">
                    {group.transactions.map((txn) => (
                      <TransactionCard
                        key={txn.id}
                        transaction={txn}
                        accounts={accounts}
                        categories={categories}
                        onEdit={() => {/* TODO */}}
                        onDelete={() => {/* TODO */}}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <Button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}

// Helper function to get group key and label
function getGroupKeyAndLabel(date: Date, filter: DateFilter): { key: string; label: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  switch (filter) {
    case 'daily': {
      const key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let label: string;
      if (key === today.toISOString().split('T')[0]) {
        label = 'Today';
      } else if (key === yesterday.toISOString().split('T')[0]) {
        label = 'Yesterday';
      } else {
        label = date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          year: year !== today.getFullYear() ? 'numeric' : undefined
        });
      }
      return { key, label };
    }
    
    case 'weekly': {
      const weekStart = new Date(date);
      weekStart.setDate(day - date.getDay()); // Sunday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const key = weekStart.toISOString().split('T')[0];
      const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      return { key, label };
    }
    
    case 'monthly': {
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return { key, label };
    }
    
    case 'quarterly': {
      const quarter = Math.floor(month / 3) + 1;
      const key = `${year}-Q${quarter}`;
      const label = `Q${quarter} ${year}`;
      return { key, label };
    }
    
    case 'semi-annual': {
      const half = month < 6 ? 1 : 2;
      const key = `${year}-H${half}`;
      const label = `H${half} ${year}`;
      return { key, label };
    }
    
    case 'annual': {
      const key = String(year);
      const label = String(year);
      return { key, label };
    }
    
    default:
      return { key: date.toISOString(), label: date.toLocaleDateString() };
  }
}
```

---

### P1.3: Nested Sub-Category Dropdown (Required When Parent Has Children)

**File:** `src/components/CategorySelector.tsx` (New Component)

```typescript
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Category } from '@/types/database';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

interface CategorySelectorProps {
  categories: Category[];
  type: 'EXPENSE' | 'INCOME';
  selectedCategoryId?: number;
  selectedSubCategoryId?: number;
  onSelect: (categoryId: number, subCategoryId?: number) => void;
  error?: string;
}

export function CategorySelector({
  categories,
  type,
  selectedCategoryId,
  selectedSubCategoryId,
  onSelect,
  error,
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedParent, setExpandedParent] = useState<number | null>(null);

  // Filter and organize categories
  const { parentCategories, childrenByParent } = useMemo(() => {
    const filtered = categories.filter(c => c.type === type);
    const parents = filtered.filter(c => !c.parentId);
    const children = new Map<number, Category[]>();
    
    for (const cat of filtered) {
      if (cat.parentId) {
        if (!children.has(cat.parentId)) {
          children.set(cat.parentId, []);
        }
        children.get(cat.parentId)!.push(cat);
      }
    }
    
    return { parentCategories: parents, childrenByParent: children };
  }, [categories, type]);

  // Get display text
  const displayText = useMemo(() => {
    if (!selectedCategoryId) return 'Select category...';
    
    const parent = categories.find(c => c.id === selectedCategoryId);
    if (!parent) return 'Select category...';
    
    if (selectedSubCategoryId) {
      const child = categories.find(c => c.id === selectedSubCategoryId);
      return `${parent.icon || '📦'} ${parent.name} > ${child?.name || ''}`;
    }
    
    return `${parent.icon || '📦'} ${parent.name}`;
  }, [categories, selectedCategoryId, selectedSubCategoryId]);

  // Check if selection is valid
  const isValid = useMemo(() => {
    if (!selectedCategoryId) return false;
    
    const hasChildren = childrenByParent.has(selectedCategoryId);
    if (hasChildren && !selectedSubCategoryId) return false;
    
    return true;
  }, [selectedCategoryId, selectedSubCategoryId, childrenByParent]);

  const handleParentClick = (parent: Category) => {
    const hasChildren = childrenByParent.has(parent.id!);
    
    if (hasChildren) {
      // Expand/collapse children
      setExpandedParent(expandedParent === parent.id ? null : parent.id!);
    } else {
      // No children, select directly
      onSelect(parent.id!);
      setIsOpen(false);
    }
  };

  const handleChildClick = (parent: Category, child: Category) => {
    onSelect(parent.id!, child.id);
    setIsOpen(false);
    setExpandedParent(null);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left ${
          error
            ? 'border-red-500 bg-red-500/10'
            : 'border-slate-600 bg-slate-700/50'
        } text-white`}
      >
        <span className={!selectedCategoryId ? 'text-slate-400' : ''}>
          {displayText}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-[300px] overflow-y-auto">
          {parentCategories.length === 0 ? (
            <div className="p-4 text-center text-slate-400">
              No categories available
            </div>
          ) : (
            parentCategories.map((parent) => {
              const children = childrenByParent.get(parent.id!) || [];
              const hasChildren = children.length > 0;
              const isExpanded = expandedParent === parent.id;
              const isParentSelected = selectedCategoryId === parent.id;

              return (
                <div key={parent.id}>
                  {/* Parent Category */}
                  <button
                    type="button"
                    onClick={() => handleParentClick(parent)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700 transition-colors ${
                      isParentSelected && !hasChildren ? 'bg-purple-500/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{parent.icon || '📦'}</span>
                      <span className="font-medium">{parent.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasChildren && (
                        <span className="text-xs text-slate-400 bg-slate-600 px-1.5 py-0.5 rounded">
                          {children.length}
                        </span>
                      )}
                      {hasChildren ? (
                        isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )
                      ) : isParentSelected ? (
                        <Check className="w-4 h-4 text-purple-400" />
                      ) : null}
                    </div>
                  </button>

                  {/* Child Categories (Sub-categories) */}
                  {hasChildren && isExpanded && (
                    <div className="bg-slate-850">
                      {children.map((child) => {
                        const isChildSelected = selectedSubCategoryId === child.id;
                        
                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => handleChildClick(parent, child)}
                            className={`w-full flex items-center justify-between px-4 py-2 pl-10 hover:bg-slate-700 transition-colors ${
                              isChildSelected ? 'bg-purple-500/20' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 text-slate-300">
                              <span className="text-slate-500">├─</span>
                              <span>{child.name}</span>
                            </div>
                            {isChildSelected && (
                              <Check className="w-4 h-4 text-purple-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setExpandedParent(null);
          }}
        />
      )}
    </div>
  );
}
```

**Update AddTransactionModal.tsx to use CategorySelector:**

```typescript
// Replace the category Select with CategorySelector

import { CategorySelector } from './CategorySelector';

// In the form:
{transactionType !== 'TRANSFER' && (
  <div>
    <label className="block text-sm text-slate-400 mb-2">
      Category *
    </label>
    <CategorySelector
      categories={categories}
      type={transactionType === 'INCOME' ? 'INCOME' : 'EXPENSE'}
      selectedCategoryId={categoryId ? parseInt(categoryId) : undefined}
      selectedSubCategoryId={subCategoryId ? parseInt(subCategoryId) : undefined}
      onSelect={(catId, subCatId) => {
        setCategoryId(catId.toString());
        setSubCategoryId(subCatId?.toString() || '');
      }}
      error={categoryError}
    />
  </div>
)}

// In validation:
const validateForm = () => {
  // ... other validations
  
  if (transactionType !== 'TRANSFER') {
    if (!categoryId) {
      setCategoryError('Category is required');
      return false;
    }
    
    // Check if selected category has children
    const selectedCategory = categories.find(c => c.id === parseInt(categoryId));
    const hasChildren = categories.some(c => c.parentId === parseInt(categoryId));
    
    if (hasChildren && !subCategoryId) {
      setCategoryError('Sub-category is required');
      return false;
    }
  }
  
  return true;
};
```

---

## 🔧 P2 — MEDIUM PRIORITY

### P2.1: Fix Net Worth Chart - Add Assets & Liabilities Lines

**File:** `src/components/stats/NetWorth.tsx`

Find the `<LineChart>` component and add additional `<Line>` components:

```typescript
<LineChart data={chartData}>
  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
  <XAxis 
    dataKey="label" 
    stroke="#9CA3AF" 
    tick={{ fill: '#9CA3AF', fontSize: 12 }} 
  />
  <YAxis 
    stroke="#9CA3AF" 
    tick={{ fill: '#9CA3AF', fontSize: 12 }}
    tickFormatter={(value) => formatCompactCurrency(value)}
  />
  <Tooltip 
    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
    formatter={(value: number) => [formatCurrency(value), '']}
  />
  <Legend />
  
  {/* Net Worth - Purple */}
  <Line
    type="monotone"
    dataKey="netWorth"
    name="Net Worth"
    stroke="#8B5CF6"
    strokeWidth={2}
    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
    activeDot={{ r: 6 }}
  />
  
  {/* Assets - Green */}
  <Line
    type="monotone"
    dataKey="assets"
    name="Assets"
    stroke="#22C55E"
    strokeWidth={2}
    dot={{ fill: '#22C55E', strokeWidth: 2, r: 3 }}
    activeDot={{ r: 5 }}
  />
  
  {/* Liabilities - Red */}
  <Line
    type="monotone"
    dataKey="liabilities"
    name="Liabilities"
    stroke="#EF4444"
    strokeWidth={2}
    dot={{ fill: '#EF4444', strokeWidth: 2, r: 3 }}
    activeDot={{ r: 5 }}
  />
</LineChart>
```

---

### P2.2: Account Group Autocomplete

**File:** `src/components/accounts/AccountModal.tsx`

Replace free text input with autocomplete dropdown:

```typescript
// Add state for existing groups
const existingGroups = useMemo(() => {
  const groups = new Set<string>();
  accounts.forEach(a => {
    if (a.group) groups.add(a.group);
  });
  return Array.from(groups).sort();
}, [accounts]);

const [groupInput, setGroupInput] = useState(account?.group || '');
const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);

const filteredGroups = useMemo(() => {
  if (!groupInput.trim()) return existingGroups;
  return existingGroups.filter(g => 
    g.toLowerCase().includes(groupInput.toLowerCase())
  );
}, [existingGroups, groupInput]);

// In the form:
<div className="relative">
  <label className="block text-sm text-slate-400 mb-2">
    Group (optional)
  </label>
  <Input
    value={groupInput}
    onChange={(e) => {
      setGroupInput(e.target.value);
      setShowGroupSuggestions(true);
    }}
    onFocus={() => setShowGroupSuggestions(true)}
    placeholder="e.g., Primary Banking"
    className="bg-slate-700/50 border-slate-600 text-white"
  />
  
  {/* Autocomplete Dropdown */}
  {showGroupSuggestions && filteredGroups.length > 0 && (
    <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
      {filteredGroups.map((group) => (
        <button
          key={group}
          type="button"
          onClick={() => {
            setGroupInput(group);
            setShowGroupSuggestions(false);
          }}
          className="w-full px-3 py-2 text-left text-slate-300 hover:bg-slate-700"
        >
          {group}
        </button>
      ))}
      {groupInput && !existingGroups.includes(groupInput) && (
        <div className="px-3 py-2 text-sm text-slate-500 border-t border-slate-700">
          Press Enter to create "{groupInput}"
        </div>
      )}
    </div>
  )}
</div>
```

---

## 📋 TESTING CHECKLIST

### P0 Tests (Critical)
- [ ] Clear browser cache, unregister service worker, hard refresh
- [ ] App loads without "Resource not cached" error
- [ ] Import CSV with new strict template
- [ ] Check imported transactions have valid categoryId in IndexedDB
- [ ] Stats page shows category names (not "Unknown")

### P1 Tests (High Priority)
- [ ] Download CSV template from import modal
- [ ] Upload invalid CSV → See clear error messages
- [ ] Copy failed rows → Paste in editor → Fix → Re-upload
- [ ] Transactions page shows date filter pills
- [ ] Default filter is "Daily" with grouped sections
- [ ] Click group header to expand/collapse
- [ ] Category selector shows nested sub-categories
- [ ] Sub-category required when parent has children
- [ ] Cannot save transaction without sub-category if required

### P2 Tests (Medium Priority)
- [ ] Net Worth chart shows 3 lines (Net Worth, Assets, Liabilities)
- [ ] Account modal shows existing group suggestions
- [ ] Can create new group by typing

---

## 🚀 DEPLOYMENT NOTES

After implementing fixes:

1. **Increment cache version** in next.config.js
2. **Build locally first:** `npm run build && npm run start`
3. **Test thoroughly** before deploying
4. **Deploy to Vercel**
5. **Force users to refresh:**
   - Consider adding a version check that prompts reload

---

**END OF PROMPT**

This prompt addresses all identified issues systematically. Start with P0 (critical), then P1 (high), then P2 (medium).
