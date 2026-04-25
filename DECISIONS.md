# DECISIONS — Money Mngr PWA
> Captures the *why* behind every feature, UI call, and architecture choice.
> This is the second brain. If it's not here, it didn't happen.

---

## HOW TO USE
- Agent adds entry whenever a QnA chain changes approach to a feature
- Simple features → bullet trail (A/C format)
- Complex features → full structured block
- Link from SESSION_LOG using #ID
- Feature ideation (from claude.ai sessions) → logged under IDEATION LOG section

---

## SECTION 1 — STANDING DECISIONS
> Architecture-level. Never revisit without major reason.

| # | Decision | Reason | Date |
|---|----------|--------|------|
| S1 | Local-first (IndexedDB/Dexie) | Privacy-first, no backend cost, works offline | Jan 2026 |
| S2 | Mobile-first bottom nav (5 tabs, icons only) | Gen Z UX pattern, thumb-friendly | Feb 2026 |
| S3 | Google Drive backup via OAuth `drive.file` scope | Least permission, user controls visibility | Feb 2026 |
| S4 | AI key chain: User Gemini → User Claude → Dev Gemini → Dev Claude | Cost control + user flexibility | Feb 2026 |
| S5 | No monetization until post-launch feedback | Avoid premature optimization | Mar 2026 |
| S6 | Dual-agent Claude Code workflow (sequential, shared CLAUDE.md) | Prevent context drift, avoid merge conflicts | Mar 2026 |

---

## SECTION 2 — FEATURE DECISIONS
> The "why" behind every feature and UI call. Agent appends after sessions.

### DECISION TEMPLATES

**Simple (low QnA, quick call):**
```
**#[ID] — [Feature Name]** | [Date] | Session #[N]
- Tried: Option A → rejected (reason)
- Tried: Option B → rejected (reason)
- ✅ Went with: Option C — because [reason]
```

**Complex (high QnA, multi-session):**
```
---
**#[ID] — [Feature Name]**
**Date:** | **Session #:** | **Phase:**

**Context:** Why this decision was needed

**Options Considered:**
| Option | Pro | Con | Verdict |
|--------|-----|-----|---------|
| A | ... | ... | ❌ |
| B | ... | ... | ✅ |

**Final Decision:** 
**Reason:** 
**Trade-offs accepted:** 
**Revisit if:** 
---
```

---

**#D001 — FAIN Tab Structure** | Feb 2026
- Tried: Single chat view → too simple, no separation of concerns
- Tried: Separate pages → too much navigation overhead
- ✅ Went with: Segmented toggle (Chat / Insights / Alerts) — keeps AI features contained, scannable, thumb-friendly

**#D002 — Google Drive Backup Scope** | Feb 2026
- Tried: Service account → requires backend, too much permission
- Tried: Full drive scope → user privacy concern
- ✅ Went with: `drive.file` OAuth scope — least privilege, user sees folder, no hidden access

**#D003 — Bottom Nav: Icons Only** | Feb 2026
- Tried: Icons + labels → too much visual weight on mobile
- Tried: Labels only → not scannable
- ✅ Went with: Icons only — Gen Z pattern, cleaner, thumb zone optimized

**#D004 — AI Key Storage: User Keys** | Apr 2026 | Session #1
- Tried: 5 user slots → rejected (over-engineering for personal PWA)
- Tried: 2 slots (Gemini + Claude) → rejected (OpenAI excluded, limits user choice)
- ✅ Went with: 3 user slots, each with provider dropdown + key field — provider auto-detected from key prefix; unrecognized prefix silently skipped

**#D005 — AI Key Slot: URL-based providers (Groq, OpenRouter, Ollama)** | Apr 2026 | Session #1
- Tried: 2 fields per slot (key + base URL) → rejected (adds UI complexity for edge case)
- ✅ Went with: 1 field per slot for now (key only) — Groq/OpenRouter/Ollama deferred to a later phase

**#D006 — Dev API Fallback Keys** | Apr 2026 | Session #1
- ✅ Went with: 2 dev slots via env vars (`AI_DEV_KEY_1`, `AI_DEV_KEY_2`) — waterfall: User-1 → User-2 → User-3 → Dev-1 → Dev-2 → Error popup

**#D007 — GSheet UserID: UUID vs Email** | Apr 2026 | Session #1
- Tried: One-time migration (rename UUID rows to email) → ~3–4 hrs effort
- ✅ Went with: Fresh start — change `session.user.id = token.email`, accept orphaned UUID rows
- Trade-off: Existing GSheet backups under UUID become unrestorable. User must re-backup post-deploy.

