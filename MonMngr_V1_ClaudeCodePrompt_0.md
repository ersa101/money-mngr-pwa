# Claude Code Prompt: Money Mngr PWA — Bug Fixes & Enhancements

## 🎯 Project Context

**App:** Money Mngr — A privacy-first Personal Finance PWA  
**Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Dexie.js (IndexedDB), CSV backend  
**Current State:** Functional scaffold with critical bugs blocking core features

---

## 📋 Task Overview

### Priority 1: Bug Fixes (Blocking)
1. **Transactions not displaying** despite successful CSV import
2. **Edit Account modal shows wrong data** (stale state)
3. **Stats page shows flat/incorrect graph** (not calculating from transactions)

### Priority 2: Enhancements
4. **Settings tab** for master data management (Account Types, Categories, Subcategories, Account Groups)
5. **Dynamic Add Transaction form** with Transfer visual preview
6. **DateTime picker** for transaction entry
7. **Responsive design** improvements for mobile + desktop

---

## 🐛 BUG FIX #1: Transactions Not Displaying

### Symptoms
- CSV imports successfully (accounts show correct balances)
- Transactions page shows "No transactions yet"
- Time filter set to "Monthly" by default

### Root Cause Investigation

Check these potential issues in order:

#### 1.1 Date Parsing Mismatch
The CSV uses format `dd/MM/yyyy HH:mm:ss` (e.g., `"13/01/2026 21:27:08"`).

**File to check:** `src/lib/csvImport.ts` (or equivalent)

```typescript
// WRONG - This creates invalid dates for dd/MM/yyyy format
const date = new Date(row.Date); // Parses as MM/dd/yyyy in JS

// CORRECT - Parse explicitly
function parseDate(dateStr: string): Date {
  // Handle "dd/MM/yyyy HH:mm:ss" format
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [_, day, month, year, hour, min, sec] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // JS months are 0-indexed
      parseInt(day),
      parseInt(hour),
      parseInt(min),
      parseInt(sec)
    );
  }
  // Fallback to ISO parsing
  return new Date(dateStr);
}
```

#### 1.2 Transaction Type Not Being Stored
The CSV column `Income/Expense` contains: `Expense`, `Income`, `Transfer-Out`

**Verify the mapping:**
```typescript
type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

function mapTransactionType(csvValue: string): TransactionType {
  const normalized = csvValue.toLowerCase().trim();
  if (normalized === 'expense') return 'EXPENSE';
  if (normalized === 'income') return 'INCOME';
  if (normalized.includes('transfer')) return 'TRANSFER';
  return 'EXPENSE'; // Default fallback
}
```

#### 1.3 Transfer Logic — Category Column Contains Account Name
**Critical:** For `Transfer-Out` transactions, the `Category` column contains the destination account name, NOT a category.

```typescript
// CSV row example for transfer:
// Account: "DB", Category: "CCs", Income/Expense: "Transfer-Out"
// This means: Transfer FROM "DB" TO "CCs"

async function processCSVRow(row: CSVRow) {
  const transactionType = mapTransactionType(row['Income/Expense']);
  
  if (transactionType === 'TRANSFER') {
    // Category column = destination account for transfers!
    const fromAccount = await findOrCreateAccount(row.Account);
    const toAccount = await findOrCreateAccount(row.Category); // NOT a category!
    
    return {
      date: parseDate(row.Date),
      amount: parseFloat(row.Amount || row.INR),
      transactionType: 'TRANSFER',
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      toCategoryId: null, // No category for transfers
      subCategoryId: null,
      description: row.Note || row.Description || '',
    };
  } else if (transactionType === 'EXPENSE') {
    const fromAccount = await findOrCreateAccount(row.Account);
    const category = await findOrCreateCategory(row.Category, 'EXPENSE');
    const subCategory = row.Subcategory 
      ? await findOrCreateSubcategory(row.Subcategory, category.id)
      : null;
    
    return {
      date: parseDate(row.Date),
      amount: parseFloat(row.Amount || row.INR),
      transactionType: 'EXPENSE',
      fromAccountId: fromAccount.id,
      toAccountId: null,
      toCategoryId: category.id,
      subCategoryId: subCategory?.id,
      description: row.Note || row.Description || '',
    };
  } else { // INCOME
    const toAccount = await findOrCreateAccount(row.Account);
    const category = await findOrCreateCategory(row.Category, 'INCOME');
    const subCategory = row.Subcategory 
      ? await findOrCreateSubcategory(row.Subcategory, category.id)
      : null;
    
    return {
      date: parseDate(row.Date),
      amount: parseFloat(row.Amount || row.INR),
      transactionType: 'INCOME',
      fromAccountId: null,
      toAccountId: toAccount.id,
      toCategoryId: category.id,
      subCategoryId: subCategory?.id,
      description: row.Note || row.Description || '',
    };
  }
}
```

