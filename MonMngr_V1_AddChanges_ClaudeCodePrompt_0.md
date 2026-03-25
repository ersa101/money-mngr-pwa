# Money Manager PWA — V1 Additive Changes Log
**Session Dates:** 2026-03-24 · 2026-03-25
**Objective:** Complete record of all code, logic, flow, and system changes made after the initial V1.0 release (`6efa7f6`). Used as a benchmark when beginning V2 development to prevent regression and misalignment.

---

## Table of Contents
1. [CSV Import Fixes](#1-csv-import-fixes)
2. [Google Sheets Backup — Column Headers](#2-google-sheets-backup--column-headers)
3. [Google Sheets Backup — Category Names in Transactions](#3-google-sheets-backup--category-names-in-transactions)
4. [Restore — userId Fallback Logic](#4-restore--userid-fallback-logic)
5. [Transaction List — Subcategory Display](#5-transaction-list--subcategory-display)
6. [Edit Transaction — Description Field Regression Fix](#6-edit-transaction--description-field-regression-fix)
7. [Note Field — Made Optional](#7-note-field--made-optional)
8. [Button Contrast Fixes](#8-button-contrast-fixes)
9. [Stats Page — Category Composition Charts Split](#9-stats-page--category-composition-charts-split)
10. [Search Bar — Autocomplete Suggestions](#10-search-bar--autocomplete-suggestions)
11. [.gitignore — Credential File Protection](#11-gitignore--credential-file-protection)
12. [Filter Presets Feature (Full Implementation)](#12-filter-presets-feature-full-implementation)
13. [Stats Page — Post-V1 Chart Enhancements](#13-stats-page--post-v1-chart-enhancements)
14. [Accounts Page — Table-only View](#14-accounts-page--table-only-view)

---

## 1. CSV Import Fixes

**File:** `src/lib/csvImport.ts`

### 1a. Note / Description field priority (strict 1-to-1 mapping)
**Problem:** CSV columns `Note` and `Description` were being merged or prioritised incorrectly. User requirement: CSV column `Note` → DB field `description`; CSV column `Description` → DB field `notes`. Both fields must always be stored independently, even if empty.

**Before:**
```ts
description: row.description || row.note || undefined,
```

**After:**
```ts
description: row.note || undefined,         // CSV "Note" → DB description
notes: row.description || undefined,        // CSV "Description" → DB notes
```

### 1b. Zero-amount rows no longer skipped
**Problem:** Rows with `amount = 0` were silently dropped via an explicit `if (amount === 0) continue` guard.

**Change:** Removed the `if (amount === 0) continue` line entirely.

### 1c. Blank-amount rows accepted
**Problem:** The CSV parser required `row.amount` to be truthy before adding a row to the queue, so rows with no amount column at all were ignored.

**Before:**
```ts
if (row.date && row.amount) { rows.push(row) }
```

**After:**
```ts
if (row.date) { rows.push(row) }
```
Amount now defaults to `0` if blank: `const amount = parseFloat(row.amount || '0')`.

### 1d. Negative-amount guard retained
Rows where the parsed amount is negative (`amount < 0`) are still rejected with an error message. Only `NaN` and negative values are invalid.

---

## 2. Google Sheets Backup — Column Headers

**File:** `src/lib/googleSheets.ts`

**Problem:** All three sheets (accounts, categories, transactions) had no header row — row 1 was blank, making the spreadsheet unreadable for developers.

**Changes:**
- Added `DISPLAY_HEADERS` constant: a mapping from internal field keys to human-readable labels (e.g., `description → "Note"`, `notes → "Description"`, `fromAccountId → "From Account ID"`).
- Added `writeHeaderRow(sheetName, headers)` function that writes display labels to `A1` of the given sheet on every backup run.
- Modified `backupToSheets` to call `writeHeaderRow` for each sheet before writing data rows.
- Data rows continue to start at `A2`.

**Key note for V2:** The header row is cosmetic only. The restore logic reads from `A2:Z` and uses the `SHEETS_CONFIG.headers` field key array — never the display labels in row 1.

---

## 3. Google Sheets Backup — Category Names in Transactions

**File:** `src/lib/googleSheets.ts`

**Problem:** Transactions sheet stored `categoryId` and `subCategoryId` as numeric IDs, making it unreadable without cross-referencing the categories sheet.

**Change:** Two virtual columns `categoryName` and `subCategoryName` appended to the transactions sheet headers:
```ts
headers: [..., 'categoryName', 'subCategoryName']
```
These are populated during backup by building a `Map<id, name>` from `data.categories` and enriching each transaction object before serialization.

**Important:** These columns are write-only for human readability. Restore logic does not use them to re-populate `categoryId` — it uses the numeric ID columns directly.

---

## 4. Restore — userId Fallback Logic

**Files:** `src/lib/googleSheets.ts`, `src/app/api/backup/route.ts`, `src/app/api/restore/route.ts`

**Problem:** After browser cache clear or on a new device, the `token.sub` (Google sub) used as userId during original backup could differ from the session userId available at restore time, causing restore to find 0 rows.

**Changes:**

`restoreFromSheets` signature changed from:
```ts
restoreFromSheets(userId: string): Promise<BackupData>
```
to:
```ts
restoreFromSheets(userIdCandidates: string[]): Promise<BackupData>
```
It tries each candidate in order until matching rows are found.

**3-tier fallback logic:**
1. Try `session.user.email` (primary — stable across devices)
2. Try `session.user.id` / `token.sub`
3. Last resort: if only one unique userId exists in the sheet (personal spreadsheet), use all rows regardless of userId column value

`/api/backup/route.ts`: switched to use email as the primary userId:
```ts
const userId = session.user.email || session.user.id
```

`/api/restore/route.ts`: passes both candidates:
```ts
[session.user.email, session.user.id].filter(Boolean)
```

---

## 5. Transaction List — Subcategory Display

**File:** `src/components/TransactionCard.tsx`

**Problem:** Only the top-level category name was shown on transaction cards. Subcategory was invisible.

**Change:** Added `subCategory` useMemo lookup. Display changed from:
```
{category?.name}
```
to:
```
{category?.name}{subCategory ? ` > ${subCategory.name}` : ''}
```

---

## 6. Edit Transaction — Description Field Regression Fix

**File:** `src/components/AddTransactionModal.tsx`

**Problem:** When opening the edit modal for an existing transaction, the "Note" (description/notes) field was always blank regardless of the saved value.

**Root cause:** `setDescription('')` was hardcoded in the edit initialisation block.

**Fix:**
```ts
// Before
setDescription('')

// After
setDescription(editTransaction.notes || '')
```

**Field mapping reminder (important for V2):**
- UI label "Note" → DB field `description` (primary note, entered by user)
- DB field `notes` → stores the CSV "Description" column value for imported transactions
- Both fields coexist independently in the DB and backup

---

## 7. Note Field — Made Optional

**File:** `src/components/AddTransactionModal.tsx`

**Change:** The "Note" input field is no longer required for manual transaction entry.
- Removed `!note.trim()` from form validation
- Label changed from `"Note *"` to `"Note"`
- Value stored as `description: note.trim() || undefined` (empty string → undefined, not stored)

---

## 8. Button Contrast Fixes

**Root cause:** `shadcn/ui Button` with `variant="outline"` applies `bg-background` which resolves to `#ffffff` (white) because the app does not set the `.dark` class on `<html>` — the Tailwind dark mode class-strategy is unused. This made outline buttons invisible (white text on white background) throughout the dark UI.

**Fix pattern applied across all affected components:** Override with explicit dark classes via `className` prop (Tailwind-merge ensures they win over the variant defaults).

**Standard overrides used:**
- Neutral/cancel buttons: `bg-slate-700 text-white border-slate-500 hover:bg-slate-600`
- Destructive/delete buttons: `bg-slate-700 text-red-400 border-red-500/50 hover:bg-red-500/20`
- Account modal cancel: `bg-muted text-foreground hover:bg-muted/80`

**Files fixed:**
| File | Button | Fix Applied |
|------|--------|-------------|
| `AddTransactionModal.tsx` | Copy, Cancel, Delete, Parse (Fast), Parse with AI | Explicit slate overrides |
| `settings/BackupSection.tsx` | Restore | `bg-slate-700 text-white border-slate-500 hover:bg-slate-600` |
| `transactions/BulkDeleteDialog.tsx` | Cancel | `border-slate-500 bg-slate-700 text-white hover:bg-slate-600` |
| `transactions/BulkEditModal.tsx` | Cancel | `border-slate-500 bg-slate-700 text-white hover:bg-slate-600` |
| `transactions/TransactionList.tsx` | Bulk Edit, Bulk Delete | Explicit slate overrides |
| `AccountModal.tsx` | Cancel | `bg-muted text-foreground hover:bg-muted/80` |
| `DeleteConfirmDialog.tsx` | Cancel | `bg-muted text-foreground hover:bg-muted/80` |
| `settings/SnapshotSection.tsx` | Entire card — missing dark wrapper | Wrapped return in `<div className="rounded-lg border border-slate-700 bg-slate-900 p-6">` |
| `settings/BackupSection.tsx` | Semi-transparent `bg-slate-800/50` blended with white page → washed-out text | Changed to solid `bg-slate-800` |

**V2 note:** If a proper dark-mode class strategy is added to `<html>` in V2, these overrides should be re-evaluated to avoid double-application.

---

## 9. Stats Page — Category Composition Charts Split

**Files:** `src/components/stats/CategoryComposition.tsx`, `src/app/stats/page.tsx`

**Change:** The single `<CategoryComposition>` chart (with an Expense/Income toggle) was replaced by two side-by-side charts:
- Left: Expense Composition (fixed, no toggle)
- Right: Income Composition (fixed, no toggle)

`CategoryComposition.tsx` received an optional `type?: 'EXPENSE' | 'INCOME'` prop:
- When provided: hides the internal toggle, titles the chart accordingly
- When omitted: original toggle behaviour preserved (backwards compatible)

`stats/page.tsx`:
```tsx
// Before
<CategoryComposition />

// After
<div className="grid grid-cols-2 gap-4">
  <CategoryComposition type="EXPENSE" />
  <CategoryComposition type="INCOME" />
</div>
```

`SubCategoryTrend` chart moved to full-width row below the two composition charts.

**Post-split addition:** `CategoryComposition` received `onCategoryClick?: (name: string) => void`. Fired on both pie slice click and list card click. Used by `stats/page.tsx` to drive the CategoryTrend chart (see §13).

---

## 10. Search Bar — Autocomplete Suggestions

**File:** `src/app/transactions/page.tsx`

**Change:** The search input in the transactions page now shows autocomplete suggestions drawn from existing transaction data.

**Logic:**
- `allNoteValues` useMemo pools both `description` and `notes` fields from all transactions (covers both manual entries and CSV imports)
- `handleSearchChange` filters this pool on each keystroke, returns up to 8 matches
- Dropdown appears below the search input with `onMouseDown` selection (prevents `onBlur` race)
- `onBlur` with 200ms delay to allow suggestion click to register

**Why both fields are pooled:** CSV-imported transactions store their "Description" column in the `notes` field, not `description`. Pooling ensures imported data is searchable by its original column value.

---

## 11. .gitignore — Credential File Protection

**File:** `.gitignore`

**Added entries:**
```
*googleproject*.json    # catches moneymngr-googleprojectMASTERapi.json
*.xlsx
*.docx
```

**Context:** The file `moneymngr-googleprojectMASTERapi.json` contains Google OAuth credentials and was not matched by the existing `.gitignore` pattern.

---

## 12. Filter Presets Feature (Full Implementation)

This is the largest addition in this session. Filter presets allow users to save named combinations of search text, date range, account, type, category, and amount filters for one-tap reuse.

### 12a. New Type — FilterPreset

**File:** `src/types/database.ts`

```ts
export interface FilterPreset {
  id?: number;
  name: string;
  searchText?: string;
  accountId?: number;
  transactionType?: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'all';
  categoryId?: number;
  subCategoryId?: number;
  dateOffsetType?: string;  // 'custom' | 'billing-26-25-0' | 'billing-26-25-1'
  dateOffsetStart?: string; // ISO date — used when dateOffsetType === 'custom'
  dateOffsetEnd?: string;   // ISO date — used when dateOffsetType === 'custom'
  amountMin?: number;
  amountMax?: number;
  createdAt?: string;
}
```

**`dateOffsetType` values:**
- `'custom'` — fixed date range; actual dates stored in `dateOffsetStart` / `dateOffsetEnd`
- `'billing-NN-MM-O'` — recurring billing cycle where NN = startDay, MM = endDay, O = offset (0 = current cycle, 1 = previous cycle). Example: `'billing-26-25-0'` = 26th→25th current; `'billing-26-25-1'` = 26th→25th previous. Actual dates computed fresh at apply-time via `computeBillingDates()`. Nothing stored in `dateOffsetStart/End` for this type.
- **Backward-compat:** Old format `'billing-NN-MM'` (no offset suffix) is still parsed correctly — treated as offset=0 (current cycle).

### 12b. Dexie Schema — Version 4

**File:** `src/lib/db.ts`

```ts
filterPresets!: Table<FilterPreset>;

// v4: Add filterPresets table
this.version(4).stores({
  filterPresets: '++id, name',
});
```

Existing data in versions 1–3 is unaffected; Dexie handles the migration automatically.

### 12c. Google Sheets Backup — 4th Sheet

**File:** `src/lib/googleSheets.ts`

Added `filterPresets` as the 4th entry in `SHEETS_CONFIG`:
```ts
{
  name: 'filterPresets',
  headers: ['userId','id','name','searchText','accountId','transactionType',
            'categoryId','subCategoryId','dateOffsetType','dateOffsetStart',
            'dateOffsetEnd','amountMin','amountMax','createdAt'],
}
```

Added display headers for all new fields (`searchText → "Search Text"`, `dateOffsetType → "Date Offset Type"`, etc.).

**`amountMin` / `amountMax` deserialization fix:** These must stay `undefined` when the cell is blank (not default to `0`, as `amountMax: 0` would filter out all transactions). Custom branch added in `deserializeRow`:
```ts
else if (['amountMin', 'amountMax'].includes(header)) {
  value = value ? parseFloat(value) : undefined;
}
```

`BackupData` interface updated:
```ts
interface BackupData {
  accounts: any[];
  categories: any[];
  transactions: any[];
  filterPresets: any[];   // ← added
}
```

### 12d. GSheet Backup / Restore

**File:** `src/hooks/useBackup.ts`

- Backup: `filterPresets` fetched from DB and included in POST body
- Restore total record count includes `filterPresets.length`
- Restore Dexie transaction scope includes `db.filterPresets`; clears and bulk-adds on restore
- `restoreFromSheets` result initialised with `filterPresets: []`

### 12e. GDrive Snapshot Backup / Restore

**File:** `src/hooks/useSnapshots.ts`

Same changes as `useBackup.ts` — `filterPresets` included in snapshot create payload and restored in the Dexie transaction on snapshot restore.

### 12f. SaveFilterModal Component (new)

**File:** `src/components/transactions/SaveFilterModal.tsx`

Full-featured modal for creating and editing filter presets.

**Props:**
```ts
interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValues: {           // Pre-fills when creating new (from active filter state)
    searchText, accountId, transactionType,
    categoryId, subCategoryId, dateFrom, dateTo,
    amountMin, amountMax
  };
  editingPreset?: FilterPreset | null;  // When set → edit mode (overwrites by ID)
  onSaved: (preset: FilterPreset) => void;
}
```

**Additional state (beyond the form fields):**
```ts
const [isBillingCycle, setIsBillingCycle] = useState(false);
const [billingCycleOffset, setBillingCycleOffset] = useState(0); // 0 = current, 1 = previous
```

**Fields in the modal:**
1. Preset name (required, uniqueness-checked)
2. Search text
3. Transaction type pills (All / Expense / Income / Transfer)
4. Account dropdown
5. Category dropdown (top-level only)
6. SubCategory dropdown (appears only if selected category has children)
7. Date From / Date To
8. **"Repeat as billing cycle?"** checkbox — visible only when both dates are set; auto-extracts start/end day from the date inputs; stores `dateOffsetType = 'billing-NN-MM-O'` (O=offset) and omits `dateOffsetStart/End`
   - When checked, shows **"Which cycle? ● Current ○ Previous"** radio group
   - Selecting **Previous**: auto-appends `" (Prev)"` to preset name if not already present; switching back to Current auto-removes it (user can freely edit the name at any time)
   - Amber hint displayed when Previous is selected
   - Unchecking the checkbox resets offset to 0
9. Amount Min / Max

**Behaviour:**
- Create mode: pre-fills all fields from `initialValues` (current active filter state); `billingCycleOffset` resets to 0
- Edit mode: pre-fills from `editingPreset`; if billing cycle, parses offset from `billing-NN-MM-O` format (legacy `billing-NN-MM` treated as offset=0); re-computes display dates; restores `isBillingCycle=true` and the correct `billingCycleOffset`
- Duplicate name: shows toast error, blocks save
- On save: writes to `db.filterPresets`, calls `onSaved(preset)`, closes

**`handleOffsetChange(offset)` helper:**
```ts
const handleOffsetChange = (offset: number) => {
  setBillingCycleOffset(offset);
  if (offset === 1 && name && !name.includes('(Prev)')) {
    setName(name.trim() + ' (Prev)');
  } else if (offset === 0 && name.endsWith(' (Prev)')) {
    setName(name.slice(0, -7));
  }
};
```

**Exported helper:**
```ts
export function computeBillingDates(startDay: number, endDay: number, offset = 0): { from: string; to: string }
```
- `offset=0` (current): if `today <= endDay` → startDate = last month's startDay, endDate = this month's endDay; else → startDate = this month's startDay, endDate = next month's endDay
- `offset=1` (previous): same logic with each month index shifted back by 1 (one full billing cycle earlier)
- Regex for parsing stored `dateOffsetType`: `/^billing-(\d+)-(\d+)(?:-(\d+))?$/` — offset group is optional for backward compat with old `billing-NN-MM` records

### 12g. Transactions Page — Preset Integration

**File:** `src/app/transactions/page.tsx`

**State:**
```ts
const [filterSubCategory, setFilterSubCategory] = useState<string>('')
const [activePresetId, setActivePresetId] = useState<number | null>(null)
const [editingPreset, setEditingPreset] = useState<FilterPreset | null>(null)
const [showSaveModal, setShowSaveModal] = useState(false)
const [showPresetsPanel, setShowPresetsPanel] = useState(false)  // replaces old showFilters
const filterPresets = useLiveQuery(() => db?.filterPresets.toArray() ?? [], [db]) || []
```

**Functions:**

`applyPreset(preset)` — applies all preset values to active filter state:
- Parses `dateOffsetType` with regex `/^billing-(\d+)-(\d+)(?:-(\d+))?$/`; passes offset (default 0) to `computeBillingDates`
- Looks up category/subcategory names from the categories array (filter state stores names, not IDs)
- Sets all filter state fields and `activePresetId`

`deletePreset(preset)` — confirms + deletes from DB; clears `activePresetId` if the deleted preset was active

`getPresetSummary(preset)` — compact summary string; billing-cycle presets include `(Prev)` hint when offset > 0:
- e.g. `"HDFC" · Expense · HDFC Savings · Billing 26th–25th (Prev)`

`handleSearchChange` — calls `setActivePresetId(null)` so typing clears active preset indicator

`clearFilters` — clears all filter fields including `filterSubCategory` and `activePresetId`

`hasActiveFilters` — includes `filterSubCategory`

`filteredTransactions` — subcategory filter:
```ts
if (filterSubCategory) {
  const subCat = categories?.find(c => c.id === tx.subCategoryId)
  if (!subCat || subCat.name !== filterSubCategory) return false
}
```

**UI layout (collapsible filter card + external totals pills):**

The filter panel is collapsible. A chevron toggle button at the end of Row 1 expands/collapses all filter fields. A blue dot badge appears on the toggle when filters are active but the panel is collapsed. State: `const [showFilters, setShowFilters] = useState(false)`.

Layout from top to bottom:

```
── Inside filter card ──────────────────────────────────────────────
[Search input .....X]  [🔽 Filter]  [+]  [↑]  [⌄ toggle + badge]
[🔖 HDFC Billing  ✕]                     ← active preset chip (always visible inside card)
── Collapsible section (hidden when showFilters=false) ─────────────
[All] [Expense] [Income] [Transfer]       ← type pills
[Account ▼]  [Category ▼]                 ← 2-col grid
[SubCategory ▼]                           ← conditional (when category has children)
[From date]  [To date]                    ← 2-col grid
[Min amount]  [Max amount]                ← 2-col grid
[💾 Save as Filter]  [✕ Clear]           ← Save enabled only when hasActiveFilters
────────────────────────────────────────────────────────────────────
── Outside filter card (always visible when hasActiveFilters) ──────
[▲ ₹X Income] [▼ ₹Y Expense] [⇄ ₹Z Transfer] [# N txns]
  green pill      red pill        blue pill        grey pill
```

Pill styles: `bg-{color}-900/40 border border-{color}-800 rounded-xl px-4 py-2.5`, arrow + amount in `text-{color}-400 font-bold text-base`.

**Filter button (funnel icon)** — opens a **floating dropdown** (`showPresetsPanel` state) showing **only saved presets**. No filter fields inside this panel.
- Badge on button shows total count of saved presets (purple)
- Dropdown header has an X close button
- Each preset card: name + summary + Edit (✏️) + Delete (🗑️)
- Clicking a preset: applies it via `applyPreset` and closes the panel
- Empty state: "No saved filters yet. Fill in filters below and click Save."

**One-active-preset-at-a-time rule:** Applying preset B calls `applyPreset(B)` → sets all filter state + `activePresetId = B.id`. Previous active preset replaced at UI level. No DB mutation.

**Edit preset flow:**
1. User taps ✏️ on a preset card (in dropdown) → `setEditingPreset(preset); setShowSaveModal(true); setShowPresetsPanel(false)`
2. Modal opens pre-filled with preset values (billing offset restored)
3. User modifies any field → Save
4. `db.filterPresets.update(editingPreset.id, presetData)` overwrites by ID
5. `onSaved(preset)` → `applyPreset(preset)` re-applies updated preset; active indicator refreshes

---

## 13. Stats Page — Post-V1 Chart Enhancements

### 13a. Net Worth — Empty-state guard

**File:** `src/components/stats/NetWorth.tsx`

**Problem:** When all accounts had `includeInNetWorth = false`, `includedAccounts` was empty, causing the chart to render with all-zero values silently rather than showing an actionable message.

**Fix:** Added `hasIncludedAccounts` useMemo. Early return with a descriptive message directing the user to the Accounts page to enable the toggle.

### 13b. SubCategoryTrend — Granularity selector (1D / 1W / 1M)

**File:** `src/components/stats/SubCategoryTrend.tsx`

Added 1D/1W/1M granularity selector with:
- `getBucketKey(date, gran)` and `getLabel(date, gran)` helpers (same bucketing logic as NetWorth)
- `daysDiff` useMemo + `useEffect` auto-selects granularity (≤35d→1D, ≤120d→1W, else→1M)
- `dataPoints` useMemo generates `{key, label}[]` for the chosen granularity (1W aligns to Sunday)
- `subcatBuckets` Map for O(1) lookup: `Map<subCatId, Map<bucketKey, amount>>`
- Granularity selector UI matches NetWorth style (`bg-muted rounded-lg p-1`)

### 13c. CategoryTrend — New component

**File:** `src/components/stats/CategoryTrend.tsx` *(new file)*

Multi-select category trend chart, positioned on the Stats page between the two composition charts and SubCategoryTrend.

**Key design decisions:**
- No EXPENSE/INCOME tab — all categories (both types) shown as chips, grouped under **Expense** / **Income** / **Both** labels. Group labels use `bg-red-100 text-red-700` / `bg-green-100 text-green-700` / `bg-blue-100 text-blue-700`.
- `categoryTypeMap`: `Map<categoryName, 'EXPENSE'|'INCOME'|'BOTH'>` built from transaction scan — determines chip group.
- `catBuckets`: aggregates ALL expense + income transactions per category name (no type filter). `Map<name, Map<bucketKey, amount>>`.
- `colorForName(name)`: hash-based stable color so the same category always maps to the same color regardless of list order or filter state.
- `dataKeyFor(name)`: sanitises category name to safe Recharts dataKey (`cat_` + alphanumeric).
- `averageLine`: combined average across all selected categories, counted by unique bucket keys.
- `categoryClick` prop: `{ name: string; type: 'EXPENSE'|'INCOME'; _t: number }` — `_t: Date.now()` forces the useEffect to re-fire even when the same category is clicked twice consecutively.
- Auto-granularity (same daysDiff thresholds as other charts).

### 13d. Stats page — CategoryTrend wiring + sticky header

**File:** `src/app/stats/page.tsx`

- Added `categoryClick` state: `{ name: string; type: 'EXPENSE'|'INCOME'; _t: number } | null`
- Both `<CategoryComposition>` instances now receive `onCategoryClick` callbacks that set `categoryClick` with the correct type and a fresh `_t` timestamp.
- `<CategoryTrend dateRange={dateRange} categoryClick={categoryClick} />` inserted between the composition grid and `<SubCategoryTrend>`.
- Header div changed to `sticky top-0 z-20 bg-background/95 backdrop-blur-sm` so the period selector stays visible while scrolling through charts.

### 13e. Net Worth — Line / Area / Stack chart types + Y-axis fix

**File:** `src/components/stats/NetWorth.tsx`

Added `chartType: 'line' | 'area' | 'stack'` state with a toggle button group alongside the granularity selector.

| Mode | Implementation |
|------|---------------|
| **Line** | Existing LineChart. Left YAxis: Net Worth + Assets (`domain={['auto','auto']}` — fixes lines coinciding at top of 0-based scale). Right YAxis: Liabilities (secondary axis keeps it visible at scale). |
| **Area** | AreaChart with gradient fills. Same dual-axis layout. `dot={false}` for cleaner look. |
| **Stack** | BarChart with `stackId="a"`. Assets (green) + Liabilities (red) stacked. Custom `StackTooltip` shows: asset value + %, liability value + %, Net Worth = assets − liabilities. |

**Y-axis domain fix:** `domain={['auto', 'auto']}` on the left YAxis prevents the axis from anchoring at 0. When assets (~1.3M) and net worth (~1.25M) differ by only ~44K, the auto domain spreads them across the full axis height instead of squishing both into the top 3% of a 0–1.6M range.

### 13f. Income vs Expense — Line / Area / Stack chart types

**File:** `src/components/stats/IncomeVsExpense.tsx`

Same `chartType` pattern as NetWorth.

| Mode | Implementation |
|------|---------------|
| **Line** | LineChart with Income (green), Expense (red), Net (blue dashed) lines. |
| **Area** | AreaChart with gradient fills. Income + Expense overlaid — region where green exceeds red = surplus; where red exceeds green = deficit. No Net line (visually self-evident from overlap). |
| **Stack** | BarChart with `stackId="a"`. Custom `StackTooltip` shows income + %, expense + %, Net = income − expense. |

Default chart type set to `'stack'` (matches prior behaviour of grouped bars).

### 13g. CategoryTrend + SubCategoryTrend — Area-line style

**Files:** `src/components/stats/CategoryTrend.tsx`, `src/components/stats/SubCategoryTrend.tsx`

Switched from `LineChart/Line` to `AreaChart/Area` with `fillOpacity={0.12}`. Each series gets a subtle fill below its line in the same stroke color. `dot={{ r: 3 }}` replaces the larger `r: 4` dots for a cleaner look with multiple series. No chart-type toggle — the area-line style is the permanent default for these multi-series charts.

---

## 14. Accounts Page — Table-only View

**File:** `src/app/accounts/page.tsx`

**Change:** Removed the grouped collapsible/expandable panels section from the Accounts page. The page now shows only:
- Header + stats bar (Total Balance, Total Threshold, Accounts Safe)
- Full-featured flat table (sort, filter, inline cell edit, color picker, Net Worth toggle, Liability toggle, Edit/Delete actions)

**Rationale:** The grouped expandable view is identical to Settings → Accounts tab. Keeping it in both places was redundant. The Accounts page is now the edit/add interface; Settings → Accounts remains the grouped read-only overview.

**Removed from accounts/page.tsx:** `groupedByTypeAndGroup` useMemo, `expandedSections` state, `toggleSection`, `handleEditGroup`, `AccountCard` import, `AccountHeader` import, `ChevronRight` import.

**Settings → Accounts tab is unchanged.** The grouped expandable panels (by account type) remain there.

---

## Data Field Mapping Reference (Critical for V2)

| UI Label | DB Field | CSV Column | Backup Sheet Column |
|----------|----------|------------|---------------------|
| Note | `description` | `Note` | `description` (display: "Note") |
| Description | `notes` | `Description` | `notes` (display: "Description") |
| Category | `categoryId` (number) | `category` (text) → resolved | `categoryId` + `categoryName` |
| SubCategory | `subCategoryId` (number) | `subcategory` (text) → resolved | `subCategoryId` + `subCategoryName` |

---

## Dexie DB Version History

| Version | Change |
|---------|--------|
| 1 | Initial schema: accounts, categories, transactions |
| 2 | Added `linkedTransactionId` index to transactions |
| 3 | Removed unique constraint on `categories.name` |
| 4 | Added `filterPresets` table (`++id, name`) |

---

## Google Sheets Structure (Post V1 Changes)

| Tab | Data |
|-----|------|
| `accounts` | One row per account per user. Row 1 = display headers. |
| `categories` | One row per category/subcategory per user. Row 1 = display headers. |
| `transactions` | One row per transaction per user. Includes `categoryName`, `subCategoryName` virtual columns. Row 1 = display headers. |
| `filterPresets` | One row per filter preset per user. Row 1 = display headers. *(Added this session)* |

**Multi-user isolation:** Column A (`userId`) = `session.user.email` (primary). Each backup operation reads all rows, strips the calling user's rows, re-appends the user's latest data, and writes back. Other users' rows are never touched.

---

## Files Changed (Cumulative, Post V1.0 Release)

| File | Nature of Change |
|------|-----------------|
| `src/lib/csvImport.ts` | Note/Description field mapping, zero/blank amount rows |
| `src/lib/googleSheets.ts` | Header rows, category names, 4th filterPresets sheet, userId fallback, amountMin/Max deserialization |
| `src/app/api/backup/route.ts` | userId uses email as primary |
| `src/app/api/restore/route.ts` | Passes array of userId candidates |
| `src/components/TransactionCard.tsx` | SubCategory display (`Category > SubCategory`) |
| `src/components/AddTransactionModal.tsx` | Note optional, description pre-fill fix, button contrast |
| `src/components/settings/BackupSection.tsx` | Button contrast |
| `src/components/transactions/BulkDeleteDialog.tsx` | Button contrast |
| `src/components/transactions/BulkEditModal.tsx` | Button contrast |
| `src/components/transactions/TransactionList.tsx` | Button contrast |
| `src/components/AccountModal.tsx` | Button contrast |
| `src/components/DeleteConfirmDialog.tsx` | Button contrast |
| `src/components/stats/CategoryComposition.tsx` | Optional `type` prop, split chart support, `onCategoryClick` callback |
| `src/components/stats/CategoryTrend.tsx` | **New file** — multi-select category trend chart (area-line, grouped chips, pie-chart click integration) |
| `src/components/stats/SubCategoryTrend.tsx` | Added 1D/1W/1M granularity selector + area-line chart style |
| `src/components/stats/NetWorth.tsx` | Line/Area/Stack toggle, dual Y-axis, `domain=['auto','auto']` fix, hasIncludedAccounts guard |
| `src/components/stats/IncomeVsExpense.tsx` | Line/Area/Stack toggle |
| `src/app/stats/page.tsx` | CategoryTrend wiring, sticky header, onCategoryClick callbacks |
| `src/app/accounts/page.tsx` | Removed grouped collapsibles; table-only view |
| `src/app/transactions/page.tsx` | Search autocomplete, filter presets integration, subCategory filter, collapsible filter panel, totals as external pills |
| `src/components/settings/BackupSection.tsx` | Button contrast + `bg-slate-800/50` → `bg-slate-800` |
| `src/components/settings/SnapshotSection.tsx` | Added missing dark card wrapper |
| `src/types/database.ts` | `FilterPreset` interface added |
| `src/lib/db.ts` | Version 4 + `filterPresets` table |
| `src/hooks/useBackup.ts` | filterPresets in backup + restore |
| `src/hooks/useSnapshots.ts` | filterPresets in snapshot create + restore |
| `src/components/transactions/SaveFilterModal.tsx` | **New file** — preset create/edit modal |
| `.gitignore` | `*googleproject*.json`, `*.xlsx`, `*.docx` |

---

*End of V1 Additive Changes Log*
