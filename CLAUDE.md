# CLAUDE.md — Money Mngr PWA
**Branch:** `v2.0426` | **Phase:** v2, Phase 2.7.4 active

---

## Session Protocol

At the start of every session, read these files before touching any code:
- `SESSION_LOG.md` — what was done last session
- `DECISIONS.md` — agreed design/architecture decisions
- `BUGS.md` — known bugs, their status, and root causes
- `CHEATSHEET.md` — key patterns, file map, gotchas

At the end of every session, update:
Append a new entry to `SESSION_LOG.md` using the template. Fill:
- All agent fields completely
- Handoff notes must be specific — not vague like "continue feature X"
- If any QnA chain changed approach → add entry to `DECISIONS.md`
- Commit message format: `[Phase X] short description | Session #N`

Append UL-[N] entry to `USER_LEARNINGS.md` (match session number)
   Fill all 🤖 agent fields. Leave 🧑 fields blank for user.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15, App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 |
| Local DB | Dexie.js v4 (IndexedDB) |
| Auth | NextAuth v5 (beta) |
| Charts | Recharts v3 |
| UI Components | shadcn/ui (Radix primitives) |
| Cloud Backup | Google Sheets API + Google Drive API |
| AI | Gemini / Claude / OpenAI (user-provided keys) |

---

## Project Rules

1. **Read before writing.** Read the target file before editing it. No blind edits.
2. **Halt if uncertain.** Ask the user before proceeding. Never improvise architecture.
3. **One commit per task.** Do not bundle unrelated changes.
4. **Never touch `main`.** All work stays on `v2.0426`.
5. **No speculative features.** Only implement what was explicitly agreed.
6. **Run `npx tsc --noEmit` after every wave.** Fix all errors before continuing.
7. **Offline-first is non-negotiable.** IndexedDB is source of truth. Never block local writes.
8. **Dev API keys** live in `.env.local` (local) or Vercel env vars (production). Variable names: `NEXT_PUBLIC_GEMINI_API_KEY`, `NEXT_PUBLIC_CLAUDE_API_KEY`, `NEXT_PUBLIC_OPENAI_API_KEY`.

---

## Process Rules (added v2_p2.7.4)

**Rule 1 — Deploy hygiene (no "fix" claim without a clean rebuild).**
Any session that touches code MUST end with:
```powershell
Remove-Item -Recurse -Force .next
npm run build
npm run start
```
Then a hard refresh + screenshot of the changed surface against acceptance criteria. tsc passing is NOT verification — it means code compiles, not that users see anything change. Until verified by clean rebuild + screenshot, the fix is `[CODE-ONLY]`, never `[BUILD-VERIFIED]`.

**Rule 2 — Commit discipline (no compact/close with uncommitted code).**
Every session ends with `git status` clean, OR with an explicit `[wip]` commit. Uncommitted work across sessions is one drive failure from gone. WIP commits are acceptable; orphaned working trees are not.

**Rule 3 — Constraint disclosure (state-touching bugs require invariants upfront).**
Any bug report touching state, data, or persistence MUST include in the initial message:
- (a) what data exists in the relevant tables/fields
- (b) what behavior the user expects
- (c) what behavior the user would reject as wrong
Three bullets minimum. Late-emerging constraints cost a clarification round each.

**Rule 4 — Blast-radius disclosure (no silent cross-feature changes).**
Do NOT make changes that directly or indirectly affect other features' code. If a planned change touches shared helpers, hooks, schemas, types, or any consumer outside the named feature scope, **stop and tell the user before making any changes.** List the affected files and what would change. Wait for explicit go-ahead. This applies even if the cross-feature change "looks safe" or "is just a refactor."

---

## SESSION_LOG verification field

Every fix entry in SESSION_LOG MUST include:
```
**Verified by:** [BUILD-VERIFIED | USER-SCREENSHOT | CODE-ONLY]
```
- `CODE-ONLY` — code is on disk, tsc passes. Nothing else.
- `BUILD-VERIFIED` — clean rebuild succeeded, expected strings/behavior confirmed in built `.next/` chunks or runtime.
- `USER-SCREENSHOT` — user has explicitly confirmed via screenshot against the fix's acceptance criteria.

Default tag is `CODE-ONLY` until proven otherwise. Do not upgrade the tag without evidence.

---

## Current Phase: v2_p2.7.4

- **v2_p2.7.4** (in progress): Tri-state account flag, NetWorth liability rewrite, CorrelationWeb algo router, UncomfortableTruth per-statement feedback, category dropdown filter, A-Z sort, BRIEF/SAGE subtitle parity, cache invalidation
- See `V2_P2.7.4_CLAUDE_CODE_PROMPT.md` (to be created)

### Prior phases (history)
- v2_p2.5a/b — see `V2_P2.5_PLAN.md`
- v2_p2.6 — see `V2_P2.6_CLAUDE_CODE_PROMPT.md`
- v2_p2.7 — see `V2_P2.7_CLAUDE_CODE_PROMPT.md`
