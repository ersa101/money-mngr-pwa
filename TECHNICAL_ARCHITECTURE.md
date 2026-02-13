# 🏗️ TECHNICAL ARCHITECTURE

**Project:** Money Manager PWA  
**Last Updated:** January 16, 2026  
**Version:** 1.0

---

## TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Layers](#architecture-layers)
4. [Data Flow](#data-flow)
5. [Database Design](#database-design)
6. [Component Architecture](#component-architecture)
7. [State Management](#state-management)
8. [API Design](#api-design)
9. [Security & Privacy](#security--privacy)
10. [Performance Strategy](#performance-strategy)

---

## SYSTEM OVERVIEW

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (PWA)                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              NEXT.JS 15 (APP ROUTER)                  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         REACT COMPONENTS (CLIENT/SERVER)        │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              CUSTOM HOOKS                       │  │  │
│  │  │  - useTransaction                               │  │  │
│  │  │  - useAccount                                   │  │  │
│  │  │  - useThreshold (NEW)                           │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              STATE MANAGEMENT                    │  │  │
│  │  │  - React State (useState, useReducer)           │  │  │
│  │  │  - Dexie Live Queries (useLiveQuery)            │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   DATA LAYER                          │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         DEXIE.JS (IndexedDB Wrapper)            │  │  │
│  │  │  - Accounts Table                               │  │  │
│  │  │  - Categories Table                             │  │  │
│  │  │  - Transactions Table                           │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                      ▼                                │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │        IndexedDB (Browser Storage)              │  │  │
│  │  │        ~50MB - 500MB capacity                   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                CSV BACKEND (Optional)                 │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         API Routes (/api/data)                  │  │  │
│  │  │  - GET: Fetch from CSV                          │  │  │
│  │  │  - POST: Write to CSV                           │  │  │
│  │  │  - DELETE: Clear CSV                            │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                      ▼                                │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │        CSV Files (.data/ folder)                │  │  │
│  │  │  - accounts.csv                                 │  │  │
│  │  │  - categories.csv                               │  │  │
│  │  │  - transactions.csv                             │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## TECHNOLOGY STACK

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.5.9 | React framework, App Router, SSR/SSG |
| **React** | 19.0.0 | UI library, component-based |
| **TypeScript** | 5.x | Type safety, better DX |
| **Tailwind CSS** | 3.4.1 | Utility-first styling |
| **Shadcn/UI** | Latest | Pre-built accessible components |
| **Lucide React** | 0.395 | Icon library |

### Data & State

| Technology | Version | Purpose |
|------------|---------|---------|
| **Dexie.js** | 4.0.7 | IndexedDB wrapper, transactions |
| **dexie-react-hooks** | 1.1.7 | Live queries, real-time sync |
| **IndexedDB** | Native | Browser storage, offline-first |

### Charts & Visualization

| Technology | Version | Purpose |
|------------|---------|---------|
| **Recharts** | 2.x | Charts for stats dashboard |

### ML & Intelligence (Phase 2)

| Technology | Version | Purpose |
|------------|---------|---------|
| **TensorFlow.js** | 4.x | Client-side ML, predictions |

### Development Tools

| Technology | Version | Purpose |
|------------|---------|---------|
| **ESLint** | Latest | Code linting |
| **Prettier** | Latest | Code formatting |
| **Vercel** | N/A | Hosting & deployment |

---

## ARCHITECTURE LAYERS

### 1. Presentation Layer (UI Components)

**Location:** `src/components/`

**Responsibility:** Render UI, handle user interactions, display data

**Key Components:**
- `transactions/AddTransactionModal.tsx` - Transaction entry form
- `transactions/TransactionList.tsx` - List of transactions with filters
- `transactions/ThresholdPreview.tsx` - Real-time balance preview
- `accounts/AccountCard.tsx` - Individual account display
- `accounts/AccountHeader.tsx` - Collapsible account groups
- `accounts/AccountModal.tsx` - Account CRUD form
- `insights/SpendingAlert.tsx` - ML-powered alerts (Phase 2)
- `ui/*` - Reusable UI primitives (buttons, inputs, etc.)

**Design Pattern:** Atomic Design
- Atoms: Buttons, Inputs, Icons
- Molecules: Input groups, Card headers
- Organisms: Modal, Card, List
- Templates: Page layouts
- Pages: Complete views

---

### 2. Business Logic Layer (Hooks & Utils)

**Location:** `src/hooks/`, `src/lib/`

**Responsibility:** Business rules, calculations, data transformations

**Custom Hooks:**
```typescript
// src/hooks/useTransaction.ts
- createTransaction(tx: Transaction): Promise<void>
- getThresholdPreview(account, amount): ThresholdWarning
- updateTransaction(id, changes): Promise<void>
- deleteTransaction(id): Promise<void>

// src/hooks/useAccount.ts
- createAccount(account: Account): Promise<number>
- updateAccount(id, changes): Promise<void>
- deleteAccount(id): Promise<void>
- getAccountById(id): Promise<Account | null>

// src/hooks/useThreshold.ts (NEW)
- useThreshold(account, proposedExpense?): ThresholdWarning
```

**Utilities:**
```typescript
// src/lib/utils.ts
- formatCurrency(amount: number): string
- formatDate(date: Date): string
- calculateSpendable(balance, threshold, expense?): number

// src/lib/csvImport.ts
- parseCSV(file: File): Promise<CSVRow[]>
- importTransactionsFromCSV(rows): Promise<ImportResult>

// src/lib/categorySuggestions.ts (NEW - Phase 1)
- suggestCategory(description: string): string | null
```

---

### 3. Data Access Layer (Database)

**Location:** `src/lib/db.ts`

**Responsibility:** Database schema, queries, transactions

**Dexie Schema:**
```typescript
export const db = new Dexie('MyFinancePWA')

db.version(1).stores({
  accounts: '++id, name, type, balance, group',
  categories: '++id, name, type, parentId',
  transactions: '++id, date, fromAccountId, toCategoryId, toAccountId'
})
```

**Key Methods:**
```typescript
// Accounts
db.accounts.toArray()
db.accounts.add(account)
db.accounts.update(id, changes)
db.accounts.delete(id)
db.accounts.where('group').equals('banks').toArray()

// Transactions
db.transactions.toArray()
db.transactions.where('date').between(start, end).toArray()
db.transactions.orderBy('date').reverse().toArray()

// ACID Transactions
db.transaction('rw', db.accounts, db.transactions, async () => {
  // Atomic operations
})
```

---

### 4. API Layer (Server Routes)

**Location:** `src/app/api/data/route.ts`

**Responsibility:** CSV file I/O, server-side operations

**Endpoints:**
```typescript
GET  /api/data?table=accounts      // Fetch all accounts from CSV
GET  /api/data?table=categories    // Fetch all categories
GET  /api/data?table=transactions  // Fetch all transactions

POST /api/data
Body: { table: 'accounts', action: 'add', data: {...} }
      { table: 'accounts', action: 'update', data: {...} }
      { table: 'accounts', action: 'delete', data: { id: 123 } }

DELETE /api/data?table=accounts    // Clear all data
```

**CSV File Structure:**
```
.data/
├── accounts.csv
├── categories.csv
└── transactions.csv
```

---

## DATA FLOW

### Transaction Creation Flow

```
┌──────────────┐
│     USER     │ Clicks "Add Transaction"
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  AddTransactionModal Component       │
│  - Renders form                      │
│  - Calls useThreshold() hook         │
│  - Shows real-time preview           │
└──────────┬───────────────────────────┘
           │
           │ User submits form
           ▼
┌──────────────────────────────────────┐
│  useTransaction Hook                 │
│  - Validates input                   │
│  - Calls createTransaction()         │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Dexie.js Transaction                │
│  1. Start transaction                │
│  2. Add to transactions table        │
│  3. Update fromAccount balance       │
│  4. Update toAccount/Category        │
│  5. Commit (ACID)                    │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  IndexedDB                           │
│  - Data persisted locally            │
│  - Triggers change event             │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  useLiveQuery Subscriptions          │
│  - TransactionList re-renders        │
│  - AccountCard updates balance       │
│  - Stats charts refresh              │
└──────────────────────────────────────┘
```

### Real-time Sync Flow

```
Component A                    IndexedDB                    Component B
    │                              │                              │
    │  db.accounts.update()        │                              │
    ├─────────────────────────────►│                              │
    │                              │                              │
    │                              │  Change Event                │
    │                              ├─────────────────────────────►│
    │                              │                              │
    │                              │                    useLiveQuery()
    │                              │                    triggers re-render
    │                              │                              │
    │       Both components now have latest data                  │
    └──────────────────────────────┴──────────────────────────────┘
```

---

## DATABASE DESIGN

### Entity-Relationship Diagram

```
┌─────────────────────┐
│      ACCOUNT        │
│─────────────────────│
│ id (PK)             │
│ name                │
│ type                │
│ balance             │◄──────┐
│ thresholdValue      │       │
│ color               │       │
│ icon                │       │
│ group               │       │
│ isHeader            │       │ Many-to-One
└─────────────────────┘       │
                              │
┌─────────────────────┐       │
│    TRANSACTION      │       │
│─────────────────────│       │
│ id (PK)             │       │
│ date                │       │
│ amount              │       │
│ fromAccountId (FK)  ├───────┘
│ toCategoryId (FK)   ├───────┐
│ toAccountId (FK)    │       │
│ description         │       │
│ isTransfer          │       │ Many-to-One
│ transactionType     │       │
│ note                │       │
└─────────────────────┘       │
                              │
┌─────────────────────┐       │
│      CATEGORY       │       │
│─────────────────────│       │
│ id (PK)             │◄──────┘
│ name                │
│ parentId (FK, self) │
│ type                │
│ icon                │
│ budgetLimit         │
└─────────────────────┘
```

### Indexes

**Accounts:**
- Primary: `id`
- Secondary: `name`, `type`, `group`

**Categories:**
- Primary: `id`
- Secondary: `type`, `parentId`

**Transactions:**
- Primary: `id`
- Secondary: `date`, `fromAccountId`, `toCategoryId`, `toAccountId`

**Query Optimization:**
- Most common: Filter by date range → Index on `date`
- Second most: Filter by account → Index on `fromAccountId`

---

## COMPONENT ARCHITECTURE

### Component Hierarchy

```
App
├── RootLayout
│   ├── Navigation
│   └── BottomTabNavigation
│
├── HomePage (redirects to /transactions)
│
├── TransactionsPage
│   ├── PageHeader
│   │   └── Button (Add Transaction)
│   ├── StatsGrid
│   │   ├── StatCard (Total Income)
│   │   ├── StatCard (Total Expenses)
│   │   └── StatCard (Total Transfers)
│   ├── FilterTabs
│   │   ├── TypeFilter (All/Expense/Income/Transfer)
│   │   └── TimeFilter (Daily/Weekly/Monthly/etc.)
│   ├── SearchBar (NEW - Phase 1)
│   ├── TransactionList
│   │   └── TransactionCard (multiple)
│   └── AddTransactionModal
│       ├── AccountSelect
│       ├── ThresholdPreview (NEW)
│       ├── CategorySelect
│       ├── AmountInput
│       ├── DescriptionInput
│       └── RecentTransactions (NEW)
│
├── AccountsPage
│   ├── PageHeader
│   │   └── Button (Add Account)
│   ├── StatsGrid
│   │   ├── StatCard (Total Balance)
│   │   ├── StatCard (Total Threshold)
│   │   └── StatCard (Accounts Safe)
│   ├── AccountHeaderList
│   │   └── AccountHeader (multiple)
│   │       ├── HeaderRow (collapsible)
│   │       └── AccountCardList
│   │           └── AccountCard (multiple)
│   ├── AccountModal (create/edit)
│   └── DeleteConfirmDialog
│
├── StatsPage
│   ├── PageHeader
│   │   └── PeriodFilter
│   ├── NetWorthChart
│   ├── IncomeVsExpenseChart
│   ├── CategoryCompositionChart
│   └── SubCategoryTrendChart
│
└── MorePage
    ├── SettingsGrid
    │   ├── SettingCard (Configuration)
    │   ├── SettingCard (Backup)
    │   └── SettingCard (Help)
    └── CSVUploadModal
```

### Component Types

**1. Page Components** (Server Components where possible)
- `src/app/transactions/page.tsx`
- `src/app/accounts/page.tsx`
- `src/app/stats/page.tsx`

**2. Feature Components** (Client Components)
- `AddTransactionModal` - Complex form with state
- `AccountCard` - Interactive card with actions
- `ThresholdPreview` - Real-time calculations

**3. UI Components** (Can be Server Components)
- `Button`, `Input`, `Select`, `Card`
- Reusable, stateless (or minimal state)

**4. Layout Components**
- `Navigation` - Global header
- `BottomTabNavigation` - Fixed bottom tabs

---

## STATE MANAGEMENT

### State Categories

**1. UI State (useState)**
```typescript
// Modal open/closed
const [isOpen, setIsOpen] = useState(false)

// Form inputs
const [amount, setAmount] = useState(0)

// Loading states
const [isLoading, setIsLoading] = useState(false)
```

**2. Server State (useLiveQuery)**
```typescript
// Database queries
const accounts = useLiveQuery(() => db.accounts.toArray())
const transactions = useLiveQuery(() => 
  db.transactions
    .where('date')
    .between(startDate, endDate)
    .toArray()
)
```

**3. Derived State (useMemo)**
```typescript
// Computed values
const totalExpenses = useMemo(() => 
  transactions
    .filter(t => t.transactionType === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0),
  [transactions]
)

const spendableAmount = useMemo(() => 
  account.balance - account.thresholdValue,
  [account]
)
```

**4. Global State (Context - Minimal Use)**
```typescript
// User preferences
const ThemeContext = createContext({ theme: 'dark' })

// Auth state (future)
const AuthContext = createContext({ user: null })
```

### State Management Decision Tree

```
┌─────────────────────────────────────┐
│ Does state affect multiple          │
│ unrelated components?               │
└────────┬────────────┬───────────────┘
         │ Yes        │ No
         ▼            ▼
┌────────────┐   ┌────────────────┐
│  Context   │   │  Local State   │
│  or        │   │  (useState)    │
│  Zustand   │   └────────────────┘
└────────────┘
```

---

## API DESIGN

### CSV Backend API

**Base URL:** `/api/data`

#### GET - Fetch Records

```http
GET /api/data?table=accounts

Response:
{
  "data": [
    {
      "id": 1,
      "name": "HDFC Bank",
      "type": "BANK",
      "balance": 50000,
      "thresholdValue": 5000,
      ...
    }
  ]
}
```

#### POST - Create/Update/Delete

```http
POST /api/data
Content-Type: application/json

// Create
{
  "table": "accounts",
  "action": "add",
  "data": {
    "name": "New Account",
    "type": "BANK",
    ...
  }
}

// Update
{
  "table": "accounts",
  "action": "update",
  "data": {
    "id": 1,
    "balance": 55000
  }
}

// Delete
{
  "table": "accounts",
  "action": "delete",
  "data": {
    "id": 1
  }
}

Response:
{
  "success": true,
  "message": "Account created",
  "data": { "id": 1, ... }
}
```

#### DELETE - Clear Table

```http
DELETE /api/data?table=accounts

Response:
{
  "success": true,
  "message": "All accounts cleared"
}
```

---

## SECURITY & PRIVACY

### Privacy Principles

1. **Local-First:** All data stored in IndexedDB (user's device)
2. **No Cloud Sync:** Zero external API calls for financial data
3. **No Tracking:** No analytics, no telemetry
4. **No Ads:** Clean experience (at least for MVP)

### Data Storage

**IndexedDB:**
- Capacity: ~50MB minimum (varies by browser)
- Scope: Per-origin (https://yourdomain.com)
- Access: Only your code can access
- Persistence: Survives browser restart

**CSV Files (Optional):**
- Location: `.data/` folder on server
- Access: Only via API routes (server-side)
- Use Case: Backup, migration, multi-device sync

### Security Considerations

**Client-Side:**
- No sensitive data in LocalStorage (use IndexedDB)
- Validate all user input
- Sanitize descriptions (XSS prevention)

**Server-Side:**
- Validate CSV file paths (prevent directory traversal)
- Rate limit API endpoints
- CORS configured properly

### Backup & Export

**User Controls:**
- Export to CSV (all data)
- Import from CSV (bulk restore)
- Clear all data (nuclear option)

---

## PERFORMANCE STRATEGY

### Key Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| First Contentful Paint | < 1s | TBD | 🟡 |
| Time to Interactive | < 2s | TBD | 🟡 |
| Largest Contentful Paint | < 2.5s | TBD | 🟡 |
| Total Bundle Size | < 500KB | TBD | 🟡 |

### Optimization Techniques

**1. Code Splitting**
```typescript
// Lazy load heavy components
const ChartComponent = lazy(() => import('@/components/ChartComponent'))

// Route-based splitting (automatic in Next.js)
```

**2. Memoization**
```typescript
// Prevent unnecessary re-renders
const AccountCard = React.memo(({ account }) => { ... })

// Cache expensive calculations
const totalExpenses = useMemo(() => calculate(transactions), [transactions])
```

**3. Virtual Scrolling**
```typescript
// For lists with 1000+ items
import { VirtualList } from 'react-virtual'

<VirtualList
  items={transactions}
  height={600}
  itemHeight={60}
  renderItem={({ item }) => <TransactionCard transaction={item} />}
/>
```

**4. Database Indexing**
```typescript
// Dexie indexes for fast queries
db.version(1).stores({
  transactions: '++id, date, fromAccountId, toCategoryId'
  //                    ▲      ▲             ▲
  //                    │      │             │
  //              Primary    Indexed      Indexed
})
```

**5. Image Optimization**
```typescript
// Next.js Image component (automatic optimization)
import Image from 'next/image'

<Image
  src="/icon.png"
  width={64}
  height={64}
  alt="Account icon"
/>
```

---

## DEPLOYMENT ARCHITECTURE

### Development
```
localhost:3000 ────► Next.js Dev Server
                    ├─ Hot Module Replacement
                    ├─ Source Maps
                    └─ Debug Mode
```

### Production (Vercel)
```
vercel.app ────► Edge Network (CDN)
                 ├─ Static Assets
                 ├─ Server Functions
                 └─ API Routes

User Device ────► Browser (PWA)
                  ├─ Service Worker
                  ├─ IndexedDB
                  └─ Offline Support
```

---

## FUTURE CONSIDERATIONS

### Phase 2: ML Integration

**Architecture Addition:**
```
┌─────────────────────────────────────┐
│         ML Processing Layer         │
│  ┌───────────────────────────────┐  │
│  │    TensorFlow.js (Client)     │  │
│  │  - Pattern Detection          │  │
│  │  - Predictions                │  │
│  │  - Categorization             │  │
│  └───────────────────────────────┘  │
│               ▲                     │
│               │                     │
│        Historical Data              │
│               │                     │
│               ▼                     │
│  ┌───────────────────────────────┐  │
│  │      IndexedDB Cache          │  │
│  │  - Training Data              │  │
│  │  - Model Weights              │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Phase 3: Backend (If Needed)

**Potential Architecture:**
```
Next.js App ────► Vercel Edge Functions
                  │
                  ▼
                Supabase (PostgreSQL)
                  ├─ Real-time subscriptions
                  ├─ Row-level security
                  └─ Authentication
```

---

## CONCLUSION

This architecture provides:
- ✅ **Local-first privacy**
- ✅ **Fast performance** (IndexedDB queries < 10ms)
- ✅ **Offline capability** (PWA + IndexedDB)
- ✅ **Scalability** (handles 10,000+ transactions)
- ✅ **Maintainability** (clear separation of concerns)
- ✅ **Extensibility** (easy to add ML, backend, etc.)

---

**Next Steps:**
1. Review this architecture
2. Start implementing Phase 1 features
3. Monitor performance metrics
4. Iterate based on user feedback

---

*Last Updated: January 16, 2026*
*For feature roadmap, see FEATURE_ROADMAP.md*
*For implementation details, see CLAUDE_CODE_INSTRUCTIONS.md*
