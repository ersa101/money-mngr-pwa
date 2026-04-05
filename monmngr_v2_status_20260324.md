# Money Mngr v2 — Status Summary
**Date:** 2026-03-24

---

## ✅ Done

### v2 Phase 1 — New Features Built
- DB schema bumped to version 4; new tables: `budgets`, `goals`, `lifeEvents`, `feedbackLog`, `appSettings`
- New types added: `Budget`, `Goal`, `LifeEvent`, `FeedbackLog`, `AppSetting`
- `useSafeToSpend` hook created
- Root `/` now redirects to `/home` (previously `/transactions`)
- **Home tab** built with 4 cards: Safe to Spend, Day-over-Day, Biggest Spend This Week, Duplicate Detector
- **Bottom navigation** updated to 5 icon-only tabs: Home, Transactions, Stats, FAIN, Settings
- **SubCategorySelector** component added; replaces chip grid in SubCategoryTrend
- **FAIN page** built with 3-segment toggle: Chat, Insights, Alerts
- FAIN components: FAINChat, FAINInsights, FAINAlerts, InsightCard, AlertCard, FeedbackButtons
- FAIN hooks: `useFAINContext`, `useAnomalyDetection`, `useRecurringDetection`
- `fainUtils.ts` — context builder + currency formatter
- API routes: `/api/fain/chat`, `/api/fain/insights`, `/api/fain/alerts`, `/api/fain/feedback`
- FAIN feedback appended to Google Sheets (`FAIN_Feedback_Log` tab)
- Settings page: new "AI Keys" tab — Gemini + Claude key storage in IndexedDB (`appSettings`)
- PWA cache ID bumped to `money-mngr-v4`

### Bug Fixes Applied This Session
- Removed `output: 'standalone'` from `next.config.mjs` (was breaking `npm run start` and auth)
- Fixed `deserializeRow` in `googleSheets.ts` — falsy values like `0` and `false` were being converted to `undefined`, corrupting restored data
- Added safety guard in `useBackup.ts` — DB is no longer wiped if restore returns 0 records
- Fixed apostrophe syntax error in `FAINChat.tsx` (broken JSX string literal)
- Fixed invalid `title` prop on Lucide icons in all 4 home card components — wrapped in `<span title="...">`
- Removed unused `toast` import from `FeedbackButtons.tsx`

---

## ⏳ Pending

### Immediate (Before Vercel Deploy)
- [ ] Stop dev server → delete `.next` folder → run `npm run build` for a clean build verification
- [ ] Re-run **Backup** from the app (the existing Google Sheet rows have a stale/empty userId from when the server was broken; a fresh backup will write the correct userId)
- [ ] Verify **Restore** works after the fresh backup
- [ ] Deploy to Vercel

### v1 → v2 Sync
- [ ] Identify what changed in the v1 branch that isn't in v2
- [ ] Open a PR from `v1 branch → v2 branch` on GitHub to surface all file-level conflicts
- [ ] Resolve overlapping file conflicts manually; auto-merge non-overlapping ones
- [ ] Verify merged v2 build still passes

### Future / Phase 2
- [ ] Budgets & Goals UI (DB tables exist, no UI yet)
- [ ] Life Events UI (DB table exists, no UI yet)
- [ ] FAIN feedback sync to Google Sheets — currently fire-and-forget; no retry on failure

---

## ⚠️ Errors Encountered & Mitigations

| Error | Root Cause | Mitigation |
|-------|-----------|------------|
| `"next start" does not work with output: standalone` | `next.config.mjs` had `output: 'standalone'` — incompatible with Vercel-style `npm run start` | Removed `output: 'standalone'` from config |
| `[auth][error] TypeError: fetch failed` | Side effect of the broken standalone server state; auth couldn't initialise | Resolved automatically once standalone config was removed |
| `Restore failed: No backup data found` | Backup was done while server was broken — stored empty string as `userId` in column A. Current session's real Google ID doesn't match | Re-backup with the correctly running server to overwrite rows with correct userId |
| `Runtime ChunkLoadError: Loading chunk app/layout failed` | FAINChat.tsx had a syntax error during hot-reload; webpack left a stale/broken chunk in cache | Delete `.next` folder and restart dev server for a clean build |
| `FAINChat.tsx: Expected '</', got 's'` | Apostrophe inside single-quoted JSX string: `'What's my...'` | Changed outer quotes to double quotes |
| Lucide icon `title` prop — TypeScript type error | Lucide icons don't accept a `title` prop via their component interface | Wrapped icons in `<span title="...">` instead |
| `deserializeRow` data corruption on restore | `value \|\| undefined` converts `0` and `false` to `undefined` — valid falsy values lost | Changed to explicit check: only treat `''`, `null`, `undefined` as absent |
| DB wiped on empty restore | `db.clear()` ran unconditionally before checking if API returned any data | Added `totalRecords === 0` guard — throws error before any clear is attempted |
