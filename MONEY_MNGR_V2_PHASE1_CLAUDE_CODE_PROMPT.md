# Money Mngr PWA — v2.0326 Phase 1 Claude Code Prompt
**Branch:** `v2.0326-dev`
**Base:** `main` (v1.0226 — stable, do not touch)
**Date:** March 2026
**Author:** Ersa (informalai)

---

## ⚠️ CRITICAL AGENT RULES — READ BEFORE ANYTHING ELSE

1. **You are working on branch `v2.0326-dev` only.** Never commit to or modify `main`.
2. **This is an additive build.** Do not remove, refactor, or rename any existing working feature unless explicitly instructed.
3. **Read `CLAUDE_gitTracking_userTVM_v1_01032026.md` first** — it is the single source of truth for architecture, patterns, and conventions.
4. **Never break the double-entry ledger.** Balance integrity is non-negotiable.
5. **Prefer `useLiveQuery` over `useState` for all DB data.** Real-time sync is core.
6. **All TypeScript interfaces live in `src/lib/db.ts`.** Do not scatter types elsewhere.
7. **Never delete or modify `.data/` CSV files.** They are the master database.
8. **Increment `cacheId` in `next.config.js` after every breaking change** (e.g., `money-mngr-v3`).
9. **Run `npx tsc --noEmit` and `npm run lint` after every major change.** Fix all errors before proceeding.
10. **All new API calls (AI, Google) must be wrapped in try/catch with graceful UI fallback.** Never let an API failure crash the app.
11. **No hardcoded API keys anywhere in code.** All secrets via environment variables only.
12. **All new components follow existing naming conventions:** PascalCase components, camelCase hooks with `use` prefix, kebab-case file names for pages.
13. **Mobile-first always.** Every new UI element must be tested at 375px width minimum.
14. **Do not auto-run heavy AI computations on page load.** All AI insight generation is on-demand via user-triggered button only.

---

## 📋 PROJECT CONTEXT

**App:** Money Mngr — Privacy-first Personal Finance PWA
**Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Dexie.js (IndexedDB), NextAuth v5, Recharts, shadcn/ui, lucide-react
**Primary AI:** Gemini API (primary), Claude API (fallback) — keys stored in Settings, retrieved from IndexedDB
**Data:** 13,350+ transactions, 6 years of history in IndexedDB
**Auth:** Google OAuth via NextAuth v5 — `drive.file` scope already requested at login for Google Drive backup

---

## 🎯 PHASE 1 OBJECTIVES

Phase 1 transforms Money Mngr from a transaction logger into an intelligent financial companion. All features in this phase use **existing data only** — no new data model changes except additions to `db.ts` schema where needed.

---

## 🗂️ NAVIGATION RESTRUCTURE

### Current State
Bottom nav: `Transactions | Accounts | Stats | Settings`

### New Bottom Nav (Mobile — 5 tabs, icons only, no text labels)
```
🏠 Home | 💸 Transactions | 📊 Stats | 🧠 FAIN | ⚙️ Settings
```

**Rules:**
- Icons only in bottom nav. No text labels — use `title` attribute for accessibility tooltip.
- Active tab = filled/colored icon (use existing active state pattern from `Navigation.tsx`)
- `Accounts` tab moves inside `Settings` as a section — do not delete the Accounts page, just relocate the nav entry
- FAIN = **Financial AI Native** — pronounced "FINE" — this is the AI intelligence tab

### FAIN Tab Internal Structure
FAIN tab uses a **3-segment toggle** at the top (not separate tabs):
```
[ 💬 Chat ] [ 📈 Insights ] [ 🔔 Alerts ]
```
- Segmented control, pill-style, full width on mobile
- Default segment on open: **Insights**
- Each segment is a separate component rendered conditionally

---

## 🏠 HOME TAB (New Page)

**File:** `src/app/home/page.tsx`
**Route:** `/home` — set as default redirect from `/` instead of `/transactions`

