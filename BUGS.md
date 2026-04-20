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

<!-- AGENT: append new bugs under correct group. Add new group if needed. Update Pattern Summary monthly. -->
