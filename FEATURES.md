# Money Manager PWA - Feature Documentation

**Version:** 1.0 (Launch Ready)
**Last Updated:** February 24, 2026

---

## Quick Summary

Money Manager is a **local-first Progressive Web App** for personal finance tracking. All data is stored locally in IndexedDB with optional Google Drive backup. Built with Next.js 15, Dexie.js, and Tailwind CSS.

---

## Feature Matrix

### Transaction Management

| Feature | Status | Description |
|---------|:------:|-------------|
| Add Transaction | ✅ | Full-featured modal with form validation |
| Edit Transaction | ✅ | **With proper balance recalculation** (reverses old, applies new) |
| Delete Transaction | ✅ | Via swipe or action menu |
| Transaction Types | ✅ | EXPENSE, INCOME, TRANSFER |
| Note Field (Required) | ✅ | **Mandatory field with autocomplete from history** |
| Description Field | ✅ | Optional additional details |
| Date & Time | ✅ | datetime-local picker |
| Category Selection | ✅ | Filtered by transaction type (Income/Expense) |
| Safe to Spend Display | ✅ | **Shows Current Balance, Threshold, Safe Amount during expense entry** |

### Smart Input (SMS Parsing)

| Feature | Status | Description |
|---------|:------:|-------------|
| Regex Parser (Fast) | ✅ | Offline pattern matching, instant results |
| AI Parser | ✅ | Gemini → Claude → OpenAI fallback chain |
| Auto-fill Form | ✅ | Populates amount, date, merchant from SMS |
| Confidence Score | ✅ | Shows parsing accuracy % |

### Note Autocomplete