#### 1.4 Time Filter Excluding All Transactions
**File:** `src/app/transactions/page.tsx`

```typescript
// Verify the date range calculation
function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  switch (period) {
    case 'Daily':
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0), end };
    case 'Weekly':
      const weekStart = new Date(end);
      weekStart.setDate(end.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      return { start: weekStart, end };
    case 'Monthly':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0), end };
    case 'Quarterly':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return { start: quarterStart, end };
    case 'Annually':
      return { start: new Date(now.getFullYear(), 0, 1, 0, 0, 0), end };
    case 'All Time':
    default:
      return { start: new Date(2000, 0, 1), end }; // Very old date to capture all
  }
}

// Filter transactions
const filteredTransactions = useLiveQuery(async () => {
  const { start, end } = getDateRange(timePeriod);
  
  let query = db.transactions
    .where('date')
    .between(start, end, true, true); // inclusive bounds
  
  if (typeFilter !== 'All') {
    const results = await query.toArray();
    return results.filter(t => t.transactionType === typeFilter.toUpperCase());
  }
  
  return query.toArray();
}, [timePeriod, typeFilter]);
```

#### 1.5 Verify Data in IndexedDB
Add a debug button temporarily:

```typescript
const debugData = async () => {
  const accounts = await db.accounts.toArray();
  const transactions = await db.transactions.toArray();
  const categories = await db.categories.toArray();
  
  console.log('=== DEBUG DATA ===');
  console.log('Accounts:', accounts.length, accounts);
  console.log('Transactions:', transactions.length, transactions);
  console.log('Categories:', categories.length, categories);
  console.log('Sample transaction:', transactions[0]);
};
```

---

## 🐛 BUG FIX #2: Edit Modal Shows Wrong Account Data

### Symptoms
- Click edit on "CCs" account
- Modal opens showing "HDFC Bank" data

### Root Cause
State is not being reset when a different account is selected for editing.

### Fix

**File:** `src/app/accounts/page.tsx` (or wherever modal state is managed)

```typescript
// WRONG - selectedAccount state persists old data
const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

const handleEditClick = (account: Account) => {
  setSelectedAccount(account); // May not trigger re-render if reference equality
  setIsModalOpen(true);
};

// CORRECT - Force fresh state on each edit
const handleEditClick = (account: Account) => {
  // Create a fresh copy to ensure React detects the change
  setSelectedAccount({ ...account });
  setIsModalOpen(true);
};

// Also reset on modal close
const handleCloseModal = () => {
  setIsModalOpen(false);
  setSelectedAccount(null); // Clear state!
};
```

**File:** `src/components/AccountModal.tsx`

```typescript
// WRONG - Using defaultValue (only sets initial value once)
<input
  defaultValue={account?.name}
  onChange={(e) => setName(e.target.value)}
/>

// CORRECT - Use value with controlled state, reset when account changes
useEffect(() => {
  if (account) {
    setName(account.name);
    setType(account.type);
    setBalance(account.balance);
    setThreshold(account.thresholdValue);
    setColor(account.color || '');
    setGroup(account.group || '');
  } else {
    // Reset for new account
    setName('');
    setType('BANK');
    setBalance(0);
    setThreshold(0);
    setColor('');
    setGroup('');
  }
}, [account]); // Re-run when account prop changes

// Use value, not defaultValue
<input
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
```