**#D008 — Duplicate Detection Key** | Apr 2026 | Session #1
⚠️ Corrected by D021 (Session #5) → D030 (Session #8, final). The key set here was wrong.
- Old key: `amount + account + categoryId` — matched too broadly (same recurring expense flagged)
- ~~New key: `amount + account + description` within 24h~~ — incorrect. Description caused false negatives; 24h window caused false positives on midnight entries. See D021 → D030 for final key.

**#D009 — Force Logout on Session Expiry** | Apr 2026 | Session #1
- Tried: Blocking overlay with auto-redirect → rejected (breaks offline-first; user on flight loses ability to add txns)
- Tried: Countdown timer + force redirect → rejected (patronizing, over-engineered)
- ✅ Went with: Persistent red non-blocking banner ("Session expired — re-login to sync") with Re-login button. Data safe in IndexedDB across session expiry.

**#D010 — Local Backup Format** | Apr 2026 | Session #1
- Tried: Excel/XLSX → rejected (tamper risk via formulas, heavier)
- Tried: CSV → rejected (multi-table, loses structure)
- ✅ Went with: Single JSON file — all 4 tables + appSettings; portable, space-efficient, no formula injection risk
- Import scope: Settings tab = JSON import overwrites all data. Transaction tab = CSV import adds rows only.

**#D011 — Accounts Management Location** | Apr 2026 | Session #1
- Old: `/accounts` standalone page + accordion list in Settings
- ✅ New: Full sortable/inline-editable table embedded in Settings > Accounts tab. `/accounts` route redirects to `/settings`. Removes duplicate surface.

**#D012 — Stats Page Theme** | Apr 2026 | Session #1
- Tried: Deep insights dark, regular charts light → rejected (visual inconsistency)
- Tried: Full light theme → rejected (inconsistent with rest of app)
- ✅ Went with: Entire stats page dark — gradient `from-slate-900 to-slate-950`, regular chart cards `bg-slate-800/60`, deep insight cards unchanged (already dark). Shared `chartColors.ts` palette for all Recharts components.

**#D013 — Full App Light Theme (supersedes D012)** | Apr 2026 | Session #2
- D012 (Apr 2026, Session #1) had chosen dark gradient for Stats page, matching the rest of the app which was dark.
- Decision reversed: user requested full light theme across every page, component, and modal.
- Palette locked: page bg `bg-gray-50`, cards `bg-white border border-gray-200`, text `text-gray-900 / text-gray-600 / text-gray-400`, income `emerald-600`, expense `red-500/600`, active nav `bg-blue-50 text-blue-600`.
- ✅ Went with: Full light theme — 35+ files changed. D012 kept for history only.
- Trade-off: `chartColors.ts` (shared dark palette) is now partially unused — chart `stroke`/`fill` values were updated per-component rather than centralised.

**#D014 — Granularity Toggles on Time-Series Charts** | Apr 2026 | Session #2
- Added 1D/1W/1M toggle to: IncomeVsExpense, NetWorth (already had it, default changed), AccountBalanceHistory, SubCategoryTrend.
- ✅ Default: `1M` for all four — matches the period filter that the Stats page already defaults to.
- CategoryTrend was intentionally skipped — it only shows top-5 by month; 1D/1W would produce too many lines. Deferred.
- AccountBalanceHistory: granularity is implemented via downsampling (daily data computed once, then sampled). 1D on 1Y range = ~365 points; may be crowded — watch for this.
- SubCategoryTrend: full re-bucketing (not downsampling) — `buckets` + `trendData` rewritten to match granularity.

**#D015 — Drive Snapshot: Which Tables to Include** | Apr 2026 | Session #2
- Current state: snapshot covers only `accounts`, `categories`, `transactions` (3 of 11 tables). BUG-014.
- Tables in DB: `accounts`, `categories`, `transactions`, `filterPresets`, `budgets`, `goals`, `lifeEvents`, `feedbackLog`, `appSettings`, `computedInsights`, `categoryBuckets`
- Decision needed before fixing BUG-014: which tables are "user data" vs "derived/log data"?
- Proposed split:
  - ✅ Include in snapshot: `accounts`, `categories`, `transactions`, `filterPresets`, `budgets`, `goals`, `lifeEvents`, `appSettings`
  - ❌ Exclude (safe to regenerate): `feedbackLog` (telemetry), `computedInsights` (cached AI results), `categoryBuckets` (derived aggregates)
- Not yet decided/implemented — needs user confirmation before coding.

**#D016 — CSV Dedup: sourceHash uses parsed ISO date, not raw CSV string** | Apr 2026 | Session #3
- Tried: Hash raw CSV datetime string → rejected. Raw string differs by CSV format (dd-MM-yyyy vs ISO), so same transaction imported from two differently formatted CSVs would produce different hashes.
- ✅ Went with: Parse date to `Date` object first, then use `date.toISOString()` as hash input — consistent regardless of CSV source format.
- Trade-off: Hash computed after date parsing. If two CSVs represent the same transaction with a time offset (e.g. one has time, one doesn't), they may produce different hashes. Acceptable for this use case.

**#D017 — CSV Dedup: Zone-based import strategy** | Apr 2026 | Session #3
- Problem: Full hash lookup on every row across 13k+ transactions would be O(n²) and freeze the UI.
- ✅ Went with: Zone classification — rows BEFORE `dbEarliest` and AFTER `dbLatest` insert blindly (no overlap possible). Only OVERLAP zone rows are hash-checked. Overlap hashes loaded once as a `Set<string>` → O(1) per row, O(n) total.
- Trade-off: Rows exactly on the boundary dates (same day as `dbEarliest` or `dbLatest`) fall into the OVERLAP zone — slightly more conservative than necessary but safe.
- Bootstrap caveat: Existing transactions have no `sourceHash`. On first post-deploy re-import, all overlap rows will appear as "missed" (empty hash Set). User must click "Skip all" on that first import. Subsequent imports dedup correctly once all rows carry hashes.

**#D018 — AI Key Redesign: Slot-order waterfall replaces provider-order waterfall** | Apr 2026 | Session #3
- Old system: Hardcoded Gemini → OpenAI → Claude regardless of user preference.
- ✅ New system: 3 user slots (each with provider dropdown + key field). Waterfall order = Slot 1 → Slot 2 → Slot 3 → Dev-1 → Dev-2. Provider at each slot is whatever user chose — no forced order.
- Dev slots: `AI_DEV_KEY_1` and `AI_DEV_KEY_2` — server-side env vars only (no `NEXT_PUBLIC_` prefix → never exposed to browser). Provider auto-detected from key prefix (AIza=Gemini, sk-ant-=Claude, sk-=OpenAI).
- Migration: On first Settings page load, old `gemini_api_key` / `claude_api_key` from IndexedDB are silently migrated to Slot 1 / Slot 2 respectively, then old keys deleted.
- Scope: FAIN routes (chat, insights, alerts) + UncomfortableTruth use new system. `llmService.ts` (SMS parsing/Magic Box) intentionally left on old env var system — not in scope for this wave.

**#D019 — Backup scope: all 11 tables across all 3 tiers** | Apr 2026 | Session #5
- Old: GSheet backed up 4 tables, GDrive 3 tables, Local JSON 8 tables — inconsistent.
- ✅ All 3 tiers (GSheet, GDrive Snapshot, Local JSON) now back up all 11 tables.
- Split: **Replace on restore** (clear + bulkPut): `transactions`, `accounts`, `categories`, `filterPresets`, `budgets`, `goals`, `categoryBuckets`, `appSettings`. **Append on restore** (never clear, only add new rows): `lifeEvents`, `feedbackLog`, `computedInsights`.
- Rationale: feedbackLog and computedInsights are long-term training data — wiping on restore would destroy user behaviour history. lifeEvents are user-authored and should accumulate across restores.

**#D020 — Safe to Spend: threshold-based logic only** | Apr 2026 | Session #5
- Old: Aggregated all accounts with `includeInNetWorth !== false && !isLiability` — included investment accounts, wallets, etc.
- ✅ New: Only include accounts where `thresholdValue > 0`. Compute per-account `balance - thresholdValue`, sum across qualifying accounts.
- Rationale: Threshold is the user's explicit intent signal. Accounts without a threshold set (e.g. investments) should not pollute "safe to spend" — that metric is about liquid, budgeted funds only.
- New companion card: `BelowThresholdCard` — persistent on home tab, lists each account where `balance < thresholdValue` with deficit amount. Disappears when no account is below threshold.

**#D021 — Duplicate detection key correction (supersedes D008)** | Apr 2026 | Session #5
- D008 (Session #1) changed the key to `amount + account + description` — this was incorrect per original spec.
- ✅ Correct key: `DateTime(24h) + Category + SubCategory + Account + Amount + Note`.
- Rationale: Two transactions with same description/amount/account but different subcategories (e.g. "Health > other" vs "Health > Ru") are intentionally different entries and must not be flagged as duplicates.
- D008 entry in DECISIONS.md annotated as corrected.

**#D022 — Budget suggestions at subcategory level** | Apr 2026 | Session #5
- Old: Budget Auto-Suggestion computed at category level using `fainContext.topCategories`.
- ✅ New: Compute at subcategory level using `fainContext.topSubCategories`.
- Rationale: Category-level budgets are too coarse. "Food" as a single budget hides the difference between "Food > Eating out" (discretionary) and "Food > Groceries" (essential).
- Edge case: transactions with no subcategory fall back to parent category name.

**#D023 — Clear Data scope + append-only table preservation** | Apr 2026 | Session #5
- Old: "Clear All Data" cleared only `transactions`, `accounts`, `categories` — left `filterPresets` intact inconsistently.
- ✅ New: "Clear Data" (renamed) clears all 8 replace-tables. Never touches `feedbackLog`, `computedInsights`, `lifeEvents`.
- Rationale: feedbackLog and computedInsights are the basis for long-term AI personalization. Wiping them on a data reset destroys accumulated learning. lifeEvents are user-authored milestones.

**#D024 — FAIN waterfall: no user key prompt, always run** | Apr 2026 | Session #5
- Old: FAIN components showed "Add your Gemini API key in Settings to unlock AI features" when no user key present. AI features gated on `hasKey`.
- ✅ New: FAIN always runs the waterfall. User-1 → User-2 → User-3 → Dev-1 → Dev-2. If no user keys, dev keys handle it silently. No prompt shown.
- Rationale: Dev keys are always present. Prompting users to add keys when the app works without them is hypocritical and degrades UX.

**#D025 — SeasonalHeatmap at subcategory level** | Apr 2026 | Session #5
- Old: Heatmap rows = top categories.
- ✅ New: Heatmap rows = top 15 subcategories by spend over 52-week window. Transactions with no subcategory fall back to parent category name.
- Added: column axis label (week indicator), inline pattern guide (seasonal spikes, lifestyle inflation, irregular vs recurring, blind months).
- Removed: Recompute button — heatmap is data-derived, not AI-inferred.

**#D026 — CorrelationWeb at subcategory level + 3 view types** | Apr 2026 | Session #5
- Old: Force-directed graph at category level. "transactions" category corrupted every correlation.
- ✅ New: Correlation computed at subcategory level (top 15–20 by spend). 3 view modes: Heatmap Matrix (default), Chord Diagram, Bubble Chart. Toggle between views.
- Rationale: Subcategory level exposes real behavioural patterns. Category level is too noisy. All 3 views built so user can decide which is useful.
- Removed: Recompute button — correlation is data-derived.

**#D027 — BelowThresholdCard: persistent, threshold-deficit display** | Apr 2026 | Session #5
- New card on home tab below SafeToSpendCard.
- Shows each account where `balance < thresholdValue` with name + deficit (`thresholdValue - balance`).
- Persistent — no dismiss button. Disappears only when all accounts are above their threshold.
- Rationale: Aggregate Safe to Spend can hide individual account deficits. User needs per-account visibility.

**#D028 — D008 duplicate key correction implemented** | Apr 2026 | Session #6
- D008 (Session #1) and D021 (Session #5) agreed the correct key is `DateTime(24h) + Category + SubCategory + Account + Amount + Note`.
- ✅ Implemented in F6: added `a.categoryId === b.categoryId && (a.subCategoryId ?? null) === (b.subCategoryId ?? null)` to `DuplicateDetectorCard.tsx`.
- D008 entry in DECISIONS.md annotated as corrected by D021.

**#D029 — Backup/restore replace vs append table split** | Apr 2026 | Session #6
- D019 (Session #5) defined the split but was not yet implemented.
- ✅ Implemented in F10: all 3 tiers (GSheet, GDrive snapshot, Local JSON) now apply the split consistently.
- Replace (clear + bulkPut): `accounts`, `categories`, `transactions`, `filterPresets`, `budgets`, `goals`, `categoryBuckets`, `appSettings`.
- Append (bulkPut only): `lifeEvents`, `feedbackLog`, `computedInsights`.
- All 3 tiers use identical split logic. `LocalBackupSection.tsx` now covers all 11 tables (was 8).

**#D030 — Duplicate detector: same-calendar-date key (supersedes D021 → D008)** | Apr 2026 | Session #8
- D021 (Session #5) corrected D008's key to `DateTime(24h) + Category + SubCategory + Account + Amount + Note`.
- Problem with D021's key: (1) `description` match causes false negatives when same transaction is entered with minor note variation; (2) 24h time window causes false positives on consecutive midnight-stored entries (exactly 86400000ms apart — `<=` boundary hits every time).
- ✅ Final key: `amount + fromAccountId + categoryId + (subCategoryId ?? null) + date.slice(0, 10)`. Description dropped entirely. 24h window replaced with same-calendar-date string equality.
- Updated footer text: `"Same amount, account, category & subcategory on the same date."`
- D008 → D021 → D030 is the full correction chain. D030 is final.

**#D031 — FAIN alerts: no auto-run on mount; feedback suppressed on error** | Apr 2026 | Session #8
- Problem 1: Lead-Lag, Savings Goal, and Life Event analyses auto-fired on mount via useEffect → 3+ concurrent Gemini requests on page open → all hit free-tier quota (429) simultaneously.
- Problem 2: Error message string passed as AlertCard `description` → feedback buttons rendered below error text (`showFeedback` defaults to `true`).
- ✅ Fix: Remove all mount-triggered useEffect calls for the 3 AI alerts. Each fires only via its Refresh button (explicit user action). Add separate boolean error state per alert (`leadLagError`, `savingsError`, `lifeEventError`). Pass `showFeedback={!errorState}` to each AlertCard — feedback buttons only render after a successful run.

**#D032 — GSheet: auto-create missing sheets on first backup** | Apr 2026 | Session #8
- Problem: `writeAllRows()` in `googleSheets.ts` throws "Sheet does not exist" for any tab not manually created. Phase 2.6 F10 added 8 new table targets but no creation logic → backup fails on 4th write for existing users who have only the original 3-tab sheet.
- ✅ Fix: `ensureSheetsExist(sheetNames[])` helper in `googleSheets.ts` — fetch sheet metadata once via `spreadsheets.get`, identify missing tabs, create all missing in a single `batchUpdate` call (not per-sheet loops), then write header rows for each newly created sheet. Called once at the start of `backupToSheets()`. Hardcoded "please create sheets" error message removed from `writeAllRows()`.

**#D033 — Unified Backup UI (C2)** | Apr 2026 | Session #10
- Old: 3 separate sections in Settings → BackupSection (GSheet), SnapshotSection (GDrive), LocalBackupSection (JSON). Redundant buttons, cluttered.
- ✅ New: Single `UnifiedBackupSection` component. One BACKUP button → runs GSheet + GDrive in parallel first; local JSON download only if both succeed (Option A). All-or-nothing failure: if any of GSheet/GDrive fails, entire operation fails, no local download. RESTORE area has 2 sections: (1) GDrive snapshot list with restore (existing flow), (2) JSON import button only (no export). GSheet has no restore path — backup-only.

**#D034 — Sidebar + Bottom Nav tab names (C3)** | Apr 2026 | Session #10
- Old: Sidebar expanded shows icon + generic label (Home, Transactions, Stats, FAIN, Settings). Bottom nav shows icons only.
- ✅ New tab names (in order): BRIEF, TALLY, RADAR, SAGE, HUB. Full acronym expansions: BRIEF = Balances, Risk Indicators & Essential Financials; TALLY = Transaction Activity Log & Ledger Yard; RADAR = Review & Detection of Activity Reports; SAGE = Spend Analysis & Guidance Engine; HUB = Handling, Utility & Backup.
- Sidebar: expanded → icon + tab name. Bottom nav: always shows icon + tab name below (no expanded state on mobile).

**#D035 — Home page redesign (BRIEF layout)** | Apr 2026 | Session #10
- Old: "Overview" title + icon, 1-col/2-col grid with no deliberate hierarchy.
- ✅ New layout: Page title "BRIEF" + date (right). Row 1: SafeToSpendCard hero (full width). Row 1.5: BelowThresholdCard (conditional, full width). Row 2: 2-col grid — Left: BiggestSpendCard (Top 5, 7 days); Right stacked: DayOverDayCard + DuplicateDetectorCard. Row 3: SpendComparisons (3-col — This Week/Last Week, This Month/Last Month, YTD/YTD). SpendComparisons is a new component.

**#D036 — CorrelationWeb + SeasonalHeatmap: remove guard, auto-compute** | Apr 2026 | Session #10
- Old: CorrelationWeb had `months.size < 6` guard → showed "need 6 months" and hid all 3 view toggles. SeasonalHeatmap had manual "▶ Compute" button for initial load; no auto-recompute on data change.
- ✅ New: Remove 6-month guard entirely. Use Pearson r for any data; show "limited data" disclaimer when < 6 months. Both SeasonalHeatmap and CorrelationWeb auto-compute on mount (if no valid cache) and auto-recompute when txCount changes (using lastTxCountRef pattern). No manual compute/recompute buttons on either chart. Cache version bumped to 3 to invalidate stale v2 entries.

**#D037 — FAINAlerts showFeedback: only after successful run** | Apr 2026 | Session #10
- Old: `showFeedback={!xxxError}` — feedback hidden on error state but shown on initial unrun state (result = null, error = false). User sees feedback buttons on "Run to see predictions…" default text.
- ✅ New: `showFeedback={!xxxError && xxxResult !== null}` — feedback only renders after a successful AI run. Hidden on initial state and on error state.

**#D038 — CorrelationWeb: category-level fallback when no subcategory data** | Apr 2026 | Session #11
- Problem: When no transactions have `subCategoryId`, `raw` array is empty → `series` is empty → `names = []` → all 3 views return `null` silently. Card renders with no chart, no message, no explanation.
- ✅ Fix: In `compute()`, check `raw.length === 0` after subcategory filter. If true, rebuild `raw` from `categoryId` using the same `subCatMap` (which already maps all categories). Store `isFallback: boolean` in result. JSX: blue info note when `isFallback`, explicit empty-state `<p>` when `names.length === 0`, main view block gated on `names.length > 0`.
- Rationale: Silent empty is worse than showing category-level data with a note. Pearson r works identically on category names — no algorithmic change needed.

**#D039 — AccountsTable toggleBoolCell: explicit boolean semantics per field** | Apr 2026 | Session #11
- Problem: `toggleBoolCell` used `!account[field]` for both fields. For `includeInNetWorth`: `!undefined = true` → first click sets `true` (same as default) → no visual change → user thinks toggle is broken. Accounts appear to ignore the first click.
- ✅ Fix: Explicit `currentVal` derivation per field:
  - `includeInNetWorth`: `account[field] !== false` (undefined + true → `true`; false → `false`) — mirrors the display logic already used in the toggle button class.
  - `isLiability`: `!!account[field]` (undefined + false → `false`; true → `true`) — unchanged effective behaviour, now explicit.
- Rationale: Both fields use `undefined` as their "not yet set" default but have opposite default meanings. One unified `!account[field]` cannot serve both correctly.

**#D040 — Tri-state account classification (Liability / Neither / Asset)** | Apr 2026 | Session #12
- Old: 2 independent toggles (`isLiability`, `includeInNetWorth`). Could be both ON, both OFF, or contradictory. NetWorth calc applied two gates + a hidden negative-balance fallback that overrode the toggle intent.
- ✅ New: Single tri-state classification per account. UI: segmented control (◀ Liability / · Neither / ▶ Asset). Storage: keep dual fields with mutual-exclusion constraint (or new `accountClassification` enum — final choice in plan doc).
- Migration tiebreaker: both ON → liability wins; only liability → liability; only NW → asset; both OFF → neither. Idempotent, gated on `appSettings.triStateMigratedAt`.
- Rationale: user's mental model is one-of-three, not two-of-N. Eliminates the toggle-OFF-but-still-counted bug class entirely.

**#D041 — NetWorth liability calc: toggle is ONLY classifier, no fallback** | Apr 2026 | Session #12
- Old: `isLiability` OR `balance < 0` → counted as liability. Filter on `includeInNetWorth !== false` dropped accounts before classification.
- ✅ New: ONLY accounts classified as Liability via tri-state are counted as liability. No negative-balance fallback. Bank accounts that go overdraft remain reduced assets.
- Calc: liability = signed sum of liability-account balances. Display: `Math.abs(liabilitySum)` on Total Liabilities card and chart Y-axis. Net Worth = sum(asset_balances) + liability_signed_sum.
- Liability accounts that go positive (paid off + cashback) reduce the liability total naturally — accurate "amount owed" semantic.

**#D042 — CorrelationWeb algo router by months count** | Apr 2026 | Session #12
- Old: Pearson r only. 6-month guard removed in S10 (D036) but no algo variation for sparse data.
- ✅ New: `selectAlgo(months)` →
  - n < 3: no correlation; show top-spend leaderboard (top 10 subcategories by ₹) + "Correlations unlock at 3 months — you're at X months" banner (option A+D for new-user retention)
  - 3 ≤ n ≤ 5: cosine similarity
  - 6 ≤ n ≤ 11: Spearman rank
  - n ≥ 12: Pearson r
- Cache version 3 → 4 (invalidates S10/S11 cached results). Caption shows which algo was used.
- Rationale: small-sample-correct-math. Pearson is meaningless at n<6; cosine works at any n≥2 but offers no ranking insight; Spearman is robust to spending spikes.

**#D043 — Cache invalidation choreography (deploy hygiene)** | Apr 2026 | Session #12
- Bump `cacheId` in `next.config.mjs` (v8 → v9) on every `computedInsights` schema change.
- Add `clearedInsightsAt: string | null` to `appSettings`. App boot logic: if `clearedInsightsAt < buildDate`, run `db.computedInsights.clear()` once, set `clearedInsightsAt = now`. One-shot, not every load.
- Rationale: prior bugs (BUG-036 root cause, CorrelationWeb empty card) traced to stale cached results surviving fix deployment because version field matched. Coordinated bump prevents this.

**#D044 — UncomfortableTruth per-statement feedback (transient + logged)** | Apr 2026 | Session #12
- Old: Single card-level Yes/Somewhat/No for the whole truths block.
- ✅ New: Each numbered statement gets inline 👍 👎. Local state `feedbackByStatementId: Map<sha256(text), 'up'|'down'>`. Transient — cleared on Recompute.
- On click: write to `feedbackLog` with `{ feature: 'UNCOMFORTABLE_TRUTH', statementHash, statementText, vote, timestamp, recomputeId }` for future training/personalization.
- Card-level Yes/Somewhat/No removed entirely.

**#D045 — Category dropdown account-name exclusion (shared helper)** | Apr 2026 | Session #12
- Problem: CSV import auto-creates category records named after accounts ("AMEX", "Cash", etc.) when CSV "category" column happens to contain account names. These pollute every category dropdown and chart legend.
- ✅ Fix: shared helper `useCleanCategories()` filters out any category whose `name.toLowerCase()` matches a known account name (`accountNames` Set, lowercased). Applied at SOURCE — every dropdown AND every chart legend reads through this helper, not direct `db.categories.toArray()`.
- Trade-off: a legitimately-named category that happens to match an account name (e.g., a "Cash" category coexisting with a "Cash" account) is hidden. Accepted — pollution is the higher-cost case.

**#D046 — A-Z sort dropdowns (locale-aware, numeric, case-insensitive)** | Apr 2026 | Session #12
- Old: Dropdowns use insertion / DB order (effectively random for the user).
- ✅ New: Sort all account/category/subcategory dropdowns by `name.localeCompare(other, undefined, { numeric: true, sensitivity: 'base' })`. Handles "1C" before "AMEX" naturally; ignores case.
- Excluded by spec: search suggestions and notes (time-sorted, latest first). Only dropdowns where user is selecting from a known list.

**#D047 — BRIEF + SAGE header layout parity with HUB/RADAR/TALLY** | Apr 2026 | Session #12
- Inconsistency: HUB / RADAR / TALLY pages use stacked icon + h1 + subtitle pattern. SAGE has inline `🧠 SAGE Spend Analysis & Guidance Engine`. BRIEF has only h1 + date.
- ✅ Fix: BRIEF gets subtitle "Balances, Risk Indicators & Essential Financials" stacked below h1. SAGE restructured to icon + h1 + subtitle stacked. Match indentation/spacing of HUB exactly.

**#D048 — Process Rules added to CLAUDE.md (4 rules)** | Apr 2026 | Session #12
- After 5+ sessions of "fixed but still broken" reports, root cause traced to: (a) tsc-passing treated as runtime verification, (b) uncommitted work across sessions, (c) late-emerging constraints, (d) silent cross-feature changes.
- ✅ Added to CLAUDE.md as binding rules:
  - **Rule 1 — Deploy hygiene:** no "fix" claim without `Remove-Item .next; npm run build; npm run start; hard refresh + screenshot`
  - **Rule 2 — Commit discipline:** no session compact/close with uncommitted code (WIP commits acceptable)
  - **Rule 3 — Constraint disclosure:** state-touching bugs must include data invariants in initial message (3 bullets minimum)
  - **Rule 4 — Blast-radius disclosure:** no silent cross-feature changes; if a fix touches shared helpers/hooks/schemas/types/consumers outside the named scope, halt and ask user first
- SESSION_LOG template now requires per-fix `Verified by: [BUILD-VERIFIED | USER-SCREENSHOT | CODE-ONLY]` tag. Default `CODE-ONLY` until proven otherwise.

<!-- AGENT: append new feature decisions above this line -->

---

## SECTION 3 — IDEATION LOG
> Feature ideas discussed in claude.ai sessions (not Claude Code).
> Captures: what was considered, rejected, finalized, and the Claude Code prompt generated.

### IDEATION ENTRY FORMAT
```
---
### IDEATION-[ID] — [Session Topic] | [Date]
**Phase:**
**Features Discussed:**
- [Feature A] → ✅ Added / ❌ Rejected (reason) / ⏳ Deferred
- [Feature B] → ...

**Key Reasoning Trail:**
- Why X was prioritized over Y
- What constraint drove the decision (time / complexity / UX / privacy)

**Final Feature List for this batch:**
1. ...

**Claude Code Prompt Generated:** Y/N
**Prompt summary:** [one line of what the prompt instructed]
---
```

---

### IDEATION-001 — Session Brain & Workflow System | Apr 2026
**Phase:** Meta / Workflow
**Features Discussed:**
- SESSION_LOG.md → ✅ Added
- DECISIONS.md → ✅ Added
- BUGS.md grouped bug patterns → ✅ Added
- CHEATSHEET.md prompt kit → ✅ Added
- Google Sheets auto-logging → ⏳ Deferred (manual first, data needed)
- Mood-to-bug pattern mapping → ⏳ Future (needs enough entries first)

**Key Reasoning Trail:**
- Local JSON rejected → MD better for human readability + Claude parsing
- Pure agent-written logs rejected → hybrid (agent + you) for fuller picture
- Separate BUGS.md chosen over inline SESSION_LOG → grouping by area enables pattern recognition
- Ideation log inside DECISIONS.md → keeps feature reasoning in one place

**Final Feature List for this batch:**
1. SESSION_LOG.md — per session diary (agent + user hybrid)
2. DECISIONS.md — feature reasoning + ideation log
3. BUGS.md — grouped bug patterns with mood tracking
4. CHEATSHEET.md — 4 prompts + usage guide + setup steps

**Claude Code Prompt Generated:** N (workflow files, not code)

### IDEATION-002 — v2_p2.5 Scoping Session | Apr 2026
**Phase:** v2, Phase 2.5
**Features Discussed:**
- AI 5-slot key system → ✅ Trimmed to 3 slots (less confusion for personal PWA)
- URL-based AI providers (Groq, OpenRouter, Ollama) → ⏳ Deferred (needs 2-field UI, out of scope)
- Force logout on session expiry → ❌ Rejected (breaks offline-first guarantee); replaced by non-blocking red banner
- Excel export for user data → ❌ Rejected (tamper risk); replaced by JSON export
- Full theme + device agnosticism → ⏳ Deferred to later phase (2–3 day effort)
- Countdown timer on session expiry → ❌ Rejected (overengineering)
- Standalone /accounts page → ❌ Removed; merged into Settings as full inline table
- Stats chart color inconsistency → ✅ Resolved via dark gradient theme + shared chartColors.ts

**Key Reasoning Trail:**
- Offline-first is the app's core value — any feature that blocks local writes was rejected
- Three backup tiers (GSheet + GDrive + Local JSON) give enough redundancy; no fourth needed
- Stats dark theme chosen because the rest of the app (sidebar, header) is already dark — light charts were the outlier
- Duplicate detection by description (not category) because category is shared legitimately across recurring transactions

**Final Feature List (v2_p2.5a — Waves 1–3):**
1. Login whitespace fix
2. Stats sticky header offset fix
3. Duplicate detection key → description
4. Suggestions in date order
5. Stats crash fix (useEffect)
6. False backup toast fix
7. GSheet userId → email
8. Gemini model auto-fallback
9. Search auto No-Grouping + Enter
10. Session expired red banner
11. Sidebar overlap fix (SidebarContext)
12. Accounts table in Settings (remove /accounts)
13. Stats dark gradient theme + unified palette

**Final Feature List (v2_p2.5b — Wave 4):**
1. AI key redesign (3 user slots + 2 dev slots + waterfall)
2. Local JSON export/import

**Claude Code Prompt Generated:** N (scoping happened within Claude Code session itself)

<!-- AGENT: append new ideation entries above this line -->

---
