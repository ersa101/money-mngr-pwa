# BUG PATTERNS — Money Mngr PWA
> Grouped by component/area. Goal: spot patterns, avoid repeating same mistakes.
> Agent appends after every bug session. You tag mood.

---

## HOW TO USE
- After every bug session → agent adds entry under correct group
- If new group needed → create it
- Before coding a new feature → scan relevant group here first
- Monthly → review patterns, map with your mood column

---

## BUG ENTRY FORMAT

```
### BUG-[ID] — [Short Title] | [Date] | Session #[N]
**Symptom:** What was visibly wrong
**Discovery Process:** How we found root cause (key steps only)
**Root Cause:** The actual reason
**Fix:** What was changed
**Pattern Tag:** #balance | #csv | #state | #cache | #ui | #auth | #db | #transfer
**Mood:** [1–5] | **Rushing?** Y/N
**Avoid next time:** One line — what to check before writing similar code
```

---

## GROUP: Balance & Transactions

> Bugs related to account balance updates, double-entry ledger, transfer logic

### BUG-001 — Edit Transaction Not Reversing Old Balance | Feb 2026 | Session #-
**Symptom:** Editing a transaction updated balance incorrectly — net wrong amount
**Discovery Process:** Noticed balance drift after multiple edits → traced to edit handler → found old transaction not reversed before new one applied
**Root Cause:** Edit was applying new values without reversing old transaction's balance effect first
**Fix:** Reverse old transaction → then apply new transaction in edit handler
**Pattern Tag:** #balance #transfer
**Mood:** — | **Rushing?** —
**Avoid next time:** Always reverse-then-apply on any edit. Never just overwrite balance.

---

## GROUP: CSV Import

> Bugs related to CSV parsing, category/account creation, data integrity on import

### BUG-002 — categoryId Race Condition | Feb 2026 | Session #-
**Symptom:** Some transactions imported with null or wrong categoryId
**Discovery Process:** Intermittent failures on large imports → isolated to category creation → found async call not awaited before ID used
**Root Cause:** `db.categories.add()` not awaited before its returned ID was referenced
**Fix:** `await db.categories.add()` before any reference to returned ID
**Pattern Tag:** #csv #db #state
**Mood:** — | **Rushing?** —
**Avoid next time:** Any DB write whose ID is immediately used — always await. No fire-and-forget.

### BUG-003 — "Unknown" Category in Stats | Feb 2026 | Session #-
**Symptom:** Stats page showing "Unknown" instead of category name
**Discovery Process:** Traced from Stats UI → category lookup → found `toCategoryId` mismatch → fallback to `csvCategory` missing
**Root Cause:** `toCategoryId` mapped incorrectly during import; no fallback to `csvCategory` field
**Fix:** Add fallback: if category lookup fails → use `csvCategory` field
**Pattern Tag:** #csv #state #ui
**Mood:** — | **Rushing?** —
**Avoid next time:** Always add fallback display logic when showing DB-resolved names. Never assume lookup succeeds.

---

## GROUP: UI & Display

> Bugs related to rendering, component display, icons, dropdowns

### BUG-011 — Login Page Has Top + Left Whitespace | Apr 2026 | Session #1
**Symptom:** Login page shows visible top padding and left margin — looks broken
**Discovery Process:** Visual check → traced to `layout.tsx` → found global wrapper div applied `pt-14 md:pt-16 md:ml-16` to ALL pages including login
**Root Cause:** Margin/padding wrapper was in `layout.tsx`, not conditional on pathname
**Fix:** Moved wrapper div into `AppContent.tsx` which already reads `pathname`. Added `if (pathname === '/login') return <>{children}</>` bypass before the wrapper.
**Pattern Tag:** #ui
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any global layout wrapper that applies nav offsets must guard the login page. Login is always outside the nav shell.

### BUG-012 — Stats Sticky Header Hidden Behind App Header | Apr 2026 | Session #1
**Symptom:** Stats page sticky period-filter bar scrolls under the fixed app header (SyncHeader)
**Discovery Process:** Visual check on scroll → sticky div uses `top-0` → SyncHeader is `h-14 md:h-16` fixed → overlap
**Root Cause:** `top-0` on sticky div doesn't account for the fixed header height
**Fix:** Changed `top-0` → `top-14 md:top-16`
**Pattern Tag:** #ui
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any sticky element below a fixed header needs `top-[header-height]`, not `top-0`. Global header = `h-14 md:h-16`.

### BUG-004 — Category Icons Showing "tag" String | Feb 2026 | Session #-
**Symptom:** Category icons displayed as text "tag" instead of emoji
**Discovery Process:** Visual check → traced to icon field value → found string "tag" stored instead of emoji
**Root Cause:** Icon field set to string "tag" instead of emoji character
**Fix:** Changed to emoji icons (💰 income, 📦 expense)
**Pattern Tag:** #ui
**Mood:** — | **Rushing?** —
**Avoid next time:** Verify icon field format before saving. String ≠ emoji.

### BUG-026 — DuplicateDetector 24h boundary flags consecutive midnight entries | Apr 2026 | Session #8
**Symptom:** Transactions on consecutive calendar dates stored at midnight (e.g. 22 Mar 00:00 and 23 Mar 00:00) are flagged as duplicates in the home tab Possible Duplicates section.
**Discovery Process:** User screenshot showing 22 Mar & 23 Mar entries in Possible Duplicates. Root cause confirmed in DuplicateDetectorCard.tsx: `diff <= 24 * 60 * 60 * 1000` — `<=` catches pairs exactly 86400000ms apart, which midnight-stored consecutive-date entries always produce.
**Root Cause:** Two-part: (1) `<=` boundary catches consecutive midnight entries that are exactly 24h apart — they are not duplicates. (2) Using a time-window at all is wrong for date-only stored transactions — same calendar date is the correct signal. Also: `description` in the match key causes false negatives when the same transaction is entered with minor note variations.
**Fix (planned F2):** Replace time-window with `a.date.slice(0, 10) === b.date.slice(0, 10)`. Drop `description` from match condition. Final key: `amount + fromAccountId + categoryId + (subCategoryId ?? null) + date.slice(0,10)`.
**Pattern Tag:** #ui #state
**Mood:** — | **Rushing?:** —
**Avoid next time:** For duplicate detection on date-stored data, use calendar-date string equality (`date.slice(0,10)`), not millisecond arithmetic. Time windows create boundary conditions that cannot be correctly tuned for midnight-stored entries.

---

## GROUP: Service Worker & Cache

> Bugs related to PWA caching, stale content, update failures

### BUG-005 — Stale Service Worker Cache | Feb 2026 | Session #-
**Symptom:** Users seeing old content after deploy; "Content unavailable" errors
**Discovery Process:** Deploy → content not updated → checked service worker → found cacheId not incremented
**Root Cause:** `cacheId` in `next.config.js` not incremented on deploy
**Fix:** Increment `cacheId` on every deploy
**Pattern Tag:** #cache
**Mood:** — | **Rushing?** —
**Avoid next time:** Add cacheId increment to deploy checklist. Non-negotiable step.

---

## GROUP: State & Hooks

> Bugs related to React state, useLiveQuery, hook dependencies, re-renders