**Alternative with key prop:**
```tsx
// Force complete remount of modal when account changes
<AccountModal
  key={selectedAccount?.id || 'new'} // Forces fresh instance
  account={selectedAccount}
  isOpen={isModalOpen}
  onClose={handleCloseModal}
/>
```

---

## 🐛 BUG FIX #3: Stats Page Shows Flat/Incorrect Graph

### Symptoms
- Net Worth chart shows same value (₹62,196.34) for every day
- No trend visualization

### Root Cause
The chart is displaying current balance repeatedly, not calculating historical balances from transactions.

### Fix

**File:** `src/app/stats/page.tsx` (or chart component)

```typescript
interface DailyNetWorth {
  date: string;
  netWorth: number;
}

function calculateNetWorthHistory(
  transactions: Transaction[],
  accounts: Account[],
  startDate: Date,
  endDate: Date
): DailyNetWorth[] {
  // Sort transactions by date ascending
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Calculate starting balances (before startDate)
  // This requires either stored historical snapshots OR calculating from all-time transactions
  
  // Approach: Start from current balances and work backwards
  // OR: Start from 0 and apply all transactions forward
  
  // Simple approach: Calculate running balance from first transaction
  const accountBalances: Record<number, number> = {};
  accounts.forEach(a => { accountBalances[a.id!] = 0; }); // Start at 0
  
  const dailyData: Record<string, number> = {};
  
  // Apply each transaction and record daily totals
  sortedTx.forEach(tx => {
    const dateKey = new Date(tx.date).toISOString().split('T')[0];
    
    if (tx.transactionType === 'EXPENSE' && tx.fromAccountId) {
      accountBalances[tx.fromAccountId] -= tx.amount;
    } else if (tx.transactionType === 'INCOME' && tx.toAccountId) {
      accountBalances[tx.toAccountId] += tx.amount;
    } else if (tx.transactionType === 'TRANSFER') {
      if (tx.fromAccountId) accountBalances[tx.fromAccountId] -= tx.amount;
      if (tx.toAccountId) accountBalances[tx.toAccountId] += tx.amount;
    }
    
    // Calculate total net worth after this transaction
    const netWorth = Object.values(accountBalances).reduce((sum, bal) => sum + bal, 0);
    dailyData[dateKey] = netWorth;
  });
  
  // Fill in missing days within the range
  const result: DailyNetWorth[] = [];
  const current = new Date(startDate);
  let lastKnownNetWorth = 0;
  
  while (current <= endDate) {
    const dateKey = current.toISOString().split('T')[0];
    if (dailyData[dateKey] !== undefined) {
      lastKnownNetWorth = dailyData[dateKey];
    }
    result.push({
      date: dateKey,
      netWorth: lastKnownNetWorth,
    });
    current.setDate(current.getDate() + 1);
  }
  
  return result;
}

// Usage in component
const netWorthData = useMemo(() => {
  if (!transactions || !accounts) return [];
  const { start, end } = getDateRange(period);
  return calculateNetWorthHistory(transactions, accounts, start, end);
}, [transactions, accounts, period]);
```

---

## ✨ ENHANCEMENT #4: Settings Tab

### New Route: `/settings`

Create comprehensive master data management interface.

**File structure:**
```
src/app/settings/
├── page.tsx              # Main settings page with tabs
├── AccountTypesTab.tsx   # CRUD for account types
├── CategoriesTab.tsx     # Tree view for categories/subcategories
├── AccountGroupsTab.tsx  # CRUD for account groups
```

### 4.1 Database Schema Updates

**File:** `src/lib/db.ts`

