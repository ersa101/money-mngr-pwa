# CLAUDE.md — AI Agent Reference Guide
## Money Mngr PWA

> **Purpose:** This file is the single source of truth for AI coding agents (Claude Code, Copilot, etc.) working on this codebase. Read this before making any changes.

---

## 📌 Project Identity

| Field | Value |
|-------|-------|
| **App Name** | Money Mngr |
| **Target Users** | Gen Z — personal finance, expense tracking |
| **Framework** | Next.js 15 (App Router) |
| **Primary Storage** | IndexedDB via Dexie.js (local-first) |
| **Backup Storage** | CSV files in `.data/` folder (master database) |
| **Deployment** | Vercel |
| **Last Updated** | February 2026 |

---

## 1. Build & Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Start development server (default port 3000)
npm run dev

# Start on custom port
PORT=3001 npm run dev
```

### Build & Production

```bash
# Production build
npm run build

# Run production build locally
npm run start

# Deploy to Vercel
vercel --prod
```

### Working Directory

```
cd "c:\Users\ershr\Downloads\random codes\Money mngr\money-mngr-pwa"
```

> ⚠️ **PWA Note:** Increment `cacheId` in `next.config.js` on every deployment to avoid stale service worker cache errors (e.g., `money-mngr-v2` → `money-mngr-v3`).

---

## 2. Test Commands

```bash
# Type checking (no emit)
npx tsc --noEmit

# Lint
npm run lint

# Format (if Prettier configured)
npx prettier --write .

# Lighthouse audit (run in browser DevTools or via CLI)
npx lighthouse http://localhost:3001 --output html --output-path ./lighthouse-report.html
```3001

### Manual Testing Checklist (5-Minute Smoke Test)

```
☐ Homepage redirects to /transactions
☐ Can add 1 transaction
☐ Threshold warning appears on low balance
☐ Account balance updates in real-time
☐ /accounts page loads
☐ /stats page loads with charts
☐ Zero console errors
☐ CSV import succeeds with sample.csv
```

### Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | > 85 |
| Page load | < 3 seconds |
| Interaction response | < 100ms |
| CSV import (1,000 rows) | < 20 seconds |

---

## 3. Coding Standards

### Naming Conventions

| Pattern | Usage |
|---------|-------|
| `camelCase` | Variables, functions, hooks |
| `PascalCase` | React components, TypeScript interfaces |
| `SCREAMING_SNAKE_CASE` | Enum-like string unions (e.g., `'BANK' \| 'CASH'`) |
| `kebab-case` | File names for pages (Next.js App Router convention) |
| `use` prefix | All custom React hooks (e.g., `useAccount`, `useTransaction`) |

### File & Folder Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Root → redirects to /transactions
│   ├── layout.tsx              # Global layout + Navigation
│   ├── transactions/page.tsx   # Transaction list + filters
│   ├── accounts/page.tsx       # Account CRUD
│   ├── stats/page.tsx          # Analytics dashboard
│   └── api/data/               # CSV CRUD API routes
├── components/                 # Reusable React components
│   ├── ui/                     # Primitive UI (Shadcn Button, etc.)
│   └── stats/                  # Chart-specific components
├── hooks/                      # Custom React hooks
│   ├── useAccount.ts
│   ├── useTransaction.ts
│   └── useThreshold.ts
└── lib/
    ├── db.ts                   # Dexie schema + DB instance
    ├── csvImport.ts            # CSV parsing + import logic
    └── parseFinancialSMS.ts    # SMS parsing scaffold

.data/                          # 🗄️ MASTER CSV DATABASE (do not delete)
├── accounts.csv
├── categories.csv
└── transactions.csv
```

### TypeScript Interfaces

All core types live in `src/lib/db.ts`. Do not duplicate them elsewhere.