### BUG-007 — Stats Page Infinite Render Loop / Crash | Apr 2026 | Session #1
**Symptom:** `localhost:3000/stats` shows "Application error: a client-side exception has occurred" when Lifestyle Inflation Curve has cached data
**Discovery Process:** Reproduced crash → traced to LifestyleInflationCurve → found `loadFromCache()` called directly in render body → `setState` during render → infinite re-render loop
**Root Cause:** `if (cached && isCacheValid() && !result && !computing) { loadFromCache() }` placed in render body, not in a `useEffect`. Every render fires `setState`, which triggers another render.
**Fix:** Moved call into `useEffect([cached])`. Added `useEffect` import.
**Pattern Tag:** #state #ui
**Mood:** — | **Rushing?:** —
**Avoid next time:** Never call `setState` (or any function that calls it) directly in render body. If logic depends on derived/live data → always `useEffect`.

### BUG-008 — "No Backup Found" Toast Fires Falsely on Every Load | Apr 2026 | Session #1
**Symptom:** Toast fires on every page load even when backup exists. Fires twice simultaneously (double toast visible in screenshot).
**Discovery Process:** Checked `BackupReminder.tsx` → found `session?.user?.id` read before auth resolves → falls back to `'anonymous'` key → localStorage key `lastBackupAt_anonymous` doesn't exist → fires "no backup" toast
**Root Cause 1:** No guard on session loading state — hook fires immediately on mount before `status === 'authenticated'`
**Root Cause 2:** React StrictMode double-mount causes the `useEffect` to run twice → two toasts
**Fix:** Added `if (status !== 'authenticated') return` guard. Added `id: 'backup-reminder'` to both toast calls (react-hot-toast deduplicates by ID).
**Pattern Tag:** #auth #state
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any hook that reads `session.user` must guard on `status === 'authenticated'` first. Never assume session is ready on mount.

---

## GROUP: Auth & Google

> Bugs related to NextAuth, Google OAuth, Drive API

### BUG-009 — GSheet Rows Keyed by UUID Instead of Email | Apr 2026 | Session #1
**Symptom:** GSheet backup stores rows with UUID (`f7649440-d760-4001-...`) as the userId column instead of the user's Gmail address — unreadable, hard to debug
**Discovery Process:** User shared GSheet screenshot → col A showed UUID → traced to `auth.ts` → found `session.user.id = token.sub` (Google OAuth subject = UUID)
**Root Cause:** `token.sub` is Google's internal UUID for the user, not the email address
**Fix:** Changed to `session.user.id = token.email || token.sub`. Note: backup route already had `session.user.email || session.user.id` fallback, so no route change needed.
**Trade-off:** Existing UUID-keyed GSheet rows are orphaned. User must re-run backup to re-key under email. Fresh start accepted.
**Pattern Tag:** #auth #db
**Mood:** — | **Rushing?:** —
**Avoid next time:** Always use `token.email` as the stable user identifier in this app. `token.sub` is an opaque UUID — never expose it as a display key.

### BUG-010 — Gemini API 404 (Deprecated Model) | Apr 2026 | Session #1
**Symptom:** FAIN features return "Gemini error 404" despite valid API key
**Discovery Process:** User reported error → checked FAIN API routes + llmService.ts → found hardcoded `gemini-1.5-flash` → Google deprecated this model in early 2026
**Root Cause:** Model name hardcoded as `gemini-1.5-flash` in 4 places: `llmService.ts`, `fain/chat/route.ts`, `fain/insights/route.ts`, `fain/alerts/route.ts`
**Fix:** Replaced hardcoded string with ordered fallback array: `['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash']`. On 404, silently retry next model.
**Pattern Tag:** #auth
**Mood:** — | **Rushing?:** —
**Avoid next time:** Never hardcode external API model names in 4+ places. Extract to a shared constant. Add 404-retry logic for any versioned external API.

### BUG-006 — Google Drive API Not Enabled Error Popup | Feb 2026 | Session #-
**Symptom:** Ugly error popup when Drive API not enabled for user
**Discovery Process:** Tested backup flow → API not enabled → unhandled error thrown → popup shown
**Root Cause:** No graceful handling for "API not enabled" response from Drive
**Fix:** Silent catch → show warning toast instead of error popup
**Pattern Tag:** #auth
**Mood:** — | **Rushing?** —
**Avoid next time:** Every external API call needs a graceful degradation path. Never let raw API errors surface to UI.

---

## GROUP: Database & Schema

> Bugs related to Dexie schema, migrations, data integrity

*No entries yet.*

---

## PATTERN SUMMARY (update monthly)

| Pattern Tag | Count | Most Common Cause | Your Mood Trend |
|-------------|-------|-------------------|-----------------|
| #balance | 2 | Not reversing before applying; CSV re-import double-counts | — |
| #csv | 3 | Async/await missing, no fallback, no dedup on re-import | — |
| #cache | 1 | Manual step skipped | — |
| #auth | 3 | No error degradation / wrong identifier / hardcoded external API | — |
| #ui | 3 | Wrong field format / missing nav offset guard | — |
| #state | 4 | Async timing, missing fallback, setState in render body (3 components hit same pattern) | — |
| #db | 2 | Wrong user identifier used as row key; snapshot covers only 3 of 11 tables | — |

---