### Cards to display (in order, vertically stacked, scrollable):

#### 1. Safe to Spend Today
- Already exists in `AddTransactionModal.tsx` — extract this logic into a shared hook `useSafeToSpend`
- Display as a prominent card: current balance across all active accounts minus sum of all thresholds
- Color: Green if positive, Red if negative
- Label: "Safe to Spend" with ₹ amount large and bold

#### 2. Day-over-Day Comparison Card
- Today's total spend vs yesterday's total spend
- Show: Today ₹X | Yesterday ₹Y | Delta with arrow (↑↓) and percentage
- Pull from IndexedDB transactions filtered by date
- If today has no spend yet, show "No spend yet today" with yesterday's figure

#### 3. Biggest Spend This Week
- Single highest-amount transaction in current calendar week
- Show: amount, category name, note, date
- Tap to open that transaction detail

#### 4. Duplicate Transaction Detector
- On load, scan last 30 days of transactions for duplicates: same amount + same account + same category + within 24 hours
- If found: show warning card with list of suspected duplicates, each tappable
- If none: do not show this card at all (hide, don't show "no duplicates" message)
- This is pure logic, no AI needed

### Home Tab Rules:
- All cards load from IndexedDB — no API calls on Home tab
- Home tab must load in under 1 second
- Each card has a subtle border, dark background consistent with existing dark theme
- Cards are non-collapsible on Home — always visible

---

## 📊 STATS TAB — Fix #29 (Sub-Category Filter)

### Problem
Current `SubCategoryTrend` component renders all sub-categories as folder chips — clunky with 50+ items.

### Solution
Replace the chip grid with a **searchable multi-select dropdown**:

**Component:** `src/components/stats/SubCategorySelector.tsx`

**Behavior:**
- Dropdown button shows: "All Sub-Categories" or "3 selected" or specific name if 1 selected
- On click: opens a modal/popover with:
  - Search input at top (filters list in real-time)
  - Grouped by parent Category (collapsible groups)
  - Checkbox per sub-category
  - "Select All" / "Clear All" buttons
  - "Apply" button to confirm selection
- Selected sub-categories drive the trend chart below
- If nothing selected, show all (existing behavior)
- Persist selection in component state only (not DB) — resets on tab change

---

## 🧠 FAIN TAB

**File:** `src/app/fain/page.tsx`
**Route:** `/fain`

### Segment 1: 💬 Chat

**Component:** `src/components/fain/FAINChat.tsx`

**UX:**
- WhatsApp-style bubble UI — user messages right-aligned (blue), AI responses left-aligned (dark card)
- Input bar fixed at bottom of chat segment
- Send button + Enter key both submit
- Typing indicator (3 animated dots) while AI responds
- Scroll to latest message automatically

**AI Context Construction:**
Build a context payload to send with every chat message. This is the intelligence layer:

```typescript
interface FAINChatContext {
  totalTransactions: number;
  dateRange: { from: string; to: string };
  topCategories: { name: string; total: number }[];        // top 10 by spend
  topSubCategories: { name: string; total: number }[];     // top 10 by spend
  monthlyTotals: { month: string; income: number; expense: number }[]; // last 12 months
  accountSummary: { name: string; type: string; balance: number }[];
  recentTransactions: { date: string; amount: number; category: string; note: string }[]; // last 50
}
```

**System Prompt to AI:**
```
You are FAIN — Financial AI Native — a personal finance analyst embedded in the user's Money Mngr app. 
You have access to the user's real transaction data provided below. 
Answer questions conversationally, in 2-4 sentences max unless a detailed breakdown is explicitly asked. 
Always respond in Indian financial context (INR, Indian festivals, Indian spending patterns). 
Never make up data. If unsure, say so. Do not give generic financial advice — always refer to actual numbers from the provided data.
User's financial data context: [CONTEXT_JSON]
```

**API:**
- Primary: Gemini API (key from Settings/IndexedDB)
- Fallback: Claude API (key from Settings/IndexedDB)
- If neither key exists: show inline message "Add your Gemini API key in Settings to use FAIN Chat"
- Max tokens: 500 per response (chat should be snappy)

**Feedback on each AI response:**
- 👍 / 👎 buttons below each AI bubble
- On 👎: small text input appears — "What was wrong?" (optional, 100 char limit)
- On submit: store to Google Sheet (see Feedback Storage section below)

---

### Segment 2: 📈 Insights

Each insight is a **card** with:
- Title + icon
- Last run timestamp ("Last run: 2 hours ago" or "Never run")
- **▶ Run** button — triggers AI call on demand
- Loading state while running (spinner + "Analysing your data...")
- Result displayed inline in card after run
- **💾 Save to Drive** button (appears after result is generated)
- **⬇ Download PDF** button (appears after result is generated)
- **Feedback** — 👍/👎 with optional reason (see Feedback Storage)

**Insight Cards in this segment:**

#### I-1: End of Month Summary
- Trigger: Manual (▶ Run)
- Context: All transactions in current calendar month
- AI Output: 150-200 word narrative summary — total spend, top 3 categories, income vs expense delta, one observation
- Show as formatted text card

#### I-2: Cross-Category Correlation Detection
- Trigger: Manual (▶ Run)
- Context: Last 6 months of transactions, grouped by week, by category
- AI Output: Identify 3-5 meaningful correlations. Format: "When [Category A] increases, [Category B] tends to [increase/decrease] [X] weeks later."
- Show as a list of correlation statements with confidence indicator (High/Medium)

#### I-3: Seasonal Trend Analysis
- Trigger: Manual (▶ Run)
- Context: All transactions grouped by month across all years, plus list of Indian festivals with approximate dates
- AI Output: "Your [category] spending peaks in [month] every year, likely due to [festival/season]. This year it was ₹X vs ₹Y average."
- Show as 3-5 bullet observations

#### I-4: Weekly Summary
- Trigger: Manual (▶ Run) — also auto-generates every Monday if user has previously run it at least once
- Context: Last 7 days of transactions
- AI Output: Short narrative — total spend, vs previous week, top category, one actionable suggestion
- Show as formatted card

#### I-5: Biggest Spend Analysis (Weekly)
- Trigger: Manual (▶ Run)
- Context: Current week's transactions
- AI Output: Top 3 spends with context — "Your ₹X spend on [category] on [day] was [X]% above your weekly average for this category."

---

### Segment 3: 🔔 Alerts

Each alert is a **card** with:
- Alert icon + title + description
- Status indicator: 🟢 Normal / 🟡 Watch / 🔴 Alert
- **▶ Refresh** button to re-run analysis
- **Feedback:** 👍 ("Accurate") / 👎 ("Not accurate") + optional reason
- Swipe-to-dismiss on mobile (dismissed alerts re-appear on next Refresh)

**Alert Cards:**

#### A-1: Anomaly / Spike Detection
- Logic: For each category, calculate 12-month average monthly spend. If current month > 150% of average → 🔴 Alert
- Show: "Your [Sub-Category] spend this month (₹X) is [Y]% above your 12-month average (₹Z)"
- Pure math, no AI API call needed — compute from IndexedDB directly
- Refresh: recomputes on demand

#### A-2: Bill / Recharge Reminder
- Logic: Detect recurring transactions — same category + similar amount + repeating within 25-35 day window
- Flag any detected recurring transaction whose last occurrence was 20+ days ago
- Show: "Your [Note/Category] payment of ~₹X is due soon. Last paid: [date]"
- Pure logic, no AI needed
- Feedback: "Was this accurate?" — if 👎, store the correction (actual due date if user provides)

#### A-3: Budget Auto-Suggestion
- Trigger: ▶ Run (not automatic)
- Logic: For each expense category, calculate 12-month average spend adjusted for seasonal variation (exclude months with 0 spend from average)
- Display as: "Suggested budget for [Category]: ₹X/month" with Accept ✓ / Edit ✎ buttons
- Accept stores the budget limit to a new `budgets` table in IndexedDB (schema addition needed)
- Edit opens inline number input
- This sets up budget infrastructure for Phase 2 without building full budget UI now

#### A-4: Lead-Lag Predictive Alert
- Trigger: ▶ Run
- Context: Last 12 months, category spend by month
- AI Output: "Based on your pattern, [category] spend typically rises in [upcoming month]. Last year it was ₹X. Heads up."
- Show 2-3 upcoming predictions only
- AI call required — use same API chain as Chat

#### A-5: Savings Goal Suggestion
- Trigger: ▶ Run
- Logic: Calculate average monthly surplus (income - expense) over last 6 months
- AI Output: "You typically have ₹X surplus monthly. Here are 2 suggested savings goals based on your spending patterns: [Goal 1], [Goal 2]"
- Show with Accept / Dismiss buttons
- Accept: stores goal name + target amount to new `goals` table in IndexedDB

#### A-6: Life Event Detection
- Trigger: ▶ Run
- Context: All transactions, look for sudden new categories appearing or >200% spend spike sustained for 3+ months
- AI Output: "We noticed a significant change in your spending around [month/year]. This might indicate [event type: travel, relocation, health event, celebration]. Does this match a life event?"
- Feedback: "Yes, this was [user types event]" / "No, dismiss"
- Store confirmed life events to `lifeEvents` table in IndexedDB

---

## 💾 FEEDBACK STORAGE SYSTEM

**Every AI-generated surface has feedback.** This is the intelligence memory layer.

### Storage Target
Google Sheet (user's own Google Drive, created automatically on first feedback submission)
Sheet name: `FAIN_Feedback_Log`
Created in the same Google Drive folder as snapshots (`MoneyMngr_Snapshots`)

### Schema (one row per feedback)
```
timestamp | feature_id | insight_type | insight_summary (first 200 chars) | user_response (👍/👎/rating) | user_reason (optional text) | category_context | subcategory_context | month_year
```

### Implementation
- Use existing Google OAuth token (drive.file scope already granted)
- Google Sheets API — append row on each feedback submission
- If Sheets API fails: store feedback locally in IndexedDB `feedbackLog` table and retry on next app open
- Never block the UI waiting for feedback to save — fire and forget with silent retry

### Feedback UX Rules
- One-tap for 👍/👎 — never require typing
- Optional text appears only after 👎 tap, max 150 characters
- After submitting: show "Saved ✓" for 1.5 seconds, then feedback buttons disappear
- Never ask for feedback more than once per insight instance

---

## 🔒 SECURITY & SAFETY REQUIREMENTS

### API Key Handling
- Gemini and Claude API keys are stored in IndexedDB (Settings) — already implemented in v1
- **Never log API keys to console**
- **Never include API keys in error messages shown to user**
- All AI API calls go through Next.js API routes (`/api/fain/*`) — never call external AI APIs directly from browser/client components
- API routes validate that the user is authenticated (NextAuth session check) before proxying any AI request

### AI API Route Structure
```
src/app/api/fain/
├── chat/route.ts          — proxies chat messages to Gemini/Claude
├── insights/route.ts      — proxies insight generation requests
├── alerts/route.ts        — proxies alert AI calls (A-4, A-5, A-6 only)
└── feedback/route.ts      — writes feedback to Google Sheet
```

Each route:
1. Checks `getServerSession()` — return 401 if not authenticated
2. Retrieves API key from request body (client sends key from IndexedDB, server uses it for the external call)
3. Wraps external call in try/catch — returns structured error if AI call fails
4. Never stores API keys server-side or in logs

### Data Privacy
- Transaction data sent to AI APIs is **summary/aggregated only** — never raw transaction notes or personal identifiers unless user explicitly asks in chat
- Chat context strips personal account names — use account types only (BANK, CASH, WALLET)
- Feedback stored in user's own Google Sheet — not in any central database

### Rate Limiting
- Client-side: disable ▶ Run button for 30 seconds after each AI call to prevent accidental spam
- Show last-run timestamp prominently so user knows they don't need to re-run

### Error Handling
- If AI API returns error: show inline card message "Analysis failed. Check your API key in Settings or try again." — never show raw API error
- If Google Sheet write fails: silently queue to IndexedDB `feedbackLog`, retry on next session
- If user has no API key: show "Add Gemini API key in ⚙️ Settings to unlock this feature" — do not show broken UI

---

## 🗃️ DATABASE SCHEMA ADDITIONS

Add to `src/lib/db.ts`:

```typescript
// New tables for Phase 1

interface Budget {
  id?: number;
  categoryId: number;
  categoryName: string;         // denormalized for display
  monthlyLimit: number;
  createdAt: string;
  updatedAt: string;
}

interface Goal {
  id?: number;
  name: string;
  targetAmount: number;
  currentAmount: number;        // manually updated in Phase 2
  suggestedByAI: boolean;
  createdAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DISMISSED';
}

interface LifeEvent {
  id?: number;
  detectedMonth: string;        // "YYYY-MM"
  eventType: string;            // user-confirmed description
  aiSummary: string;
  confirmedByUser: boolean;
  createdAt: string;
}

interface FeedbackLog {
  id?: number;
  timestamp: string;
  featureId: string;            // e.g., "INSIGHT_MONTHLY_SUMMARY"
  insightType: string;
  insightSummary: string;
  userResponse: 'POSITIVE' | 'NEGATIVE' | number;  // number for ratings
  userReason?: string;
  categoryContext?: string;
  subcategoryContext?: string;
  monthYear: string;
  syncedToSheet: boolean;       // false until successfully written to Google Sheet
}
```

**Dexie version bump:** Increment DB version number and add migration for new tables.

---

## 🎨 UI / UX RULES FOR ALL NEW COMPONENTS

1. **Dark theme only** — consistent with v1. Background: `bg-slate-900`, Cards: `bg-slate-800`, borders: `border-slate-700`
2. **Icons over text** wherever internationally understood — use `lucide-react` exclusively
3. **Every icon gets `title` attribute** for accessibility tooltip
4. **Touch targets minimum 44px** on mobile for all interactive elements
5. **Loading states mandatory** — every async operation shows a spinner or skeleton, never blank
6. **Empty states mandatory** — every list/card that can be empty has a meaningful empty state message
7. **No form tags** — use `onClick` handlers, not HTML form submit
8. **Swipe to dismiss** on Alert cards (mobile gesture)
9. **Segmented control** for FAIN tab segments — pill style, consistent with existing button patterns
10. **Card anatomy:** title row (icon + label + last-run time) → content area → action row (Run | Save | Download | Feedback)
11. **AI response text** — never render raw markdown. Parse basic formatting only (bold, line breaks). No full markdown renderer needed.
12. **Amounts always in ₹ INR format** — use existing currency formatting utility if present, else create `formatINR(amount: number): string` in `src/lib/utils.ts`

---

## 📁 NEW FILE STRUCTURE

```
src/
├── app/
│   ├── home/page.tsx                          ← NEW: Home tab
│   ├── fain/page.tsx                          ← NEW: FAIN tab shell
│   └── api/fain/
│       ├── chat/route.ts                      ← NEW: AI chat proxy
│       ├── insights/route.ts                  ← NEW: AI insights proxy
│       ├── alerts/route.ts                    ← NEW: AI alerts proxy
│       └── feedback/route.ts                  ← NEW: Feedback → Google Sheet
├── components/
│   ├── home/
│   │   ├── SafeToSpendCard.tsx               ← NEW
│   │   ├── DayOverDayCard.tsx                ← NEW
│   │   ├── BiggestSpendCard.tsx              ← NEW
│   │   └── DuplicateDetectorCard.tsx         ← NEW
│   ├── fain/
│   │   ├── FAINChat.tsx                      ← NEW: Chat segment
│   │   ├── FAINInsights.tsx                  ← NEW: Insights segment
│   │   ├── FAINAlerts.tsx                    ← NEW: Alerts segment
│   │   ├── InsightCard.tsx                   ← NEW: Reusable insight card
│   │   ├── AlertCard.tsx                     ← NEW: Reusable alert card
│   │   └── FeedbackButtons.tsx               ← NEW: Reusable 👍/👎 component
│   └── stats/
│       └── SubCategorySelector.tsx           ← NEW: Replaces chip grid
├── hooks/
│   ├── useSafeToSpend.ts                     ← NEW: Extracted from AddTransactionModal
│   ├── useAnomalyDetection.ts                ← NEW: Pure math, no AI
│   ├── useRecurringDetection.ts              ← NEW: Bill reminder logic
│   └── useFAINContext.ts                     ← NEW: Builds AI context payload
└── lib/
    └── fainUtils.ts                          ← NEW: Context builder, prompt templates
```

---

## 🧪 TESTING CHECKLIST (Run before marking Phase 1 complete)

```
NAVIGATION
☐ All 5 bottom nav tabs navigate correctly
☐ Active tab icon is visually distinct
☐ Home is default route (/ → /home)
☐ Accounts accessible from Settings

HOME TAB
☐ Safe to Spend card loads in < 1 second
☐ Day-over-day shows correct today vs yesterday figures
☐ Biggest spend this week shows correct transaction
☐ Duplicate detector correctly identifies duplicates in test data
☐ Duplicate detector hidden when no duplicates found

STATS FIX
☐ Sub-category selector opens and closes correctly
☐ Search filters list in real-time
☐ Multi-select works correctly
☐ Chart updates when selection changes
☐ "All" state works when nothing selected

FAIN CHAT
☐ Chat loads with empty state and prompt suggestion
☐ Message sends on Enter and button click
☐ AI response appears with correct bubble styling
☐ Typing indicator shows during API call
☐ Error state shows when no API key
☐ Feedback buttons appear on each AI response
☐ 👎 shows text input, 👍 does not
☐ Feedback saves to Google Sheet (check sheet in Drive)
☐ Feedback saves to IndexedDB if Sheet fails

FAIN INSIGHTS
☐ All 5 insight cards render with "Never run" state
☐ ▶ Run button triggers AI call
☐ Loading state shows during AI call
☐ Result renders correctly after completion
☐ Last-run timestamp updates
☐ Run button disabled for 30 seconds after use
☐ Save to Drive button appears after result
☐ Download PDF button appears after result
☐ Feedback works on each insight

FAIN ALERTS
☐ Anomaly detection runs on load (pure math)
☐ Bill reminders detect recurring correctly
☐ Budget suggestion generates from 12-month average
☐ AI-powered alerts (A-4, A-5, A-6) require ▶ Run
☐ Swipe to dismiss works on mobile
☐ Feedback works on each alert

SECURITY
☐ No API keys visible in browser console
☐ No API keys in network request URLs
☐ FAIN API routes return 401 when not authenticated
☐ App does not crash when AI API fails

PERFORMANCE
☐ Home tab loads in < 1 second
☐ FAIN tab loads in < 2 seconds (before any AI run)
☐ No TypeScript errors: npx tsc --noEmit
☐ No lint errors: npm run lint
☐ PWA cacheId incremented in next.config.js
```

---

## 🚀 DEPLOYMENT NOTES

1. Before deploying to Vercel, increment `cacheId` in `next.config.js`
2. No new environment variables required for Phase 1 — AI keys come from user's Settings (IndexedDB)
3. Google Sheets API must be enabled in the same Google Cloud project as the existing Drive API
4. Test on actual mobile device (not just browser DevTools) before marking complete
5. Branch `v2.0326-dev` → create PR to `main` only after all checklist items pass

---

*Phase 1 of 4 | Money Mngr v2.0326 | Built with Claude Code*
