# 💰 Money Mngr PWA — Claude Code Prompt (v3)

> **Repository:** https://github.com/ersa101/money-mngr-pwa
> **Date:** February 8, 2026
> **Architecture:** IndexedDB-First + Google Sheets Backup + Drive Snapshots
> **Prerequisite:** v1 must be deployed and working

---

## 📋 VERSION HISTORY

| Version | Codename | Features |
|---------|----------|----------|
| **v1** | Launch | Basic CRUD, Unified Add Transaction, PWA, Vercel Deploy |
| **v3** | Power User | Bulk Edit/Delete, Linked Transactions, Person Accounts, Backup to Sheets, Snapshots |
| **v4** | Full Suite | Authentication, Multi-device Sync, Budget Tracking |

---

## 🎯 v3 FEATURE LIST

| # | Feature | Complexity | Est. Time |
|---|---------|------------|-----------|
| 1 | Person Account Type | Low | 1 hour |
| 2 | Linked Transaction Checkbox | Medium | 3 hours |
| 3 | Bulk Select UI | Medium | 2 hours |
| 4 | Bulk Edit | Medium | 2 hours |
| 5 | Bulk Delete | Low | 1 hour |
| 6 | Google Sheets Backup (Batch) | Medium | 3 hours |
| 7 | Drive Snapshots (JSON) | Medium | 3 hours |
| 8 | Restore from Snapshot | Medium | 2 hours |
| 9 | Backup Reminder | Low | 30 min |
| | **Total** | | **~17.5 hours** |

---

## 📁 NEW/MODIFIED FILES

```
src/
├── lib/
│   ├── google-sheets.ts          # NEW: Sheets API client
│   ├── google-drive.ts           # NEW: Drive API for snapshots
│   └── db.ts                     # MODIFY: Add Person account type
│
├── components/
│   ├── transactions/
│   │   ├── AddTransactionModal.tsx   # MODIFY: Add linked transaction checkbox
│   │   ├── TransactionList.tsx       # MODIFY: Add bulk select UI
│   │   ├── BulkEditModal.tsx         # NEW: Bulk edit modal
│   │   └── BulkDeleteDialog.tsx      # NEW: Bulk delete confirmation
│   │
│   └── settings/
│       ├── BackupSection.tsx         # NEW: Live backup UI
│       ├── SnapshotSection.tsx       # NEW: Snapshot management UI
│       └── BackupReminder.tsx        # NEW: Reminder toast
│
├── app/
│   └── api/
│       ├── backup/
│       │   └── route.ts              # NEW: Backup to Sheets endpoint
│       ├── restore/
│       │   └── route.ts              # NEW: Restore from Sheets
│       └── snapshots/
│           ├── route.ts              # NEW: List snapshots
│           ├── create/route.ts       # NEW: Create snapshot
│           └── [id]/route.ts         # NEW: Get/Delete snapshot
│
├── hooks/
│   ├── useBackup.ts                  # NEW: Backup operations hook
│   └── useSnapshots.ts               # NEW: Snapshot operations hook
│
└── types/
    └── database.ts                   # MODIFY: Add new types
```

---

## 🔧 FEATURE 1: Person Account Type

### Database Changes

**File:** `src/types/database.ts`

```typescript
// Update Account type enum
export type AccountType = 
  | 'BANK' 
  | 'CASH' 
  | 'WALLET' 
  | 'INVESTMENT' 
  | 'CREDIT_CARD' 
  | 'PERSON';  // ← NEW

export interface Account {
  id?: number;
  name: string;
  type: AccountType;
  balance: number;           // For PERSON: positive = they owe you, negative = you owe them
  thresholdValue: number;
  color?: string;
  icon?: string;
  groupId?: number;
  isPerson?: boolean;        // ← NEW: Quick filter flag
  createdAt: string;
  updatedAt: string;
}
```

### UI Changes

**File:** `src/components/accounts/AccountModal.tsx`

Add "Person" to the account type dropdown:

