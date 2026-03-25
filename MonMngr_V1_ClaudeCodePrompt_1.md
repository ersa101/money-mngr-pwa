# 💰 Money Mngr PWA — Complete Development Prompt for Claude Code

> **Repository:** https://github.com/ersa101/money-mngr-pwa
> **Last Updated:** January 27, 2026
> **Version:** 2.0.0 (Full Production Build)

---

## 📋 TABLE OF CONTENTS

1. Project Overview
2. Tech Stack  
3. Project Structure
4. Environment Setup
5. Database Schema (Google Sheets)
6. Authentication System
7. Core Features Implementation
8. Magic Box (SMS Parser)
9. Google Sheets Integration
10. Offline-First Architecture
11. UI Components
12. PWA Configuration
13. Deployment
14. Testing Checklist

---

## 1. PROJECT OVERVIEW

### 1.1 What We're Building

A **privacy-first personal finance Progressive Web App (PWA)** that:
- Tracks income, expenses, and transfers across multiple accounts
- Uses **Google Sheets as the primary database** (real-time sync)
- Works **offline-first** with local IndexedDB cache
- Supports **multi-user authentication** (Google OAuth + Email/Password)
- Features **Magic Box** — an SMS parser that auto-extracts transaction details
- Is **installable** on mobile and desktop from browser
- Deploys to **Vercel** for serverless hosting

### 1.2 Data Isolation

- Each user sees only THEIR data (filtered by userId)
- Admin user (product owner) can see ALL data
- Data stored in Google Sheets with userId column for isolation

---

## 2. TECH STACK

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.x | React framework with App Router |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.4.x | Styling |
| shadcn/ui | latest | UI component library |
| Google Sheets API | v4 | Primary database |
| Dexie.js | 4.x | IndexedDB wrapper for offline |
| NextAuth.js | 4.x | Authentication |
| date-fns | 3.x | Date manipulation |
| recharts | 2.x | Charts and graphs |
| lucide-react | latest | Icons |
| next-pwa | 5.x | PWA configuration |
| zod | 3.x | Schema validation |
| react-hot-toast | 2.x | Toast notifications |

---

## 3. PROJECT STRUCTURE