### BUG-013 — SeasonalHeatmap + CorrelationWeb setState-in-render Crash | Apr 2026 | Session #2
**Symptom:** Same crash pattern as BUG-007. Both components called `loadFromCache()` directly in render body, causing infinite re-render when cached data existed.
**Discovery Process:** Identified during light theme pass — both components shared the same pattern as LifestyleInflationCurve (already fixed in Session #1).
**Root Cause:** `loadFromCache()` (which calls `setState`) placed in render body, not guarded by `useEffect`.
**Fix:** Moved `loadFromCache()` calls into `useEffect([cached])` in both components.
**Pattern Tag:** #state
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any deep insight component that uses a `cached` prop to restore prior results → must restore in `useEffect`, never in render body. Check all 6 deep insight components before shipping.

---

## GROUP: Backup & Restore

> Bugs and known limitations related to GDrive snapshot backup, GSheet backup, and local JSON backup/restore

### BUG-014 — Drive Snapshot Restore Silently Excludes 8 Tables | Apr 2026 | Session #2
**Symptom:** After restoring a Drive snapshot, data in `filterPresets`, `budgets`, `goals`, `lifeEvents`, `feedbackLog`, `appSettings`, `computedInsights`, `categoryBuckets` is not restored — user sees stale or empty state in those areas with no warning.
**Discovery Process:** Reviewed `src/app/api/snapshots/create` and `confirmRestore()` in `SnapshotSection.tsx` — backup payload is `{ accounts, categories, transactions }` only. DB has 11 tables total.
**Root Cause:** Snapshot create route only serialises 3 tables. Restore only calls `bulkAdd` on those same 3. Remaining 8 tables are never touched.
**Fix (not yet applied):** Expand snapshot payload to include all 11 tables, or at minimum: `accounts`, `categories`, `transactions`, `filterPresets`, `budgets`, `goals`, `lifeEvents`, `appSettings`. `feedbackLog` and `computedInsights` are safe to omit (derived/log data).
**Pattern Tag:** #db
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any backup feature must explicitly enumerate every table in the schema. Never assume "the important tables" covers it — always compare against `db.ts` version stores.

### BUG-015 — CSV Re-Import Corrupts Account Balances (No Dedup) | Apr 2026 | Session #2 → Fixed Session #3
**Symptom:** If a user imports a CSV that contains transactions already present in the DB, account balances are wrong — each transaction's amount is applied as a delta again on top of the existing balance.
**Discovery Process:** Code review of `importTransactionsFromCSV` — Phase 7 applies `accountBalanceDeltas` to current `account.balance` unconditionally. No check against existing transactions before adding.
**Root Cause:** CSV import has no deduplication logic. `bulkAdd` adds every row as a new transaction. Balance delta phase then modifies live balance based on all imported rows, including duplicates.
**Fix (Session #3):** Full zone-based dedup system. Each row gets a `sourceHash` (SHA-256 of ISO date + paise amount + account name + type, truncated to 16 hex chars). Rows classified as BEFORE/AFTER DB date range insert blindly; OVERLAP zone rows batch-checked against existing hashes in a single DB query. Missed overlap rows (in date range but not in DB) shown in `ImportPreviewModal` — user picks "Insert all" or "Skip all". `sourceHash` also stored on manual entries via `AddTransactionModal`. Dexie bumped to v8 with `sourceHash` index.
**Bootstrap caveat:** Pre-fix transactions have no `sourceHash`. On first post-deploy re-import, all overlap rows appear as "missed" — user must "Skip all" once. Subsequent imports dedup correctly.
**Pattern Tag:** #balance #csv
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any import flow that modifies balances must deduplicate first. Never trust that users won't re-import the same file.

---

## GROUP: AI & LLM Integration

> Bugs related to AI provider calls, key handling, model compatibility

### BUG-016 — FAINAlerts `db` stripped during hook migration | Apr 2026 | Session #3
**Symptom:** TypeScript errors — `Cannot find name 'db'` across 10+ lines in `FAINAlerts.tsx`.
**Discovery Process:** `npx tsc --noEmit` after migration. Immediately obvious — `db` used for budget DB writes but `useDb` import + call had been stripped when removing the old key-reading code.
**Root Cause:** Migration removed `useDb` + `useLiveQuery` imports and the `const db = useDb()` line because those were associated with the old `geminiKeySetting`/`claudeKeySetting` reads — but `db` is also independently needed for budget saves.
**Fix:** Restored `useDb` import and `const db = useDb()` in `FAINAlerts`. Removed `useLiveQuery` (genuinely unused after migration).
**Pattern Tag:** #state
**Mood:** — | **Rushing?:** —
**Avoid next time:** When stripping hook imports during a migration, grep for all usages of the derived variable (e.g. `db`) — not just the hook call. Don't assume the hook was only used for the thing being replaced.

### BUG-017 — UncomfortableTruth narrow provider type breaks after adding OpenAI | Apr 2026 | Session #3
**Symptom:** TypeScript error — `Argument of type 'AIProvider' is not assignable to parameter of type '"gemini" | "claude"'`.
**Discovery Process:** `npx tsc --noEmit` after `resolveAIKey.ts` was updated to return `AIProvider` (which now includes `'openai'`). `generateNarratives` in `UncomfortableTruth.tsx` had a hardcoded narrow union that predated OpenAI support.
**Root Cause:** `generateNarratives(numbers, provider: 'gemini' | 'claude', ...)` — type written when only 2 providers existed. Also still called `gemini-1.5-flash` directly instead of the model fallback list.
**Fix:** Widened type to `'gemini' | 'claude' | 'openai'`. Added OpenAI call branch. Replaced hardcoded `gemini-1.5-flash` with fallback model list (`gemini-2.0-flash → gemini-2.0-flash-lite → gemini-1.5-flash`).
**Pattern Tag:** #auth
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any function that branches on provider type must be updated in lockstep when a new provider is added. Search for narrow provider union types (`'gemini' | 'claude'`) whenever extending the provider set.

## PATTERN SUMMARY (update monthly)

| Pattern Tag | Count | Most Common Cause | Your Mood Trend |
|-------------|-------|-------------------|-----------------|
| #balance | 2 | Not reversing before applying; CSV re-import double-counts (fixed S3) | — |
| #csv | 3 | Async/await missing, no fallback, no dedup on re-import (fixed S3) | — |
| #cache | 1 | Manual step skipped | — |
| #auth | 4 | No error degradation / wrong identifier / hardcoded external API / narrow provider type | — |
| #ui | 3 | Wrong field format / missing nav offset guard | — |
| #state | 5 | Async timing, missing fallback, setState in render body, stripping hook without checking all usages | — |
| #db | 2 | Wrong user identifier used as row key; snapshot covers only 3 of 11 tables | — |

---

## GROUP: Theme & UI Consistency

> Bugs where components were missed during theme passes or have inconsistent styling

### BUG-021 — CategorySelector.tsx missed during light theme pass | Apr 2026 | Session #5
**Symptom:** Category dropdown in AddTransactionModal is fully dark-themed (bg-slate-800, text-white) while the rest of the modal is light.
**Discovery Process:** User screenshot during local testing. Confirmed by reading CategorySelector.tsx — all dark Tailwind classes, never touched in Session #2 light theme pass.
**Root Cause:** Session #2 light theme pass (35+ files) missed CategorySelector.tsx and the selection mode bar in TransactionList.tsx.
**Fix (planned F2):** Full light theme rewrite of CategorySelector.tsx. Fix TransactionList.tsx selection bar.
**Pattern Tag:** #ui
**Mood:** — | **Rushing?:** —
**Avoid next time:** After any full-app theme pass, grep for `bg-slate` across the entire src/ directory to catch missed components.

### BUG-025 — TransactionCard.tsx never theme-patched | Apr 2026 | Session #8
**Symptom:** Transactions page shows fully dark transaction rows (bg-slate-800, text-white, dark icon containers, dark amounts) while the rest of the app is light.
**Discovery Process:** User screenshot during local testing. File read confirmed: entire TransactionCard.tsx uses dark Tailwind classes — never touched in Session #2 (35-file pass) or Session #6 F2 (scoped CategorySelector/TransactionList pass).
**Root Cause:** Session #2 35-file pass did not include TransactionCard.tsx. Session #6 F2 was explicitly scoped to CategorySelector + TransactionList selection bar — TransactionCard was not listed. No post-pass `grep bg-slate src/` was run after either session to catch gaps.
**Fix (planned F1):** Full light rewrite of TransactionCard.tsx. Also fix TransactionList.tsx checkbox button dark classes (hover:bg-slate-700 → hover:bg-gray-100; text-slate-500/text-purple-400 → text-gray-400/text-blue-500).
**Pattern Tag:** #ui
**Mood:** — | **Rushing?:** —
**Avoid next time:** After any theme pass, run `grep -r "bg-slate" src/` before closing the session. Any component that renders in the main transaction list must be explicitly named in the scope.

---

## GROUP: Planning & Spec Accuracy

> Bugs where the implementation diverged from the original spec due to incorrect decisions logged

### BUG-022 — D008 duplicate detection key was incorrect | Apr 2026 | Session #5
**Symptom:** Two intentionally separate transactions ("Health > other" and "Health > Ru", same amount/description/date) flagged as duplicates on home tab.
**Discovery Process:** User screenshot showing the Dental Care pair in Possible Duplicates. Root cause confirmed in DuplicateDetectorCard.tsx — key is `amount + fromAccountId + description` only.
**Root Cause:** D008 (Session #1) incorrectly changed the duplicate key away from the original spec. The spec required `DateTime(24h) + Category + SubCategory + Account + Amount + Note`. SubCategory was dropped, which caused false positives on intentionally split transactions.
**Fix (planned F6):** Add `categoryId` and `subCategoryId` back to the duplicate condition. Correct D008 in DECISIONS.md.
**Pattern Tag:** #ui #state
**Mood:** — | **Rushing?:** —
**Avoid next time:** When modifying a detection/matching key, test against real data before committing. A key change that "fixes" false positives can introduce false negatives — both need verification.

---

## GROUP: AI & LLM Integration

### BUG-020 — resolveAIKey.ts `'use client'` blocks all server-side FAIN calls | Apr 2026 | Session #5
**Symptom:** FAIN Insights tab shows "Attempted to call buildWaterfall() from the server but buildWaterfall is on the client" on every insight card. Chat and Alerts AI features also broken.
**Discovery Process:** User screenshot. Error message is unambiguous — Next.js boundary violation.
**Root Cause:** `resolveAIKey.ts` has `'use client'` directive at the top. The file also contains server-side functions (`buildWaterfall`, `callWaterfallPrompt`, `callWaterfallChat`, all provider callers). API routes importing these functions violate Next.js's rule that server code cannot import client-marked modules.
**Fix (planned F1):** Split into `resolveAIKeyServer.ts` (no directive, server-safe) and `resolveAIKey.ts` (keep `'use client'`, client-safe only). Update all 3 FAIN routes to import from server file.
**Pattern Tag:** #state #auth
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any utility file that contains both `process.env` reads (server-only) AND `indexedDB` reads (client-only) cannot be a single file in Next.js App Router. Split at the boundary before writing the first line.

---

## GROUP: Backup & Restore

### BUG-023 — Drive Snapshot restore ConstraintError on dirty DB | Apr 2026 | Session #5
**Symptom:** "Restore failed: accounts.bulkAdd(): 28 of 56 operations failed. Errors: ConstraintError: Key already exists in the object store."
**Discovery Process:** User screenshot. SnapshotSection.tsx confirmRestore() uses bulkAdd which throws on any duplicate key.
**Root Cause:** `bulkAdd` requires all keys to be absent. If the DB has any pre-existing data with matching IDs (even from a prior partial restore or from data loaded after the Dexie transaction opened), it fails hard. Should use `bulkPut` (upsert).
**Fix (planned F9):** Replace `bulkAdd` with `bulkPut` in `SnapshotSection.tsx` confirmRestore().
**Pattern Tag:** #db
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any restore operation that clears before inserting should still use `bulkPut` not `bulkAdd` — defensive programming against race conditions and partial state.

---

## GROUP: State & Hooks

### BUG-018 — Budget edit value not reflected in UI after save | Apr 2026 | Session #5
**Symptom:** User edits a budget suggestion value, clicks ✓ to save. DB write succeeds but the UI still shows the original suggested value. Looks like the edit had no effect.
**Discovery Process:** Code review of FAINAlerts.tsx budget edit flow. `acceptBudget()` correctly writes to `db.budgets`. But `budgetSuggestions` state array is never updated — the displayed `s.suggested` value comes from state, not from the DB.
**Root Cause:** Missing state update after `acceptBudget()` call. The edit confirm handler calls `acceptBudget(s.categoryName, parseFloat(budgetEditValue))` and then `setBudgetEditingIdx(null)` — but does not call `setBudgetSuggestions(prev => prev.map(...))` to reflect the new value.
**Fix (F13, Session #7):** After `acceptBudget` succeeds, filter out the accepted entry from `budgetSuggestions` state so it disappears from the list immediately.
**Pattern Tag:** #state
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any inline edit flow must update both the DB AND the local state. DB write alone is invisible to the user until the next full re-render from a useLiveQuery.

### BUG-019 — lifeEvents deduplication gap on repeated restore | Apr 2026 | Session #5
**Symptom:** (Not yet observed in production — identified during design.) Restoring from multiple snapshots accumulates duplicate life events in the DB since restore uses append (no-clear) for lifeEvents.
**Discovery Process:** Design review during backup overhaul scoping (Session #5). lifeEvents are append-only on restore by design (D019), but no dedup key is enforced.
**Root Cause:** No deduplication logic on lifeEvents append. Two restores of the same snapshot would add the same life event twice.
**Fix (future phase):** Dedup by `detectedMonth + eventType` at restore time — skip insert if a matching record already exists. Not in scope for Phase 2.6.
**Pattern Tag:** #db
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any table marked as "always append" needs a natural dedup key defined upfront. Document it at the time the table is created, not after bugs appear.

### BUG-027 — FinancialAgeScore null-element crash in accounts.filter chain | Apr 2026 | Session #8
**Symptom:** Stats page throws "Application error" on every load. Browser console: `TypeError: Cannot read properties of null (reading 'type')` in `Array.reduce`.
**Discovery Process:** Console trace → `Array.reduce` + `s.onsuccess` (IndexedDB callback). Ruled out: SeasonalHeatmap, CorrelationWeb (both use useEffect correctly), FinancialIdentityCard (for...of, no reduce), categoryUtils (has null guard). Identified: FinancialAgeScore.tsx lines 97–104 — two `.filter(a => a.type ...)` chains on the `accounts` useLiveQuery result followed by `.reduce()`. In the minified bundle, `.filter().reduce()` compiles to a single `.reduce()` call — matches stack trace exactly.
**Root Cause:** Null record in IndexedDB accounts array. `.filter(a => a.type === '...')` accesses `a.type` on a null element → throws. No `.filter(Boolean)` element-level null guard before field access. The same exposure exists across all 11 stats components that iterate useLiveQuery results.
**Fix (planned F4):** Add `.filter(Boolean)` before every `.filter()` that accesses field properties in FinancialAgeScore.tsx. Sweep all 11 stats components and add `.filter(Boolean)` defensively before any iterated field access on useLiveQuery results.
**Pattern Tag:** #state #db
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any useLiveQuery result must have `.filter(Boolean)` as the first chain step before field access. Null DB records are a real condition — not a hypothetical.

## PATTERN SUMMARY (update monthly)

| Pattern Tag | Count | Most Common Cause | Your Mood Trend |
|-------------|-------|-------------------|-----------------|
| #balance | 2 | Not reversing before applying; CSV re-import double-counts (fixed S3) | — |
| #csv | 3 | Async/await missing, no fallback, no dedup on re-import (fixed S3) | — |
| #cache | 1 | Manual step skipped | — |
| #auth | 5 | No error degradation / wrong identifier / hardcoded external API / narrow provider type / client-server boundary violation | — |
| #ui | 7 | Wrong field format / missing nav offset guard / missed theme pass / incorrect detection key / boundary condition on date comparison | — |
| #state | 9 | Async timing, missing fallback, setState in render body, stripping hook, missing state update after DB write, null element in useLiveQuery result | — |
| #db | 5 | Wrong user identifier / snapshot coverage / bulkAdd not bulkPut / append-only dedup gap / null element in IndexedDB array | — |

**Session #6 note:** No new bugs hit. F1–F11 implemented cleanly. tsc 0 errors after F1 and F10.

BUG-014 (Drive snapshot only backed up 3 tables) — **FIXED** in Session #6 F10. All 3 tiers now cover all 11 tables.
BUG-020 (resolveAIKey `'use client'` blocks FAIN server calls) — **FIXED** in Session #6 F1. Split into server/client files.
BUG-021 (CategorySelector dark theme) — **FIXED** in Session #6 F2.
BUG-022 (D008 duplicate key incorrect) — **FIXED** in Session #6 F6. categoryId + subCategoryId added.
BUG-023 (Drive Snapshot restore ConstraintError) — **FIXED** in Session #6 F9. bulkAdd → bulkPut.

**Session #7 note:** No new bugs hit. F12–F16 implemented cleanly. tsc 0 errors after F16.

BUG-018 (Budget edit value not reflected in UI after save) — **FIXED** in Session #7 F13. `setBudgetSuggestions` filter called after `acceptBudget`; accepted entries removed from list immediately.

### BUG-024 — InsightCard localStorage SSR crash | Apr 2026 | Session #7 (post-commit)
**Symptom:** `npm run build` fails on `/fain` page — `ReferenceError: localStorage is not defined`. Build exits with code 1.
**Discovery Process:** User ran `npm run build` after pushing commit `f04f2de`. Build prerender hit the error at `.next/server/app/fain/page.js:6:9044`.
**Root Cause:** `InsightCard.tsx` line 24 — `localStorage.getItem(persistKey)` called inside a `useState` lazy initializer. Lazy initializers run synchronously at component instantiation, which happens during SSR prerender. `localStorage` does not exist on the server.
**Fix:** Added `typeof window === 'undefined'` guard to the lazy initializer — returns `null` early on server, reads localStorage only on client.
**Pattern Tag:** #ui
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any `localStorage` / `sessionStorage` access outside a `useEffect` must be guarded with `typeof window !== 'undefined'`. `useState` lazy initializers, module-level expressions, and render-body calls all execute during SSR.

**Session #8 note:** No code written (pure RCA + planning). BUG-025, BUG-026, BUG-027 diagnosed and logged for Phase 2.7.

**Session #9 note:** F1–F7 executed. tsc 0 errors throughout.

BUG-025 (TransactionCard dark theme) — **FIXED** in Session #9 F1. Full light rewrite: border-l-4 coloured borders per type, bg-white card, light dropdowns.
BUG-026 (DuplicateDetector 24h boundary) — **FIXED** in Session #9 F2. Calendar-date string equality; description dropped; footer text updated. D030 is final key.
BUG-027 (FinancialAgeScore null crash) — **FIXED** in Session #9 F4. `.filter(Boolean)` sweep across all 11 stats components.
BUG-024 (InsightCard SSR crash) — **FIXED** in Session #9 F4 (included in same commit). `typeof window === 'undefined'` guard on `useState` lazy initializer.

**Session #10 note:** Pure scoping + RCA session. No code written. BUG-028 through BUG-034 diagnosed and logged for Phase 2.7.2.

---

## GROUP: Database & Schema

### BUG-028 — GSheet updatedAt column shows Unix timestamp number | Apr 2026 | Session #10
**Symptom:** GSheet backup shows raw numbers (e.g. `1713456789000`) in the Updated At column instead of readable dates.
**Discovery Process:** User screenshot of GSheet. Root cause confirmed in `googleSheets.ts:serializeRow()` — does `String(value)` for all fields regardless of type.
**Root Cause:** `serializeRow` has no special handling for date fields. When `updatedAt` is stored as a Unix ms number in IndexedDB (accounts/categories update paths use `Date.now()`), `String(1713456789000)` writes that number directly to GSheet. ISO string values serialize correctly; only numeric timestamps are broken.
**Fix (planned):** In `serializeRow`, detect date fields (`createdAt`, `updatedAt`, `date`, `detectedMonth`, `computedAt`, `timestamp`) and if value is a number, format as `new Date(value).toISOString()` before writing.
**Pattern Tag:** #db
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any serializer that outputs to a human-readable format must explicitly handle numeric timestamps. `String(number)` is never correct for a date column.

---

## GROUP: State & Hooks

### BUG-029 — NetWorth allTransactions inner forEach missing null guard | Apr 2026 | Session #10
**Symptom:** Stats page crashes with client-side error ("Application error"). NetWorth chart shows nothing. Same symptom as BUG-027 (FinancialAgeScore null crash), now in a different component.
**Discovery Process:** Session #9 fix for BUG-027 added `.filter(Boolean)` on `accounts` in NetWorth.tsx but SESSION_LOG shows it did NOT add it to `allTransactions`. The `netWorthData` useMemo at line 146 iterates `allTransactions.forEach(tx => tx.date ...)` without null guard on `tx`. One null element in IndexedDB transactions array → crash → Stats page dies (no per-component error boundary).
**Root Cause:** Session #9 sweep was variable-level ("add .filter(Boolean) on accounts") not pattern-level ("add .filter(Boolean) before every field access on useLiveQuery arrays"). Same file, same function, 16 lines apart. Missed because `allTransactions` was guarded at the array level (`if (!allTransactions)`) which protects against `undefined` but not null elements inside the array.
**Fix (planned):** Pre-filter `allTransactions.filter(Boolean)` once in `netWorthData` useMemo before the nested loop. Use filtered array in the forEach.
**Pattern Tag:** #state #db
**Mood:** — | **Rushing?:** —
**Avoid next time:** After any null-guard sweep, grep the entire file for `.forEach`, `.map`, `.reduce`, `.filter` on the same arrays that were fixed — not just the reported pattern. One file, one pass, all array iterations.

---

## GROUP: AI & LLM Integration

### BUG-030 — FAINAlerts showFeedback renders on unrun state | Apr 2026 | Session #10
**Symptom:** Feedback buttons appear below "Run to see predictions…" default text before any AI analysis has been run. Appears as "seeking feedback" on content that doesn't exist yet.
**Discovery Process:** Code review. `showFeedback={!leadLagError}` — initial state has `leadLagError = false`, `leadLagResult = null`. `!false = true` → FeedbackButtons rendered on unrun card.
**Root Cause:** Session #9 F5 fixed the error-state case (`showFeedback={!error}`) but did not account for the pre-run state (`result === null`). Fix is incomplete — condition needed: `!error AND result !== null`.
**Fix (planned):** Change all three: `showFeedback={!leadLagError && leadLagResult !== null}`, `showFeedback={!savingsError && savingsResult !== null}`, `showFeedback={!lifeEventError && lifeEventResult !== null}`.
**Pattern Tag:** #state
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any `showFeedback` guard must cover both error state AND unrun state. Two independent conditions, both required.

---

## GROUP: UI & Display

### BUG-031 — CategoryComposition pie legend collides with slice labels | Apr 2026 | Session #10
**Symptom:** Expense/Income pie chart: legend items overlap with percentage labels on pie slices, especially with 6+ categories.
**Discovery Process:** User screenshot. Root cause: PieChart `height={300}`, `outerRadius={100}`, Recharts `<Legend />` defaults to inside the 300px container. No margin or spacing control applied.
**Root Cause:** Never addressed. `<Legend />` uncontrolled, fights for space with pie in 300px height.
**Fix (planned):** Remove `<Legend />` from PieChart (the category list below already serves as legend with color swatches). Increase `outerRadius` to 110 to use freed space.
**Pattern Tag:** #ui
**Mood:** — | **Rushing?:** —
**Avoid next time:** When a component already renders a custom legend (the category card list), do not also render Recharts `<Legend />` — they duplicate and compete for space.

### BUG-032 — SeasonalHeatmap axis labels too pale to read | Apr 2026 | Session #10
**Symptom:** Month column labels and category row labels on the Seasonal Heatmap are very light and difficult to read, especially on white background.
**Discovery Process:** User screenshot. Code confirms: month labels `fill="#9ca3af"` (gray-400), category labels `fill="#6b7280"` (gray-500). Low-spend cells get opacity as low as `0.15 + 0.85 * (amount/max)` → ≈0.15 for sparse weeks.
**Root Cause:** Color values chosen for dark-theme origin; never updated when app moved to light theme (Session #2). Never flagged during any post-light-theme review.
**Fix (planned):** Month labels → `fill="#374151"` (gray-700). Category labels → `fill="#374151"`. Minimum cell opacity → `0.20` (from `0.15`).
**Pattern Tag:** #ui
**Mood:** — | **Rushing?:** —
**Avoid next time:** After any theme change, run grep for hardcoded hex color values in SVG `fill` attributes — these are not Tailwind classes and are invisible to a class-level theme audit.

### BUG-033 — CorrelationWeb 3 view types hidden when < 6 months subcategory data | Apr 2026 | Session #10
**Symptom:** Correlation chart area shows "Need at least 6 months of data" with no view toggles (Heatmap/Chord/Bubble), even when user has substantial transaction history but with limited subcategory usage.
**Discovery Process:** Code review. `months.size < 6` guard in `CorrelationWeb.tsx:94` sets `hasEnoughData: false`. JSX at line 436 wraps all 3 view toggles inside `{result?.hasEnoughData && ...}`. Guard is based on distinct months with subcategorized expense transactions — not total months of data.
**Root Cause:** 6-month threshold was arbitrary. User may have 12 months of data but if subcategory assignment is sparse, `months.size` stays below 6. Also, seasonal/lifestyle charts (SeasonalHeatmap, LifestyleInflationCurve) have no similar guard — inconsistent UX.
**Fix (planned):** Remove `months.size < 6` guard. Compute on any available data. Show "limited data — results may not be statistically significant" disclaimer when months < 6. Pearson r handles sparse data (already returns 0 for < 3 data points via existing guard in `pearson()`).
**Pattern Tag:** #ui #state
**Mood:** — | **Rushing?:** —
**Avoid next time:** Arbitrary data minimums for chart display should be consistent across all deep insight components. If one shows with sparse data, all should.

### BUG-034 — SeasonalHeatmap requires manual compute on first open | Apr 2026 | Session #10
**Symptom:** SeasonalHeatmap shows "▶ Compute" button on first open (no cache). User must manually trigger computation. CorrelationWeb auto-computes — inconsistent behavior across the two data-derived deep insight charts.
**Discovery Process:** Code review. SeasonalHeatmap `useEffect` only loads from cache — no auto-compute fallback. CorrelationWeb has both: load-from-cache + auto-compute if no valid cache.
**Root Cause:** Session #7 removed the "Recompute" button per spec, but never added auto-compute-on-mount logic. The initial "▶ Compute" button was retained as the only trigger.
**Fix (planned):** Add `txCount` tracking (via `useLiveQuery`) and `lastTxCountRef` pattern to SeasonalHeatmap. Auto-compute on mount if no valid cache. Auto-recompute when `txCount` changes. Remove the `{!result && <button>▶ Compute</button>}` block entirely.
**Pattern Tag:** #ui #state
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any data-derived deep insight chart should auto-compute. Manual compute buttons are only valid for AI-inferred content (where cost/latency justifies explicit trigger).

### BUG-035 — FinancialAgeScore + SubCategoryTrend missing .filter(Boolean) on categories.map() | Apr 2026 | Session #10
**Symptom:** Stats page crashes with "Application error: a client-side exception" immediately after BUG-029 (NetWorth allTransactions crash) was fixed. Two separate crashes surface one after the other.
**Discovery Process:** Fixed BUG-029 → refreshed stats page → new crash. Read FinancialAgeScore.tsx line 58: `categories.map((c) => [c.id!, c.name.toLowerCase()])` — no `.filter(Boolean)`. Read SubCategoryTrend.tsx line 63: `categories.map(c => [c.id!, c])` — no `.filter(Boolean)`. Both construct Maps from raw `categories` useLiveQuery result. One null element → destructure crash on `c.id!`.
**Root Cause:** Session #9 F4 null-guard sweep added `.filter(Boolean)` to many patterns (`tx.field`, `a.field`, etc.) but missed category Map construction calls — these don't look like the typical `.filter(a => a.field)` guard pattern, so they passed visual review. The two crashes were hidden behind the NetWorth crash (first component rendered on stats page — subsequent crashes never reached).
**Fix:** Added `.filter(Boolean)` before `.map()` in both files:
- `FinancialAgeScore.tsx` line 58: `categories.filter(Boolean).map((c) => [c.id!, c.name.toLowerCase()])`
- `SubCategoryTrend.tsx` line 63: `categories.filter(Boolean).map(c => [c.id!, c])`
**Pattern Tag:** #state #db
**Mood:** — | **Rushing?:** —
**Avoid next time:** After fixing the first crash in a component chain, always grep the entire stats/ directory for `.map(` on `categories`, `transactions`, and `accounts` before declaring the sweep complete. Map construction calls (`new Map(array.map(...))`) are just as vulnerable as field-access chains but look different syntactically — they require the same `.filter(Boolean)` guard.

**Session #13 note:** V2.7.4 execution complete (C1–C7). All 7 commits CODE-ONLY pending build verification.

BUG-039 (NetWorth liability dual-toggle + fallback) — **FIXED** in S13 C7. Tri-state classification (D040) + toggle-only classifier (D041). Liability accounts now solely defined by `isLiability=true`; no negative-balance fallback.
BUG-040 (CorrelationWeb empty card cache version 3 stale) — **FIXED** in S13 C5+C6. Cache version 3 → 4 + one-shot `computedInsights.clear()` on app boot if `clearedInsightsAt < INSIGHTS_BUILD_DATE`.
BUG-041 (BRIEF + SAGE missing acronym subtitle) — **FIXED** in S13 C1. Stacked icon + h1 + subtitle layout matching HUB/RADAR/TALLY pattern.
BUG-042 (UncomfortableTruth missing per-statement feedback) — **FIXED** in S13 C4. Per-statement 👍 👎 inline; transient state cleared on Recompute; each click writes to `feedbackLog` with statementHash for future training.
BUG-043 (Category dropdowns showing account names) — **FIXED** in S13 C3. Shared `useCleanCategories()` hook applied at source across 13 display files. Top-level filter only (subcategories pass through per S12 user clarification).
BUG-044 (process — stale .next/ build) — **CODIFIED** in S12 Bucket B (CLAUDE.md Rule 1). No code change; mandates clean rebuild + screenshot before any "fix" claim.

**Session #10 note:** BUG-028 through BUG-034 fixes applied (E1–E7 + C1–C3). BUG-035 crash fix applied. tsc 0 errors throughout.

BUG-028 (GSheet numeric timestamps) — **FIXED** in Session #10 C1. `DATE_FIELDS` set + numeric → ISO conversion in `serializeRow`.
BUG-029 (NetWorth allTransactions inner forEach null crash) — **FIXED** in Session #10. `safeTransactions = allTransactions.filter(Boolean)` before nested loop.
BUG-030 (FAINAlerts showFeedback pre-run state) — **FIXED** in Session #10. `showFeedback={!xxxError && xxxResult !== null}` on all 3 AlertCards.
BUG-031 (CategoryComposition pie legend collision) — **FIXED** in Session #10. Removed `<Legend />`, increased outerRadius.
BUG-032 (SeasonalHeatmap pale axis labels) — **FIXED** in Session #10. Labels `fill="#374151"`, min opacity 0.20.
BUG-033 (CorrelationWeb hidden behind 6-month guard) — **FIXED** in Session #10. Guard removed; `hasEnoughData: months.size >= 3`; soft disclaimer added.
BUG-034 (SeasonalHeatmap manual compute required) — **FIXED** in Session #10. Auto-compute on mount via txCount + lastTxCountRef pattern. Manual compute button removed.
BUG-035 (FinancialAgeScore + SubCategoryTrend categories.map null crash) — **FIXED** in Session #10 (this entry).

**Session #11 note:** Phase 2.7.3 — 3 bugs fixed (BUG-036, BUG-037, BUG-038). 2 reported bugs were false positives (code already correct). tsc 0 errors.

BUG-036 (CorrelationWeb silent no-render on no subcategory data) — **FIXED** in Session #11. Category-level fallback + empty state added.
BUG-037 (AccountsTable includeInNetWorth toggle first-click no-op) — **FIXED** in Session #11. toggleBoolCell rewritten with explicit boolean semantics.
BUG-038 (Page h1 titles not updated in S10) — **FIXED** in Session #11. RADAR/SAGE/TALLY/HUB applied to all 4 page bodies.

---

## GROUP: UI & Display (continued)

### BUG-036 — CorrelationWeb silent no-render when no subcategory data | Apr 2026 | Session #11
**Symptom:** All 3 correlation views (Heatmap, Chord, Bubble) show nothing after computing. Card appears to compute successfully but displays blank content with no error or explanation.
**Discovery Process:** S10 removed the 6-month guard and logged BUG-033 as fixed. But the chart still showed nothing for the user. Root cause: the fix only removed the data-quantity guard — it did not address the case where `raw.length === 0` because no transactions have `subCategoryId` assigned. All 3 view useMemos return `null` when `names.length === 0`. No empty-state message exists for this case.
**Root Cause:** `raw` is filtered to only transactions where `t.subCategoryId` exists and `subCatMap.get(t.subCategoryId)` resolves. If the user has not assigned subcategories to transactions, `raw` is empty → `series = []` → `names = []` → all views return `null`. S10 fix addressed the wrong condition (months.size guard) and did not test whether any subcategory data actually exists.
**Fix:** In `compute()`: if `raw.length === 0` after subcategory filter, rebuild `raw` from `categoryId` using same `subCatMap`. Store `isFallback: boolean` in `MatrixResult`. JSX: blue note when fallback, explicit empty-state paragraph when `names.length === 0`, all 3 views gated on `names.length > 0`.
**Pattern Tag:** #ui #state
**Mood:** — | **Rushing?:** —
**Avoid next time:** After any chart fix, test with data that matches the exact condition fixed AND with data that does not. Fixing a guard does not guarantee the chart renders — the underlying data may still be empty for a different reason.

### BUG-037 — AccountsTable includeInNetWorth toggle first-click does nothing | Apr 2026 | Session #11
**Symptom:** Clicking the Net Worth toggle on an account that has never had the toggle set appears to do nothing — toggle stays in the same visual state. Second click then works.
**Discovery Process:** User reported liabilities line persisting despite deactivating credit card account toggles. Traced to `toggleBoolCell`: `!account['includeInNetWorth']` when field is `undefined` → `!undefined = true` → saves `true`. Toggle display uses `account.includeInNetWorth !== false`, so `undefined` and `true` both render as ON. First click goes from undefined (ON) to true (ON) — zero visual change. Second click: `!true = false` → renders OFF. User saw first click as a no-op.
**Root Cause:** `!account[field]` treats `undefined` as falsy → `!undefined = true`. But `includeInNetWorth` has a default-true semantic (included unless explicitly excluded). The display already uses `!== false` to express this, but the toggle setter did not match that logic.
**Fix:** `currentVal = account[field] !== false` for `includeInNetWorth` (undefined + true → currentVal=true → toggle sets false). `!!account[field]` for `isLiability` (unchanged effective behaviour, now explicit).
**Pattern Tag:** #state #ui
**Mood:** — | **Rushing?:** —
**Avoid next time:** When a field has a non-false default (undefined = on), the toggle setter must derive current state the same way the display does. If display uses `!== false`, setter must also use `!== false` — not `!!value` or `!value`.

### BUG-038 — Page h1 titles not updated after nav label rename | Apr 2026 | Session #11
**Symptom:** Individual page headers still show "Stats & Insights", "Transactions", "FAIN" after S10 renamed nav tabs to RADAR/TALLY/SAGE/HUB. Settings page had no h1 at all.
**Discovery Process:** User noticed tab names changed in bottom nav and sidebar but not on the actual page screens.
**Root Cause:** S10 task C3 only updated `Sidebar.tsx` NAV_ITEMS labels and `BottomTabNavigation.tsx` — the page-level `<h1>` elements inside each route's `page.tsx` were never touched. Settings page had no h1 whatsoever (only a subtitle and icon). Scope was written as "nav labels" but the intent was full app renaming.
**Fix:** Updated h1 in `stats/page.tsx` (RADAR), `fain/page.tsx` (SAGE), `transactions/page.tsx` (TALLY). Added h1 to `settings/page.tsx` (HUB). Subtitles updated to match acronym expansions.
**Pattern Tag:** #ui
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any app-wide rename must list every surface where the name appears: nav label, page h1, browser tab title, any other header. Never scope "rename X" to just one of those surfaces.

**Session #12 note:** Pure RCA + scoping + process-rules session. No code fixes applied. 5 new bugs diagnosed and logged for V2.7.4.

### BUG-039 — NetWorth liability calc: dual-toggle + hidden negative-balance fallback produce nonsense values | Apr 2026 | Session #12
**Symptom:** Total Liabilities shows ₹0 when GDrive snapshot is restored (with user's CC accounts having `isLiability=ON` but `includeInNetWorth=OFF`); shows ₹30,378.2 (random small value) after fresh CSV import. Neither value matches any sensible formula on user's actual debt.
**Discovery Process:** User screenshots + PDF showed inconsistent liability totals across the same data depending on import path. RCA traced two interacting bugs in `NetWorth.tsx`: (1) line 130 filter `accounts.filter(acc => acc.includeInNetWorth !== false)` drops CC accounts before they reach the liability check; (2) lines 164-170 have hidden `else if (balance < 0)` fallback that adds any account with negative balance to liabilities regardless of toggle state.
**Root Cause:** Two-part. (a) The filter at line 130 makes `includeInNetWorth` a prerequisite for ANY classification — accounts with NW=OFF never get classified at all. CCs typically have NW=OFF (user excludes them from net worth view) and Liab=ON → they fall through both gates → liability=0. (b) The negative-balance fallback overrides toggle intent — toggling `isLiability` OFF on an overdrawn bank account still counts it as a liability via balance<0. Different import paths produce different default flag values, so identical data yields different liability totals.
**Fix (planned F1+F2 / D040+D041):** Tri-state account classification (Liability / Neither / Asset). Toggle is the ONLY classifier — no negative-balance fallback. Liability = signed sum of liability-account balances, displayed as `Math.abs()`.
**Pattern Tag:** #state #db #balance
**Mood:** Extremely angry (5+ session recurrence) | **Rushing?:** N
**Avoid next time:** Two independent toggles with overlapping semantics + a hidden fallback rule = unfixable by inspection. When two flags can both be ON or both OFF and the calc has implicit overrides, redesign to one-of-N classification immediately. Don't patch around it.

### BUG-040 — CorrelationWeb empty card: cache version 3 holds empty result, never invalidates | Apr 2026 | Session #12
**Symptom:** Spending DNA — Correlation card on RADAR page renders header + subtitle only, no content below. PDF confirms across multiple post-rebuild tests.
**Discovery Process:** Code review of `CorrelationWeb.tsx`. S11 added `isFallback` field + category-level fallback when no subcategory data exists. But `isCacheValid()` checks `version === 3` only — does not check whether the cached result is meaningfully populated. Cached result from S10 (with `names: [], isFallback: undefined`) loads as "valid", `setResult` fires with empty result, JSX renders `"Not enough expense data to compute correlations."` in tiny grey text → looks blank.
**Root Cause:** Cache version not bumped when S11 added the fallback path. Old cached results from S10 (which produced empty `names` because no subcategory data) are deemed valid forever. The S11 fallback compute path never runs because the empty result blocks it.
**Fix (planned F3 / D042+D043):** Cache version 3 → 4. Add `clearedInsightsAt` flag to `appSettings`; one-shot `db.computedInsights.clear()` on app boot if flag is older than build date. `cacheId` in `next.config.mjs` bumped in coordinated commit.
**Pattern Tag:** #cache #state
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any `computedInsights` schema change MUST bump cache version AND `cacheId` in the same commit. Add to CLAUDE.md (covered via D043).

### BUG-041 — BRIEF + SAGE missing acronym subtitle parity with HUB/RADAR/TALLY | Apr 2026 | Session #12
**Symptom:** HUB, RADAR, TALLY pages show stacked icon + h1 + acronym-expansion subtitle. BRIEF page shows only h1 + date (no acronym). SAGE shows inline icon + h1 + subtitle on one line, not stacked.
**Discovery Process:** User screenshots + PDF. Inspected `home/page.tsx` (only h1 "BRIEF"), `fain/page.tsx` (inline `🧠 SAGE Spend Analysis & Guidance Engine`).
**Root Cause:** S10 nav rename (D034) renamed nav labels and updated h1 on TALLY/RADAR/HUB but did not apply consistent header layout pattern across BRIEF and SAGE. Scope of "rename tabs" was interpreted narrowly.
**Fix (planned F7 / D047):** Add subtitle "Balances, Risk Indicators & Essential Financials" to BRIEF stacked below h1. Restructure SAGE header from inline to stacked icon + h1 + subtitle. Match HUB indentation exactly.
**Pattern Tag:** #ui
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any app-wide rename / restyle must enumerate every surface and apply identical layout pattern. "Rename" ≠ "rename in 3 places."

### BUG-042 — UncomfortableTruth missing per-statement feedback (carried from S11) | Apr 2026 | Session #11 → Session #12 (RCA confirmed)
**Symptom:** Truth statements show only a single card-level "Did this change how you think about your spending? Yes / Somewhat / No" prompt. Per-statement thumbs up/down for each numbered truth (decided in earlier scope) is absent.
**Discovery Process:** S11 user reported as bug; S11 agent dismissed as false positive based on static code reading. S12 PDF re-confirmed: card-level only, no per-statement controls. Code inspection: `UncomfortableTruth.tsx` has no per-statement feedback render path.
**Root Cause:** Per-statement feedback existed in some past version per user testimony, removed in unknown refactor, never re-added. S11 agent failed to verify against running app — repeated UL-11 lesson.
**Fix (planned F4 / D044):** Each numbered statement gets inline 👍 👎. Transient state cleared on Recompute. Each click writes to `feedbackLog` with statementHash + recomputeId for future training. Card-level Yes/Somewhat/No removed.
**Pattern Tag:** #ui #state
**Mood:** Frustrated (carried 2 sessions) | **Rushing?:** N
**Avoid next time:** When user reports a feature as missing and code does not show it, the answer is always "feature missing" — never "false positive based on static read." Static code reading is sufficient to confirm presence, never absence-of-bug-in-runtime.

### BUG-043 — Category dropdowns showing account names (CSV import contamination) | Apr 2026 | Session #12
**Symptom:** Transactions page filter "Category" dropdown shows AMEX, AMZ, ANR, Axis, Cash, Cashback, DB, etc. — these are ACCOUNT names, not categories. Other category dropdowns and chart legends presumed similarly polluted.
**Discovery Process:** User screenshot of category dropdown in Transactions filter showed mixed account/category names. Likely cause: CSV import process auto-creates category records when CSV "category" column contains values that don't match existing categories. If user's CSV has account names in the category column (common from bank statement exports), those account names become category records.
**Root Cause:** Pollution at DB level (categories table contains account-named records). Filtering at every dropdown is symptom-treatment; cleaning the DB is root-cause.
**Fix (planned F5 / D045):** Shared helper `useCleanCategories()` filters out any category matching an account name (case-insensitive exact). Applied at SOURCE — every dropdown AND every chart legend reads through helper. Pollution stays in DB but never surfaces to UI. Trade-off accepted: legitimately-named categories that happen to match account names are also hidden.
**Pattern Tag:** #db #ui
**Mood:** — | **Rushing?:** —
**Avoid next time:** Any auto-create-on-import logic must validate input against a known-name blacklist (account names being the obvious one). Add validation to `csvImport.ts` future scope.

### BUG-044 (process) — 4+ sessions of "still broken" reports caused by stale `.next/` build, not bad code | Apr 2026 | Session #12
**Symptom:** Across Sessions #5–#11, user repeatedly reported bugs as "still happening" after fixes were applied. Each session attempted re-fixes; same complaints recurred. User's frustration peaked at S11 ("penalty session").
**Discovery Process:** S12 round 5 hypothesis: stale build pipeline. User confirmed disk code had TALLY h1 but UI rendered "Transactions" — string did not exist anywhere in the codebase. After clean rebuild (`Remove-Item .next; npm run build; npm run start`), TALLY appeared.
**Root Cause:** `npm run start` serves `.next/` build output verbatim. If `.next/` was last generated before the fix landed, browser receives months-old JS regardless of source code state, hard refresh, or service worker unregister. Verification standard across S5–S11 was tsc-passing + on-disk code change — neither catches a stale build artifact.
**Fix:** No code change. CLAUDE.md Rule 1 (Deploy hygiene) now mandates clean rebuild + screenshot before any "fix" claim. SESSION_LOG `Verified by:` field documents verification level. Default `CODE-ONLY` until upgraded.
**Pattern Tag:** #cache #process
**Mood:** Extremely angry (rightfully) | **Rushing?:** N
**Avoid next time:** tsc passing ≠ user sees the change. Every session that touches code ends with clean rebuild + screenshot OR `[CODE-ONLY]` tag. No exceptions.

## PATTERN SUMMARY (update monthly)

| Pattern Tag | Count | Most Common Cause | Your Mood Trend |
|-------------|-------|-------------------|-----------------|
| #balance | 3 | Reverse-then-apply missing; CSV re-import double-counts (fixed S3); dual-toggle architectural mismatch (D040/D041) | — |
| #csv | 3 | Async/await missing, no fallback, no dedup on re-import (fixed S3) | — |
| #cache | 3 | Manual step skipped; computedInsights version not bumped on schema change; stale .next/ across deploys | Frustrated |
| #auth | 5 | Error degradation / wrong identifier / hardcoded model / narrow provider type / client-server boundary violation | — |
| #ui | 10 | Field format / nav offset / theme pass / detection key / boundary date / missed h1 / contamination / collision | — |
| #state | 11 | Async timing / fallback missing / setState in render body / hook stripping / null elements / dual-toggle conflicts | — |
| #db | 7 | User identifier / snapshot coverage / bulkAdd not bulkPut / append-only dedup / null elements / contamination / dual-toggle filter gates | — |
| #process | 1 | tsc-passing treated as runtime verification across multiple sessions | Extremely angry → constructive |

<!-- AGENT: append new bugs under correct group. Add new group if needed. Update Pattern Summary monthly. -->
