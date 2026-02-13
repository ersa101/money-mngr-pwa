# 🤖 CLAUDE CODE DEVELOPMENT INSTRUCTIONS

**Project:** Money Manager PWA - Gen Z Expense Tracker with ML Intelligence  
**Target Launch:** January 20, 2026 (MVP)  
**Repository:** Connected to GitHub (auto-sync enabled)  
**Developer:** Claude Code (Autonomous AI Developer)  

---

## 📋 TABLE OF CONTENTS

1. [Project Context & Vision](#1-project-context--vision)
2. [Current State Assessment](#2-current-state-assessment)
3. [Development Workflow](#3-development-workflow)
4. [Phase 1: MVP Development Tasks](#4-phase-1-mvp-development-tasks)
5. [Code Architecture Guidelines](#5-code-architecture-guidelines)
6. [UI/UX Design Principles](#6-uiux-design-principles)
7. [Testing & Quality Standards](#7-testing--quality-standards)
8. [Git Commit Conventions](#8-git-commit-conventions)
9. [Documentation Requirements](#9-documentation-requirements)
10. [Troubleshooting & Error Handling](#10-troubleshooting--error-handling)

---

## 1. PROJECT CONTEXT & VISION

### **Target Users**
- **Primary:** Gen Z (18-25 years old)
- **Secondary:** Young professionals and students who want detailed expense tracking
- **Use Cases:** Personal finance management, multi-account tracking, budget planning

### **Core Value Propositions**
1. **Smart Threshold Warnings** - Never accidentally overspend
2. **Predictive Insights** - AI warns about upcoming expensive periods (festivals, etc.)
3. **Flexible Account Management** - Track 20+ accounts with custom headers/grouping
4. **Beautiful, Fast PWA** - Works offline, feels native

### **Top Priority Feature (Phase 1)**
**Festive/Seasonal Spending Alerts** - ML-powered predictions based on historical patterns

### **Technology Constraints**
- Must work as PWA (Progressive Web App)
- Deploy to Vercel
- Later: Publish to Google Play Store
- Privacy-first: All data stored locally (IndexedDB)

---

## 2. CURRENT STATE ASSESSMENT

### ✅ **What's Already Built**

#### **Backend/Data Layer:**
- ✅ CSV-based backend (`.data/` folder)
  - `accounts.csv` - Bank accounts, wallets, cash
  - `categories.csv` - Expense/income categories with hierarchy
  - `transactions.csv` - All financial transactions
- ✅ API layer (`src/app/api/data/route.ts`)
  - GET/POST/DELETE endpoints for CRUD operations
- ✅ Dexie.js integration (IndexedDB wrapper)
- ✅ Client-side CSV adapter mimicking Dexie API

#### **Frontend Components:**
- ✅ Transaction entry modal with type toggle (Expense/Income/Transfer)
- ✅ Transaction list with filters (All/Expense/Income/Transfer)
- ✅ Account management page with CRUD
- ✅ Stats dashboard with charts (recharts)
- ✅ Bottom tab navigation (Transactions/Accounts/Stats/More)
- ✅ CSV import with progress bar

#### **Features Working:**
- ✅ Double-entry bookkeeping
- ✅ Multi-account support
- ✅ Hierarchical categories (parent/child)
- ✅ Time-based filters (Daily/Weekly/Monthly/Quarterly/Annually/All-Time)
- ✅ Real-time data sync via Dexie live queries
- ✅ CSV bulk import with auto-account creation

### ❌ **What's Missing/Broken**

#### **Critical Issues to Fix:**
1. **No threshold warning system** - Threshold field exists but not displayed during entry
2. **Account headers not visually distinct** - Headers look like regular accounts
3. **No real-time spendable balance** - User can't see "safe to spend" amount
4. **"transactions" category too dominant** - 71.8% of expenses uncategorized
5. **No ML/predictive features** - Core differentiator not implemented

#### **UI/UX Issues:**
1. Account grouping exists in data model but not in UI
2. No collapsible headers
3. Transaction entry doesn't show balance impact preview
4. No visual threshold indicators (red/yellow/green)
5. No quick access to recent/frequent transactions

---

## 3. DEVELOPMENT WORKFLOW

### **Daily Workflow**

```bash
# 1. Start development session
cd /path/to/money-mngr-pwa
git pull origin main  # Get latest changes

# 2. Check current branch
git branch
# If not on feature branch, create one:
git checkout -b feature/threshold-warnings

# 3. Start dev server
npm run dev  # Runs on http://localhost:3000

# 4. Make changes
# [Code here]

# 5. Test locally
# - Open browser to http://localhost:3000
# - Test all affected features
# - Check console for errors

# 6. Build to verify no errors
npm run build

# 7. Commit changes (see section 8 for conventions)
git add .
git commit -m "feat: add threshold warning indicators"

# 8. Push to GitHub
git push origin feature/threshold-warnings

# 9. Merge to main when feature complete
git checkout main
git merge feature/threshold-warnings
git push origin main
```

### **File Structure Conventions**

```
src/
├── app/
│   ├── page.tsx                 # Home (redirects to /transactions)
│   ├── layout.tsx               # Root layout
│   ├── transactions/page.tsx    # Transaction management
│   ├── accounts/page.tsx        # Account management
│   ├── stats/page.tsx           # Analytics dashboard
│   └── api/
│       └── data/route.ts        # CSV CRUD API
├── components/
│   ├── transactions/            # NEW: Group transaction components
│   │   ├── AddTransactionModal.tsx
│   │   ├── TransactionList.tsx
│   │   └── ThresholdPreview.tsx # NEW: Create this
│   ├── accounts/                # NEW: Group account components
│   │   ├── AccountCard.tsx
│   │   ├── AccountHeader.tsx    # NEW: Create this
│   │   └── AccountModal.tsx
│   ├── insights/                # NEW: ML-powered components
│   │   ├── SpendingAlert.tsx
│   │   └── TrendChart.tsx
│   └── ui/                      # Shadcn components
├── hooks/
│   ├── useTransaction.ts
│   ├── useAccount.ts
│   └── useThreshold.ts          # NEW: Create this
├── lib/
│   ├── db.ts                    # Dexie database
│   ├── csvImport.ts             # CSV parsing
│   └── ml/                      # NEW: ML utilities
│       ├── patternDetection.ts
│       └── predictions.ts
└── types/
    └── index.ts                 # Centralized TypeScript types
```

---

## 4. PHASE 1: MVP DEVELOPMENT TASKS

**Deadline:** January 20, 2026

### **Sprint 1: Foundation Cleanup (Jan 16-17)**

#### **Task 1.1: Remove Redundant Documentation**
```bash
# Delete these files:
rm CSV_IMPORT.md
rm ERROR_LOG.md
rm ERROR_STATUS.md
rm TROUBLESHOOTING.md
rm SESSION_SUMMARY.md
rm CHANGELOG_JAN14.md

# Commit
git add .
git commit -m "docs: remove redundant documentation files"
git push origin main
```

#### **Task 1.2: Create Foundational Documents**
Create these new files in project root:
- `PRODUCT_VISION.md` - Vision, target users, core value props
- `TECHNICAL_ARCHITECTURE.md` - System design, data flow
- `FEATURE_ROADMAP.md` - Prioritized features by phase
- `DATA_MODELS.md` - Complete database schemas
- `ML_STRATEGY.md` - ML implementation plan (Phase 2)
- `UI_COMPONENT_LIBRARY.md` - Component catalog
- `DEVELOPMENT_GUIDELINES.md` - Coding standards

#### **Task 1.3: Centralize TypeScript Types**
```typescript
// Create src/types/index.ts
export interface Account {
  id?: number
  name: string
  type: 'BANK' | 'CASH' | 'WALLET' | 'INVESTMENT'
  balance: number
  thresholdValue: number
  icon?: string
  color?: string
  group?: string  // Header grouping
  isHeader?: boolean  // NEW: Distinguish headers from accounts
}

export interface Category {
  id?: number
  name: string
  parentId?: number
  type: 'EXPENSE' | 'INCOME'
  icon: string
  budgetLimit?: number  // NEW: Category budget
}

export interface Transaction {
  id?: number
  date: Date
  amount: number
  fromAccountId: number
  toCategoryId?: number
  toAccountId?: number
  description: string
  isTransfer: boolean
  transactionType?: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  category?: string
  subCategory?: string
  note?: string
  smsRaw?: string
  // CSV import metadata
  csvAccount?: string
  csvCategory?: string
  csvSubcategory?: string
  csvIncomeExpense?: string
  csvDescription?: string
  csvCurrency?: string
  importedAt?: Date
}

export interface ThresholdWarning {
  accountId: number
  accountName: string
  currentBalance: number
  threshold: number
  spendableAmount: number
  status: 'SAFE' | 'WARNING' | 'CRITICAL'  // >50%, 20-50%, <20%
  message: string
}

export interface SpendingPattern {
  dateRange: { start: Date; end: Date }
  totalAmount: number
  categoryBreakdown: Record<string, number>
  averageDailySpend: number
  peakDays: Date[]
}
```

---

### **Sprint 2: Threshold Warning System (Jan 17-18)**

#### **Task 2.1: Create Threshold Hook**
```typescript
// Create src/hooks/useThreshold.ts

import { useMemo } from 'react'
import { Account, ThresholdWarning } from '@/types'

export function useThreshold(account: Account, proposedExpense?: number): ThresholdWarning {
  return useMemo(() => {
    const balance = account.balance
    const threshold = account.thresholdValue
    const afterExpense = proposedExpense ? balance - proposedExpense : balance
    const spendable = afterExpense - threshold
    
    let status: 'SAFE' | 'WARNING' | 'CRITICAL'
    let message: string
    
    const percentRemaining = (spendable / threshold) * 100
    
    if (percentRemaining > 50) {
      status = 'SAFE'
      message = `You have ₹${spendable.toLocaleString()} safe to spend`
    } else if (percentRemaining > 20) {
      status = 'WARNING'
      message = `⚠️ Only ₹${spendable.toLocaleString()} left above threshold`
    } else {
      status = 'CRITICAL'
      message = `🚨 This will put you ₹${Math.abs(spendable).toLocaleString()} below your threshold!`
    }
    
    return {
      accountId: account.id!,
      accountName: account.name,
      currentBalance: balance,
      threshold,
      spendableAmount: spendable,
      status,
      message
    }
  }, [account, proposedExpense])
}
```

#### **Task 2.2: Enhanced Transaction Entry Modal**
Update `src/components/AddTransactionModal.tsx`:

**Requirements:**
1. Show current account balance
2. Show threshold value
3. Show spendable amount (balance - threshold)
4. Update preview in real-time as user types amount
5. Color-coded warning:
   - Green border: SAFE
   - Yellow border: WARNING
   - Red border + alert: CRITICAL
6. Block submission if CRITICAL (optional: allow with confirmation)

**UI Structure:**
```tsx
<Modal>
  <Header>Add Expense</Header>
  
  <Form>
    <AccountSelect onChange={handleAccountChange} />
    
    {selectedAccount && (
      <ThresholdPreview>
        <BalanceInfo>
          Current: ₹{balance.toLocaleString()}
          Threshold: ₹{threshold.toLocaleString()}
        </BalanceInfo>
        
        <SpendableAmount status={warning.status}>
          {warning.status === 'SAFE' && '✅'}
          {warning.status === 'WARNING' && '⚠️'}
          {warning.status === 'CRITICAL' && '🚨'}
          Spendable: ₹{spendable.toLocaleString()}
        </SpendableAmount>
        
        {amount > 0 && (
          <AfterTransaction status={warning.status}>
            After this: ₹{(balance - amount).toLocaleString()}
            {warning.message}
          </AfterTransaction>
        )}
      </ThresholdPreview>
    )}
    
    <CategorySelect />
    <AmountInput onChange={handleAmountChange} />
    <DescriptionInput />
    
    <SubmitButton disabled={warning.status === 'CRITICAL'}>
      {warning.status === 'CRITICAL' ? 'Cannot Proceed' : 'Record Transaction'}
    </SubmitButton>
  </Form>
</Modal>
```

#### **Task 2.3: Account Card Threshold Indicator**
Update `src/components/accounts/AccountCard.tsx`:

**Add visual elements:**
1. Progress bar showing: (balance / threshold) ratio
2. Color-coded border-left:
   - 🟢 Green: balance > threshold * 1.5
   - 🟡 Yellow: threshold < balance < threshold * 1.5
   - 🔴 Red: balance < threshold
3. Badge showing spendable amount
4. Mini trend indicator (↑↓ from last week)

---

### **Sprint 3: Account Header UI (Jan 18)**

#### **Task 3.1: Distinguish Headers from Accounts**
Update data model to mark headers:
```typescript
// In src/lib/db.ts
// Add isHeader field to existing accounts or create separate header records

// Example:
const headers = [
  { id: 1, name: 'Cash Accounts', isHeader: true, group: 'cash' },
  { id: 2, name: 'Bank Accounts', isHeader: true, group: 'banks' },
  { id: 3, name: 'Wallets', isHeader: true, group: 'wallets' }
]
```

#### **Task 3.2: Create Collapsible Account Header Component**
```tsx
// Create src/components/accounts/AccountHeader.tsx

interface Props {
  header: string
  accounts: Account[]
  totalBalance: number
  isExpanded: boolean
  onToggle: () => void
}

export function AccountHeader({ header, accounts, totalBalance, isExpanded, onToggle }: Props) {
  return (
    <div className="border rounded-lg mb-4">
      {/* Header Row - Always Visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-800"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
          <h3 className="font-semibold text-lg">{header}</h3>
          <Badge>{accounts.length} accounts</Badge>
        </div>
        
        <div className="text-right">
          <p className="text-2xl font-bold">₹{totalBalance.toLocaleString()}</p>
          <p className="text-sm text-slate-400">Total Balance</p>
        </div>
      </button>
      
      {/* Collapsible Account List */}
      {isExpanded && (
        <div className="border-t divide-y">
          {accounts.map(account => (
            <AccountCard key={account.id} account={account} compact />
          ))}
        </div>
      )}
    </div>
  )
}
```

#### **Task 3.3: Update Accounts Page Layout**
Refactor `src/app/accounts/page.tsx`:

**New Structure:**
```tsx
// Group accounts by header
const groupedAccounts = {
  'Cash Accounts': [cashAccount1, cashAccount2],
  'Bank Accounts': [sbiAccount, dbAccount, hdfcAccount],
  'Wallets': [paytmAccount, phonePeAccount],
  'Investments': [zerodhaAccount]
}

// Render with collapsible headers
{Object.entries(groupedAccounts).map(([header, accounts]) => (
  <AccountHeader
    key={header}
    header={header}
    accounts={accounts}
    totalBalance={accounts.reduce((sum, acc) => sum + acc.balance, 0)}
    isExpanded={expandedHeaders.includes(header)}
    onToggle={() => toggleHeader(header)}
  />
))}
```

---

### **Sprint 4: Quick Transaction Improvements (Jan 19)**

#### **Task 4.1: Recent Transactions Quick Access**
Add to transaction entry modal:

```tsx
<Section>
  <h3>Recent Transactions</h3>
  <div className="grid grid-cols-2 gap-2">
    {recentTransactions.slice(0, 4).map(txn => (
      <button
        key={txn.id}
        onClick={() => prefillFromTransaction(txn)}
        className="p-3 border rounded hover:bg-slate-800 text-left"
      >
        <p className="font-semibold">{txn.description}</p>
        <p className="text-sm text-slate-400">{txn.category}</p>
        <p className="text-sm">₹{txn.amount}</p>
      </button>
    ))}
  </div>
</Section>
```

#### **Task 4.2: Smart Category Suggestions**
Implement simple keyword matching:

```typescript
// src/lib/categorySuggestions.ts

export function suggestCategory(description: string, history: Transaction[]): string | null {
  const desc = description.toLowerCase()
  
  // Keyword matching
  const keywords = {
    'Food': ['zomato', 'swiggy', 'food', 'restaurant', 'cafe', 'coffee'],
    'Transportation': ['uber', 'ola', 'rapido', 'metro', 'bus', 'petrol'],
    'Entertainment': ['netflix', 'hotstar', 'movie', 'bookmyshow'],
    'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio'],
    'Health': ['pharmacy', 'medicine', 'doctor', 'hospital']
  }
  
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => desc.includes(word))) {
      return category
    }
  }
  
  // Frequency-based suggestion from history
  const similarTransactions = history.filter(t => 
    t.description.toLowerCase().includes(desc) || 
    desc.includes(t.description.toLowerCase())
  )
  
  if (similarTransactions.length > 0) {
    // Return most common category
    const categoryCount = similarTransactions.reduce((acc, t) => {
      acc[t.category!] = (acc[t.category!] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.keys(categoryCount).sort((a, b) => categoryCount[b] - categoryCount[a])[0]
  }
  
  return null
}
```

---

### **Sprint 5: Enhanced Filtering & Search (Jan 19-20)**

#### **Task 5.1: Advanced Date Range Picker**
Create custom date range selector:

```tsx
// src/components/DateRangePicker.tsx

const presets = [
  { label: 'Today', getValue: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
  { label: 'Yesterday', getValue: () => ({ start: startOfYesterday(), end: endOfYesterday() }) },
  { label: 'This Week', getValue: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }) },
  { label: 'Last 7 Days', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: 'This Month', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: 'Last 30 Days', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: 'Custom', getValue: () => null }
]
```

#### **Task 5.2: Transaction Search**
Add search bar to transactions page:

```tsx
<SearchBar
  placeholder="Search by description, category, or amount..."
  onChange={handleSearch}
/>
```

**Search Logic:**
```typescript
function searchTransactions(query: string, transactions: Transaction[]) {
  const q = query.toLowerCase()
  
  return transactions.filter(t => 
    t.description.toLowerCase().includes(q) ||
    t.category?.toLowerCase().includes(q) ||
    t.subCategory?.toLowerCase().includes(q) ||
    t.note?.toLowerCase().includes(q) ||
    t.amount.toString().includes(q)
  )
}
```

#### **Task 5.3: Multi-Filter Support**
Allow combining filters:
- Type (Expense/Income/Transfer)
- Date Range
- Account
- Category
- Amount Range

**UI:** Chip-based filter display with clear-all option

---

### **Sprint 6: Final Polish & Testing (Jan 20)**

#### **Task 6.1: Performance Optimization**
1. Add React.memo to expensive components
2. Optimize re-renders in transaction list
3. Implement virtual scrolling for 1000+ transactions
4. Lazy load chart components

#### **Task 6.2: Responsive Design Audit**
Test on:
- Mobile (375px - iPhone SE)
- Mobile (390px - iPhone 12)
- Tablet (768px - iPad)
- Desktop (1920px)

Fix any layout issues.

#### **Task 6.3: Error Boundaries**
Wrap main sections in error boundaries:

```tsx
// src/components/ErrorBoundary.tsx

export class ErrorBoundary extends React.Component {
  state = { hasError: false }
  
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>
            Reload App
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

#### **Task 6.4: Deployment to Vercel**
```bash
# Build production
npm run build

# Test production build locally
npm run start

# Deploy to Vercel
vercel --prod

# Set environment variables if needed
vercel env add DATABASE_PATH .data/
```

---

## 5. CODE ARCHITECTURE GUIDELINES

### **Component Design Principles**

1. **Single Responsibility** - Each component does one thing well
2. **Composition over Inheritance** - Build complex UIs from simple pieces
3. **Props Drilling Limit** - Max 2 levels, then use context
4. **Server vs Client Components** - Use server components by default, client only when needed

### **File Naming Conventions**

```
PascalCase: Components (AccountCard.tsx)
camelCase: Utilities, hooks (useAccount.ts, formatCurrency.ts)
kebab-case: CSS modules (account-card.module.css)
UPPER_SNAKE_CASE: Constants (API_ENDPOINTS.ts)
```

### **Import Order**

```typescript
// 1. External dependencies
import React from 'react'
import { useRouter } from 'next/navigation'

// 2. Internal components
import { AccountCard } from '@/components/accounts/AccountCard'
import { Button } from '@/components/ui/button'

// 3. Hooks
import { useAccount } from '@/hooks/useAccount'

// 4. Utils & Lib
import { db } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'

// 5. Types
import type { Account, Transaction } from '@/types'

// 6. Styles
import styles from './styles.module.css'
```

### **TypeScript Best Practices**

```typescript
// ✅ DO: Explicit return types for functions
export function calculateSpendable(balance: number, threshold: number): number {
  return balance - threshold
}

// ✅ DO: Use interfaces for objects, types for unions
interface User { id: number; name: string }
type Status = 'SAFE' | 'WARNING' | 'CRITICAL'

// ✅ DO: Optional chaining and nullish coalescing
const spendable = account?.balance ?? 0

// ❌ DON'T: Use 'any'
// Use 'unknown' if type truly unknown, then narrow

// ✅ DO: Generic types for reusable components
interface SelectProps<T> {
  options: T[]
  onChange: (value: T) => void
}
```

### **State Management Strategy**

**Local State (useState):**
- Form inputs
- UI state (modals open/closed, dropdowns)
- Temporary data

**Server State (React Query or SWR):**
- API data
- Consider for future if adding backend

**Global State (Context):**
- User preferences (theme, currency)
- Auth state (future)

**Database State (Dexie + useLiveQuery):**
- Accounts, transactions, categories
- Automatically syncs across components

### **Performance Guidelines**

```typescript
// ✅ DO: Memoize expensive calculations
const totalExpenses = useMemo(() => 
  transactions
    .filter(t => t.transactionType === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0),
  [transactions]
)

// ✅ DO: Debounce search inputs
const debouncedSearch = useDeferredValue(searchQuery)

// ✅ DO: Lazy load heavy components
const ChartComponent = lazy(() => import('@/components/ChartComponent'))

// ✅ DO: Virtual scrolling for long lists
import { VirtualList } from 'react-virtual'
```

---

## 6. UI/UX DESIGN PRINCIPLES

### **Design System**

**Colors:**
```typescript
const colors = {
  // Status colors
  safe: '#10B981',      // Green-500
  warning: '#F59E0B',   // Amber-500
  critical: '#EF4444',  // Red-500
  
  // Backgrounds
  bg: {
    primary: '#0F172A',   // Slate-900
    secondary: '#1E293B', // Slate-800
    tertiary: '#334155'   // Slate-700
  },
  
  // Text
  text: {
    primary: '#F1F5F9',   // Slate-100
    secondary: '#94A3B8', // Slate-400
    muted: '#64748B'      // Slate-500
  },
  
  // Accent
  accent: '#3B82F6'       // Blue-500
}
```

**Typography:**
```css
/* Headings */
h1: font-size: 2.5rem, font-weight: 700
h2: font-size: 2rem, font-weight: 600
h3: font-size: 1.5rem, font-weight: 600

/* Body */
body: font-size: 1rem, font-weight: 400
small: font-size: 0.875rem

/* Font family */
font-family: 'Inter', system-ui, sans-serif
```

**Spacing:**
```
Base unit: 4px
Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96
Use: p-2, p-4, p-6, m-4, gap-4, etc.
```

**Shadows:**
```css
sm: 0 1px 2px rgba(0, 0, 0, 0.05)
md: 0 4px 6px rgba(0, 0, 0, 0.1)
lg: 0 10px 15px rgba(0, 0, 0, 0.1)
```

### **Component Patterns**

**Cards:**
- Rounded corners: `rounded-lg` (8px)
- Padding: `p-4` or `p-6`
- Background: `bg-slate-800`
- Border: `border border-slate-700` (subtle)

**Buttons:**
- Primary: Blue background, white text
- Secondary: Slate background, white text
- Danger: Red background, white text
- Ghost: Transparent, colored text
- Padding: `px-4 py-2`
- Rounded: `rounded-md`

**Inputs:**
- Background: `bg-slate-900`
- Border: `border-slate-700`
- Focus ring: `focus:ring-2 focus:ring-blue-500`
- Padding: `px-3 py-2`

**Modals:**
- Backdrop: `bg-black/50`
- Container: `bg-slate-900 rounded-xl p-6`
- Max width: `max-w-md` or `max-w-lg`
- Center: `flex items-center justify-center`

### **Animation Standards**

```css
/* Transitions */
transition-colors: 150ms
transition-transform: 200ms
transition-opacity: 300ms

/* Hover states */
hover:scale-105 (buttons)
hover:bg-slate-800 (cards)

/* Loading states */
animate-spin (spinners)
animate-pulse (skeletons)
```

### **Accessibility Requirements**

1. **Color Contrast:** Minimum 4.5:1 for text
2. **Focus Indicators:** Visible focus rings on all interactive elements
3. **Keyboard Navigation:** Tab order logical, Enter/Space trigger actions
4. **ARIA Labels:** All icons and buttons have labels
5. **Screen Reader:** Announce state changes (e.g., "Transaction added")

---

## 7. TESTING & QUALITY STANDARDS

### **Manual Testing Checklist (Before Each Commit)**

```
□ Transaction Entry
  □ Can add expense to category
  □ Can add income
  □ Can transfer between accounts
  □ Threshold warning displays correctly
  □ Spendable balance updates in real-time
  □ Form validation works (required fields)
  
□ Account Management
  □ Can create new account
  □ Can edit existing account
  □ Can delete account (if no transactions)
  □ Headers collapse/expand correctly
  □ Balance calculations accurate
  
□ Transaction List
  □ Filters work (All/Expense/Income/Transfer)
  □ Time filters work (Daily/Weekly/Monthly/etc.)
  □ Search returns correct results
  □ Sorting by date works
  □ Transactions display correct data
  
□ CSV Import
  □ File upload works
  □ Progress bar displays
  □ Accounts auto-created
  □ Categories auto-created
  □ Balance calculations correct after import
  
□ Responsive Design
  □ Mobile (375px) - layout doesn't break
  □ Tablet (768px) - layout adapts
  □ Desktop (1920px) - uses space well
  
□ Performance
  □ Page loads in <2 seconds
  □ No console errors
  □ Smooth animations (60fps)
  
□ Data Integrity
  □ Balances always accurate
  □ No duplicate transactions
  □ CSV data matches database
```

### **Automated Testing (Future Phase)**

```typescript
// Unit tests for utilities
describe('calculateSpendable', () => {
  it('returns correct spendable amount', () => {
    expect(calculateSpendable(10000, 2000)).toBe(8000)
  })
  
  it('returns negative if below threshold', () => {
    expect(calculateSpendable(1000, 2000)).toBe(-1000)
  })
})

// Integration tests for components
describe('AddTransactionModal', () => {
  it('shows threshold warning when amount exceeds spendable', async () => {
    render(<AddTransactionModal account={mockAccount} />)
    
    await userEvent.type(screen.getByLabelText('Amount'), '10000')
    
    expect(screen.getByText(/below your threshold/i)).toBeInTheDocument()
  })
})
```

### **Code Quality Checks**

```bash
# Run before committing
npm run lint          # ESLint
npm run type-check    # TypeScript compiler
npm run build         # Production build test
```

---

## 8. GIT COMMIT CONVENTIONS

### **Commit Message Format**

```
<type>(<scope>): <subject>

<body>

<footer>
```

### **Types**

```
feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Code formatting (no logic change)
refactor: Code restructuring (no behavior change)
perf:     Performance improvement
test:     Adding/updating tests
chore:    Build process, dependencies, tooling
```

### **Scopes**

```
transactions: Transaction-related code
accounts:     Account management
stats:        Analytics/charts
csv:          CSV import
ui:           UI components
db:           Database/data layer
ml:           Machine learning features
```

### **Examples**

```bash
# Good commits
git commit -m "feat(transactions): add threshold warning indicator"
git commit -m "fix(accounts): correct balance calculation for transfers"
git commit -m "docs: update FEATURE_ROADMAP with Phase 1 tasks"
git commit -m "refactor(ui): extract AccountHeader component"
git commit -m "perf(transactions): add virtual scrolling for large lists"

# Bad commits (don't do this)
git commit -m "updates"
git commit -m "fixed stuff"
git commit -m "WIP"
```

### **Branch Naming**

```
feature/threshold-warnings
feature/account-headers
fix/balance-calculation
refactor/component-structure
docs/update-architecture
```

### **Commit Frequency**

- Commit after each logical unit of work
- Don't commit broken code to main
- Use feature branches for work-in-progress
- Squash commits before merging to main (optional)

---

## 9. DOCUMENTATION REQUIREMENTS

### **Code Documentation**

**Function/Method Comments:**
```typescript
/**
 * Calculates the spendable amount after accounting for threshold
 * 
 * @param balance - Current account balance
 * @param threshold - Minimum safe balance threshold
 * @param proposedExpense - Optional expense to factor in
 * @returns Spendable amount (can be negative)
 * 
 * @example
 * calculateSpendable(10000, 2000) // Returns 8000
 * calculateSpendable(10000, 2000, 5000) // Returns 3000
 */
export function calculateSpendable(
  balance: number,
  threshold: number,
  proposedExpense: number = 0
): number {
  return balance - proposedExpense - threshold
}
```

**Component Documentation:**
```typescript
/**
 * AccountHeader - Collapsible header for grouping accounts
 * 
 * Displays aggregate balance for a group of accounts and allows
 * expanding/collapsing the list of individual accounts.
 * 
 * @component
 * @example
 * <AccountHeader
 *   header="Bank Accounts"
 *   accounts={bankAccounts}
 *   totalBalance={150000}
 *   isExpanded={true}
 *   onToggle={() => setExpanded(!expanded)}
 * />
 */
```

### **README Updates**

After each major feature, update `README.md` with:
1. What changed
2. How to use the new feature
3. Any breaking changes
4. Migration guide (if needed)

### **Documentation Files to Maintain**

```
README.md                    - Project overview, quick start
FEATURES.md                  - Feature list (update as you add features)
TECHNICAL_ARCHITECTURE.md    - System design (update for major changes)
FEATURE_ROADMAP.md           - Progress tracker (check off completed tasks)
DEVELOPMENT_GUIDELINES.md    - Coding standards
CHANGELOG.md                 - Release notes
```

---

## 10. TROUBLESHOOTING & ERROR HANDLING

### **Common Issues & Solutions**

#### **Issue: npm install fails**
```bash
# Solution 1: Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Solution 2: Use legacy peer deps
npm install --legacy-peer-deps
```

#### **Issue: TypeScript errors after adding new dependency**
```bash
# Solution: Install type definitions
npm install --save-dev @types/[package-name]

# If types don't exist, create declaration file
# types/[package-name].d.ts
declare module '[package-name]'
```

#### **Issue: Dexie "Table not found" error**
```typescript
// Solution: Ensure db.ts has proper version increment
export const db = new Dexie('MyFinancePWA')

db.version(2).stores({  // Increment version when schema changes
  accounts: '++id, name, type, balance, group',
  categories: '++id, name, type, parentId',
  transactions: '++id, date, fromAccountId, toCategoryId, toAccountId'
})
```

#### **Issue: CSV import not updating balances**
```typescript
// Solution: Ensure transaction type detection is correct
// Check csvImport.ts parseTransactionType() function

// Verify balance calculation logic
if (type === 'EXPENSE') {
  account.balance -= amount
} else if (type === 'INCOME') {
  account.balance += amount
} else if (type === 'TRANSFER') {
  fromAccount.balance -= amount
  toAccount.balance += amount
}
```

#### **Issue: Threshold warnings not showing**
```typescript
// Debug checklist:
1. Verify account has thresholdValue set
2. Check useThreshold hook is called correctly
3. Ensure ThresholdPreview component is rendered
4. Check conditional rendering logic
5. Inspect browser console for errors
```

### **Error Handling Patterns**

**API Calls:**
```typescript
async function fetchTransactions() {
  try {
    const response = await fetch('/api/data?table=transactions')
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data
    
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    
    // Show user-friendly message
    toast.error('Could not load transactions. Please try again.')
    
    // Return fallback data
    return []
  }
}
```

**Database Operations:**
```typescript
async function addTransaction(transaction: Transaction) {
  try {
    await db.transaction('rw', db.transactions, db.accounts, async () => {
      // Atomic operations
      await db.transactions.add(transaction)
      await db.accounts.update(transaction.fromAccountId, {
        balance: newBalance
      })
    })
    
    toast.success('Transaction added successfully')
    
  } catch (error) {
    console.error('Transaction failed:', error)
    toast.error('Could not save transaction. Changes rolled back.')
    throw error  // Re-throw for upstream handling
  }
}
```

**Component Error Boundaries:**
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <TransactionList />
</ErrorBoundary>
```

### **Logging Strategy**

**Development:**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG] Transaction:', transaction)
}
```

**Production:**
```typescript
// Use structured logging
function logError(context: string, error: Error, metadata?: object) {
  console.error({
    timestamp: new Date().toISOString(),
    context,
    message: error.message,
    stack: error.stack,
    ...metadata
  })
  
  // In future: Send to error tracking service (Sentry, etc.)
}
```

---

## 📞 GETTING HELP

### **When Stuck:**

1. **Check Documentation:**
   - Review relevant `.md` files in project root
   - Check Next.js docs: https://nextjs.org/docs
   - Check Dexie docs: https://dexie.org/docs

2. **Debug Checklist:**
   - Check browser console for errors
   - Verify data in IndexedDB (DevTools → Application → IndexedDB)
   - Check network tab for API failures
   - Add console.logs to trace execution flow
   - Verify TypeScript types are correct

3. **Ask for Clarification:**
   - If requirements unclear, ask the user
   - Provide options/recommendations
   - Show examples of what you plan to implement

4. **Document Decisions:**
   - Update relevant `.md` files
   - Add comments in code explaining "why"
   - Update CHANGELOG.md for significant changes

---

## ✅ DEFINITION OF DONE

A task is complete when:

- [ ] Code written and tested locally
- [ ] No TypeScript errors
- [ ] No console errors/warnings
- [ ] Manual testing checklist passed
- [ ] Responsive design verified (mobile/tablet/desktop)
- [ ] Code follows architecture guidelines
- [ ] Proper error handling implemented
- [ ] User-facing changes documented
- [ ] Committed with proper message format
- [ ] Pushed to GitHub
- [ ] Documentation updated (if needed)

---

## 🎯 SUCCESS METRICS

### **Phase 1 Success Criteria (Jan 20):**

- [ ] App deployed to Vercel and accessible
- [ ] All existing features work (transactions, accounts, stats, CSV import)
- [ ] Threshold warning system fully functional
- [ ] Account headers collapsible and visually distinct
- [ ] Transaction entry shows real-time balance impact
- [ ] UI responsive on mobile, tablet, desktop
- [ ] No critical bugs
- [ ] Core user flow smooth (add account → add transaction → view stats)

### **Quality Benchmarks:**

- Page load time: < 2 seconds
- Time to Interactive: < 3 seconds
- Lighthouse Performance Score: > 90
- Accessibility Score: > 95
- Zero TypeScript errors
- Zero console errors in production

---

## 🚀 FINAL NOTES

**Remember:**
1. **User First:** Every decision should benefit Gen Z users
2. **Data Integrity:** Never compromise on financial accuracy
3. **Privacy:** All data stays local (IndexedDB)
4. **Speed:** Fast is a feature - optimize aggressively
5. **Beautiful:** Gen Z expects great design
6. **Smart:** ML features are the differentiator

**When in Doubt:**
- Favor simplicity over complexity
- Ask the user for clarification
- Document your reasoning
- Make it work, then make it beautiful, then make it fast

**You Got This! 💪**

Deploy an MVP that works reliably by Jan 20, 2026. Phase 2 (ML features) can come after once the foundation is solid.

---

**End of Instructions**

*Last Updated: January 16, 2026*
*Version: 1.0*