\`\`\`
money-mngr-pwa/
├── .env.local                    # Environment variables (DO NOT COMMIT)
├── .env.example                  # Template for env vars
├── next.config.js                # Next.js + PWA config
├── tailwind.config.ts            # Tailwind config
├── package.json                  # Dependencies
│
├── public/
│   ├── icons/                    # PWA icons (72-512px)
│   ├── manifest.json             # PWA manifest
│   └── favicon.ico
│
├── src/
│   ├── app/
│   │   ├── (auth)/               # Auth routes (login, register)
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/          # Protected routes
│   │   │   ├── transactions/page.tsx
│   │   │   ├── accounts/page.tsx
│   │   │   ├── stats/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── categories/page.tsx
│   │   │   │   ├── account-types/page.tsx
│   │   │   │   └── account-groups/page.tsx
│   │   │   ├── import/page.tsx
│   │   │   ├── export/page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── sheets/
│   │   │   │   ├── accounts/route.ts
│   │   │   │   ├── transactions/route.ts
│   │   │   │   ├── categories/route.ts
│   │   │   │   └── sync/route.ts
│   │   │   └── magic-box/route.ts
│   │   │
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn components
│   │   ├── layout/               # Navbar, BottomNav, Sidebar
│   │   ├── auth/                 # LoginForm, RegisterForm
│   │   ├── transactions/         # Transaction components
│   │   ├── accounts/             # Account components
│   │   ├── magic-box/            # Magic Box components
│   │   ├── stats/                # Chart components
│   │   ├── settings/             # Settings components
│   │   └── shared/               # Common components
│   │
│   ├── lib/
│   │   ├── google-sheets.ts      # Sheets API client
│   │   ├── auth.ts               # NextAuth config
│   │   ├── db.ts                 # Dexie/IndexedDB
│   │   ├── sync.ts               # Sync engine
│   │   ├── sms-parser.ts         # Magic Box parser
│   │   ├── csv-parser.ts         # CSV import
│   │   ├── date-utils.ts         # Date helpers
│   │   ├── currency-utils.ts     # Currency helpers
│   │   └── utils.ts              # General utils
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useAccounts.ts
│   │   ├── useTransactions.ts
│   │   ├── useCategories.ts
│   │   ├── useSync.ts
│   │   └── useOffline.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── database.ts
│   │   └── auth.ts
│   │
│   └── constants/
│       ├── index.ts
│       └── banks.ts              # Bank SMS patterns
│
└── scripts/
    └── setup-sheets.ts           # Initialize Google Sheets
\`\`\`

---

## 4. ENVIRONMENT SETUP

### 4.1 Create .env.local

\`\`\`env
# Google Sheets Backend
GOOGLE_SERVICE_ACCOUNT_EMAIL=moneymngr@moneymngr.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=1bYAXgCbiN7zFiUw2IRRJPf8vLx9oWffnh7lrTFMRU88

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-32-char-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=705047390910-gcs4k70b0833vlefcnrmeg3ln3837214.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE

# App Config
NEXT_PUBLIC_APP_NAME="Money Mngr"
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### 4.2 package.json

\`\`\`json
{
  "name": "money-mngr-pwa",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "setup-sheets": "npx ts-node scripts/setup-sheets.ts"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next-auth": "^4.24.0",
    "googleapis": "^140.0.0",
    "dexie": "^4.0.7",
    "dexie-react-hooks": "^1.1.7",
    "zod": "^3.23.0",
    "date-fns": "^3.6.0",
    "recharts": "^2.12.0",
    "lucide-react": "^0.400.0",
    "react-hot-toast": "^2.4.1",
    "bcryptjs": "^2.4.3",
    "uuid": "^9.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/uuid": "^9.0.0",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.38",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "^15.1.0",
    "next-pwa": "^5.6.0"
  }
}
\`\`\`


---

## 5. DATABASE SCHEMA (GOOGLE SHEETS)

### 5.1 Sheet Structure

The Google Spreadsheet has **7 tabs**:

| Tab Name | Description |
|----------|-------------|
| users | User accounts |
| accounts | Bank accounts, wallets |
| categories | Expense/Income categories |
| transactions | All transactions |
| accountTypes | Account type definitions |
| accountGroups | Account groupings |
| settings | User preferences |

### 5.2 Tab: users

| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| email | string | Unique email |
| name | string | Display name |
| image | string | Profile image URL |
| passwordHash | string | For email auth |
| isAdmin | boolean | Can see all data |
| createdAt | datetime | ISO 8601 |
| updatedAt | datetime | ISO 8601 |

### 5.3 Tab: accounts

| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| userId | string | Owner |
| name | string | Account name |
| typeId | string | FK to accountTypes |
| balance | number | Current balance |
| thresholdValue | number | Safety threshold |
| color | string | Hex color |
| icon | string | Icon name |
| groupId | string | FK to accountGroups |
| sortOrder | number | Display order |
| createdAt | datetime | ISO 8601 |
| updatedAt | datetime | ISO 8601 |
| deletedAt | datetime | Soft delete |

### 5.4 Tab: categories

| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| userId | string | Owner |
| name | string | Category name |
| type | string | EXPENSE or INCOME |
| parentId | string | Parent category (for subcategories) |
| icon | string | Emoji icon |
| color | string | Hex color |
| sortOrder | number | Display order |
| createdAt | datetime | ISO 8601 |
| updatedAt | datetime | ISO 8601 |
| deletedAt | datetime | Soft delete |

### 5.5 Tab: transactions

| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| userId | string | Owner |
| date | datetime | Transaction date/time |
| amount | number | Always positive |
| transactionType | string | EXPENSE, INCOME, TRANSFER |
| fromAccountId | string | Source account |
| toAccountId | string | Destination account |
| categoryId | string | Category |
| subCategoryId | string | Subcategory |
| description | string | Note |
| status | string | CONFIRMED, PENDING, REJECTED |
| source | string | MANUAL, CSV_IMPORT, MAGIC_BOX |
| currency | string | INR, USD, etc. |
| tags | string | Comma-separated |
| receiptUrl | string | Image URL |
| createdAt | datetime | ISO 8601 |
| updatedAt | datetime | ISO 8601 |
| deletedAt | datetime | Soft delete |

### 5.6 Tab: accountTypes

| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| userId | string | Owner |
| name | string | Bank, Cash, Wallet, etc. |
| icon | string | Emoji |
| isLiability | boolean | Credit cards, loans |
| sortOrder | number | Display order |
| createdAt | datetime | ISO 8601 |
| updatedAt | datetime | ISO 8601 |
| deletedAt | datetime | Soft delete |

### 5.7 Tab: accountGroups

| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| userId | string | Owner |
| name | string | Group name |
| sortOrder | number | Display order |
| createdAt | datetime | ISO 8601 |
| updatedAt | datetime | ISO 8601 |
| deletedAt | datetime | Soft delete |

### 5.8 Tab: settings

| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| userId | string | Owner |
| key | string | Setting key |
| value | string | JSON stringified value |
| updatedAt | datetime | ISO 8601 |

**Common settings keys:**
- theme: "dark" | "light" | "system"
- currency: "INR" | "USD" | etc.
- dateFormat: "DD/MM/YYYY"
- timeFormat: "24h" | "12h"
- numberFormat: "international" | "indian"


---

## 6. AUTHENTICATION SYSTEM

### 6.1 NextAuth Configuration

**File: src/lib/auth.ts**

- Use GoogleProvider for OAuth
- Use CredentialsProvider for email/password
- On Google sign-in, check if user exists in sheets, create if not
- Session includes userId and isAdmin flag
- JWT strategy with 30-day max age

### 6.2 Login Page Features

- Google OAuth button (primary)
- Email/password form (secondary)
- Link to registration
- Purple gradient background with dark theme
- Wallet icon branding

### 6.3 Register Page Features

- Name, email, password, confirm password fields
- Password min 8 characters
- Calls /api/auth/register endpoint
- Hashes password with bcryptjs
- Creates user in Google Sheets
- Redirects to login on success

---

## 7. CORE FEATURES IMPLEMENTATION

### 7.1 TypeScript Interfaces

**File: src/types/database.ts**

Define interfaces for:
- BaseEntity (id, createdAt, updatedAt)
- UserOwnedEntity (extends BaseEntity + userId)
- User, Account, Category, Transaction
- AccountType, AccountGroup, UserSetting
- CreateInput types (omit auto-generated fields)
- WithDetails types (include resolved names)
- Filter types (TimePeriod, TransactionFilters)
- SyncStatus, SyncQueueItem

### 7.2 Transaction Types

| Type | From Account | To Account | Category | Balance Effect |
|------|--------------|------------|----------|----------------|
| EXPENSE | Required | - | Required | fromAccount -= amount |
| INCOME | - | Required | Required | toAccount += amount |
| TRANSFER | Required | Required | - | from -= amount, to += amount |

### 7.3 Transaction Status

- **CONFIRMED**: Verified by user
- **PENDING**: Auto-added by Magic Box (shows light red)
- **REJECTED**: Marked as invalid

### 7.4 Transaction Source

- **MANUAL**: User entered
- **CSV_IMPORT**: Bulk import
- **MAGIC_BOX**: SMS parser

---

## 8. MAGIC BOX (SMS PARSER)

### 8.1 Overview

Magic Box parses bank SMS messages to auto-extract:
- Amount
- Transaction type (debit/credit)
- Bank name
- Account last 4 digits
- Balance (if present)
- Merchant name
- UPI reference
- Date

### 8.2 Supported Banks (Regex Patterns)

| Bank | Debit Keywords | Credit Keywords |
|------|----------------|-----------------|
| HDFC | debited, sent, withdrawn, payment | credited, received, deposited |
| SBI | debited, transferred | credited, received |
| ICICI | debited | credited |
| Axis | debited | credited |
| Kotak | debited | credited |
| Google Pay | sent, paid | received |
| PhonePe | sent, paid, debited | received, credited |
| Paytm | paid, sent | received, cashback |

### 8.3 Parser Flow

1. Detect bank from SMS text
2. Try bank-specific patterns first
3. Fall back to generic patterns
4. Extract amount, type, and metadata
5. Generate account/category suggestions based on keywords
6. Return ParsedSMS with confidence score (0-100)

### 8.4 Auto-Submit Behavior

- If confidence >= 70%, start 3-second countdown
- Show countdown in UI
- User can cancel or edit during countdown
- On timeout, submit as PENDING status
- PENDING transactions show with light red background in daily view

### 8.5 Suggestions Logic

**Account suggestions:**
- HDFC in text → suggest "HDFC" account
- SBI in text → suggest "SBI" account
- GPay/Google Pay → suggest "Google Pay" account

**Category suggestions (Expense):**
- Swiggy/Zomato → "Food"
- Uber/Ola/Rapido → "Transportation"
- Amazon/Flipkart → "Shopping"
- Netflix/Spotify → "Entertainment"

**Category suggestions (Income):**
- Salary/Payroll → "Salary"
- Cashback → "Cashback"
- Refund/Return → "Reimbursement"


---

## 9. GOOGLE SHEETS INTEGRATION

### 9.1 Client Setup

**File: src/lib/google-sheets.ts**

- Use googleapis library
- Auth with service account credentials
- Get spreadsheet by ID from env
- Utility functions:
  - rowToObject(headers, row) - convert array to typed object
  - objectToRow(headers, obj) - convert object to array
  - generateId() - UUID v4
  - now() - ISO timestamp

### 9.2 CRUD Operations Pattern

For each entity (accounts, categories, transactions, etc.):

```typescript
// GET all for user
async function getByUserId(userId: string): Promise<T[]>