```typescript
import Dexie, { Table } from 'dexie';

// NEW: Account Types table
export interface AccountType {
  id?: number;
  name: string;          // "Bank", "Credit Card", "Loan", etc.
  icon?: string;
  isLiability?: boolean; // For future: credit cards, loans
  sortOrder: number;
}

// NEW: Account Groups table
export interface AccountGroup {
  id?: number;
  name: string;          // "Primary Banking", "Digital Wallets"
  sortOrder: number;
}

// UPDATED: Account with group reference
export interface Account {
  id?: number;
  name: string;
  typeId: number;        // References AccountType
  type?: string;         // Keep for backward compatibility
  balance: number;
  thresholdValue: number;
  icon?: string;
  color?: string;
  groupId?: number;      // References AccountGroup
}

// UPDATED: Category with sortOrder
export interface Category {
  id?: number;
  name: string;
  parentId?: number;     // NULL for top-level, set for subcategories
  type: 'EXPENSE' | 'INCOME';
  icon?: string;
  color?: string;
  sortOrder: number;
}

export class MoneyMngrDB extends Dexie {
  accounts!: Table<Account>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;
  accountTypes!: Table<AccountType>;
  accountGroups!: Table<AccountGroup>;

  constructor() {
    super('MoneyMngrDB');
    
    this.version(2).stores({
      accounts: '++id, name, typeId, groupId',
      categories: '++id, name, parentId, type, sortOrder',
      transactions: '++id, date, transactionType, fromAccountId, toAccountId, toCategoryId',
      accountTypes: '++id, name, sortOrder',
      accountGroups: '++id, name, sortOrder',
    });
  }
}

export const db = new MoneyMngrDB();

// Seed default account types if empty
db.on('ready', async () => {
  const count = await db.accountTypes.count();
  if (count === 0) {
    await db.accountTypes.bulkAdd([
      { name: 'Bank', icon: '🏦', sortOrder: 1 },
      { name: 'Cash', icon: '💵', sortOrder: 2 },
      { name: 'Wallet', icon: '👛', sortOrder: 3 },
      { name: 'Investment', icon: '📈', sortOrder: 4 },
      { name: 'Credit Card', icon: '💳', isLiability: true, sortOrder: 5 },
    ]);
  }
});
```

### 4.2 Settings Page Layout

**File:** `src/app/settings/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Settings, CreditCard, FolderTree, Layers } from 'lucide-react';
import AccountTypesTab from './AccountTypesTab';
import CategoriesTab from './CategoriesTab';
import AccountGroupsTab from './AccountGroupsTab';

type SettingsTab = 'account-types' | 'categories' | 'account-groups';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account-types');

  const tabs = [
    { id: 'account-types', label: 'Account Types', icon: CreditCard },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'account-groups', label: 'Account Groups', icon: Layers },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-slate-400">Manage your master data</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-700 pb-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'account-types' && <AccountTypesTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'account-groups' && <AccountGroupsTab />}
      </div>
    </div>
  );
}
```

### 4.3 Categories Tab with Tree View