```typescript
interface Account {
  id?: number
  name: string
  type: 'BANK' | 'CASH' | 'WALLET' | 'INVESTMENT' | 'PERSON' | 'CREDIT'
  balance: number
  thresholdValue: number
  icon?: string
  color?: string
  group?: string              // e.g., "Primary Banking", "Digital Wallets"
}

interface Category {
  id?: number
  name: string
  parentId?: number           // null = top-level category
  type: 'EXPENSE' | 'INCOME'
  icon: string
}

interface Transaction {
  id?: number
  date: Date
  amount: number
  fromAccountId: number
  toCategoryId?: number
  toAccountId?: number        // used for transfers
  description: string
  isTransfer: boolean
  smsRaw?: string
  // CSV metadata fields (preserved for lookup fallback)
  transactionType?: string
  category?: string
  subCategory?: string
  note?: string
  csvAccount?: string
  csvCategory?: string
  csvSubcategory?: string
  csvIncomeExpense?: string
  csvDescription?: string
  csvCurrency?: string
  importedAt?: Date
}
```

### Architectural Patterns

#### 1. Local-First Data Access

All reads/writes go through Dexie (`src/lib/db.ts`). The CSV files in `.data/` are the persistent backend — IndexedDB is the runtime cache.

```typescript
// ✅ Correct: use Dexie live query
import { useLiveQuery } from 'dexie-react-hooks'
const accounts = useLiveQuery(() => db.accounts.toArray())

// ❌ Wrong: useState + manual fetch
const [accounts, setAccounts] = useState([])
```

#### 2. Centralized Display Logic

Do **not** resolve account/category names inline in components. Use or create shared hooks:

```typescript
// src/hooks/useTransactionDisplay.ts
export function useTransactionDisplay(transaction: Transaction) {
  // Returns display-ready fields: fromAccountName, categoryName, icon, etc.
  // Falls back to csvCategory/csvAccount if DB lookup fails
}
```

#### 3. Double-Entry Ledger

Every transaction must maintain balance consistency:

| Type | Balance Effect |
|------|---------------|
| Expense | `fromAccount.balance -= amount` |
| Income | `fromAccount.balance += amount` |
| Transfer-Out | `fromAccount.balance -= amount` |
| Transfer-In | `toAccount.balance += amount` |

#### 4. Threshold System

- `safeBalance = balance - thresholdValue`
- Green indicator = above threshold
- Red indicator = below threshold
- Yellow = within 10% of threshold (buffer zone)

#### 5. Styling

- **Tailwind CSS 3.x** — utility-first, no custom CSS unless unavoidable
- **Shadcn/UI** — for primitive components (Button, Dialog, etc.)
- **lucide-react** — for all icons
- **recharts** — for all charts in Stats dashboard
- Dense, information-rich layouts (mobile-first, Gen Z aesthetic)
- Bottom tab navigation — fixed, 3 routes: Transactions | Accounts | Stats

---

## 4. Error Handling

### General Pattern

```typescript
// Standard async error handling in hooks
const createAccount = async (data: Account) => {
  try {
    setLoading(true)
    const id = await db.accounts.add(data)
    return { success: true, id }
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error }
  } finally {
    setLoading(false)
  }
}
```

### CSV Import Error Handling

- **Strict validation** — reject entire file if headers are wrong
- **Partial import allowed** — valid rows import; invalid rows reported
- **Copiable error output** — display failed rows as copyable text so user can fix their CSV
- **Atomic per-row** — use Dexie transactions for consistency
- **Race condition prevention** — always `await db.categories.add()` before referencing the returned ID

```typescript
// ✅ Correct: await before using ID
const categoryId = await db.categories.add({ name, type, icon: '📦' })
await db.transactions.add({ ...txn, toCategoryId: categoryId })

// ❌ Wrong: race condition
db.categories.add({ name, type, icon: '📦' }).then(id => { ... })
```

### Service Worker Cache Errors