// GET single by id
async function getById(id: string, userId: string): Promise<T | null>

// CREATE
async function create(input: CreateInput): Promise<T>

// UPDATE
async function update(id: string, userId: string, updates: Partial<T>): Promise<T | null>

// DELETE (soft delete)
async function delete(id: string, userId: string): Promise<boolean>
```

### 9.3 Balance Updates

When creating/deleting transactions, update account balances:

**On CREATE:**
- EXPENSE: fromAccount.balance -= amount
- INCOME: toAccount.balance += amount
- TRANSFER: fromAccount -= amount, toAccount += amount

**On DELETE:**
- Reverse the above operations

### 9.4 Seed Default Data

When user first signs up:
1. Create default account types (Bank, Cash, Wallet, Investment, Credit Card, Loan)
2. Create default expense categories (Food, Transportation, Entertainment, Shopping, Health, Education, Utilities, Personal)
3. Create default income categories (Salary, Freelance, Investment, Cashback, Reimbursement, Gift, Dividend, Other)
4. Create default account group (Primary)

---

## 10. OFFLINE-FIRST ARCHITECTURE

### 10.1 Strategy

- **Primary store**: IndexedDB (Dexie.js)
- **Cloud store**: Google Sheets
- **Sync**: Bidirectional with conflict resolution (last write wins)

### 10.2 Dexie Schema

**File: src/lib/db.ts**

Tables mirror Google Sheets:
- users
- accounts
- categories
- transactions
- accountTypes
- accountGroups
- settings
- syncQueue (for pending changes)

### 10.3 Sync Queue

When offline or for background sync:
- Store changes in syncQueue table
- Each item has: table, action (CREATE/UPDATE/DELETE), entityId, data, timestamp, retryCount
- On reconnect, process queue in order
- Max 3 retries per item

### 10.4 Sync Flow

1. User makes change → Write to IndexedDB immediately
2. Add to syncQueue
3. Debounce 2 seconds
4. If online, process syncQueue
5. On success, remove from queue
6. On failure, increment retryCount
7. Show sync status indicator

### 10.5 Pull from Cloud

On login or manual refresh:
1. Fetch all data for user from Sheets
2. Clear local data for user
3. Insert fresh data
4. Update lastSyncAt timestamp

### 10.6 Sync Status Indicator

Show in navbar:
- 🟢 Synced (green cloud + check)
- 🔵 Syncing (spinning icon)
- 🟡 Offline (cloud off icon + pending count)
- 🔴 Error (retry button)

---

## 11. UI COMPONENTS

### 11.1 Design System

**Theme:** Dark with purple accents
- Background: slate-900 (#0f172a)
- Cards: slate-800 (#1e293b)
- Accent: purple-600 (#7c3aed)
- Success: green-500
- Warning: amber-500
- Error: red-500

**Typography:**
- Font: Inter
- Headings: Bold
- Body: Regular

### 11.2 Layout Components

**Navbar (top):**
- Logo + App name
- Sync indicator
- User avatar + dropdown

**BottomNav (mobile):**
- Transactions (default)
- Accounts
- Stats
- Settings

### 11.3 Transaction Components

**TransactionList:**
- Grouped by date
- Each item shows: amount, category icon, description, account
- Swipe actions (edit/delete)
- PENDING items have light red background

**AddTransactionModal:**
- Type selector (Expense/Income/Transfer)
- Dynamic fields based on type
- Transfer shows visual preview
- DateTime picker with "Now" button
- Category dropdown (filtered by type)

**TransactionFilters:**
- Type: All, Expense, Income, Transfer
- Period: Daily, Weekly, Monthly, Quarterly, Annually, All Time

### 11.4 Account Components

**AccountCard:**
- Name + type icon
- Current balance
- Threshold
- Spendable amount (balance - threshold)
- Progress bar (green if safe, red if below threshold)
- Edit/Delete buttons

**AccountModal:**
- Name, Type, Balance, Threshold, Color, Group fields
- Type dropdown from accountTypes

### 11.5 Magic Box Component

**MagicBox:**
- Textarea for SMS input
- Paste from clipboard button
- Parse button
- Preview card with extracted data
- Auto-submit countdown
- Account/Category dropdowns for adjustment

### 11.6 Stats Components

**NetWorthChart:** Line chart of total balance over time
**IncomeExpenseChart:** Bar chart comparing income vs expense
**CategoryPieChart:** Donut chart of spending by category
**StatsSummaryCards:** Total income, expense, savings rate

### 11.7 Settings Components

**CategoryTree:** Hierarchical view with expand/collapse
**CategoryModal:** Create/edit with parent selection
**DeleteWithMoveModal:** When deleting category with transactions


---

## 12. PWA CONFIGURATION

### 12.1 next.config.js

Use next-pwa wrapper with:
- Disable in development
- Runtime caching for fonts, images, API calls
- Network-first strategy for APIs
- Cache-first for static assets

### 12.2 manifest.json

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
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 12.3 Root Layout Meta Tags

- apple-mobile-web-app-capable: yes
- apple-mobile-web-app-status-bar-style: black-translucent
- theme-color meta tags for light/dark

---

## 13. DEPLOYMENT

### 13.1 Vercel Setup

1. Connect GitHub repo to Vercel
2. Set environment variables
3. Deploy

### 13.2 Environment Variables for Vercel

- GOOGLE_SERVICE_ACCOUNT_EMAIL
- GOOGLE_PRIVATE_KEY (with \n for newlines)
- GOOGLE_SPREADSHEET_ID
- NEXTAUTH_URL (production URL)
- NEXTAUTH_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET

### 13.3 Google OAuth Redirect URI

Add to Google Cloud Console:
- https://your-app.vercel.app/api/auth/callback/google

### 13.4 Google Sheets Access

Share the spreadsheet with the service account email as Editor.

---

## 14. TESTING CHECKLIST

### Authentication
- [ ] Google OAuth sign in
- [ ] Email/password registration
- [ ] Email/password login
- [ ] Session persistence
- [ ] Logout

### Accounts
- [ ] Create account
- [ ] Edit account
- [ ] Delete account
- [ ] Balance updates on transactions
- [ ] Threshold warnings

### Transactions
- [ ] Create expense
- [ ] Create income
- [ ] Create transfer with preview
- [ ] Edit transaction
- [ ] Delete transaction
- [ ] Filter by type
- [ ] Filter by period
- [ ] PENDING status styling

### Magic Box
- [ ] Paste SMS
- [ ] Parse HDFC SMS
- [ ] Parse SBI SMS
- [ ] Auto-submit countdown
- [ ] Cancel countdown
- [ ] Account/category suggestions

### Categories
- [ ] Create category
- [ ] Create subcategory
- [ ] Edit category
- [ ] Delete with move option

### Sync
- [ ] Changes sync to Sheets
- [ ] Offline indicator
- [ ] Offline queue
- [ ] Reconnection sync

### PWA
- [ ] Install prompt
- [ ] Standalone mode
- [ ] Icons correct
- [ ] Offline caching

### CSV Import
- [ ] Upload file
- [ ] Progress indicator
- [ ] Error handling
- [ ] Transaction type detection

### Stats
- [ ] Net worth chart
- [ ] Income vs expense chart
- [ ] Category breakdown
- [ ] Period filters

---

## 15. IMPLEMENTATION ORDER

1. **Phase 1: Foundation**
   - Project setup (npm init, dependencies)
   - Environment configuration
   - TypeScript interfaces
   - Tailwind + shadcn/ui setup

2. **Phase 2: Backend**
   - Google Sheets client
   - NextAuth configuration
   - API routes for CRUD

3. **Phase 3: Core UI**
   - Layout (Navbar, BottomNav)
   - Login/Register pages
   - Dashboard layout

4. **Phase 4: Main Features**
   - Accounts page + CRUD
   - Transactions page + CRUD
   - Add Transaction modal with type switching

5. **Phase 5: Magic Box**
   - SMS parser with bank patterns
   - MagicBox component
   - Auto-submit with countdown
   - PENDING status styling

6. **Phase 6: Settings**
   - Categories management
   - Account types management
   - Account groups management

7. **Phase 7: Stats**
   - Charts with recharts
   - Period filters

8. **Phase 8: Offline**
   - Dexie setup
   - Sync engine
   - Sync status indicator

9. **Phase 9: PWA**
   - Manifest
   - Service worker
   - Icons

10. **Phase 10: Polish**
    - CSV import/export
    - Error handling
    - Loading states
    - Testing

---

## 16. QUICK START COMMANDS

```bash
# Clone repo
git clone https://github.com/ersa101/money-mngr-pwa.git
cd money-mngr-pwa

# Install dependencies
npm install

# Copy env template
cp .env.example .env.local
# Edit .env.local with your credentials

# Setup Google Sheets tabs
npm run setup-sheets

# Start dev server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel
```

---

**END OF PROMPT**

This comprehensive prompt covers the full Money Mngr PWA implementation.
Use with Claude Code in VS Code to build step by step.

