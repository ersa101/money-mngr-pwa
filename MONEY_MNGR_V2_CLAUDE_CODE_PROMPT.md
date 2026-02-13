# 💰 Money Mngr PWA — Claude Code Prompt (v1.0 Launch)

> **Repository:** https://github.com/ersa101/money-mngr-pwa
> **Date:** February 8, 2026
> **Architecture:** IndexedDB-First, Local-Only, No Auth
> **Goal:** Deploy to Vercel ASAP

---

## 📋 QUICK SUMMARY

### What v1 Includes
- ✅ IndexedDB as primary (and only) data store
- ✅ Unified Add Transaction Modal (Manual + Magic Box SMS Parser)
- ✅ Transfer Visual for ALL transfers (including CSV imports)
- ✅ AI parsing with manual trigger (Gemini → Claude → OpenAI)
- ✅ PWA configuration (installable)
- ✅ Vercel deployment

### What v1 Does NOT Include (Saved for v2)
- ❌ Authentication (no login required)
- ❌ Google Sheets backup (local-only for now)
- ❌ Multi-device sync
- ❌ Budget tracking

---

## 🎯 REMAINING TASKS (4 Tasks)

### Task 1: Fix Transfer Visual in Transaction List
### Task 2: Unified Add Transaction Modal (SMS + Manual)
### Task 3: PWA Configuration
### Task 4: Vercel Deployment

---

## 📁 PROJECT STRUCTURE (Clean)

```
money-mngr-pwa/
├── .env.local                    # API keys (gitignored)
├── .env.example                  # Template (committed)
├── .gitignore                    # Must include .env.local
├── next.config.js                # Next.js + PWA config
├── package.json
├── tailwind.config.ts
├── tsconfig.json
│
├── public/
│   ├── icons/
│   │   ├── icon-192x192.png      # PWA icon
│   │   └── icon-512x512.png      # PWA icon
│   ├── manifest.json             # PWA manifest
│   └── favicon.ico
│
├── src/
│   ├── app/
│   │   ├── transactions/page.tsx
│   │   ├── accounts/page.tsx
│   │   ├── stats/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx              # Redirects to /transactions
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn components
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx
│   │   │   └── Navbar.tsx
│   │   ├── transactions/
│   │   │   ├── TransactionList.tsx
│   │   │   ├── TransactionCard.tsx       # ← TASK 1: Fix transfer visual
│   │   │   ├── AddTransactionModal.tsx   # ← TASK 2: Unified modal
│   │   │   └── TransactionFilters.tsx
│   │   ├── accounts/
│   │   │   ├── AccountCard.tsx
│   │   │   └── AccountModal.tsx
│   │   ├── stats/
│   │   │   └── NetWorthChart.tsx
│   │   └── settings/
│   │       ├── CategoryTree.tsx
│   │       └── APIKeysSection.tsx
│   │
│   ├── lib/
│   │   ├── db.ts                 # Dexie IndexedDB schema
│   │   ├── llmService.ts         # AI parsing (Gemini → Claude → OpenAI)
│   │   ├── sms-parser.ts         # Regex parsing
│   │   ├── csv-parser.ts
│   │   ├── date-utils.ts
│   │   └── currency-utils.ts
│   │
│   ├── hooks/
│   │   ├── useAccounts.ts
│   │   ├── useTransactions.ts
│   │   └── useCategories.ts
│   │
│   ├── types/
│   │   └── database.ts
│   │
│   └── constants/
│       └── banks.ts              # SMS regex patterns
│
└── FILES TO DELETE (if they exist):
    - src/app/api/                # No API routes needed for v1
    - .data/                      # Old CSV storage
    - BACKEND_ARCHITECTURE.md
    - SESSION_SUMMARY_*.md
    - CSV_ANALYSIS.md
```

---

## 🔧 TASK 1: Fix Transfer Visual in Transaction List

**Problem:** Transfers from CSV import display as plain cards, not as transfer visuals.

**Solution:** Update `TransactionCard.tsx` to render transfers with From → To visual.