| Feature | Status | Description |
|---------|:------:|-------------|
| History-based Suggestions | ✅ | Queries all previous transaction notes |
| Type-ahead Filtering | ✅ | Filters as you type (e.g., "RS/" shows all RS/* notes) |
| Click to Select | ✅ | One-click fill from dropdown |
| Max 8 Suggestions | ✅ | Prevents UI clutter |

---

### Account Management

| Feature | Status | Description |
|---------|:------:|-------------|
| Account Types | ✅ | BANK, SAVINGS, CASH, WALLET, CREDIT, LOAN, INVESTMENT, **PERSON**, OTHER |
| Auto Balance Updates | ✅ | Balances update on every transaction |
| Threshold Values | ✅ | Minimum safe balance per account |
| Include in Net Worth | ✅ | Toggle per account |
| Liability Flag | ✅ | For proper asset/liability classification |
| Account Grouping | ✅ | Visual grouping by type |
| **PERSON Type** | ✅ | **For tracking loans & debts with people** |

### Linked Transactions (Payment on Behalf)

| Feature | Status | Description |
|---------|:------:|-------------|
| Available on Transfer | ✅ | Checkbox to create linked transaction |
| PERSON Account Selection | ✅ | Select who owes you |
| Dual Transaction Creation | ✅ | Creates Transfer + Income (receivable) |
| Balance Updates | ✅ | Both accounts updated correctly |

---

### Category System

| Feature | Status | Description |
|---------|:------:|-------------|
| Income Categories | ✅ | Separate category type |
| Expense Categories | ✅ | Separate category type |
| Sub-categories | ✅ | Parent-child hierarchy |
| Emoji Icons | ✅ | 💰 for income, 📦 for expense (customizable) |
| Auto-creation on Import | ✅ | CSV import creates missing categories |
| Settings Management | ✅ | Add/Edit/Delete in Settings |

---

### Statistics & Analytics

#### Net Worth Tracking

| Feature | Status | Description |
|---------|:------:|-------------|
| Trend Chart | ✅ | **LineChart with data point markers** |
| Current Net Worth | ✅ | Assets - Liabilities |
| Total Assets | ✅ | Sum of non-liability accounts |
| Total Liabilities | ✅ | Sum of liability accounts |
| Period Change | ✅ | Amount + percentage change |
| Historical Replay | ✅ | Calculates past balances by reversing transactions |

#### Other Charts

| Feature | Status | Description |
|---------|:------:|-------------|
| Income vs Expense | ✅ | Bar chart comparison |
| Category Composition | ✅ | Pie chart breakdown |
| Sub-Category Trend | ✅ | Line chart trends |
| Account Balance History | ✅ | Per-account timeline |

#### Period Filters

| Filter | Status |
|--------|:------:|
| Monthly | ✅ |
| Quarterly | ✅ |
| Semi-Annual | ✅ |
| Annual | ✅ |
| Custom Range | ✅ |

---

### Data Import/Export

#### CSV Import

| Feature | Status | Description |
|---------|:------:|-------------|
| Progress Indicator | ✅ | Real-time percentage (0-100%) |
| Multiple Date Formats | ✅ | dd-MM-yyyy, dd/MM/yyyy, ISO, etc. |
| Transaction Type Detection | ✅ | Expense, Income, Transfer-Out, Transfer-In |
| Auto-create Accounts | ✅ | Missing accounts created as BANK type |
| Auto-create Categories | ✅ | Missing categories created with emoji icons |
| Balance Tracking | ✅ | Accounts updated based on imports |
| Error Reporting | ✅ | Per-row error details |

#### Backup & Restore

| Feature | Status | Description |
|---------|:------:|-------------|
| JSON Export | ✅ | Full database backup |
| Google Drive Snapshots | ✅ | Point-in-time cloud backup |
| Restore from Snapshot | ✅ | Full database restore |
| Delete Snapshots | ✅ | Cleanup old backups |
| **API Not Enabled Handling** | ✅ | **Graceful warning instead of error popup** |

#### Backup Reminders

| Feature | Status | Description |
|---------|:------:|-------------|
| No Backup Warning | ✅ | **Dismissible toast with X button** |
| 7-Day Reminder | ✅ | Shows days since last backup |

---

### Settings & Configuration

| Feature | Status | Description |
|---------|:------:|-------------|
| API Keys (Gemini) | ✅ | For AI SMS parsing |
| API Keys (Claude) | ✅ | Fallback AI provider |
| API Keys (OpenAI) | ✅ | Fallback AI provider |
| Category Management | ✅ | CRUD for categories |
| Drive Snapshots Panel | ✅ | Backup management UI |

---

### Authentication

| Feature | Status | Description |
|---------|:------:|-------------|
| Google OAuth | ✅ | NextAuth v5 integration |
| Session Management | ✅ | Secure cookie-based |
| Localhost Support | ✅ | AUTH_TRUST_HOST for dev |

---

### PWA Capabilities

| Feature | Status | Description |
|---------|:------:|-------------|
| Installable | ✅ | Add to Home Screen |
| Offline Mode | ✅ | Full functionality without internet |
| Responsive Design | ✅ | Mobile-first approach |
| Dark Theme | ✅ | Default and only theme |
| Bottom Navigation | ✅ | Fixed tabs (Transactions, Accounts, Stats, Settings) |

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Database | IndexedDB via Dexie.js |
| Auth | NextAuth v5 |
| Charts | Recharts |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Icons | Lucide React |
| Notifications | react-hot-toast |

---

## Known Limitations (v1.0)

| Limitation | Notes |
|------------|-------|
| Tab Switching Lag | Web-based routing slower than native apps |
| Google Drive API Setup | Requires manual Cloud Console configuration |
| No Push Notifications | Not implemented |
| No Multi-device Sync | Local-first, manual backup required |
| No Recurring Transactions | Manual entry required |

---

## Future Roadmap (V2/V3)

| Feature | Priority | Description |
|---------|:--------:|-------------|
| Budget Planning | High | Monthly budget limits per category |
| Recurring Transactions | High | Auto-create scheduled entries |
| Multi-currency | Medium | Exchange rate support |
| Reports Export | Medium | PDF/Excel generation |
| Real-time Sync | Medium | Multi-device cloud sync |
| Push Notifications | Low | Bill payment reminders |
| Voice Input | Low | Speech-to-transaction |
| Light Theme | Low | Theme toggle option |

---

## Version History

### v1.0 - Launch (February 24, 2026)

**Core Features:**
- Full transaction management (Add/Edit/Delete)
- Balance recalculation on edit (CRITICAL fix)
- Note field required + autocomplete from history
- Safe to Spend display during expense entry
- Linked transactions for "payment on behalf"

**Account System:**
- 9 account types including PERSON for loans/debts
- Threshold-based safety indicators
- Include/Exclude from net worth toggle

**Analytics:**
- Net Worth trend with LineChart markers
- Income vs Expense comparison
- Category composition & trends
- Period filters (Monthly to Annual + Custom)

**Data Management:**
- CSV import with progress bar
- Google Drive snapshots (with graceful error handling)
- Backup reminders with dismiss button

**UX Improvements:**
- Removed MagicBox (Quick Add) from transactions
- Removed Seed Test Data button from stats
- Category icons display properly (no "tag" prefix)

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                    → Redirects to /transactions
│   ├── layout.tsx                  → Global layout + Navigation
│   ├── transactions/page.tsx       → Transaction list
│   ├── accounts/page.tsx           → Account management
│   ├── stats/page.tsx              → Analytics dashboard
│   ├── settings/page.tsx           → Settings & config
│   └── api/
│       ├── auth/[...nextauth]/     → Auth endpoints
│       └── snapshots/              → Drive backup API
├── components/
│   ├── AddTransactionModal.tsx     → Main transaction form
│   ├── AccountCard.tsx             → Account display
│   ├── AccountModal.tsx            → Account form
│   ├── Navigation.tsx              → Bottom tabs
│   ├── settings/
│   │   ├── BackupSection.tsx       → JSON backup
│   │   ├── SnapshotSection.tsx     → Drive snapshots
│   │   └── BackupReminder.tsx      → Toast reminder
│   ├── stats/
│   │   ├── NetWorth.tsx            → Net worth chart
│   │   ├── IncomeVsExpense.tsx     → Comparison chart
│   │   ├── CategoryComposition.tsx → Pie chart
│   │   └── AccountBalanceHistory.tsx
│   └── ui/                         → shadcn components
├── hooks/
│   ├── useAccount.ts               → Account CRUD
│   ├── useDateFilter.ts            → Period filtering
│   └── useSnapshots.ts             → Drive backup
├── lib/
│   ├── db.ts                       → Dexie schema
│   ├── csvImport.ts                → CSV parser
│   ├── smsParser.ts                → Regex SMS parser
│   └── llmService.ts               → AI parsing
└── types/
    └── database.ts                 → TypeScript interfaces
```

---

## Development Notes

### Critical Bug Fixes Applied:
1. **Edit Transaction Balance** - Now properly reverses old transaction before applying new
2. **Category Mapping** - Fixed `toCategoryId` → `categoryId` in CSV import
3. **Category Icons** - Changed from "tag" string to emoji icons
4. **Google Drive Error** - Silently handles "API not enabled" instead of popup

### Environment Variables Required:
```env
AUTH_TRUST_HOST=true  # For localhost production testing
NEXTAUTH_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

---

**Status: LAUNCH READY** ✅
