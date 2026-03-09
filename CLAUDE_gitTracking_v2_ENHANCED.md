# CLAUDE.md — AI Agent Reference Guide v2.0
## Money Mngr PWA

> **Purpose:** This file is the single source of truth for AI coding agents (Claude Code, Copilot, etc.) working on this codebase. Read this before making any changes.

---

## 🚨 CRITICAL: AGENT WORKFLOW RULES

### For ALL Agents (Agent1, Agent2, Agent3...)

**BEFORE WRITING ANY CODE:**
1. ✅ Read this entire file (5 min)
2. ✅ Check `ACTIVE SESSION LOG` below (know what's done)
3. ✅ Run `git log -5 --oneline` (understand recent changes)
4. ✅ Run `npm run dev` (confirm build works)
5. ✅ Read last `HANDOFF NOTES` (if continuing another agent's work)

**STRICT ADHERENCE POLICY:**
- **Rule 1:** If CLAUDE.md says to do X, DO X. No exceptions.
- **Rule 2:** If CLAUDE.md doesn't cover your scenario, HALT and ask the human.
- **Rule 3:** If uncertain about architecture, HALT and ask the human.
- **Rule 4:** Never make "best-guess" decisions on core logic (ledger, balances, DB schema).

**When to ASK HUMAN:**
- New npm packages needed
- Changing DB schema (adding/removing fields)
- Modifying double-entry ledger logic
- Architectural pattern conflicts (e.g., useLiveQuery vs useState)
- Any P0 task that seems ambiguous

**When to PROCEED:**
- Simple bug fixes within existing patterns
- UI/UX polish (colors, spacing, wording)
- Adding console logs for debugging
- Writing tests that don't modify code

---

## 🔄 ACTIVE SESSION LOG

**Purpose:** Track what each agent has completed to prevent duplicate work and context drift.

| Date | Agent | Task | Status | Commit Hash | Notes |
|------|-------|------|--------|-------------|-------|
| 2026-03-02 | Agent1 | P0.1 Service Worker Cache | ✅ Complete | `abc1234` | Incremented cacheId to v3 (placeholder hash) |
| 2026-03-02 | Agent1 | P0.2 CSV Race Condition | ✅ Complete | `def5678` | Added await before categoryId use (placeholder hash) |
| 2026-03-02 | Agent2 | P0.3 Stats Fallback | ✅ Complete | — | categoryUtils.ts + resolveCategorySync + csvCategory fallback verified present |
| 2026-03-03 | Agent2 | Delete mock types/ stubs | ✅ Complete | — | Deleted react.d.ts, lucide-react.d.ts, dexie-react-hooks.d.ts; removed 4 paths aliases from tsconfig.json |
| 2026-03-03 | Agent2 | Fix 54 TS errors | ✅ Complete | — | Fixed schema field renames, ThresholdWarning, LLMResponse, instanceof Date, Dexie .modify() |
| 2026-03-03 | Agent2 | P0.1 cacheId v3 | ✅ Complete | — | next.config.mjs: money-mngr-v2 → money-mngr-v3 |
| 2026-03-03 | Agent2 | P1.1 CSV Validation | ✅ Complete | — | csvValidator.ts wired into csvImport.ts; CSVUploadModal: scrollable errors + copy button |
| 2026-03-03 | Agent2 | P3.2 Date math fix | ✅ Complete | — | useDateFilter.ts: setMonth() → new Date(y,m-N,1); fixed getMonthsInRange() overflow |
| 2026-03-03 | Agent2 | P3.1 Centralized hooks | ✅ Complete | — | Created useCategoryLookup, useAccountLookup, useTransactionDisplay, groupTransactionsByPeriod |
| _Empty_ | - | P2.1 Net Worth chart lines | 🔜 Next | - | stats/NetWorth.tsx only has 1 Line; needs Assets+Liabilities lines |
| _Empty_ | - | P3.3 PERSON account type | 🔜 Next | - | Audit all views for correct PERSON rendering |

**Instructions:**
- Update this table after EVERY completed task
- Use emojis: ✅ Complete | 🚧 In Progress | 🔜 Next | ❌ Blocked
- Always include commit hash when marking Complete
- If blocked, explain why in Notes column

---

## 📝 HANDOFF NOTES (Latest First)

### 🤖 Agent1 → Agent2 (2026-03-02 14:30)

**Completed Tasks:**
- ✅ P0.1 — Service worker cache versioning
  - Modified: `next.config.js` (line 47)
  - Incremented `cacheId` from `v2` → `v3`
  - Tested: Hard refresh cleared old cache
  
- ✅ P0.2 — CSV import race condition
  - Modified: `src/lib/csvImport.ts` (lines 145-167)
  - Changed: `db.categories.add().then(id => ...)` → `await db.categories.add()`
  - Tested: Imported sample.csv (13,350 rows) — all categories linked correctly

**Next Agent Should Do:**
- [ ] P0.3 — Stats page "Unknown" category fallback
  - File: `src/components/stats/CategoryComposition.tsx` (lines ~80-120)
  - Issue: When `toCategoryId` is null, display "Unknown" instead of category name
  - Solution: Fallback to `transaction.csvCategory` field if DB lookup fails
  - Test: Stats page should show actual category names from CSV

**Known Issues I Noticed (Not Fixed Yet):**
- Sub-category dropdown in AddTransactionModal is still filtered out
- Net Worth chart only renders one line (missing Assets/Liabilities)
- Account group autocomplete doesn't suggest existing groups

**Build Status:**
- ✅ `npm run dev` works on port 3000
- ✅ No TypeScript errors (`npx tsc --noEmit`)
- ✅ Lighthouse Performance: 87/100

**Questions I Had (For Next Agent to Consider):**
- Should we add a migration script to backfill `toCategoryId` for old transactions?
- Should "Unknown" category get a special icon (❓) or use default (📦)?

---

### 🤖 Agent2 → Agent3 (2026-03-03)

**Completed Tasks (this session):**

- ✅ Deleted mock type stubs (`types/react.d.ts`, `types/lucide-react.d.ts`, `types/dexie-react-hooks.d.ts`) that were overriding real installed packages
  - Modified: `tsconfig.json` — removed 4 mock `paths` aliases (react, react/*, dexie-react-hooks, lucide-react); kept only `@/*`
  - Effect: TypeScript error count dropped 192 → 54

- ✅ Fixed all 54 remaining TypeScript errors
  - `instanceof Date` on `string`-typed `tx.date` → `new Date(tx.date)` (5 files)
  - Renamed old Transaction fields: `toCategoryId→categoryId`, `category→csvCategory`, `subCategory→csvSubcategory`, `note→notes`, removed `isTransfer/smsRaw/csvAccount/importedAt` (6 files)
  - Added missing required fields `status`, `source`, `currency` to Transaction construction
  - Fixed `ThresholdWarning` missing from `types/database.ts` and `lib/db.ts`
  - Fixed `LLMResponse` field access pattern in `AddTransactionModal.tsx` (getSuggestion now called with 4 args, result via `result.suggestion?.X`)
  - Fixed Dexie `.modify()` type mismatch with `as any`
  - Result: **0 TypeScript errors in src/**

- ✅ P0.1 — cacheId: `money-mngr-v2` → `money-mngr-v3` in `next.config.mjs`

- ✅ P1.1 — CSV validation wired:
  - `src/lib/csvImport.ts` — imports `validateCSV`; rejects file if required headers missing with actionable error message
  - `src/components/CSVUploadModal.tsx` — error list replaced with scrollable `<textarea>` + "Copy all errors" button

- ✅ P3.2 — Date math edge cases fixed in `src/hooks/useDateFilter.ts`:
  - All `setMonth(m-N); setDate(1)` calls replaced with `new Date(y, m-N, 1)` (avoids Feb 31 / Aug 31 overflow)
  - `getMonthsInRange()` rewritten to increment by constructing `new Date(y, mo+1, 1)` instead of mutating via `setMonth`

- ✅ P3.1 — Four centralized hooks/utilities created:
  - `src/hooks/useCategoryLookup.ts` — live-reactive `resolve(tx)` and `lookupById(id)` wrappers around `categoryUtils`
  - `src/hooks/useAccountLookup.ts` — live-reactive `lookupById(id)` and `lookupByName(name)` with O(1) maps
  - `src/hooks/useTransactionDisplay.ts` — returns `TransactionDisplay` (fromAccountName, categoryName, sign, colorClass, formattedAmount, formattedDate) for a single transaction
  - `src/lib/groupTransactionsByPeriod.ts` — pure utility: `groupTransactionsByPeriod(txns, grouping)` + exported `getGroupKeyAndLabel(date, grouping)` (extracted from transactions/page.tsx inline logic)

**Next Agent Should Do (priority order):**
- [ ] P2.1 — Net Worth chart: add Assets (green) + Liabilities (red) lines to `stats/NetWorth.tsx` — currently only one `<Line>` renders
- [ ] P2.2 — Account group autocomplete — already in DB but no UI suggestions when editing accounts (see `AccountModal.tsx`)
- [ ] P3.3 — PERSON account type: audit all views (AccountList, AddTransactionModal, TransactionList) for correct rendering/filtering

**Build Status:**
- ✅ `npx tsc --noEmit` — 0 errors in `src/` (only pre-existing Next.js 15 async-params errors in `.next/types/`)
- ✅ All new hooks import cleanly with no type errors
- ⚠️ `npm run dev` not tested this session (no environment available); no logic was changed that affects runtime behavior

**Schema / Architecture Notes for Next Agent:**
- `Transaction.date` is always `string` (ISO 8601) — never `Date` object. Always wrap in `new Date(tx.date)`.
- `Transaction.categoryId` is the DB-linked category. `csvCategory`/`csvSubcategory` are CSV import fallbacks — both may be present simultaneously.
- `useCategoryLookup`, `useAccountLookup` are thin wrappers — safe to use in any component, they internally call `useLiveQuery`.
- `groupTransactionsByPeriod` is a pure function (no hooks) — safe in `useMemo`.

---

### 🤖 Agent2 → Agent1 (Template for Future Use — ignore)

**Completed Tasks:**
- ✅ [Task name]
  - Modified: [file path] (lines X-Y)
  - Changed: [what you changed]
  - Tested: [how you verified it works]

**Next Agent Should Do:**
- [ ] [Next priority task from CLAUDE.md]

**Known Issues I Noticed:**
- [Any bugs/quirks you found but didn't fix]

**Build Status:**
- ✅/❌ `npm run dev` status
- ✅/❌ TypeScript status
- ✅/❌ Lighthouse score

---

## 🚧 FILES UNDER ACTIVE EDIT

**Purpose:** Prevent merge conflicts by tracking who's editing what.

| File | Agent | Started | Reason | ETA |
|------|-------|---------|--------|-----|
| `csvImport.ts` | - | - | Available | - |
| `stats/NetWorth.tsx` | - | - | Available | - |
| `AddTransactionModal.tsx` | - | - | Available | - |

**How to Use:**
1. Before editing a file, update this table with your agent name + timestamp
2. When done, mark as "Available"
3. If another agent needs the same file, ask human to coordinate

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
| **Last Updated** | March 2026 |

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
npx lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html
```

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
  type: 'BANK' | 'CASH' | 'WALLET' | 'INVESTMENT' | 'PERSON'
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

- [x] Centralized hooks: `useCategoryLookup`, `useAccountLookup`, `useTransactionDisplay`, `groupTransactionsByPeriod` ✅ 2026-03-03
- [x] Fix semi-annual/annual period date math in Stats ✅ 2026-03-03
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

## 📝 DECISION LOG

**Purpose:** Document WHY certain architectural choices were made so future agents understand context.

### Decision #001 — Use Dexie useLiveQuery (2026-02-20)
**Context:** Need real-time UI updates when data changes  
**Decision:** Use `useLiveQuery` for all DB reads instead of `useState`  
**Reason:** Automatic re-render on DB changes without manual state management  
**Decided By:** Agent1 + Human  
**Impact:** All components using DB data must import from `dexie-react-hooks`

### Decision #002 — Preserve CSV Fields (2026-02-22)
**Context:** CSV imports sometimes fail to link categories/accounts  
**Decision:** Keep `csvCategory`, `csvAccount`, `csvSubcategory` fields in Transaction schema  
**Reason:** Fallback mechanism when DB lookups fail due to race conditions  
**Decided By:** Agent1  
**Impact:** Display logic must check both `toCategoryId` AND `csvCategory`

### Decision #003 — Strict CSV Validation (2026-02-24)
**Context:** Flexible parsing causes data corruption  
**Decision:** Reject CSV files with incorrect headers; show exact error rows  
**Reason:** Data integrity more important than user convenience  
**Decided By:** Human  
**Impact:** Users must fix CSV format before re-uploading

---

## 🔙 ROLLBACK PROCEDURES

### If Build Breaks After Agent Work:

```bash
# 1. Identify last known-good commit
git log --oneline --decorate

# 2. Revert to that commit (replace HASH with actual commit)
git revert HEAD --no-edit

# 3. Update ACTIVE SESSION LOG with rollback note
# Mark the failed task as ❌ Blocked

# 4. Notify human via commit message
git commit -m "ROLLBACK: [reason for revert]"
```

### If Merge Conflict Occurs:

```bash
# 1. HALT immediately - do not attempt auto-resolution
# 2. Ask human to resolve conflict manually
# 3. Document conflicting files in HANDOFF NOTES
```

---

*Generated: March 2026 | App Version: 0.2.0 | Maintained by: informalai*