If users see "Content unavailable" or stale content:
1. Increment `cacheId` in `next.config.js`
2. Clear browser cache manually or force update via DevTools → Application → Service Workers → "Update on reload"
3. Rebuild and redeploy

### Delete Protection

- Accounts with existing transactions cannot be deleted
- Check `db.transactions.where('fromAccountId').equals(id).count()` before deletion
- Show descriptive error if blocked

---

## 5. Version History & Requirements

> Requirements are listed **most recent first**. Each version builds on the last.

---

### 🔴 v3 (formerly v1.5) — Bug Fixes & Core UX (Feb 2026) — **In Progress**

**Priority P0 — Critical (do first):**

- [ ] Fix service worker cache versioning — increment `cacheId` on every deploy
- [ ] Fix CSV import `categoryId` race condition — `await db.categories.add()` before reference
- [ ] Fix Stats page "Unknown" category display — fallback to `csvCategory` field

**Priority P1 — High:**

- [ ] Strict CSV template validation — reject files with wrong headers; show copiable error rows
- [ ] Date filters on Transactions page — default: grouped by day; also support weekly/monthly/quarterly/annually/all-time
- [ ] Nested sub-category dropdown — required selection when parent category has children; scrollable list

**Priority P2 — Medium:**

- [ ] Net Worth chart — add Assets (green) + Liabilities (red) lines alongside Net Worth
- [ ] Account group autocomplete — suggest existing group names from DB when editing/creating accounts

**Priority P3 — Tech Debt:**

- [ ] Centralized hooks: `useCategoryLookup`, `useAccountLookup`, `useTransactionDisplay`, `groupTransactionsByPeriod`
- [ ] Fix semi-annual/annual period date math in Stats
- [ ] Ensure PERSON account type renders correctly in all views

---

### 🟡 v2 — Advanced Features (Post v1 launch)

- [ ] **PERSON account type** — track money owed to/from individuals
  - Separate balance view for "people owe me" vs "I owe people"
  - Visual indicator distinct from BANK/CASH/WALLET
- [ ] **Linked transactions** — when paying on behalf of someone, auto-create linked expense + PERSON debit
- [ ] **Bulk editing** — select multiple transactions, apply category/date/account changes
- [ ] **Backup system:**
  - Google Sheets integration for live data sync
  - Google Drive for point-in-time snapshot backups
  - Fallback chain: local `.data/` → Google Sheets → Google Drive

---

### 🟢 v1 — MVP Launch (Jan 2026) — **Complete**

- [x] Account management (BANK, CASH, WALLET, INVESTMENT)
- [x] Transaction CRUD with double-entry ledger
- [x] CSV import (13,350+ transactions tested)
- [x] CSV progress bar (Reading → Parsing → Importing)
- [x] Stats dashboard (NetWorth, IncomeVsExpense, CategoryComposition, SubCategoryTrend)
- [x] Time filters: Daily | Weekly | Monthly | Quarterly | Annually | All-Time
- [x] Bottom tab navigation (Transactions | Accounts | Stats)
- [x] Threshold safety system (Green/Red indicators)
- [x] Real-time sync via `useLiveQuery`
- [x] Delete protection for accounts with transactions
- [x] Auto-redirect: `/` → `/transactions`
- [x] Account grouping field (UI coming in future version)
- [x] Auto-create missing accounts/categories on CSV import

---

### 🔵 v4 (formerly v2) — AI & Integrations (Future)

- [ ] SMS parsing with local LLM (WebLLM scaffold exists in `parseFinancialSMS.ts`)
- [ ] Festive/seasonal spending alerts using ML predictions
- [ ] API fallback chain: Gemini → Claude → OpenAI
- [ ] Threshold "buffer" alerts (Yellow at 10% above threshold)
- [ ] Multi-currency support
- [ ] Receipt attachments
- [ ] Recurring transactions
- [ ] Budget tracking per category
- [ ] Monthly PDF/CSV reports
- [ ] Mobile app (React Native)

---

