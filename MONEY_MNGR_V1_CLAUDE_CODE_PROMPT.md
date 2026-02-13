# 💰 Money Mngr PWA — Updated Development Prompt (v2.0)

> **Repository:** https://github.com/ersa101/money-mngr-pwa
> **Last Updated:** February 8, 2026
> **Architecture:** IndexedDB-First + Google Sheets Backup

---

## 📋 TABLE OF CONTENTS

1. [Current Status Summary](#1-current-status-summary)
2. [Architecture Decision](#2-architecture-decision)
3. [Remaining Tasks](#3-remaining-tasks)
4. [Tech Stack](#4-tech-stack)
5. [Project Structure](#5-project-structure)
6. [Database Schema](#6-database-schema)
7. [Authentication System](#7-authentication-system)
8. [Magic Box Enhancement](#8-magic-box-enhancement)
9. [Transfer Visual Fix](#9-transfer-visual-fix)
10. [Google Sheets Backup](#10-google-sheets-backup)
11. [PWA Configuration](#11-pwa-configuration)
12. [Deployment to Vercel](#12-deployment-to-vercel)
13. [Files to Clean Up](#13-files-to-clean-up)
14. [Implementation Order](#14-implementation-order)

---

## 1. CURRENT STATUS SUMMARY

### ✅ COMPLETED FEATURES

| Feature | Status | Notes |
|---------|--------|-------|
| IndexedDB with Dexie.js | ✅ Done | Primary data store |
| Account CRUD | ✅ Done | Create, edit, delete with validation |
| Transaction CRUD | ✅ Done | Expense, Income, Transfer support |
| CSV Import | ✅ Done | With progress bar, type detection |
| Time-Based Filters | ✅ Done | Daily, Weekly, Monthly, Quarterly, Annually, All-Time |
| Transaction Type Filters | ✅ Done | All, Expense, Income, Transfer |
| Stats Dashboard | ✅ Done | NetWorth, Income vs Expense charts |
| Bottom Tab Navigation | ✅ Done | Mobile-friendly |
| Real-time Updates | ✅ Done | useLiveQuery from Dexie |
| Threshold System | ✅ Done | Safety indicators, progress bars |
| Settings - Categories | ✅ Done | Grouped by Expense/Income, toggle type |
| Settings - API Keys | ✅ Done | Gemini, OpenAI, Claude storage in localStorage |
| LLM Service | ✅ Done | Fallback chain with context-aware prompts |
| MagicBox SMS Parser | ✅ Done | Regex patterns + LLM integration |
| NetWorth Chart Fix | ✅ Done | Monthly aggregation, period-based data points |

### ⚠️ PARTIALLY COMPLETED

| Feature | Status | What's Missing |
|---------|--------|----------------|
| Account Grouping | ⚠️ Partial | Backend ready, UI not implemented |
| Transfer Visual Preview | ⚠️ Partial | Only works for new inputs, NOT for CSV imports |
| Magic Box AI Toggle | ⚠️ Partial | AI calls happen automatically, need manual trigger option |

### ❌ NOT STARTED

| Feature | Priority | Notes |
|---------|----------|-------|
| Authentication (NextAuth) | High | Google OAuth + Email/Password |
| Google Sheets Backup | High | On-demand backup, not real-time sync |
| PWA Configuration | High | Manifest, service worker, installable |
| Vercel Deployment | High | Production deployment |
| Magic Box in Add Transaction Modal | Medium | Show Magic Box when clicking "Add Transaction" |
| Export to CSV | Medium | Backup data locally |
| Multi-currency Support | Low | Phase 2 |
| Budget Tracking | Low | Phase 2 |
| Receipt Image Upload | Low | Phase 2 |

---

## 2. ARCHITECTURE DECISION

### IndexedDB-First with On-Demand Backup

```
┌─────────────────────────────────────────────────────────────────┐
│                     ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   USER INTERACTION                                               │
│         │                                                        │
│         ▼                                                        │
│   ┌─────────────┐                                               │
│   │   React UI  │                                               │
│   └─────────────┘                                               │
│         │                                                        │
│         ▼                                                        │
│   ┌─────────────┐     useLiveQuery()                            │
│   │   Hooks     │◄────────────────────┐                         │
│   └─────────────┘                     │                         │
│         │                             │                         │
│         ▼                             │                         │
│   ┌─────────────┐              ┌─────────────┐                  │
│   │  Dexie.js   │──────────────│  IndexedDB  │  ◄── PRIMARY     │
│   │  (db.ts)    │              │  (Browser)  │                  │
│   └─────────────┘              └─────────────┘                  │
│         │                                                        │
│         │  Manual "Backup" button                               │
│         ▼                                                        │
│   ┌─────────────┐              ┌─────────────┐                  │
│   │  API Route  │──────────────│Google Sheets│  ◄── BACKUP      │
│   │  /api/backup│              │  (Cloud)    │                  │
│   └─────────────┘              └─────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Principles:**
1. All reads/writes go to IndexedDB FIRST (instant, offline-capable)
2. Google Sheets is for BACKUP only (not real-time sync)
3. User manually triggers backup via "Backup to Cloud" button
4. Restore from cloud seeds IndexedDB for new devices

---

## 3. REMAINING TASKS

### Priority 1: Critical for Launch

#### Task 1.1: Fix Magic Box AI Trigger
**Current:** AI suggestions are fetched automatically when SMS is parsed
**Required:** Add a button "Use AI Suggestions" that triggers API calls only when clicked

**File:** `src/components/magic-box/MagicBox.tsx`

```tsx
// Add state for AI suggestion mode
const [useAI, setUseAI] = useState(false);
const [aiLoading, setAiLoading] = useState(false);
const [aiSuggestion, setAiSuggestion] = useState<LLMSuggestion | null>(null);

// Button to trigger AI
<Button
  onClick={handleFetchAISuggestion}
  disabled={!parsedResult?.success || aiLoading}
  variant="outline"
  className="border-purple-500 text-purple-400"
>
  {aiLoading ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Asking AI...
    </>
  ) : (
    <>
      <Sparkles className="w-4 h-4 mr-2" />
      Use AI Suggestions
    </>
  )}
</Button>

// API call order: Gemini → Claude → OpenAI
const handleFetchAISuggestion = async () => {
  setAiLoading(true);
  try {
    const suggestion = await llmService.getSuggestion(
      parsedResult.data.rawText,
      { accounts, categories, recentTransactions }
    );
    setAiSuggestion(suggestion);
    
    // Auto-apply if high confidence
    if (suggestion.confidence >= 70) {
      applyAISuggestion(suggestion);
    }
  } catch (error) {
    toast.error('AI suggestion failed');
  } finally {
    setAiLoading(false);
  }
};
```

#### Task 1.2: Magic Box in Add Transaction Modal
**Current:** Magic Box is a separate component
**Required:** Show Magic Box as a tab/option when clicking "Add Transaction"

**File:** `src/components/transactions/AddTransactionModal.tsx`

```tsx
// Add tabs: Manual Entry | Magic Box (SMS Parser)
const [entryMode, setEntryMode] = useState<'manual' | 'magicbox'>('manual');

return (
  <Dialog>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Transaction</DialogTitle>
      </DialogHeader>
      
      {/* Mode Selector */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={entryMode === 'manual' ? 'default' : 'outline'}
          onClick={() => setEntryMode('manual')}
          className="flex-1"
        >
          <PenLine className="w-4 h-4 mr-2" />
          Manual Entry
        </Button>
        <Button
          variant={entryMode === 'magicbox' ? 'default' : 'outline'}
          onClick={() => setEntryMode('magicbox')}
          className="flex-1"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Magic Box
        </Button>
      </div>
      
      {entryMode === 'manual' ? (
        <ManualEntryForm />
      ) : (
        <MagicBoxForm onTransactionCreated={handleClose} />
      )}
    </DialogContent>
  </Dialog>
);
```

#### Task 1.3: Fix Transfer Visual for CSV Imports
**Current:** Transfer visual preview only shows for new manual transfers
**Required:** Show transfer visual in transaction list/detail for ALL transfers

**Issue Analysis:**
- CSV imports create transfers but don't get the visual treatment
- The transfer preview component only renders in AddTransactionModal
- Transaction list doesn't differentiate transfers visually

**Solution:**

**File:** `src/components/transactions/TransactionCard.tsx`

```tsx
// Add transfer visual to transaction card
interface TransactionCardProps {
  transaction: Transaction;
  accounts: Account[];
}

export function TransactionCard({ transaction, accounts }: TransactionCardProps) {
  const isTransfer = transaction.transactionType === 'TRANSFER';
  
  if (isTransfer) {
    const fromAccount = accounts.find(a => a.id === transaction.fromAccountId);
    const toAccount = accounts.find(a => a.id === transaction.toAccountId);
    
    return (
      <div className="bg-slate-800 rounded-lg p-4 border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-blue-400 font-medium">TRANSFER</span>
          <span className="text-slate-400 text-sm">
            {formatDateTime(transaction.date)}
          </span>
        </div>
        
        {/* Transfer Visual */}
        <div className="flex items-center justify-between gap-4 my-3">
          <div className="flex-1 text-center">
            <div className="text-sm text-slate-400">From</div>
            <div className="font-medium">{fromAccount?.name || 'Unknown'}</div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="text-lg font-bold text-blue-400">
              {formatCurrency(transaction.amount)}
            </div>
            <ArrowRight className="w-6 h-6 text-blue-400" />
          </div>
          
          <div className="flex-1 text-center">
            <div className="text-sm text-slate-400">To</div>
            <div className="font-medium">{toAccount?.name || 'Unknown'}</div>
          </div>
        </div>
        
        {transaction.description && (
          <p className="text-sm text-slate-400 mt-2">{transaction.description}</p>
        )}
      </div>
    );
  }
  
  // Regular expense/income card
  return (
    <div className={`bg-slate-800 rounded-lg p-4 border-l-4 ${
      transaction.transactionType === 'EXPENSE' 
        ? 'border-red-500' 
        : 'border-green-500'
    }`}>
      {/* ... existing card layout ... */}
    </div>
  );
}
```

#### Task 1.4: Authentication with NextAuth

**Files to create:**

1. `src/lib/auth.ts` - NextAuth configuration
2. `src/app/api/auth/[...nextauth]/route.ts` - Auth API route
3. `src/app/(auth)/login/page.tsx` - Login page
4. `src/app/(auth)/register/page.tsx` - Register page
5. `src/components/auth/AuthProvider.tsx` - Session provider wrapper
6. `src/middleware.ts` - Route protection

**Auth Flow:**
1. User visits app → Check if authenticated
2. Not authenticated → Redirect to /login
3. Login options: Google OAuth OR Email/Password
4. On successful login → Seed default data if new user
5. Store userId in session for data isolation

**NextAuth Config:**

```typescript
// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }
        
        // Check user in IndexedDB (for local-first)
        // Or check against backup in Sheets
        const user = await db.users
          .where('email')
          .equals(credentials.email)
          .first();
        
        if (!user || !user.passwordHash) {
          throw new Error('Invalid credentials');
        }
        
        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        
        if (!isValid) {
          throw new Error('Invalid credentials');
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-in, create/update user in local DB
      if (account?.provider === 'google') {
        const existingUser = await db.users
          .where('email')
          .equals(user.email!)
          .first();
        
        if (!existingUser) {
          // Create new user and seed default data
          const userId = crypto.randomUUID();
          await db.users.add({
            id: userId,
            email: user.email!,
            name: user.name || 'User',
            image: user.image || '',
            isAdmin: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          
          // Seed default categories and account types
          await seedDefaultData(userId);
        }
      }
      return true;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
```

#### Task 1.5: Google Sheets Backup (On-Demand)

**NOT real-time sync.** User manually clicks "Backup to Cloud" button.

**Files to create:**
1. `src/lib/google-sheets.ts` - Sheets API client
2. `src/app/api/backup/route.ts` - Backup endpoint
3. `src/app/api/restore/route.ts` - Restore endpoint
4. `src/components/settings/BackupSection.tsx` - UI for backup/restore

**Backup Flow:**

```typescript
// src/app/api/backup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { google } from 'googleapis';
import { authOptions } from '@/lib/auth';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { accounts, categories, transactions, accountTypes, accountGroups, settings } = 
      await request.json();
    
    const userId = session.user.id;
    const timestamp = new Date().toISOString();

    // Clear existing data for this user and write new data
    // Each table has userId column for isolation
    
    // ... write to sheets ...

    return NextResponse.json({ 
      success: true, 
      timestamp,
      counts: {
        accounts: accounts.length,
        categories: categories.length,
        transactions: transactions.length,
      }
    });
  } catch (error) {
    console.error('Backup failed:', error);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}
```

**Backup UI:**

```tsx
// src/components/settings/BackupSection.tsx
'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Cloud, CloudUpload, CloudDownload, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export function BackupSection() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(
    localStorage.getItem('lastBackupAt')
  );

  // Get all data from IndexedDB
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const accountTypes = useLiveQuery(() => db.accountTypes.toArray());
  const accountGroups = useLiveQuery(() => db.accountGroups.toArray());

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts,
          categories,
          transactions,
          accountTypes,
          accountGroups,
        }),
      });

      if (!response.ok) throw new Error('Backup failed');

      const result = await response.json();
      localStorage.setItem('lastBackupAt', result.timestamp);
      setLastBackup(result.timestamp);
      
      toast.success(`Backed up ${result.counts.transactions} transactions to cloud`);
    } catch (error) {
      toast.error('Backup failed. Please try again.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm('This will replace all local data. Are you sure?')) return;
    
    setIsRestoring(true);
    try {
      const response = await fetch('/api/restore');
      if (!response.ok) throw new Error('Restore failed');
      
      const data = await response.json();
      
      // Clear local data and insert from cloud
      await db.transaction('rw', 
        db.accounts, db.categories, db.transactions, 
        db.accountTypes, db.accountGroups, 
        async () => {
          await db.accounts.clear();
          await db.categories.clear();
          await db.transactions.clear();
          await db.accountTypes.clear();
          await db.accountGroups.clear();
          
          await db.accounts.bulkAdd(data.accounts);
          await db.categories.bulkAdd(data.categories);
          await db.transactions.bulkAdd(data.transactions);
          await db.accountTypes.bulkAdd(data.accountTypes);
          await db.accountGroups.bulkAdd(data.accountGroups);
        }
      );
      
      toast.success('Data restored from cloud');
    } catch (error) {
      toast.error('Restore failed. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Cloud className="w-5 h-5 text-blue-400" />
        Cloud Backup
      </h3>
      
      <p className="text-slate-400 text-sm mb-4">
        Your data is stored locally on this device. Back up to Google Sheets 
        to access from other devices or restore after clearing browser data.
      </p>
      
      {lastBackup && (
        <p className="text-slate-500 text-sm mb-4">
          Last backup: {new Date(lastBackup).toLocaleString()}
        </p>
      )}
      
      <div className="flex gap-3">
        <Button
          onClick={handleBackup}
          disabled={isBackingUp}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isBackingUp ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CloudUpload className="w-4 h-4 mr-2" />
          )}
          Backup to Cloud
        </Button>
        
        <Button
          onClick={handleRestore}
          disabled={isRestoring}
          variant="outline"
          className="border-slate-600"
        >
          {isRestoring ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CloudDownload className="w-4 h-4 mr-2" />
          )}
          Restore from Cloud
        </Button>
      </div>
    </div>
  );
}
```

#### Task 1.6: PWA Configuration

**Files to create/modify:**

1. `public/manifest.json`
2. `next.config.js` (add next-pwa)
3. `public/icons/` (PWA icons)

**manifest.json:**

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

**next.config.js:**

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

---

## 4. TECH STACK

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.x | React framework |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.4.x | Styling |
| Dexie.js | 4.x | IndexedDB wrapper (PRIMARY) |
| dexie-react-hooks | 1.x | React integration |
| NextAuth.js | 4.x | Authentication |
| googleapis | 140.x | Sheets backup |
| recharts | 2.x | Charts |
| lucide-react | latest | Icons |
| next-pwa | 5.x | PWA |
| bcryptjs | 2.x | Password hashing |
| react-hot-toast | 2.x | Notifications |

---

## 5. PROJECT STRUCTURE

```
money-mngr-pwa/
├── .env.local                    # Environment variables
├── .env.example                  # Template
├── next.config.js                # Next.js + PWA config
├── middleware.ts                 # Auth middleware
├── package.json
│
├── public/
│   ├── icons/                    # PWA icons
│   ├── manifest.json             # PWA manifest
│   └── favicon.ico
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── transactions/page.tsx
│   │   │   ├── accounts/page.tsx
│   │   │   ├── stats/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── import/page.tsx
│   │   │   ├── export/page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── backup/route.ts
│   │   │   └── restore/route.ts
│   │   │
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn components
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── AuthProvider.tsx
│   │   ├── transactions/
│   │   │   ├── TransactionList.tsx
│   │   │   ├── TransactionCard.tsx      # ← Fix transfer visual
│   │   │   ├── AddTransactionModal.tsx  # ← Add Magic Box tab
│   │   │   └── TransactionFilters.tsx
│   │   ├── accounts/
│   │   │   ├── AccountList.tsx
│   │   │   ├── AccountCard.tsx
│   │   │   └── AccountModal.tsx
│   │   ├── magic-box/
│   │   │   ├── MagicBox.tsx             # ← Add AI trigger button
│   │   │   └── MagicBoxPreview.tsx
│   │   ├── stats/
│   │   │   ├── NetWorthChart.tsx
│   │   │   └── CategoryPieChart.tsx
│   │   ├── settings/
│   │   │   ├── CategoryTree.tsx
│   │   │   ├── APIKeysSection.tsx
│   │   │   └── BackupSection.tsx        # ← NEW
│   │   └── shared/
│   │       ├── LoadingSpinner.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── lib/
│   │   ├── db.ts                 # Dexie schema (PRIMARY)
│   │   ├── auth.ts               # NextAuth config
│   │   ├── google-sheets.ts      # Sheets API (BACKUP ONLY)
│   │   ├── llmService.ts         # AI suggestions
│   │   ├── sms-parser.ts         # Regex parsing
│   │   ├── csv-parser.ts
│   │   ├── date-utils.ts
│   │   └── currency-utils.ts
│   │
│   ├── hooks/
│   │   ├── useAccounts.ts
│   │   ├── useTransactions.ts
│   │   ├── useCategories.ts
│   │   └── useAuth.ts
│   │
│   └── types/
│       ├── database.ts
│       └── auth.ts
```

---

## 6. DATABASE SCHEMA (IndexedDB via Dexie)

**File:** `src/lib/db.ts`

```typescript
import Dexie, { Table } from 'dexie';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  passwordHash?: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id?: number;
  name: string;
  type: 'BANK' | 'CASH' | 'WALLET' | 'INVESTMENT' | 'CREDIT_CARD';
  balance: number;
  thresholdValue: number;
  color?: string;
  icon?: string;
  groupId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id?: number;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  parentId?: number;
  icon?: string;
  color?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

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
  createdAt: string;
  updatedAt: string;
}

export interface AccountType {
  id?: number;
  name: string;
  icon?: string;
  isLiability: boolean;
  sortOrder: number;
}

export interface AccountGroup {
  id?: number;
  name: string;
  sortOrder: number;
}

// Database class
export class MoneyMngrDB extends Dexie {
  users!: Table<User>;
  accounts!: Table<Account>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;
  accountTypes!: Table<AccountType>;
  accountGroups!: Table<AccountGroup>;

  constructor() {
    super('MoneyMngrDB');

    this.version(1).stores({
      users: 'id, email',
      accounts: '++id, name, type, groupId',
      categories: '++id, name, type, parentId',
      transactions: '++id, date, transactionType, fromAccountId, toAccountId, categoryId, status',
      accountTypes: '++id, name, sortOrder',
      accountGroups: '++id, name, sortOrder',
    });
  }
}

export const db = new MoneyMngrDB();
```

---

## 7. ENVIRONMENT VARIABLES

**File:** `.env.local`

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-32-char-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=705047390910-gcs4k70b0833vlefcnrmeg3ln3837214.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET

# Google Sheets (for backup only)
GOOGLE_SERVICE_ACCOUNT_EMAIL=moneymngr@moneymngr.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=1bYAXgCbiN7zFiUw2IRRJPf8vLx9oWffnh7lrTFMRU88

# App
NEXT_PUBLIC_APP_NAME="Money Mngr"
```

---

## 8. LLM SERVICE UPDATE

**File:** `src/lib/llmService.ts`

Update the fallback order to: **Gemini → Claude → OpenAI**

```typescript
// API call order
const providers = [
  { name: 'gemini', key: apiKeys.gemini, endpoint: callGemini },
  { name: 'claude', key: apiKeys.claude, endpoint: callClaude },
  { name: 'openai', key: apiKeys.openai, endpoint: callOpenAI },
];

// Try each provider in order until one succeeds
for (const provider of providers) {
  if (!provider.key) continue;
  
  try {
    const result = await provider.endpoint(provider.key, prompt, context);
    return { ...result, provider: provider.name };
  } catch (error) {
    console.log(`${provider.name} failed, trying next...`);
    continue;
  }
}

throw new Error('All AI providers failed');
```

---

## 9. FILES TO DELETE (No Longer Needed)

These files are artifacts of the old CSV-backend architecture:

```
DELETE:
- src/app/api/data/route.ts           # Old CSV API
- src/app/api/transactions/route.ts   # Old API, use IndexedDB directly
- src/app/api/accounts/route.ts       # Old API, use IndexedDB directly
- src/app/api/categories/route.ts     # Old API, use IndexedDB directly
- .data/                              # Old CSV storage folder
- BACKEND_ARCHITECTURE.md             # Outdated
- RECENT_ENHANCEMENTS.md              # Can merge into main README
- SESSION_SUMMARY_*.md                # Development logs
- CSV_ANALYSIS.md                     # No longer relevant
```

**Keep:**
- All `src/` code (refactored to use IndexedDB)
- `FEATURES.md` (update with current status)
- `README.md`
- `sample.csv` (for testing imports)

---

## 10. IMPLEMENTATION ORDER

### Phase 1: Fix Current Issues (Day 1)
1. ✅ Fix Magic Box AI trigger (add button)
2. ✅ Add Magic Box tab to Add Transaction modal
3. ✅ Fix transfer visual for all transactions

### Phase 2: Authentication (Day 2)
1. Setup NextAuth with Google + Credentials
2. Create login/register pages
3. Add middleware for route protection
4. Add userId to all data operations

### Phase 3: Cloud Backup (Day 3)
1. Setup Google Sheets API client
2. Create backup/restore endpoints
3. Add Backup section to Settings

### Phase 4: PWA & Deploy (Day 4)
1. Add PWA manifest and icons
2. Configure next-pwa
3. Test installability
4. Deploy to Vercel
5. Update OAuth redirect URIs

### Phase 5: Cleanup (Day 5)
1. Delete unused files
2. Update documentation
3. Final testing

---

## 11. DEPLOYMENT CHECKLIST

### Before Deploying to Vercel:

- [ ] All environment variables set in Vercel dashboard
- [ ] Google OAuth redirect URI updated: `https://your-app.vercel.app/api/auth/callback/google`
- [ ] Service account has Editor access to spreadsheet
- [ ] PWA manifest and icons in `/public`
- [ ] Test local build: `npm run build`

### Vercel Environment Variables:

```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate-random-string>
GOOGLE_CLIENT_ID=705047390910-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-secret>
GOOGLE_SERVICE_ACCOUNT_EMAIL=moneymngr@moneymngr.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=<full-private-key-with-newlines>
GOOGLE_SPREADSHEET_ID=1bYAXgCbiN7zFiUw2IRRJPf8vLx9oWffnh7lrTFMRU88
```

---

## 12. TESTING CHECKLIST

### Authentication
- [ ] Google OAuth login works
- [ ] Email/password registration works
- [ ] Email/password login works
- [ ] Logout works
- [ ] Protected routes redirect to login

### Core Features
- [ ] Create account
- [ ] Edit account
- [ ] Delete account
- [ ] Create expense transaction
- [ ] Create income transaction
- [ ] Create transfer (visual preview works)
- [ ] CSV import (transfers show visual)
- [ ] Filter by type
- [ ] Filter by period

### Magic Box
- [ ] Paste SMS and parse (regex)
- [ ] "Use AI Suggestions" button works
- [ ] AI fallback chain works (Gemini → Claude → OpenAI)
- [ ] Auto-submit countdown
- [ ] PENDING status styling

### Backup
- [ ] Backup to cloud works
- [ ] Restore from cloud works
- [ ] Last backup time shown

### PWA
- [ ] Install prompt appears
- [ ] App installs correctly
- [ ] Opens in standalone mode
- [ ] Works offline (reads from IndexedDB)

---

**END OF PROMPT**

This is the updated, comprehensive prompt for Money Mngr PWA v2.0.
Use with Claude Code in VS Code to complete the remaining tasks.