```tsx
const accountTypes = [
  { value: 'BANK', label: '🏦 Bank', icon: Building2 },
  { value: 'CASH', label: '💵 Cash', icon: Wallet },
  { value: 'WALLET', label: '👛 Digital Wallet', icon: Smartphone },
  { value: 'INVESTMENT', label: '📈 Investment', icon: TrendingUp },
  { value: 'CREDIT_CARD', label: '💳 Credit Card', icon: CreditCard },
  { value: 'PERSON', label: '👤 Person', icon: User },  // ← NEW
];
```

### Person Account Card Display

**File:** `src/components/accounts/AccountCard.tsx`

```tsx
// Special display for Person accounts
if (account.type === 'PERSON') {
  const theyOweYou = account.balance > 0;
  const youOweThem = account.balance < 0;
  const settled = account.balance === 0;

  return (
    <div className={`bg-slate-800 rounded-lg p-4 border-l-4 ${
      theyOweYou ? 'border-green-500' : 
      youOweThem ? 'border-orange-500' : 
      'border-slate-500'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <User className="w-5 h-5 text-slate-400" />
        <span className="font-medium text-white">{account.name}</span>
        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
          Person
        </span>
      </div>
      
      <div className={`text-2xl font-bold ${
        theyOweYou ? 'text-green-400' : 
        youOweThem ? 'text-orange-400' : 
        'text-slate-400'
      }`}>
        {formatCurrency(Math.abs(account.balance))}
      </div>
      
      <div className="text-sm text-slate-400 mt-1">
        {theyOweYou && '← They owe you'}
        {youOweThem && '→ You owe them'}
        {settled && '✓ Settled'}
      </div>
    </div>
  );
}
```

---

## 🔧 FEATURE 2: Linked Transaction Checkbox

### Purpose

When paying for someone using Credit Card (or any account), create TWO linked transactions:
1. **Expense** from your account (Credit Card expense shows correctly)
2. **Income** to person's account (They now owe you)

### UI Changes

**File:** `src/components/transactions/AddTransactionModal.tsx`

Add this section after the existing form fields (only show for EXPENSE type):

```tsx
{/* ═══════════════════════════════════════════════════════════════ */}
{/* LINKED TRANSACTION (Only for Expense) */}
{/* ═══════════════════════════════════════════════════════════════ */}
{transactionType === 'EXPENSE' && (
  <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        id="isLinked"
        checked={isLinkedTransaction}
        onChange={(e) => setIsLinkedTransaction(e.target.checked)}
        className="w-4 h-4 rounded border-slate-500 bg-slate-700 
                   text-purple-500 focus:ring-purple-500"
      />
      <label htmlFor="isLinked" className="text-sm text-slate-300">
        This is a payment for someone (create linked transaction)
      </label>
    </div>
    
    {isLinkedTransaction && (
      <div className="mt-4 pl-7 space-y-3">
        <div>
          <label className="block text-sm text-slate-400 mb-2">
            Create receivable in *
          </label>
          <Select 
            value={linkedPersonAccountId} 
            onValueChange={setLinkedPersonAccountId}
          >
            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
              <SelectValue placeholder="Select person account" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {accounts
                .filter(a => a.type === 'PERSON')
                .map((account) => (
                  <SelectItem
                    key={account.id}
                    value={account.id!.toString()}
                    className="text-white"
                  >
                    👤 {account.name} ({formatCurrency(account.balance)})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Preview */}
        {linkedPersonAccountId && (
          <div className="bg-slate-800 rounded-lg p-3 text-sm">
            <div className="text-slate-400 mb-2">Will create:</div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-red-400">1.</span>
              <span>Expense from {accounts.find(a => a.id?.toString() === fromAccountId)?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 mt-1">
              <span className="text-green-400">2.</span>
              <span>Receivable in {accounts.find(a => a.id?.toString() === linkedPersonAccountId)?.name}</span>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
)}
```

### State Variables to Add

```tsx
const [isLinkedTransaction, setIsLinkedTransaction] = useState(false);
const [linkedPersonAccountId, setLinkedPersonAccountId] = useState<string>('');
```

### Save Logic Update

```tsx
const handleSave = async () => {
  // ... existing validation ...

  setIsSaving(true);

  try {
    const now = new Date().toISOString();
    
    // Create main transaction
    const mainTransactionId = await db.transactions.add({
      date: new Date(date).toISOString(),
      amount: parseFloat(amount),
      transactionType,
      fromAccountId: fromAccountId ? parseInt(fromAccountId) : undefined,
      toAccountId: toAccountId ? parseInt(toAccountId) : undefined,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      description: description.trim() || undefined,
      status: 'CONFIRMED',
      source: parseSource === 'ai' || parseSource === 'regex' ? 'MAGIC_BOX' : 'MANUAL',
      currency: 'INR',
      linkedTransactionId: undefined, // Will update after creating linked
      createdAt: now,
      updatedAt: now,
    });

    // Update source account balance
    if (transactionType === 'EXPENSE' && fromAccountId) {
      await db.accounts
        .where('id')
        .equals(parseInt(fromAccountId))
        .modify(account => {
          account.balance -= parseFloat(amount);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // CREATE LINKED TRANSACTION (if checked)
    // ═══════════════════════════════════════════════════════════════
    if (isLinkedTransaction && linkedPersonAccountId && transactionType === 'EXPENSE') {
      const linkedTransactionId = await db.transactions.add({
        date: new Date(date).toISOString(),
        amount: parseFloat(amount),
        transactionType: 'INCOME',
        fromAccountId: undefined,
        toAccountId: parseInt(linkedPersonAccountId),
        categoryId: undefined, // Or a default "Lending" category
        description: `Linked: ${description || 'Payment on behalf'}`,
        status: 'CONFIRMED',
        source: 'MANUAL',
        currency: 'INR',
        linkedTransactionId: mainTransactionId,
        createdAt: now,
        updatedAt: now,
      });

      // Update main transaction with link
      await db.transactions.update(mainTransactionId, {
        linkedTransactionId: linkedTransactionId,
      });

      // Update person account balance (they now owe you)
      await db.accounts
        .where('id')
        .equals(parseInt(linkedPersonAccountId))
        .modify(account => {
          account.balance += parseFloat(amount);
        });

      toast.success('Transaction + linked receivable created!');
    } else {
      toast.success('Transaction saved!');
    }

    onClose();
  } catch (error) {
    console.error('Failed to save:', error);
    toast.error('Failed to save transaction');
  } finally {
    setIsSaving(false);
  }
};
```

### Database Schema Update

**File:** `src/types/database.ts`

```typescript
export interface Transaction {
  id?: number;
  date: string;
  amount: number;
  transactionType: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  fromAccountId?: number;
  toAccountId?: number;
  categoryId?: number;
  subCategoryId?: number;
  description?: string;
  status: 'CONFIRMED' | 'PENDING' | 'REJECTED';
  source: 'MANUAL' | 'CSV_IMPORT' | 'MAGIC_BOX';
  currency: string;
  linkedTransactionId?: number;  // ← NEW: Links to counterpart transaction
  createdAt: string;
  updatedAt: string;
}
```

**File:** `src/lib/db.ts`

```typescript
this.version(2).stores({
  // ... existing tables ...
  transactions: '++id, date, transactionType, fromAccountId, toAccountId, categoryId, status, linkedTransactionId',
});
```

---

## 🔧 FEATURE 3: Bulk Select UI

### Transaction List with Checkboxes

**File:** `src/components/transactions/TransactionList.tsx`

```tsx
'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Transaction } from '@/types/database';
import { TransactionCard } from './TransactionCard';
import { BulkEditModal } from './BulkEditModal';
import { BulkDeleteDialog } from './BulkDeleteDialog';
import { Button } from '@/components/ui/button';
import { 
  CheckSquare, 
  Square, 
  Pencil, 
  Trash2, 
  X,
  Filter
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionList({ 
  transactions, 
  onEdit, 
  onDelete 
}: TransactionListProps) {
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  // Bulk selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Toggle single selection
  const toggleSelection = (id: number) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  // Select all visible
  const selectAll = () => {
    const allIds = new Set(transactions.map(t => t.id!));
    setSelectedIds(allIds);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Exit selection mode
  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Get selected transactions
  const selectedTransactions = useMemo(() => {
    return transactions.filter(t => selectedIds.has(t.id!));
  }, [transactions, selectedIds]);

  return (
    <div className="space-y-4">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BULK ACTIONS BAR */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {isSelectionMode ? (
        <div className="sticky top-0 z-10 bg-slate-800 rounded-lg p-3 flex items-center justify-between border border-slate-700">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={exitSelectionMode}
              className="text-slate-400"
            >
              <X className="w-4 h-4" />
            </Button>
            
            <span className="text-white font-medium">
              {selectedIds.size} selected
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={selectedIds.size === transactions.length ? deselectAll : selectAll}
              className="text-slate-300"
            >
              {selectedIds.size === transactions.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkEdit(true)}
              disabled={selectedIds.size === 0}
              className="border-slate-600 text-slate-300"
            >
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkDelete(true)}
              disabled={selectedIds.size === 0}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSelectionMode(true)}
            className="text-slate-400"
          >
            <CheckSquare className="w-4 h-4 mr-1" />
            Select
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TRANSACTION LIST */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-2">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex items-start gap-2">
            {/* Checkbox (only in selection mode) */}
            {isSelectionMode && (
              <button
                onClick={() => toggleSelection(transaction.id!)}
                className="mt-4 p-1 hover:bg-slate-700 rounded"
              >
                {selectedIds.has(transaction.id!) ? (
                  <CheckSquare className="w-5 h-5 text-purple-400" />
                ) : (
                  <Square className="w-5 h-5 text-slate-500" />
                )}
              </button>
            )}
            
            {/* Transaction Card */}
            <div className="flex-1">
              <TransactionCard
                transaction={transaction}
                accounts={accounts}
                categories={categories}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <BulkEditModal
        isOpen={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        transactions={selectedTransactions}
        onSuccess={() => {
          setShowBulkEdit(false);
          exitSelectionMode();
        }}
      />

      <BulkDeleteDialog
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        transactions={selectedTransactions}
        onSuccess={() => {
          setShowBulkDelete(false);
          exitSelectionMode();
        }}
      />
    </div>
  );
}
```

---

## 🔧 FEATURE 4: Bulk Edit Modal

**File:** `src/components/transactions/BulkEditModal.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Transaction } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onSuccess: () => void;
}

export function BulkEditModal({
  isOpen,
  onClose,
  transactions,
  onSuccess,
}: BulkEditModalProps) {
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const [categoryId, setCategoryId] = useState<string>('__keep__');
  const [fromAccountId, setFromAccountId] = useState<string>('__keep__');
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter: Only expense transactions can have category changed
  const expenseTransactions = transactions.filter(t => t.transactionType === 'EXPENSE');
  const incomeTransactions = transactions.filter(t => t.transactionType === 'INCOME');

  const handleUpdate = async () => {
    const updates: Partial<Transaction> = {};
    
    if (categoryId !== '__keep__') {
      updates.categoryId = parseInt(categoryId);
    }
    
    if (fromAccountId !== '__keep__') {
      updates.fromAccountId = parseInt(fromAccountId);
    }

    if (Object.keys(updates).length === 0) {
      toast.error('No changes selected');
      return;
    }

    setIsUpdating(true);

    try {
      const ids = transactions.map(t => t.id!);
      
      await db.transactions
        .where('id')
        .anyOf(ids)
        .modify({
          ...updates,
          updatedAt: new Date().toISOString(),
        });

      toast.success(`Updated ${transactions.length} transactions`);
      onSuccess();
    } catch (error) {
      console.error('Bulk update failed:', error);
      toast.error('Failed to update transactions');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>
            Bulk Edit ({transactions.length} transactions)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="bg-slate-800 rounded-lg p-3 text-sm text-slate-400">
            <div>Expenses: {expenseTransactions.length}</div>
            <div>Income: {incomeTransactions.length}</div>
            <div>Transfers: {transactions.length - expenseTransactions.length - incomeTransactions.length}</div>
          </div>

          {/* Change Category */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Change Category to
            </label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Keep original" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="__keep__" className="text-slate-400">
                  Keep original (no change)
                </SelectItem>
                {categories
                  .filter(c => !c.parentId)
                  .map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id!.toString()}
                      className="text-white"
                    >
                      {category.icon} {category.name}
                      <span className="text-slate-500 ml-2">
                        ({category.type})
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Change Account */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Change Account to
            </label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Keep original" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="__keep__" className="text-slate-400">
                  Keep original (no change)
                </SelectItem>
                {accounts.map((account) => (
                  <SelectItem
                    key={account.id}
                    value={account.id!.toString()}
                    className="text-white"
                  >
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 text-amber-400 text-sm bg-amber-500/10 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Note: Changing accounts will NOT recalculate balances. 
              Use this for correcting categorization, not moving money.
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update {transactions.length} Transactions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔧 FEATURE 5: Bulk Delete Dialog

**File:** `src/components/transactions/BulkDeleteDialog.tsx`

```tsx
'use client';

import { useState } from 'react';
import { db } from '@/lib/db';
import { Transaction } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import toast from 'react-hot-toast';

interface BulkDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onSuccess: () => void;
}

export function BulkDeleteDialog({
  isOpen,
  onClose,
  transactions,
  onSuccess,
}: BulkDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate totals
  const totalExpense = transactions
    .filter(t => t.transactionType === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalIncome = transactions
    .filter(t => t.transactionType === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await db.transaction('rw', db.transactions, db.accounts, async () => {
        for (const txn of transactions) {
          // Reverse balance changes
          if (txn.transactionType === 'EXPENSE' && txn.fromAccountId) {
            await db.accounts
              .where('id')
              .equals(txn.fromAccountId)
              .modify(a => { a.balance += txn.amount; });
          } else if (txn.transactionType === 'INCOME' && txn.toAccountId) {
            await db.accounts
              .where('id')
              .equals(txn.toAccountId)
              .modify(a => { a.balance -= txn.amount; });
          } else if (txn.transactionType === 'TRANSFER') {
            if (txn.fromAccountId) {
              await db.accounts
                .where('id')
                .equals(txn.fromAccountId)
                .modify(a => { a.balance += txn.amount; });
            }
            if (txn.toAccountId) {
              await db.accounts
                .where('id')
                .equals(txn.toAccountId)
                .modify(a => { a.balance -= txn.amount; });
            }
          }

          // Check for linked transaction and delete it too
          if (txn.linkedTransactionId) {
            const linkedTxn = await db.transactions.get(txn.linkedTransactionId);
            if (linkedTxn) {
              // Reverse linked transaction balance
              if (linkedTxn.toAccountId) {
                await db.accounts
                  .where('id')
                  .equals(linkedTxn.toAccountId)
                  .modify(a => { a.balance -= linkedTxn.amount; });
              }
              await db.transactions.delete(linkedTxn.id!);
            }
          }
        }

        // Delete all selected transactions
        const ids = transactions.map(t => t.id!);
        await db.transactions.where('id').anyOf(ids).delete();
      });

      toast.success(`Deleted ${transactions.length} transactions`);
      onSuccess();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Failed to delete transactions');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <Trash2 className="w-5 h-5" />
            Delete {transactions.length} Transactions?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="flex items-start gap-3 text-amber-400 bg-amber-500/10 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">This action cannot be undone!</div>
              <div className="text-sm text-amber-400/70 mt-1">
                Account balances will be adjusted automatically.
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-800 rounded-lg p-4 space-y-2">
            <div className="text-sm text-slate-400">You are about to delete:</div>
            
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <div className="text-slate-500 text-xs">Expenses</div>
                <div className="text-red-400 font-medium">
                  {formatCurrency(totalExpense)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">Income</div>
                <div className="text-green-400 font-medium">
                  {formatCurrency(totalIncome)}
                </div>
              </div>
            </div>
          </div>

          {/* Preview list (first 5) */}
          <div className="max-h-40 overflow-y-auto space-y-1">
            {transactions.slice(0, 5).map((txn) => (
              <div 
                key={txn.id} 
                className="text-sm text-slate-400 flex justify-between"
              >
                <span className="truncate">{txn.description || 'No description'}</span>
                <span className={
                  txn.transactionType === 'EXPENSE' ? 'text-red-400' : 'text-green-400'
                }>
                  {formatCurrency(txn.amount)}
                </span>
              </div>
            ))}
            {transactions.length > 5 && (
              <div className="text-sm text-slate-500">
                ... and {transactions.length - 5} more
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete {transactions.length} Transactions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔧 FEATURE 6: Google Sheets Backup (Batch)

### Environment Variables Needed

**File:** `.env.local`

```env
# Google Sheets (for backup)
GOOGLE_SERVICE_ACCOUNT_EMAIL=moneymngr@moneymngr.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=1bYAXgCbiN7zFiUw2IRRJPf8vLx9oWffnh7lrTFMRU88
```

### Google Sheets Client

**File:** `src/lib/google-sheets.ts`

```typescript
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ═══════════════════════════════════════════════════════════════
// BACKUP: Write all data to Google Sheets (batch)
// ═══════════════════════════════════════════════════════════════

interface BackupData {
  accounts: any[];
  categories: any[];
  transactions: any[];
  accountTypes: any[];
  accountGroups: any[];
}

export async function backupToSheets(data: BackupData): Promise<void> {
  // Define headers for each sheet
  const sheetsConfig = [
    {
      name: 'accounts',
      headers: ['id', 'name', 'type', 'balance', 'thresholdValue', 'color', 'icon', 'groupId', 'isPerson', 'createdAt', 'updatedAt'],
      data: data.accounts,
    },
    {
      name: 'categories',
      headers: ['id', 'name', 'type', 'parentId', 'icon', 'color', 'sortOrder', 'createdAt', 'updatedAt'],
      data: data.categories,
    },
    {
      name: 'transactions',
      headers: ['id', 'date', 'amount', 'transactionType', 'fromAccountId', 'toAccountId', 'categoryId', 'subCategoryId', 'description', 'status', 'source', 'currency', 'linkedTransactionId', 'createdAt', 'updatedAt'],
      data: data.transactions,
    },
    {
      name: 'accountTypes',
      headers: ['id', 'name', 'icon', 'isLiability', 'sortOrder'],
      data: data.accountTypes || [],
    },
    {
      name: 'accountGroups',
      headers: ['id', 'name', 'sortOrder'],
      data: data.accountGroups || [],
    },
  ];

  for (const config of sheetsConfig) {
    // Clear existing data (keep header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${config.name}!A2:Z`,
    });

    if (config.data.length === 0) continue;

    // Convert objects to rows
    const rows = config.data.map(item =>
      config.headers.map(header => {
        const value = item[header];
        if (value === undefined || value === null) return '';
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        return String(value);
      })
    );

    // Batch write all rows at once
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${config.name}!A2`,
      valueInputOption: 'RAW',
      requestBody: {
        values: rows,
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// RESTORE: Read all data from Google Sheets
// ═══════════════════════════════════════════════════════════════

export async function restoreFromSheets(): Promise<BackupData> {
  const sheetsConfig = [
    { name: 'accounts', headers: ['id', 'name', 'type', 'balance', 'thresholdValue', 'color', 'icon', 'groupId', 'isPerson', 'createdAt', 'updatedAt'] },
    { name: 'categories', headers: ['id', 'name', 'type', 'parentId', 'icon', 'color', 'sortOrder', 'createdAt', 'updatedAt'] },
    { name: 'transactions', headers: ['id', 'date', 'amount', 'transactionType', 'fromAccountId', 'toAccountId', 'categoryId', 'subCategoryId', 'description', 'status', 'source', 'currency', 'linkedTransactionId', 'createdAt', 'updatedAt'] },
    { name: 'accountTypes', headers: ['id', 'name', 'icon', 'isLiability', 'sortOrder'] },
    { name: 'accountGroups', headers: ['id', 'name', 'sortOrder'] },
  ];

  const result: BackupData = {
    accounts: [],
    categories: [],
    transactions: [],
    accountTypes: [],
    accountGroups: [],
  };

  for (const config of sheetsConfig) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${config.name}!A2:Z`,
    });

    const rows = response.data.values || [];
    
    const data = rows.map(row => {
      const obj: Record<string, any> = {};
      config.headers.forEach((header, index) => {
        let value = row[index];
        
        // Parse types
        if (value === 'TRUE') value = true;
        else if (value === 'FALSE') value = false;
        else if (header === 'balance' || header === 'amount' || header === 'thresholdValue' || header === 'sortOrder') {
          value = parseFloat(value) || 0;
        }
        else if (header === 'id' || header.endsWith('Id')) {
          value = value ? parseInt(value) : undefined;
        }
        
        obj[header] = value || undefined;
      });
      return obj;
    });

    (result as any)[config.name] = data;
  }

  return result;
}

export const sheetsClient = {
  backupToSheets,
  restoreFromSheets,
};
```

### Backup API Route

**File:** `src/app/api/backup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sheetsClient } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    await sheetsClient.backupToSheets(data);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        accounts: data.accounts?.length || 0,
        categories: data.categories?.length || 0,
        transactions: data.transactions?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Backup failed:', error);
    return NextResponse.json(
      { error: error.message || 'Backup failed' },
      { status: 500 }
    );
  }
}
```

### Restore API Route

**File:** `src/app/api/restore/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sheetsClient } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  try {
    const data = await sheetsClient.restoreFromSheets();
    
    return NextResponse.json({
      success: true,
      data,
      counts: {
        accounts: data.accounts?.length || 0,
        categories: data.categories?.length || 0,
        transactions: data.transactions?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Restore failed:', error);
    return NextResponse.json(
      { error: error.message || 'Restore failed' },
      { status: 500 }
    );
  }
}
```

---

## 🔧 FEATURE 7 & 8: Drive Snapshots

### Google Drive Client

**File:** `src/lib/google-drive.ts`

```typescript
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

const FOLDER_NAME = 'MoneyMngr_Snapshots';

// Get or create snapshots folder
async function getSnapshotsFolderId(): Promise<string> {
  // Search for existing folder
  const response = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  return folder.data.id!;
}

// ═══════════════════════════════════════════════════════════════
// CREATE SNAPSHOT
// ═══════════════════════════════════════════════════════════════

interface SnapshotData {
  accounts: any[];
  categories: any[];
  transactions: any[];
  accountTypes?: any[];
  accountGroups?: any[];
}

export async function createSnapshot(data: SnapshotData): Promise<{
  id: string;
  name: string;
  createdAt: string;
}> {
  const folderId = await getSnapshotsFolderId();
  const timestamp = new Date().toISOString();
  const fileName = `snapshot_${timestamp.replace(/[:.]/g, '-')}.json`;

  const snapshotContent = {
    version: '1.0',
    createdAt: timestamp,
    data,
    stats: {
      totalAccounts: data.accounts.length,
      totalCategories: data.categories.length,
      totalTransactions: data.transactions.length,
    },
  };

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/json',
    },
    media: {
      mimeType: 'application/json',
      body: JSON.stringify(snapshotContent, null, 2),
    },
    fields: 'id, name, createdTime',
  });

  return {
    id: file.data.id!,
    name: file.data.name!,
    createdAt: timestamp,
  };
}

// ═══════════════════════════════════════════════════════════════
// LIST SNAPSHOTS
// ═══════════════════════════════════════════════════════════════

export interface SnapshotInfo {
  id: string;
  name: string;
  createdAt: string;
  size: number;
}

export async function listSnapshots(): Promise<SnapshotInfo[]> {
  const folderId = await getSnapshotsFolderId();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/json' and trashed=false`,
    fields: 'files(id, name, createdTime, size)',
    orderBy: 'createdTime desc',
  });

  return (response.data.files || []).map(file => ({
    id: file.id!,
    name: file.name!,
    createdAt: file.createdTime!,
    size: parseInt(file.size || '0'),
  }));
}

// ═══════════════════════════════════════════════════════════════
// GET SNAPSHOT CONTENT
// ═══════════════════════════════════════════════════════════════

export async function getSnapshot(fileId: string): Promise<SnapshotData> {
  const response = await drive.files.get({
    fileId,
    alt: 'media',
  });

  const content = response.data as any;
  return content.data;
}

// ═══════════════════════════════════════════════════════════════
// DELETE SNAPSHOT
// ═══════════════════════════════════════════════════════════════

export async function deleteSnapshot(fileId: string): Promise<void> {
  await drive.files.delete({ fileId });
}

export const driveClient = {
  createSnapshot,
  listSnapshots,
  getSnapshot,
  deleteSnapshot,
};
```

### Snapshot API Routes

**File:** `src/app/api/snapshots/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { driveClient } from '@/lib/google-drive';

// GET: List all snapshots
export async function GET() {
  try {
    const snapshots = await driveClient.listSnapshots();
    return NextResponse.json({ snapshots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**File:** `src/app/api/snapshots/create/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { driveClient } from '@/lib/google-drive';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await driveClient.createSnapshot(data);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**File:** `src/app/api/snapshots/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { driveClient } from '@/lib/google-drive';

// GET: Get snapshot content
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await driveClient.getSnapshot(params.id);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete snapshot
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await driveClient.deleteSnapshot(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 🔧 FEATURE 9: Backup Reminder

**File:** `src/components/settings/BackupReminder.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { CloudOff } from 'lucide-react';
import toast from 'react-hot-toast';

const REMINDER_DAYS = 7;

export function useBackupReminder() {
  useEffect(() => {
    const lastBackup = localStorage.getItem('lastBackupAt');
    
    if (!lastBackup) {
      // Never backed up
      toast((t) => (
        <div className="flex items-center gap-3">
          <CloudOff className="w-5 h-5 text-amber-400" />
          <div>
            <div className="font-medium">No backup found</div>
            <div className="text-sm text-slate-400">
              Backup your data to avoid losing it
            </div>
          </div>
        </div>
      ), { duration: 5000 });
      return;
    }

    const daysSinceBackup = Math.floor(
      (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceBackup >= REMINDER_DAYS) {
      toast((t) => (
        <div className="flex items-center gap-3">
          <CloudOff className="w-5 h-5 text-amber-400" />
          <div>
            <div className="font-medium">Backup reminder</div>
            <div className="text-sm text-slate-400">
              Last backup was {daysSinceBackup} days ago
            </div>
          </div>
        </div>
      ), { duration: 5000 });
    }
  }, []);
}
```

Use in layout:

```tsx
// src/app/(dashboard)/layout.tsx
import { useBackupReminder } from '@/components/settings/BackupReminder';

export default function DashboardLayout({ children }) {
  useBackupReminder();
  // ...
}
```

---

## 📋 TESTING CHECKLIST

### Person Accounts
- [ ] Create person account (type = PERSON)
- [ ] Balance shows "They owe you" / "You owe them"
- [ ] Transfer to/from person works
- [ ] Person appears in linked transaction dropdown

### Linked Transactions
- [ ] Checkbox appears for EXPENSE type
- [ ] Dropdown shows only PERSON accounts
- [ ] Preview shows both transactions
- [ ] Save creates TWO transactions
- [ ] Both transactions have linkedTransactionId
- [ ] Person account balance updates
- [ ] Delete one warns about linked transaction

### Bulk Operations
- [ ] "Select" button enters selection mode
- [ ] Checkboxes appear next to transactions
- [ ] "Select All" / "Deselect All" works
- [ ] Bulk Edit modal opens
- [ ] Category change works
- [ ] Account change works
- [ ] Bulk Delete shows warning
- [ ] Delete reverses balances correctly
- [ ] Linked transactions deleted together

### Google Sheets Backup
- [ ] "Backup Now" writes to Sheet
- [ ] All tabs populated (accounts, categories, transactions)
- [ ] "Restore from Sheet" reads data
- [ ] IndexedDB populated correctly
- [ ] lastBackupAt saved to localStorage

### Drive Snapshots
- [ ] "Create Snapshot" creates JSON in Drive
- [ ] Snapshot list shows all snapshots
- [ ] Restore from snapshot works
- [ ] Delete snapshot works
- [ ] Restore confirmation shows diff

### Backup Reminder
- [ ] Toast shows if never backed up
- [ ] Toast shows if > 7 days since backup
- [ ] No toast if recent backup

---

## 🚀 DEPLOYMENT NOTES

### New Environment Variables for Vercel

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account-email>
GOOGLE_PRIVATE_KEY=<private-key-with-newlines>
GOOGLE_SPREADSHEET_ID=<spreadsheet-id>
```

### Google Cloud Setup

1. **Enable APIs:**
   - Google Sheets API
   - Google Drive API

2. **Service Account Permissions:**
   - Share spreadsheet with service account email (Editor)
   - Drive files created by service account are accessible

---

**END OF v3 PROMPT**

After completing v3, proceed to v4 for:
- Authentication (NextAuth)
- Multi-device sync
- Budget tracking