**File:** `src/app/settings/CategoriesTab.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Category } from '@/lib/db';
import { 
  ChevronRight, ChevronDown, Plus, Pencil, Trash2, 
  GripVertical, AlertTriangle 
} from 'lucide-react';

export default function CategoriesTab() {
  const [categoryType, setCategoryType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);
  const [moveToCategory, setMoveToCategory] = useState<number | null>(null);

  const categories = useLiveQuery(
    () => db.categories.where('type').equals(categoryType).sortBy('sortOrder'),
    [categoryType]
  );

  const transactions = useLiveQuery(() => db.transactions.toArray());

  // Group into parent/children
  const categoryTree = categories?.reduce((acc, cat) => {
    if (!cat.parentId) {
      acc.parents.push(cat);
    } else {
      if (!acc.children[cat.parentId]) acc.children[cat.parentId] = [];
      acc.children[cat.parentId].push(cat);
    }
    return acc;
  }, { parents: [] as Category[], children: {} as Record<number, Category[]> });

  const getTransactionCount = (categoryId: number) => {
    return transactions?.filter(t => 
      t.toCategoryId === categoryId || t.subCategoryId === categoryId
    ).length || 0;
  };

  const handleDelete = async (category: Category) => {
    const txCount = getTransactionCount(category.id!);
    
    if (txCount > 0) {
      setDeleteConfirm(category);
      return;
    }
    
    await db.categories.delete(category.id!);
  };

  const handleDeleteWithMove = async () => {
    if (!deleteConfirm || moveToCategory === null) return;
    
    // Move all transactions to the new category
    await db.transactions
      .where('toCategoryId')
      .equals(deleteConfirm.id!)
      .modify({ toCategoryId: moveToCategory });
    
    await db.transactions
      .where('subCategoryId')
      .equals(deleteConfirm.id!)
      .modify({ subCategoryId: moveToCategory });
    
    // Delete the category
    await db.categories.delete(deleteConfirm.id!);
    
    setDeleteConfirm(null);
    setMoveToCategory(null);
  };

  const toggleExpand = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setCategoryType('EXPENSE')}
          className={`px-4 py-2 rounded-lg ${
            categoryType === 'EXPENSE' 
              ? 'bg-red-600 text-white' 
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          Expense Categories
        </button>
        <button
          onClick={() => setCategoryType('INCOME')}
          className={`px-4 py-2 rounded-lg ${
            categoryType === 'INCOME' 
              ? 'bg-green-600 text-white' 
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          Income Categories
        </button>
      </div>

      {/* Add New Category */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New category name..."
          className="flex-1 px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 
                     focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={async () => {
            if (!newCategoryName.trim()) return;
            const maxSort = Math.max(...(categories?.map(c => c.sortOrder) || [0]));
            await db.categories.add({
              name: newCategoryName,
              type: categoryType,
              sortOrder: maxSort + 1,
            });
            setNewCategoryName('');
          }}
          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Category Tree */}
      <div className="space-y-2">
        {categoryTree?.parents.map(parent => (
          <div key={parent.id} className="bg-slate-800 rounded-lg overflow-hidden">
            {/* Parent Category Row */}
            <div className="flex items-center gap-2 p-3 hover:bg-slate-700">
              <GripVertical className="w-4 h-4 text-slate-500 cursor-grab" />
              
              <button
                onClick={() => toggleExpand(parent.id!)}
                className="p-1 hover:bg-slate-600 rounded"
              >
                {expandedCategories.has(parent.id!) 
                  ? <ChevronDown className="w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />
                }
              </button>
              
              <span className="flex-1 font-medium">{parent.name}</span>
              
              <span className="text-slate-500 text-sm">
                {getTransactionCount(parent.id!)} transactions
              </span>
              
              <button
                onClick={() => setEditingCategory(parent)}
                className="p-2 hover:bg-slate-600 rounded"
              >
                <Pencil className="w-4 h-4 text-blue-400" />
              </button>
              
              <button
                onClick={() => handleDelete(parent)}
                className="p-2 hover:bg-slate-600 rounded"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>

            {/* Subcategories */}
            {expandedCategories.has(parent.id!) && (
              <div className="border-t border-slate-700">
                {categoryTree.children[parent.id!]?.map(child => (
                  <div 
                    key={child.id}
                    className="flex items-center gap-2 p-3 pl-12 hover:bg-slate-700 
                               border-t border-slate-700/50"
                  >
                    <GripVertical className="w-4 h-4 text-slate-500 cursor-grab" />
                    <span className="flex-1">{child.name}</span>
                    <span className="text-slate-500 text-sm">
                      {getTransactionCount(child.id!)} transactions
                    </span>
                    <button
                      onClick={() => setEditingCategory(child)}
                      className="p-2 hover:bg-slate-600 rounded"
                    >
                      <Pencil className="w-4 h-4 text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(child)}
                      className="p-2 hover:bg-slate-600 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
                
                {/* Add Subcategory */}
                <div className="p-3 pl-12 border-t border-slate-700/50">
                  <button
                    onClick={async () => {
                      const name = prompt('Subcategory name:');
                      if (!name) return;
                      await db.categories.add({
                        name,
                        parentId: parent.id,
                        type: categoryType,
                        sortOrder: (categoryTree.children[parent.id!]?.length || 0) + 1,
                      });
                    }}
                    className="text-blue-400 text-sm flex items-center gap-1 hover:text-blue-300"
                  >
                    <Plus className="w-3 h-3" />
                    Add Subcategory
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Category Has Transactions</h3>
            </div>
            
            <p className="text-slate-300 mb-4">
              "{deleteConfirm.name}" has {getTransactionCount(deleteConfirm.id!)} transactions.
              Where should they be moved?
            </p>
            
            <select
              value={moveToCategory || ''}
              onChange={(e) => setMoveToCategory(Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-700 rounded-lg mb-4"
            >
              <option value="">Select category...</option>
              {categories
                ?.filter(c => c.id !== deleteConfirm.id)
                .map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              }
            </select>
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setDeleteConfirm(null);
                  setMoveToCategory(null);
                }}
                className="px-4 py-2 bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWithMove}
                disabled={moveToCategory === null}
                className="px-4 py-2 bg-red-600 rounded-lg disabled:opacity-50"
              >
                Move & Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4.4 Update Navigation

**File:** `src/components/Navigation.tsx` or bottom tabs

```tsx
// Add Settings to navigation
const tabs = [
  { path: '/transactions', icon: Receipt, label: 'Transactions' },
  { path: '/accounts', icon: Building, label: 'Accounts' },
  { path: '/stats', icon: BarChart3, label: 'Stats' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];
```

---

## ✨ ENHANCEMENT #5: Dynamic Add Transaction Form

### 5.1 Transaction Type UI Logic

**File:** `src/components/AddTransactionModal.tsx`

```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Account, Category } from '@/lib/db';
import { ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';

type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

interface TransactionFormData {
  type: TransactionType;
  amount: number;
  fromAccountId?: number;
  toAccountId?: number;
  categoryId?: number;
  subCategoryId?: number;
  dateTime: string;
  note: string;
}

export default function AddTransactionModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'EXPENSE',
    amount: 0,
    dateTime: new Date().toISOString().slice(0, 16), // "YYYY-MM-DDTHH:mm"
    note: '',
  });

  const accounts = useLiveQuery(() => db.accounts.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());

  // Filter categories based on transaction type
  const availableCategories = useMemo(() => {
    if (!categories) return [];
    if (formData.type === 'TRANSFER') return []; // No categories for transfers
    const catType = formData.type === 'EXPENSE' ? 'EXPENSE' : 'INCOME';
    return categories.filter(c => c.type === catType && !c.parentId);
  }, [categories, formData.type]);

  // Get subcategories for selected category
  const availableSubcategories = useMemo(() => {
    if (!categories || !formData.categoryId) return [];
    return categories.filter(c => c.parentId === formData.categoryId);
  }, [categories, formData.categoryId]);

  // Calculate preview for transfers
  const transferPreview = useMemo(() => {
    if (formData.type !== 'TRANSFER' || !formData.amount) return null;
    if (!formData.fromAccountId || !formData.toAccountId) return null;
    
    const fromAccount = accounts?.find(a => a.id === formData.fromAccountId);
    const toAccount = accounts?.find(a => a.id === formData.toAccountId);
    
    if (!fromAccount || !toAccount) return null;
    
    const newFromBalance = fromAccount.balance - formData.amount;
    const newToBalance = toAccount.balance + formData.amount;
    
    return {
      from: {
        account: fromAccount,
        currentBalance: fromAccount.balance,
        newBalance: newFromBalance,
        belowThreshold: newFromBalance < fromAccount.thresholdValue,
      },
      to: {
        account: toAccount,
        currentBalance: toAccount.balance,
        newBalance: newToBalance,
        belowThreshold: newToBalance < toAccount.thresholdValue,
      },
    };
  }, [formData, accounts]);

  const handleSubmit = async () => {
    const date = new Date(formData.dateTime);
    
    // Create transaction
    const txData: any = {
      date,
      amount: formData.amount,
      transactionType: formData.type,
      description: formData.note,
    };

    if (formData.type === 'EXPENSE') {
      txData.fromAccountId = formData.fromAccountId;
      txData.toCategoryId = formData.categoryId;
      txData.subCategoryId = formData.subCategoryId;
      
      // Update account balance
      await db.accounts.update(formData.fromAccountId!, {
        balance: db.accounts.get(formData.fromAccountId!).then(a => a!.balance - formData.amount)
      });
    } else if (formData.type === 'INCOME') {
      txData.toAccountId = formData.toAccountId;
      txData.toCategoryId = formData.categoryId;
      txData.subCategoryId = formData.subCategoryId;
      
      // Update account balance
      await db.accounts.update(formData.toAccountId!, {
        balance: db.accounts.get(formData.toAccountId!).then(a => a!.balance + formData.amount)
      });
    } else { // TRANSFER
      txData.fromAccountId = formData.fromAccountId;
      txData.toAccountId = formData.toAccountId;
      
      // Update both accounts
      const fromAccount = await db.accounts.get(formData.fromAccountId!);
      const toAccount = await db.accounts.get(formData.toAccountId!);
      
      await db.accounts.update(formData.fromAccountId!, {
        balance: fromAccount!.balance - formData.amount
      });
      await db.accounts.update(formData.toAccountId!, {
        balance: toAccount!.balance + formData.amount
      });
    }

    await db.transactions.add(txData);
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold">Add Transaction</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Transaction Type Selector */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Transaction Type</label>
            <div className="flex gap-2">
              {(['EXPENSE', 'INCOME', 'TRANSFER'] as TransactionType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    type,
                    categoryId: undefined,
                    subCategoryId: undefined,
                    fromAccountId: undefined,
                    toAccountId: undefined,
                  }))}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    formData.type === type
                      ? type === 'EXPENSE' 
                        ? 'bg-red-600 text-white'
                        : type === 'INCOME'
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Amount (₹) *</label>
            <input
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 
                         focus:border-blue-500 focus:outline-none text-xl"
            />
          </div>

          {/* From Account - for EXPENSE and TRANSFER */}
          {(formData.type === 'EXPENSE' || formData.type === 'TRANSFER') && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                {formData.type === 'TRANSFER' ? 'From Account *' : 'Account *'}
              </label>
              <select
                value={formData.fromAccountId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, fromAccountId: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600"
              >
                <option value="">Select account...</option>
                {accounts?.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} (₹{account.balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* To Account - for INCOME and TRANSFER */}
          {(formData.type === 'INCOME' || formData.type === 'TRANSFER') && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                {formData.type === 'TRANSFER' ? 'To Account *' : 'Account *'}
              </label>
              <select
                value={formData.toAccountId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, toAccountId: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600"
              >
                <option value="">Select account...</option>
                {accounts
                  ?.filter(a => a.id !== formData.fromAccountId) // Exclude "from" account for transfers
                  .map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} (₹{account.balance.toLocaleString()})
                    </option>
                  ))
                }
              </select>
            </div>
          )}

          {/* Category - only for EXPENSE and INCOME */}
          {formData.type !== 'TRANSFER' && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">Category *</label>
              <select
                value={formData.categoryId || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  categoryId: Number(e.target.value),
                  subCategoryId: undefined,
                }))}
                className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600"
              >
                <option value="">Select category...</option>
                {availableCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Subcategory - only if category is selected */}
          {formData.type !== 'TRANSFER' && formData.categoryId && availableSubcategories.length > 0 && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">Subcategory</label>
              <select
                value={formData.subCategoryId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, subCategoryId: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600"
              >
                <option value="">Select subcategory (optional)...</option>
                {availableSubcategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Transfer Preview */}
          {formData.type === 'TRANSFER' && transferPreview && (
            <div className="bg-slate-700/50 rounded-xl p-4">
              <h4 className="text-sm text-slate-400 mb-3 flex items-center gap-2">
                💸 Transfer Preview
              </h4>
              
              <div className="flex items-center justify-between gap-4">
                {/* From Account */}
                <div className="flex-1 text-center">
                  <div className="font-medium">{transferPreview.from.account.name}</div>
                  <div className="text-slate-400">₹{transferPreview.from.currentBalance.toLocaleString()}</div>
                  <div className="text-2xl my-2">↓</div>
                  <div className={`font-semibold ${
                    transferPreview.from.belowThreshold ? 'text-red-400' : 'text-green-400'
                  }`}>
                    ₹{transferPreview.from.newBalance.toLocaleString()}
                  </div>
                  {transferPreview.from.belowThreshold && (
                    <div className="flex items-center justify-center gap-1 text-red-400 text-xs mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      Below threshold!
                    </div>
                  )}
                </div>

                {/* Arrow with amount */}
                <div className="flex flex-col items-center">
                  <div className="text-blue-400 font-bold">
                    ₹{formData.amount.toLocaleString()}
                  </div>
                  <ArrowRight className="w-8 h-8 text-blue-400" />
                </div>

                {/* To Account */}
                <div className="flex-1 text-center">
                  <div className="font-medium">{transferPreview.to.account.name}</div>
                  <div className="text-slate-400">₹{transferPreview.to.currentBalance.toLocaleString()}</div>
                  <div className="text-2xl my-2">↓</div>
                  <div className="font-semibold text-green-400">
                    ₹{transferPreview.to.newBalance.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-green-400 text-xs mt-1">
                    <CheckCircle className="w-3 h-3" />
                    Safe
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Date & Time</label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={formData.dateTime}
                onChange={(e) => setFormData(prev => ({ ...prev, dateTime: e.target.value }))}
                className="flex-1 px-4 py-3 bg-slate-700 rounded-lg border border-slate-600"
              />
              <button
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  dateTime: new Date().toISOString().slice(0, 16) 
                }))}
                className="px-4 py-2 bg-slate-600 rounded-lg hover:bg-slate-500"
              >
                Now
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Note (optional)</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Add a note..."
              rows={2}
              className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 rounded-lg hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              !formData.amount ||
              (formData.type === 'EXPENSE' && (!formData.fromAccountId || !formData.categoryId)) ||
              (formData.type === 'INCOME' && (!formData.toAccountId || !formData.categoryId)) ||
              (formData.type === 'TRANSFER' && (!formData.fromAccountId || !formData.toAccountId))
            }
            className={`px-6 py-2 rounded-lg font-medium disabled:opacity-50 ${
              formData.type === 'EXPENSE' 
                ? 'bg-red-600 hover:bg-red-700'
                : formData.type === 'INCOME'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {formData.type === 'TRANSFER' ? 'Transfer' : 'Record'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## ✨ ENHANCEMENT #6: Responsive Design

### Mobile-First Utilities

Add these Tailwind responsive patterns consistently:

```tsx
// Grid layouts
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Text sizes
className="text-lg md:text-xl lg:text-2xl"

// Padding
className="p-4 md:p-6 lg:p-8"

// Hide on mobile, show on desktop
className="hidden md:flex"

// Show on mobile, hide on desktop
className="flex md:hidden"

// Modal sizing
className="w-full max-w-lg md:max-w-xl lg:max-w-2xl"

// Bottom nav stays fixed
className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto"
```

---

## 📁 Files to Create/Modify Summary

### Create New Files:
1. `src/app/settings/page.tsx`
2. `src/app/settings/AccountTypesTab.tsx`
3. `src/app/settings/CategoriesTab.tsx`
4. `src/app/settings/AccountGroupsTab.tsx`

### Modify Existing Files:
1. `src/lib/db.ts` — Add new tables, update schema
2. `src/lib/csvImport.ts` — Fix parsing logic for transfers and dates
3. `src/app/transactions/page.tsx` — Fix filtering, add debug
4. `src/app/accounts/page.tsx` — Fix edit modal state
5. `src/app/stats/page.tsx` — Fix net worth calculation
6. `src/components/AccountModal.tsx` — Fix controlled inputs
7. `src/components/AddTransactionModal.tsx` — Full rewrite with dynamic form
8. `src/components/Navigation.tsx` — Add Settings tab

---

## 🧪 Testing Checklist

After implementation, verify:

- [ ] CSV import creates transactions visible in list
- [ ] Time filter "All Time" shows all transactions
- [ ] Edit account modal shows correct data
- [ ] Stats chart shows changing values over time
- [ ] Settings tab allows CRUD on categories
- [ ] Deleting category with transactions prompts "move to"
- [ ] Add Transaction form changes based on type selection
- [ ] Transfer preview shows correct balance changes
- [ ] DateTime picker works and saves correctly
- [ ] Mobile layout is usable (bottom tabs, single column)

---

## 🚀 Implementation Order

1. **Bug #1 first** — Fix CSV parsing and transaction display (unblocks everything)
2. **Bug #2** — Fix edit modal state (quick win)
3. **Bug #3** — Fix stats calculation (depends on transactions working)
4. **Enhancement #5** — Dynamic transaction form (high user impact)
5. **Enhancement #4** — Settings tab (master data management)
6. **Enhancement #6** — Responsive polish

Good luck! 🎉