## 6. CSV Schema Reference

### Import Format (`sample.csv` / user uploads)

```csv
Date,Account,Category,Subcategory,Note,Type,Description,Amount,Currency
24/02/2026 14:30,HDFC Bank,Food,Restaurant,Lunch,Expense,Swiggy order,250.00,INR
24/02/2026 10:00,SBI,Salary,,February salary,Income,Monthly salary,50000.00,INR
23/02/2026 18:00,HDFC Bank,DB Acc,,Transfer,Transfer-Out,,5000.00,INR
23/02/2026 18:00,DB Acc,HDFC Bank,,Transfer,Transfer-In,,5000.00,INR
```

### Column Rules

| Column | Required | Format | Notes |
|--------|----------|--------|-------|
| Date | ✅ | `dd/MM/yyyy HH:mm:ss` or ISO | Time optional |
| Account | ✅ | Text | Auto-created if missing |
| Category | ✅* | Text | *Required for Expense/Income |
| Subcategory | ❌ | Text | Optional; must exist under Category |
| Note | ✅ | Text | — |
| Type | ✅ | `Expense`, `Income`, `Transfer-Out`, `Transfer-In` | Exact match required |
| Description | ❌ | Text | Optional |
| Amount | ✅ | Positive decimal | Never negative |
| Currency | ❌ | Text | Default: INR |

### Master Database Files (`.data/`)

```
accounts.csv:     id,name,type,balance,thresholdValue,color,icon,group
categories.csv:   id,name,parentId,type,icon
transactions.csv: id,date,amount,fromAccountId,toCategoryId,toAccountId,
                  description,isTransfer,smsRaw,transactionType,category,
                  subCategory,note,csvAccount,csvCategory,csvSubcategory,
                  csvIncomeExpense,csvDescription,csvCurrency,importedAt
```

---

## 7. Known Issues & Gotchas

| Issue | Location | Workaround |
|-------|----------|------------|
| Category "Unknown" in Stats | `csvImport.ts` | Fallback to `csvCategory` field |
| Service worker stale cache | `next.config.js` | Increment `cacheId` on each deploy |
| Sub-category dropdown missing | `AddTransactionModal.tsx` | Sub-categories filtered out in current code |
| Net Worth chart missing lines | `stats/NetWorth.tsx` | Only one `<Line>` component rendered |
| Semi-annual/annual date math | `stats/page.tsx` | Audit period calculation logic |
| PERSON account type | Multiple components | May not render correctly everywhere |

---

## 8. Dependencies

```json
{
  "next": "15.x",
  "react": "19.x",
  "dexie": "4.0.7",
  "dexie-react-hooks": "latest",
  "tailwindcss": "3.4.1",
  "recharts": "latest",
  "lucide-react": "latest",
  "next-pwa": "latest"
}
```

> ⚠️ React 18 vs 19 conflicts were a known issue during setup. If reinstalling, check peer dependencies carefully.

---

## 9. Agent Instructions

When working on this codebase as an AI agent:

1. **Read this file first.** Do not make assumptions about architecture.
2. **Never break the double-entry ledger.** Balance updates are non-negotiable.
3. **Prefer `useLiveQuery` over `useState` for DB data.** Real-time sync is a core feature.
4. **Centralize display logic.** If resolving a name (account, category), check if a shared hook exists.
5. **Fix P0 before P1.** Order matters — stale cache and race conditions mask other bugs.
6. **Test CSV import with `sample.csv`.** It has 13,350+ rows and covers all edge cases.
7. **Never delete `.data/` files.** They are the master database.
8. **Increment `cacheId` in `next.config.js` after any breaking change.**
9. **Keep TypeScript interfaces in `src/lib/db.ts`.** Do not scatter type definitions.
10. **Validate strictly on CSV import.** Flexible parsing causes data integrity issues downstream.

---

*Generated: March 2026 | App Version: 0.1.0 | Maintained by: informalai*