### File: `src/components/transactions/TransactionCard.tsx`

```tsx
'use client';

import { useMemo } from 'react';
import { Transaction, Account, Category } from '@/types/database';
import { formatCurrency } from '@/lib/currency-utils';
import { formatDateTime } from '@/lib/date-utils';
import { 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownLeft,
  MoreVertical,
  Pencil,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TransactionCardProps {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionCard({
  transaction,
  accounts,
  categories,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  const isTransfer = transaction.transactionType === 'TRANSFER';
  const isExpense = transaction.transactionType === 'EXPENSE';
  const isIncome = transaction.transactionType === 'INCOME';

  const fromAccount = useMemo(() => 
    accounts.find(a => a.id === transaction.fromAccountId),
    [accounts, transaction.fromAccountId]
  );

  const toAccount = useMemo(() => 
    accounts.find(a => a.id === transaction.toAccountId),
    [accounts, transaction.toAccountId]
  );

  const category = useMemo(() => 
    categories.find(c => c.id === transaction.categoryId),
    [categories, transaction.categoryId]
  );

  // ═══════════════════════════════════════════════════════════════
  // TRANSFER CARD
  // ═══════════════════════════════════════════════════════════════
  if (isTransfer) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border-l-4 border-blue-500 hover:bg-slate-750 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
              TRANSFER
            </span>
            <span className="text-slate-500 text-sm">
              {formatDateTime(transaction.date)}
            </span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-slate-700 rounded">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem onClick={() => onEdit(transaction)} className="text-slate-300">
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(transaction)} className="text-red-400">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Transfer Visual */}
        <div className="flex items-center justify-between gap-2 my-3">
          {/* From Account */}
          <div className="flex-1 text-center p-3 rounded-lg bg-slate-700/50">
            <div className="text-xs text-slate-400 mb-1">From</div>
            <div className="font-medium text-white truncate">
              {fromAccount?.name || 'Unknown'}
            </div>
            {fromAccount && (
              <div className="text-xs text-slate-500 mt-1">
                Bal: {formatCurrency(fromAccount.balance)}
              </div>
            )}
          </div>

          {/* Arrow with Amount */}
          <div className="flex flex-col items-center px-2">
            <div className="text-lg font-bold text-blue-400">
              {formatCurrency(transaction.amount)}
            </div>
            <ArrowRight className="w-6 h-6 text-blue-400" />
          </div>

          {/* To Account */}
          <div className="flex-1 text-center p-3 rounded-lg bg-slate-700/50">
            <div className="text-xs text-slate-400 mb-1">To</div>
            <div className="font-medium text-white truncate">
              {toAccount?.name || 'Unknown'}
            </div>
            {toAccount && (
              <div className="text-xs text-slate-500 mt-1">
                Bal: {formatCurrency(toAccount.balance)}
              </div>
            )}
          </div>
        </div>

        {/* Note */}
        {transaction.description && (
          <p className="text-sm text-slate-400 mt-2 truncate">
            {transaction.description}
          </p>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPENSE / INCOME CARD
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className={`bg-slate-800 rounded-lg p-4 border-l-4 hover:bg-slate-750 transition-colors ${
      isExpense ? 'border-red-500' : 'border-green-500'
    }`}>
      <div className="flex items-start justify-between">
        {/* Left: Icon, Category, Description */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${
            isExpense ? 'bg-red-500/20' : 'bg-green-500/20'
          }`}>
            {isExpense ? (
              <ArrowUpRight className="w-5 h-5 text-red-400" />
            ) : (
              <ArrowDownLeft className="w-5 h-5 text-green-400" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white truncate">
                {category?.icon} {category?.name || 'Uncategorized'}
              </span>
            </div>
            
            {transaction.description && (
              <p className="text-sm text-slate-400 truncate mt-0.5">
                {transaction.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span>{formatDateTime(transaction.date)}</span>
              <span>•</span>
              <span>{isExpense ? fromAccount?.name : toAccount?.name}</span>
            </div>
          </div>
        </div>

        {/* Right: Amount and Actions */}
        <div className="flex items-start gap-2 ml-2">
          <div className={`text-right ${isExpense ? 'text-red-400' : 'text-green-400'}`}>
            <div className="font-semibold">
              {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-slate-700 rounded">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem onClick={() => onEdit(transaction)} className="text-slate-300">
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(transaction)} className="text-red-400">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔧 TASK 2: Unified Add Transaction Modal

**Goal:** Single modal with optional SMS parsing at top, form fields below.

### File: `src/components/transactions/AddTransactionModal.tsx`

```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { parseSMS } from '@/lib/sms-parser';
import { llmService } from '@/lib/llmService';
import { formatCurrency } from '@/lib/currency-utils';
import { Transaction, Account, Category } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Zap,
  Sparkles,
  Loader2,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  AlertTriangle,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTransaction?: Transaction | null;
}

type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export function AddTransactionModal({
  isOpen,
  onClose,
  editTransaction,
}: AddTransactionModalProps) {
  // Data from IndexedDB
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  // SMS Parsing State
  const [smsText, setSmsText] = useState('');
  const [isParsingRegex, setIsParsingRegex] = useState(false);
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [parseSource, setParseSource] = useState<'manual' | 'regex' | 'ai' | null>(null);

  // Form State
  const [transactionType, setTransactionType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  });
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter categories by type
  const filteredCategories = useMemo(() => {
    if (transactionType === 'TRANSFER') return [];
    const type = transactionType === 'EXPENSE' ? 'EXPENSE' : 'INCOME';
    return categories.filter(c => c.type === type && !c.parentId);
  }, [categories, transactionType]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editTransaction) {
        // Editing existing transaction
        setTransactionType(editTransaction.transactionType);
        setAmount(editTransaction.amount.toString());
        setFromAccountId(editTransaction.fromAccountId?.toString() || '');
        setToAccountId(editTransaction.toAccountId?.toString() || '');
        setCategoryId(editTransaction.categoryId?.toString() || '');
        setDate(new Date(editTransaction.date).toISOString().slice(0, 16));
        setDescription(editTransaction.description || '');
        setParseSource(null);
      } else {
        // New transaction - reset form
        resetForm();
      }
    }
  }, [isOpen, editTransaction]);

  const resetForm = () => {
    setSmsText('');
    setTransactionType('EXPENSE');
    setAmount('');
    setFromAccountId('');
    setToAccountId('');
    setCategoryId('');
    setDate(new Date().toISOString().slice(0, 16));
    setDescription('');
    setParseSource(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // SMS PARSING - REGEX (Fast, Offline)
  // ═══════════════════════════════════════════════════════════════
  const handleParseRegex = () => {
    if (!smsText.trim()) {
      toast.error('Please paste SMS text first');
      return;
    }

    setIsParsingRegex(true);

    try {
      const result = parseSMS(smsText);

      if (result.success && result.data) {
        applyParsedData(result.data, result.suggestions);
        setParseSource('regex');
        toast.success(`Parsed! Confidence: ${result.data.confidence}%`);
      } else {
        toast.error(result.error || 'Could not parse SMS');
      }
    } catch (error) {
      toast.error('Failed to parse SMS');
    } finally {
      setIsParsingRegex(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // SMS PARSING - AI (Gemini → Claude → OpenAI)
  // ═══════════════════════════════════════════════════════════════
  const handleParseAI = async () => {
    if (!smsText.trim()) {
      toast.error('Please paste SMS text first');
      return;
    }

    // Check if any API key is configured
    const apiKeys = {
      gemini: localStorage.getItem('gemini_api_key'),
      claude: localStorage.getItem('claude_api_key'),
      openai: localStorage.getItem('openai_api_key'),
    };

    if (!apiKeys.gemini && !apiKeys.claude && !apiKeys.openai) {
      toast.error('No API keys configured. Go to Settings → API Keys');
      return;
    }

    setIsParsingAI(true);

    try {
      // Get recent transactions for context
      const recentTransactions = await db.transactions
        .orderBy('date')
        .reverse()
        .limit(20)
        .toArray();

      const result = await llmService.getSuggestion(smsText, {
        accounts,
        categories,
        recentTransactions,
      });

      if (result) {
        // Apply AI suggestions
        if (result.transactionType) {
          setTransactionType(result.transactionType as TransactionType);
        }
        if (result.amount) {
          setAmount(result.amount.toString());
        }
        if (result.accountName) {
          const account = accounts.find(a => 
            a.name.toLowerCase().includes(result.accountName!.toLowerCase())
          );
          if (account) {
            if (result.transactionType === 'EXPENSE' || result.transactionType === 'TRANSFER') {
              setFromAccountId(account.id!.toString());
            } else {
              setToAccountId(account.id!.toString());
            }
          }
        }
        if (result.categoryName) {
          const category = categories.find(c => 
            c.name.toLowerCase() === result.categoryName!.toLowerCase()
          );
          if (category) {
            setCategoryId(category.id!.toString());
          }
        }
        if (result.description) {
          setDescription(result.description);
        }

        setParseSource('ai');
        toast.success(`AI parsed! (${result.provider}, ${result.confidence}% confidence)`);
        
        if (result.reasoning) {
          console.log('AI Reasoning:', result.reasoning);
        }
      } else {
        toast.error('AI could not parse SMS');
      }
    } catch (error: any) {
      console.error('AI parsing failed:', error);
      toast.error(error.message || 'AI parsing failed');
    } finally {
      setIsParsingAI(false);
    }
  };

  // Apply parsed data to form
  const applyParsedData = (
    data: any,
    suggestions?: { accountName?: string; categoryName?: string }
  ) => {
    // Set transaction type
    if (data.transactionType) {
      setTransactionType(data.transactionType);
    }

    // Set amount
    if (data.amount) {
      setAmount(data.amount.toString());
    }

    // Set date
    if (data.date) {
      setDate(new Date(data.date).toISOString().slice(0, 16));
    }

    // Set description
    if (data.merchant) {
      setDescription(data.merchant);
    }

    // Apply account suggestion
    if (suggestions?.accountName) {
      const account = accounts.find(a => 
        a.name.toLowerCase().includes(suggestions.accountName!.toLowerCase())
      );
      if (account) {
        if (data.transactionType === 'EXPENSE') {
          setFromAccountId(account.id!.toString());
        } else if (data.transactionType === 'INCOME') {
          setToAccountId(account.id!.toString());
        }
      }
    }

    // Apply category suggestion
    if (suggestions?.categoryName) {
      const category = categories.find(c => 
        c.name.toLowerCase() === suggestions.categoryName!.toLowerCase()
      );
      if (category) {
        setCategoryId(category.id!.toString());
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // SAVE TRANSACTION
  // ═══════════════════════════════════════════════════════════════
  const handleSave = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (transactionType === 'EXPENSE' && !fromAccountId) {
      toast.error('Please select an account');
      return;
    }

    if (transactionType === 'INCOME' && !toAccountId) {
      toast.error('Please select an account');
      return;
    }

    if (transactionType === 'TRANSFER' && (!fromAccountId || !toAccountId)) {
      toast.error('Please select both accounts for transfer');
      return;
    }

    if (transactionType === 'TRANSFER' && fromAccountId === toAccountId) {
      toast.error('Cannot transfer to the same account');
      return;
    }

    if ((transactionType === 'EXPENSE' || transactionType === 'INCOME') && !categoryId) {
      toast.error('Please select a category');
      return;
    }

    setIsSaving(true);

    try {
      const transactionData: Omit<Transaction, 'id'> = {
        date: new Date(date).toISOString(),
        amount: parseFloat(amount),
        transactionType,
        fromAccountId: fromAccountId ? parseInt(fromAccountId) : undefined,
        toAccountId: toAccountId ? parseInt(toAccountId) : undefined,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        description: description.trim() || undefined,
        status: 'CONFIRMED',
        source: parseSource === 'ai' ? 'MAGIC_BOX' : parseSource === 'regex' ? 'MAGIC_BOX' : 'MANUAL',
        currency: 'INR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editTransaction?.id) {
        // Update existing
        await db.transactions.update(editTransaction.id, transactionData);
        
        // TODO: Reverse old balance changes and apply new ones
        // For now, this is simplified - full implementation would track deltas
        
        toast.success('Transaction updated');
      } else {
        // Create new
        await db.transactions.add(transactionData);

        // Update account balances
        const amountValue = parseFloat(amount);

        if (transactionType === 'EXPENSE' && fromAccountId) {
          await db.accounts
            .where('id')
            .equals(parseInt(fromAccountId))
            .modify(account => {
              account.balance -= amountValue;
            });
        } else if (transactionType === 'INCOME' && toAccountId) {
          await db.accounts
            .where('id')
            .equals(parseInt(toAccountId))
            .modify(account => {
              account.balance += amountValue;
            });
        } else if (transactionType === 'TRANSFER') {
          if (fromAccountId) {
            await db.accounts
              .where('id')
              .equals(parseInt(fromAccountId))
              .modify(account => {
                account.balance -= amountValue;
              });
          }
          if (toAccountId) {
            await db.accounts
              .where('id')
              .equals(parseInt(toAccountId))
              .modify(account => {
                account.balance += amountValue;
              });
          }
        }

        toast.success('Transaction saved');
      }

      onClose();
    } catch (error) {
      console.error('Failed to save transaction:', error);
      toast.error('Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // TRANSFER PREVIEW
  // ═══════════════════════════════════════════════════════════════
  const TransferPreview = () => {
    if (transactionType !== 'TRANSFER') return null;

    const from = accounts.find(a => a.id?.toString() === fromAccountId);
    const to = accounts.find(a => a.id?.toString() === toAccountId);
    const amountValue = parseFloat(amount) || 0;

    if (!from && !to) return null;

    const fromNewBalance = from ? from.balance - amountValue : 0;
    const toNewBalance = to ? to.balance + amountValue : 0;
    const fromBelowThreshold = from ? fromNewBalance < from.thresholdValue : false;

    return (
      <div className="bg-slate-700/50 rounded-lg p-4 my-4">
        <div className="text-sm text-slate-400 mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Transfer Preview
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* From Account */}
          <div className={`flex-1 text-center p-3 rounded-lg border ${
            fromBelowThreshold ? 'border-red-500 bg-red-500/10' : 'border-slate-600 bg-slate-800'
          }`}>
            <div className="text-xs text-slate-400">From</div>
            <div className="font-medium text-white">{from?.name || 'Select'}</div>
            {from && (
              <>
                <div className="text-sm text-slate-400">
                  {formatCurrency(from.balance)}
                </div>
                <div className="text-xs mt-1">↓</div>
                <div className={`text-sm font-medium ${
                  fromBelowThreshold ? 'text-red-400' : 'text-white'
                }`}>
                  {formatCurrency(fromNewBalance)}
                </div>
              </>
            )}
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center">
            <div className="text-lg font-bold text-blue-400">
              {amountValue > 0 ? formatCurrency(amountValue) : '₹0'}
            </div>
            <ArrowRight className="w-8 h-8 text-blue-400" />
          </div>

          {/* To Account */}
          <div className="flex-1 text-center p-3 rounded-lg border border-slate-600 bg-slate-800">
            <div className="text-xs text-slate-400">To</div>
            <div className="font-medium text-white">{to?.name || 'Select'}</div>
            {to && (
              <>
                <div className="text-sm text-slate-400">
                  {formatCurrency(to.balance)}
                </div>
                <div className="text-xs mt-1">↓</div>
                <div className="text-sm font-medium text-green-400">
                  {formatCurrency(toNewBalance)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Warning */}
        {fromBelowThreshold && (
          <div className="flex items-center gap-2 mt-3 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {from?.name} will go below threshold!
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ═══════════════════════════════════════════════════════ */}
          {/* SMS PARSING SECTION */}
          {/* ═══════════════════════════════════════════════════════ */}
          {!editTransaction && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <label className="block text-sm text-slate-400 mb-2">
                📱 Paste Bank SMS (optional)
              </label>
              <Textarea
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder="Paste your bank SMS here to auto-fill the form..."
                className="bg-slate-700/50 border-slate-600 text-white resize-none min-h-[80px]"
              />

              {/* Parse Buttons - Only show if SMS has text */}
              {smsText.trim() && (
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={handleParseRegex}
                    disabled={isParsingRegex || isParsingAI}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    {isParsingRegex ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                    )}
                    Parse (Fast)
                  </Button>

                  <Button
                    onClick={handleParseAI}
                    disabled={isParsingRegex || isParsingAI}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  >
                    {isParsingAI ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Parse with AI
                  </Button>
                </div>
              )}

              {/* Parse Source Indicator */}
              {parseSource && (
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <Check className="w-3 h-3 text-green-400" />
                  <span className="text-slate-400">
                    Parsed using {parseSource === 'ai' ? 'AI' : 'regex patterns'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* TRANSACTION TYPE */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Transaction Type
            </label>
            <div className="flex gap-2">
              {(['EXPENSE', 'INCOME', 'TRANSFER'] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setTransactionType(type)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    transactionType === type
                      ? type === 'EXPENSE'
                        ? 'bg-red-500 text-white'
                        : type === 'INCOME'
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {type === 'EXPENSE' && <ArrowUpRight className="w-4 h-4 inline mr-1" />}
                  {type === 'INCOME' && <ArrowDownLeft className="w-4 h-4 inline mr-1" />}
                  {type === 'TRANSFER' && <RefreshCw className="w-4 h-4 inline mr-1" />}
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* AMOUNT */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="pl-8 bg-slate-700/50 border-slate-600 text-white text-lg"
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* ACCOUNTS */}
          {/* ═══════════════════════════════════════════════════════ */}
          {(transactionType === 'EXPENSE' || transactionType === 'TRANSFER') && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                {transactionType === 'TRANSFER' ? 'From Account *' : 'Account *'}
              </label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {accounts.map((account) => (
                    <SelectItem
                      key={account.id}
                      value={account.id!.toString()}
                      className="text-white"
                    >
                      {account.name} ({formatCurrency(account.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(transactionType === 'INCOME' || transactionType === 'TRANSFER') && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                {transactionType === 'TRANSFER' ? 'To Account *' : 'Account *'}
              </label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {accounts
                    .filter(a => transactionType !== 'TRANSFER' || a.id?.toString() !== fromAccountId)
                    .map((account) => (
                      <SelectItem
                        key={account.id}
                        value={account.id!.toString()}
                        className="text-white"
                      >
                        {account.name} ({formatCurrency(account.balance)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Transfer Preview */}
          <TransferPreview />

          {/* ═══════════════════════════════════════════════════════ */}
          {/* CATEGORY (not for transfers) */}
          {/* ═══════════════════════════════════════════════════════ */}
          {transactionType !== 'TRANSFER' && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Category *
              </label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {filteredCategories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id!.toString()}
                      className="text-white"
                    >
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* DATE & TIME */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Date & Time
            </label>
            <Input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-700/50 border-slate-600 text-white"
            />
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* NOTE */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Note (optional)
            </label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a note..."
              className="bg-slate-700/50 border-slate-600 text-white"
            />
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* ACTIONS */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex-1 ${
                transactionType === 'EXPENSE'
                  ? 'bg-red-600 hover:bg-red-700'
                  : transactionType === 'INCOME'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editTransaction ? 'Update' : 'Save'} Transaction
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔧 TASK 3: PWA Configuration

### 3.1 Create PWA Icons

Generate icons at these sizes and place in `public/icons/`:
- icon-192x192.png
- icon-512x512.png

**Quick way:** Use https://realfavicongenerator.net or create a simple ₹ symbol icon.

### 3.2 Create Manifest

**File:** `public/manifest.json`

```json
{
  "name": "Money Mngr",
  "short_name": "MoneyMngr",
  "description": "Privacy-first personal finance manager",
  "start_url": "/transactions",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#7c3aed",
  "orientation": "portrait-primary",
  "categories": ["finance", "productivity"],
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ]
}
```

### 3.3 Install next-pwa

```bash
npm install next-pwa
```

### 3.4 Update next.config.js

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
```

### 3.5 Update Root Layout

**File:** `src/app/layout.tsx`

Add these meta tags in the `<head>`:

```tsx
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Money Mngr',
  description: 'Privacy-first personal finance manager',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Money Mngr',
  },
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```

---

## 🔧 TASK 4: Vercel Deployment

### 4.1 Ensure .gitignore is Correct

**File:** `.gitignore`

```gitignore
# Dependencies
node_modules/
.pnp/
.pnp.js

# Build
.next/
out/
build/
dist/

# Environment (CRITICAL!)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env*.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# PWA (generated)
public/sw.js
public/workbox-*.js

# Vercel
.vercel/

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Testing
coverage/
```

### 4.2 Create .env.example (Safe to Commit)

**File:** `.env.example`

```env
# App Configuration
NEXT_PUBLIC_APP_NAME="Money Mngr"

# Optional: AI API Keys (stored in browser localStorage, not here)
# Users configure these in Settings → API Keys
```

### 4.3 Verify No Secrets in Git History

Run this command BEFORE deploying:

```bash
# Check if .env.local was ever committed
git log --all --full-history -- .env.local

# If it shows results, remove it from history:
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (careful!)
git push origin --force --all
```

### 4.4 Deploy to Vercel

1. **Push latest code:**
```bash
git add .
git commit -m "Ready for v1 launch"
git push origin main
```

2. **Go to Vercel:**
   - Visit https://vercel.com
   - Sign in with GitHub
   - Click "Add New" → "Project"
   - Import `ersa101/money-mngr-pwa`

3. **Configure Build:**
   - Framework: Next.js (auto-detected)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

4. **Environment Variables:**
   - For v1, you don't need any! (No auth, no cloud backup)
   - Just click "Deploy"

5. **Wait for deployment** (2-3 minutes)

6. **Test your app:**
   - Visit the Vercel URL
   - Test add transaction
   - Test install as PWA

---

## 📋 FILES TO DELETE

Before deploying, clean up these files if they exist:

```bash
# Delete old API routes (not needed for IndexedDB-first)
rm -rf src/app/api/

# Delete old CSV storage
rm -rf .data/

# Delete outdated docs
rm -f BACKEND_ARCHITECTURE.md
rm -f SESSION_SUMMARY_*.md
rm -f CSV_ANALYSIS.md
rm -f IMPLEMENTATION.md

# Keep these:
# - README.md
# - FEATURES.md (update it)
# - QUICK_REFERENCE.md
# - sample.csv (for testing)
```

---

## ✅ DEPLOYMENT CHECKLIST

### Before Deploying
- [ ] `.gitignore` includes `.env.local`
- [ ] No secrets in git history
- [ ] PWA manifest exists at `public/manifest.json`
- [ ] PWA icons exist at `public/icons/`
- [ ] `next.config.js` has PWA configuration
- [ ] Local build works: `npm run build`

### After Deploying
- [ ] App loads at Vercel URL
- [ ] Can create accounts
- [ ] Can add transactions (manual)
- [ ] Can add transactions (SMS parse)
- [ ] Transfer visual shows correctly
- [ ] CSV import works
- [ ] Charts display correctly
- [ ] PWA install prompt appears on mobile
- [ ] App works offline (after first load)

---

## 🚀 QUICK START

```bash
# Clone repo
git clone https://github.com/ersa101/money-mngr-pwa.git
cd money-mngr-pwa

# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build

# Deploy (after pushing to GitHub)
# Go to vercel.com → Import → Deploy
```

---

**END OF v1 PROMPT**

This prompt is optimized for fast deployment:
- No authentication complexity
- No cloud backup complexity
- Just IndexedDB + PWA + Vercel

Copy this entire document and use with Claude Code to complete the remaining tasks.
