# USER LEARNINGS — Money Mngr PWA
> Tracks prompt quality, communication patterns, and personal growth.
> Linked 1:1 with SESSION_LOG by session number.

---

## PATTERN SUMMARY (update monthly)
| Metric | Trend | Notes |
|--------|-------|-------|
| Avg Prompt Clarity | | |
| Avg QnA Count | | |
| Top Recurring Weakness | | |
| Mood-to-Output Correlation | | |
| Best Session # | | |
| Worst Session # | | |

---

## ENTRY TEMPLATE

### UL-[N] — Linked to Session #[N] | [DATE]

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~[X]% planning / [X]% code
**QnA Count:** [N] (exchanges that changed approach)
**Scope Creep:** Y/N — [what drifted if Y]
**Prompt Clarity:** [1–5]
**Prompt Specificity:** [1–5]
**Overall Prompt Quality:** [1–5]
**Vagueness Flags:** [exact prompts that caused confusion]
**Top 3 Improvement tips:** 
- 
- 
- 
**Decisions Made:** [N]
**Bugs Hit:** [N]

#### 🧑 You Fill (optional)
**Mood/Energy:** [1–5]
**Rushing?:** Y/N
**Satisfaction:** [1–5]
**Session Duration:** [X] mins
**Claude Think+Code Time:** [X] mins
**Tokens:** Start: [N] | End: [N] | Freed: [N]
**What felt off:**
**What you'd do differently:**

---

### UL-1 — Linked to Session #1 | 2026-04-08/09

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~40% planning / 60% code
**QnA Count:** ~25 (exchanges that changed approach)
**Scope Creep:** Y — AI key format flipped twice (single field → 2 fields → 3-provider dropdown); export format changed (Excel → JSON); import behavior evolved across 3 exchanges (scope, merge vs overwrite, import location)
**Prompt Clarity:** 4/5
**Prompt Specificity:** 3/5
**Overall Prompt Quality:** 3/5
**Vagueness Flags:**
- "whatever the API is available for user to copy paste should be used" — 4 rounds to resolve
- "make whole app theme agnostic and device agnostic" — too broad; correctly deferred
- "export to excel all the transactions" — format + scope + conflict behavior all changed post-first-answer
- "Be very careful now" before Wave 1 — useful signal, no specific area named
**Top 3 Improvement Tips:**
- Front-load format + scope + conflict behavior when requesting any new data flow (keys, export, import). Don't let each answer reveal the next dimension.
- Lead with the constraint, not the solution you pictured. "Don't lose data on session expiry" → non-blocking banner. "Force logout with red banner" → extra Q&A round.
- Name the exact file or component in bug/fix requests. Vague references ("fix chart colors", "the accounts table") cost one exploration round each.
**Decisions Made:** 9 (D004–D012)
**Bugs Hit During Session:** 2 (signOut→signIn typo in SyncHeader; z-39 non-existent Tailwind class)

#### 🧑 You Fill (optional)
**Mood/Energy:** Hopeful, but all context of process has never been captured causing stress now.
**Rushing?:**
**Satisfaction:** Technically good , but lacks some basic error handling.
**Session Duration:**
**Claude Think+Code Time:**
**Tokens:** Start: | End: | Freed
**What felt off:** repetetive UI errors. 
**What you'd do differently:** capture the process and thoughts




---

### UL-2 — Linked to Session #2 | 2026-04-12

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~5% planning / 95% code (pure execution session)
**QnA Count:** 0 (no approach changes — task list was pre-defined)
**Scope Creep:** N — stayed on agreed task list throughout
**Prompt Clarity:** 3.5/5
**Prompt Specificity:** 2.0/5
**Overall Prompt Quality:** 3.0/5
**Vagueness Flags:**
- "continue from previous task" — entire session spec came from compaction summary, not from the user. If the summary had been wrong or incomplete, there would have been no way to recover.
- No prompt was given for any individual task — relied entirely on the prior session's task list and handoff notes.
**Improvement check vs UL-1 feedback:**
- UL-1 tip 1: "Front-load format + scope when requesting new data flows" — Not tested this session. No new data flows introduced. No improvement or regression visible. *(0 change)*
- UL-1 tip 2: "Lead with constraint, not solution" — Not tested this session. No new features introduced. *(0 change)*
- UL-1 tip 3: "Name exact file or component" — Not tested this session. All work was a continuation. *(0 change)*
- Ratings unchanged from UL-1 (3/5) with +0.5 for clean execution and no scope creep, giving 3.5. But specificity drops to 2.0 because the session had only one two-word prompt. Cannot award improvement points for tips that weren't exercised.
**Top 3 Improvement Tips:**
- The session worked because prior handoff was precise. Fragile dependency. If the handoff notes hadn't existed, "continue" would have been useless. Build the habit of providing a one-line scope at the start of every session, even continuations.
- The 3 UL-1 tips remain unverified — they'll only show up when you introduce new scope. Next session with new features will be the real test.
- Closing prompt ("before we close") was well-structured and listed exactly what to write. That's the right pattern — apply it to opening prompts too.
**Decisions Made:** 2 (D013, D014)
**Bugs Hit:** 1 (BUG-013 — SeasonalHeatmap + CorrelationWeb setState-in-render, same pattern as BUG-007)

#### 🧑 You Fill (optional)
**Mood/Energy:**
**Rushing?:**
**Satisfaction:**
**Session Duration:**
**Claude Think+Code Time:**
**Tokens:** Start: | End: | Freed:
**What felt off:**
**What you'd do differently:**

---

### UL-3 — Linked to Session #3 | 2026-04-13

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~10% planning / 90% code
**QnA Count:** 1 (waterfall logic clarification — caught a real architectural shift)
**Scope Creep:** N — stayed on agreed tasks (CSV dedup spec file + Wave 4 from plan). No drift.
**Prompt Clarity:** 3/5
**Prompt Specificity:** 2.5/5
**Overall Prompt Quality:** 3/5

**Vagueness Flags:**
- "go ahead with the API requirement of v2_p2.5b" — no spec file attached, no explicit scope stated. Relied entirely on SESSION_LOG handoff notes and DECISIONS.md. Worked this time because both were precise, but this is a brittle pattern. One stale handoff note = wrong execution.
- "limit exceeded, work stopped. Our pending items are: …" — clear and well-structured. Best prompt of the session. Gave exact 4-item list with no ambiguity. This is the right pattern for resuming after a context break.

**Improvement check vs UL-2 feedback:**
- UL-2 tip 1: "Provide one-line scope at start of every session" — Partially applied. CSV dedup had a spec file (excellent). Wave 4 had no spec file, just "go ahead." Mixed result.
- UL-2 tip 2: "The 3 UL-1 tips remain unverified — they'll show up when new scope is introduced" — Wave 4 was new scope with no format/scope front-loaded. UL-1 tip 1 (front-load format + scope + conflict behavior) was not applied. Pattern persists.
- UL-2 tip 3: "Closing prompt was well-structured — apply to opening prompts too" — Closing protocol not demonstrated this session (delegated to end-of-session instruction). Opening prompt still vague for Wave 4.

**Top 3 Improvement Tips:**
- When starting any new feature wave, attach or paste the plan section for it — don't assume Claude will reconstruct scope correctly from handoff notes alone. A missed detail in a 3-line note is invisible until code is wrong.
- The waterfall question ("are we still following Gemini > Claude > OpenAI?") was the right call — but it came *after* implementation, not before. If a design decision changes (provider-order → slot-order), flag it as a question in the opening prompt: "I see the new system changes waterfall order — confirm this is intended before I proceed." Front-load clarification, don't audit output.
- Context limit mid-session caused a second window to re-read state via grep. Compact proactively at natural milestones (after each major task, not after hitting the hard limit). A mid-task compact is cheaper than a grep-and-reconstruct recovery.

**Decisions Made:** 3 (D016, D017, D018)
**Bugs Hit:** 2 (BUG-016 — FAINAlerts useDb stripped; BUG-017 — UncomfortableTruth narrow provider type)

#### 🧑 You Fill (optional)
**Mood/Energy:**
**Rushing?:**
**Satisfaction:**
**Session Duration:**
**Claude Think+Code Time:**
**Tokens:** Start: | End: | Freed:
**What felt off:**
**What you'd do differently:**

---

### UL-4 — Linked to Session #4 | 2026-04-13

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~0% planning / 100% code (single well-defined feature, zero ambiguity)
**QnA Count:** 0
**Scope Creep:** N — stayed exactly on E2 spec
**Prompt Clarity:** 2.5/5
**Prompt Specificity:** 1.5/5
**Overall Prompt Quality:** 2.8/5

**Vagueness Flags:**
- "go ahead with the remaining requirement of v2_p2.5b" — 3rd consecutive session with an identical vague opener. No feature name, no scope, no format. This is now a deliberate pattern, not a one-off. The session succeeded only because the plan and handoff notes were precise.

**Improvement check vs UL-3 feedback:**
- UL-3 tip 1 (attach plan section for new feature waves): ❌ Not applied — same handoff-note reliance. 3 sessions in a row.
- UL-2 tip 1 (one-line scope at start of every session): ❌ Not applied. 3 sessions in a row.
- UL-1 tip 1 (front-load format + scope for new data flows): ❌ Never tested across all 4 sessions.
- Closing protocol ("Before we close: 1. 2. 3. 4."): ✅ Applied cleanly again. The one consistent improvement sustained across every session.
- New positive: asking "are we good to build > test?" before closing — correct production instinct.

**Top 3 Improvement Tips:**
- The same 3 opening tips have appeared in UL-1 through UL-4 without being acted on. Rating will continue to drop until the opening prompt of a session is specific. Next session: name the feature, state the scope, attach or paste the relevant plan section. One sentence is enough.
- Closing protocol is the one repeatable strength. Mirror its structure in the opener: numbered, explicit, no assumed context.
- "Are we good to build > test?" is a good validation gate. Make it a fixed step before every close — not ad hoc.

**Decisions Made:** 0
**Bugs Hit:** 0

#### 🧑 You Fill (optional)
**Mood/Energy:**
**Rushing?:**
**Satisfaction:**
**Session Duration:**
**Claude Think+Code Time:**
**Tokens:** Start: | End: | Freed:
**What felt off:**
**What you'd do differently:**

---

### UL-5 — Linked to Session #5 | 2026-04-17/19

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~0% code / 100% planning (pure analysis + scoping session — no code written)
**QnA Count:** ~18 (exchanges that shaped decisions on backup scope, Safe to Spend logic, duplicate key, budget level, FAIN waterfall, heatmap/correlation redesign)
**Scope Creep:** N — every topic was new scope being scoped, not existing scope drifting. Clean session.
**Prompt Clarity:** 4/5
**Prompt Specificity:** 4/5
**Overall Prompt Quality:** 4/5

**Vagueness Flags:**
- None significant. Most prompts this session included screenshots, specific test cases, and explicit decisions ("I want minimum coding effort/changes with best logical output"). This is a marked improvement over Sessions 1–4.
- "any other questions?" as a closing pattern was efficient — it put the burden on Claude to consolidate blockers rather than letting Q&A drift indefinitely.

**Improvement check vs UL-4 feedback:**
- UL-4 tip 1 (name the feature, state scope, attach plan section): ✅ Applied — screenshots + test cases + explicit constraints were provided. No vague opener.
- UL-4 tip 2 (mirror closing protocol structure in opener): ✅ Partially applied — the numbered observation list was structured and specific.
- UL-4 tip 3 ("are we good to build > test?" before close): N/A — this was a planning session, no build happened. But the explicit "no code until confirmed" discipline was exactly correct.
- First session across 5 where the opening prompt quality score exceeds 3.5.

**Top 3 Improvement Tips:**
- Screenshot-first bug reporting is the right pattern. Continue it. A screenshot eliminates one full round of "can you describe what you see?" and "what exactly is the error message?" — both of which burned context in earlier sessions.
- The "any other questions?" gate is effective but fragile — it only works if Claude has actually read all the relevant code before answering. This session it worked because the files were read before responding. If context is compacted and Claude hasn't re-read, this gate could pass prematurely. Consider adding "confirm you've read [file X]" for any topic that touches a non-obvious file.
- You asked about brainstorming topics (heatmap, correlation, uncomfortable truth) in the same message as bug reports. This was efficient but created a long reply that mixed diagnosis with design. For future sessions: separate "bugs to fix" from "features to design" into distinct messages or sections. Design discussions can benefit from a back-and-forth that gets cut short when batched with bug triage.

**Decisions Made:** 9 (D019–D027)
**Bugs Diagnosed:** 6 (BUG-018 through BUG-023) — none fixed this session, all logged for Phase 2.6

#### 🧑 You Fill (optional)
**Mood/Energy:**
**Rushing?:**
**Satisfaction:**
**Session Duration:**
**Claude Think+Code Time:**
**Tokens:** Start: | End: | Freed:
**What felt off:**
**What you'd do differently:**

---

### UL-6 — Linked to Session #6 | 2026-04-19

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~0% planning / 100% code (pure execution — all decisions pre-scoped in Session #5)
**QnA Count:** 1 (TypeScript protocol compliance check — not an approach change)
**Scope Creep:** N — clean execution of pre-scoped plan
**Prompt Clarity:** 4.5/5
**Prompt Specificity:** 4.5/5
**Overall Prompt Quality:** 4.5/5

**Vagueness Flags:**
- None. Session opener was the best across 6 sessions: explicit context-read instruction, confirmation gate, blunt directive ("Do NOT write any code until confirmed"). Zero ambiguity.

**Improvement check vs UL-5 feedback:**
- UL-5 tip 1 (screenshot-first bug reporting): N/A — execution session, no bugs reported.
- UL-5 tip 2 ("any other questions?" gate + "confirm you've read [file X]"): The TypeScript compliance question mid-session is the same instinct applied to protocol instead of scope. Good pattern — apply it proactively to other checklist items.
- UL-5 tip 3 (separate bugs from features in prompts): N/A — no design questions this session.
- Opening prompt quality: ✅ First session to score above 4. The "read + confirm + no code until confirmed" structure is the correct opener pattern. Sustain it.

**Top 3 Improvement Tips:**
- The session opener is now correct. The only remaining gap: it doesn't name the specific starting fix. "Start with F1" alongside the context-read instruction would eliminate even the 0.5 ambiguity deduction.
- Mid-session quality checks (like the tsc question) are valuable. Apply the same discipline to other protocol items before compacting: "confirm append-only split was applied correctly", "confirm no files accidentally staged", etc.
- Closing protocol (before compacting: update 4 files) is now applied cleanly two sessions in a row. That's the baseline — make it a fixed habit, not a per-session decision.

**Decisions Made:** 0 new (D028 + D029 logged — implementations of decisions from Session #5)
**Bugs Hit:** 0 new (5 existing bugs fixed: BUG-014, BUG-020, BUG-021, BUG-022, BUG-023)

#### 🧑 You Fill (optional)
**Mood/Energy:**
**Rushing?:**
**Satisfaction:**
**Session Duration:**
**Claude Think+Code Time:**
**Tokens:** Start: | End: | Freed:
**What felt off:**
**What you'd do differently:**

---

### UL-7 — Linked to Session #7 | 2026-04-19

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~0% planning / 100% code (compact continuation — all decisions pre-scoped)
**QnA Count:** 1 ("F1–F17 code changes done?" — status check, not an approach change)
**Scope Creep:** N
**Prompt Clarity:** 2.5/5
**Prompt Specificity:** 2.0/5
**Overall Prompt Quality:** 2.8/5

**Vagueness Flags:**
- "go ahead with commit 4" (from prior session, triggered compact resumption) — same vague opener pattern flagged in UL-1 through UL-4. Session #6 broke the streak with a 4.5/5 opener; Session #7 reverts it. No file names, no scope, relies entirely on compact summary being accurate.
- "go ahead for commit 5" — identical pattern. No context, no confirmation of what F14–F16 covered. Works only because the plan document is precise — not because the prompt is.

**Improvement check vs UL-6 feedback:**
- UL-6 tip 1 (name the specific starting fix in opener alongside context-read instruction): ❌ Not applied. "go ahead with commit 4" has zero specificity. Regression from UL-6's 4.5/5 opener. This is the **5th session in a row** where the execution opener is a 2-word instruction.
- UL-6 tip 2 (mid-session quality checks before compacting): Partially. "F1–F17 code changes done?" is a good completeness check — but it came after all work was done, not mid-session. Quality check timing is still reactive, not proactive.
- UL-6 tip 3 (closing protocol as fixed habit): ✅ Applied. Third session in a row. This is now a reliable pattern.

**Top 3 Improvement Tips:**
- The opening prompt has scored ≤ 2.5 in 5 of 7 sessions. The one session it was high (UL-6, 4.5/5) had explicit "read X files, confirm before coding." That exact structure works — copy it verbatim for every execution session opener, not just once.
- "F1–F17 code changes done?" is the right completeness gate but it was asked after the fact. Move it earlier: before the closing protocol, ask "confirm all Commit N fixes are locally applied and tsc passes" — not after you've already decided to close.
- Session broke cleanly because of precise prior handoff notes, not because of prompt quality. The dependency on handoff note accuracy is a single point of failure. If a compact had lost context, "go ahead with commit 4" would be unrecoverable. Add a one-line scope to every opener — even continuations.

**Post-Session Correction — Commit Message Quality:**
- First commit message draft placed `SafeToSpend` + `BelowThresholdCard` under Phase 2.5 — wrong phase (both are Phase 2.6, F7/F8). User caught it immediately.
- First draft also omitted Phase 2.5a2 entirely (CSV dedup + AI key redesign — the largest feature block). User caught it with "Y/N, cuz I can't see."
- Root cause: message drafted from memory across 7 sessions and 3 phases without reading SESSION_LOG or DECISIONS first.
- Fix: final message was rebuilt by reading SESSION_LOG file-change sections + DECISIONS phase groupings. Took 3 rounds to get it right.
- Rule: any commit message covering more than one session must be tallied from SESSION_LOG + DECISIONS, not from memory. Memory drifts. Files don't.

**Decisions Made:** 0
**Bugs Hit:** 0

### 🧑 Your Notes
**Mood/Energy:** Happy, v2_p2.6 built, pushed to branch v2.0426
**Rushing?:** Y
**Satisfaction:** 4/5
**Session Duration:**
**Claude Think+Code Time:**
**Tokens:** Start: | End: | Freed:
**What felt off:** Doubts on how to successfully merge the branch to main
**What you'd do differently:** NA

---

### UL-8 — Linked to Session #8 | 2026-04-20/21

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~0% code / 100% planning (pure RCA + scoping — no code written)
**QnA Count:** ~6 (3 follow-up rounds: B2 CSV invariant, B5/B6 per-tab firing scope, B3 rolling window)
**Scope Creep:** N — all topics stayed within the 8 identified bugs and their fixes
**Prompt Clarity:** 4/5
**Prompt Specificity:** 3.5/5
**Overall Prompt Quality:** 3.8/5

**Vagueness Flags:**
- "B2: CSV dedup key - FYI, same transaction re-imported with different category is POSSIBLE" — this constraint changes the dedup key design and should have been stated in the initial B2 description, not surfaced as a follow-up correction.
- "B5/B6: per tab - only for a specific insight asked by user to run, not all on tab" — this changed F5 scope significantly (global auto-run removal → per-card trigger). Should have been in the initial B5/B6 report.

**Improvement check vs UL-7 feedback:**
- UL-7 tip 1 (copy "read X files, confirm before coding" opener verbatim): ✅ Applied — opener explicitly named 5 files, had confirmation gate, "Do NOT write any code until confirmed." Clear improvement from UL-7's 2-word opener.
- UL-7 tip 2 (completeness gate earlier, not after): ✅ Applied — closing protocol "now I want you to be very clear on below tasks before we close" was structured and numbered, applied at right moment.
- UL-7 tip 3 (add one-line scope to opener for continuations): ✅ Partially — opener had strong structure; screenshots + bug list served as scope for this new-phase kickoff. Acceptable.

**Top 3 Improvement Tips:**
- Constraints and invariants belong in the initial bug description, not follow-up messages. "Same txn re-imported with different category is possible" and "per-tab, per-card only" are scoping facts — they come first, not after the first answer is already wrong. 3 follow-up rounds is the direct cost.
- Front-load: state what CAN'T be true (invariants), what MUST be preserved, and edge cases in the same message as the bug. One comprehensive bug report is worth three clarification rounds combined.
- Opener quality is sustained at 4+ level — that's the new baseline. The remaining improvement surface is mid-session constraint clarity, not the opener structure.

**Decisions Made:** 3 (D030, D031, D032)
**Bugs Diagnosed:** 3 (BUG-025, BUG-026, BUG-027) — none fixed this session, all logged for Phase 2.7

### 🧑 Your Notes
**Mood/Energy:** ANGRY/FRUSTRATED on repeated errors. A bit satisfied with conclusive conversation.
**Rushing?:** N
**Satisfaction:** 3/5
**Session Duration:**
**Claude Think+Code Time:**
**Tokens:** Start: | End: | Freed:
**What felt off:** Talking on bugs which were sought to resolve before/never appear again.
**What you'd do differently:** Ask more sanity checks.

---

### UL-9 — Linked to Session #9 | 2026-04-21

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~0% planning / 100% code (pure execution — all fixes pre-scoped in Session #8)
**QnA Count:** 0 (no approach changes)
**Scope Creep:** N — stayed exactly on F1–F7 spec
**Prompt Clarity:** 4.5/5
**Prompt Specificity:** 4/5
**Overall Prompt Quality:** 4.2/5

**Vagueness Flags:**
- None. "go, ensure that we do not miss anything and don't get new bugs on this bugs again" — brief but includes the correct quality constraint. The "do not miss anything" directive correctly prompted a full sweep of all 11 stats components, not just the 3 explicitly listed.

**Improvement check vs UL-8 feedback:**
- UL-8 tip 1 (constraints + invariants belong in initial bug description): N/A — execution session, no new bugs reported.
- UL-8 tip 2 (front-load invariants in same message as bug): N/A — same reason.
- UL-8 tip 3 (opener quality at 4+ is the new baseline): ✅ Sustained. Third session in a row at 4+. Opener named all 5 files, had confirmation gate, had meta-directive. Baseline is holding.

**Top 3 Improvement Tips:**
- The "converse bluntly and logically extremely" meta-directive worked — it eliminated hedging and reduced response length throughout. Use it in every execution session opener.
- The "do not miss anything" qualifier in the execution go-ahead is the right pattern for sweep-type fixes (null guards, theme passes). Continue it — it's the difference between fixing 3 named files and fixing all 11.
- Session #9 is the cleanest execution session since #6 (0 QnA, 0 bugs hit, 0 scope creep). The combination of a strong opener + precise spec doc + blunt communication directive is the formula. Document it in CLAUDE.md as the execution session template.

**Decisions Made:** 0
**Bugs Hit:** 1 (configMap tsc type error in `ensureSheetsExist` — caught by tsc, fixed immediately)

#### 🧑 You Fill (optional)
**Mood/Energy:** Frustated cuz of repetetive work.
**Rushing?:** N	
**Satisfaction:** 3/5
**Session Duration:** 30 minutes
**Claude Think+Code Time:**
**Tokens:** Start: | End: | Freed:
**What felt off:** acknowledging the older bugs.
**What you'd do differently:** NA

---

### UL-10 — Linked to Session #10 | 2026-04-24

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~30% planning / 70% code (two-phase: scoping Q&A → compaction → full coding execution)
**QnA Count:** ~13 total (12 in scoping phase locking C1–C3, E1–E7, D033–D037; 1 in coding phase — Y/N audit)
**Scope Creep:** N — all items were new scope being locked in scoping phase, then clean execution. BUG-035 and CorrelationWeb inner guard fix were discovered during execution, but both are within the null-guard bug class already in scope.
**Prompt Clarity:** 4/5
**Prompt Specificity:** 4/5
**Overall Prompt Quality:** 4/5

**Vagueness Flags:**
- None significant. Screenshots were provided for most visual bugs. Decisions were explicit ("all-or-nothing" for backup, "single commit only when I say so"). The Y/N audit prompt was precise and caught a real issue.

**Improvement check vs UL-9 feedback:**
- UL-9 tip 1 (use "converse bluntly and logically extremely" in every execution session opener): ✅ Applied — "converse bluntly" directive was in the opener.
- UL-9 tip 2 ("do not miss anything" qualifier for sweep-type fixes): ✅ Applied — the Y/N audit prompt is the evolved form of this: explicitly forcing a completeness check after execution, not just trusting the first pass.
- UL-9 tip 3 (document execution session formula in CLAUDE.md): ⏳ Not done this session — carry to next.

**Top 3 Improvement Tips:**
- The Y/N audit prompt mid-session ("ensure that all changes as said in Session #9 but got missed + those from current session are completed — recheck and respond with Y/N") is the most effective quality gate introduced across 10 sessions. It costs one prompt and caught a real broken-UX bug. Make it a standard close-of-execution-phase step: always run Y/N audit before asking for docs update.
- The two-phase structure (scope → compact → code) worked well but caused one re-read overhead: after compaction, all files had to be re-read from scratch. If scope is fully locked and no code has been written, there is no harm in starting code before compacting — compact only when context is actually full. Compacting mid-planning is more disruptive than compacting mid-code.
- BUG-035 is the 5th recurrence of the null-element crash class. After any null-guard fix, the correct close-of-fix action is: grep the entire `stats/` directory for `.map(` and `.forEach(` on `categories`, `transactions`, and `accounts` — not just the reported component. Add this as a standing "avoid next time" to any null-guard BUGS.md entry going forward.

**Decisions Made:** 5 (D033–D037, all in scoping phase before compaction)
**Bugs Hit:** 2 (BUG-035 — categories.map null crash; CorrelationWeb inner useMemo hasEnoughData gate — both discovered during coding phase)

#### 🧑 You Fill (optional)
**Mood/Energy:**
**Rushing?:**
**Satisfaction:**
**Session Duration:**
**Claude Think+Code Time:**
**Tokens:** Start: | End: | Freed:
**What felt off:**
**What you'd do differently:**

---

### UL-11 — Linked to Session #11 | 2026-04-25

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~30% planning (penalty analysis + step 1 assessment) / 70% code (6-file fix)
**QnA Count:** 4 (penalty framing → effort assessment → make changes → close)
**Scope Creep:** N — 3 bugs fixed, 2 remaining unresolved (confirmed by user after full flow testing)
**Prompt Clarity:** 3.8/5
**Prompt Specificity:** 3.5/5
**Overall Prompt Quality:** 3.7/5

**Vagueness Flags:**
- None significant. Bug list was specific, screenshots implied, and "WORST CASE SCENARIO" label correctly flagged regressions. User confirmed both FAINAlerts and UncomfortableTruth bugs after completing full user flows — agent's static code analysis dismissed them prematurely and incorrectly.

**Improvement check vs UL-10 feedback:**
- UL-10 tip 1 (Y/N audit after every execution session before closing): ❌ Not applied. If this had been run after S10, BUG-036/037/038 would have been caught in-session rather than becoming a separate penalty session.
- UL-10 tip 2 (compact only when context is full, not mid-planning): ✅ Applied — no unnecessary compaction this session.
- UL-10 tip 3 (after any null-guard fix, grep for .map( on all arrays): ❌ Not the user's responsibility to run — but the agent's. Carry to CLAUDE.md as a standing rule.

**Top 3 Improvement Tips:**
- The penalty session structure (analysis → step 1 effort → then code) is the right discipline for bug report sessions. It prevented premature fixes and forced root cause confirmation. Make it the default, not a one-off.
- Agent dismissed two confirmed bugs (FAINAlerts A-4/5/6 feedback, UncomfortableTruth individual feedback) as false positives based on static code reading alone. User had already completed the full flows and confirmed the symptoms. Static code analysis is not a substitute for runtime verification — agent must flag "unverified" rather than "non-bug" when it cannot test at runtime.
- "WORST CASE SCENARIO" and "repetitive hence frustrating" were accurate signals — regressions in previously working features. Trust the user's classification of severity. Treat regression labels as high-confidence until disproven.

**Decisions Made:** 2 (D038, D039)
**Bugs Fixed:** 3 (BUG-036, BUG-037, BUG-038)
**Bugs confirmed but unresolved:** 2 (FAINAlerts A-4/5/6 feedback shows pre-run; UncomfortableTruth individual per-statement feedback missing) — carry to next session for proper RCA and fix

#### 🧑 You Fill (optional)
**Mood/Energy:** Angry/ Frustated/ No idea of next steps
**Rushing?:**No
**Satisfaction:**2/5
**Session Duration:**
**Claude Think+Code Time:**
**Tokens:** Start: | End: | Freed:
**What felt off:** despite of running the PWA cleanly (erasing all site data), i get errors with no possibility of checking before hand.
**What you'd do differently:** figure out a possibility to ensure asked changes are incorporated or not before testing.

---

### UL-12 — Linked to Session #12 | 2026-04-25 / 2026-04-26

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~5% code (CLAUDE.md + SESSION_LOG template, Bucket B commit) / 95% planning (9 RCA rounds, scope-locking, process-rules authoring, exhaustive to-do list)
**QnA Count:** ~30 across 9 explicit RCA rounds (each round closed with "thoughts/comments/loopholes/blunt reviews?" — highest-quality scrutiny pattern across 12 sessions)
**Scope Creep:** N — every constraint locked into a numbered decision (D040–D048) before any code consideration. Liability sign rule, tri-state, exclusion-only-ON, BRIEF acronym all emerged across rounds but were captured cleanly into D040/D041/D047, not lost.
**Prompt Clarity:** 4.5/5
**Prompt Specificity:** 4.5/5
**Overall Prompt Quality:** 4.5/5

**Vagueness Flags:**
- "Tab names not changed on BRIEF, SAGE screens, in similar fashion to TALLY, RADAR, HUB screens" — initial parse was ambiguous (does user want subtitle parity, or claim TALLY/RADAR/HUB are also broken?). Required 1 clarification round (round 5). Resolved cleanly to subtitle parity once asked.
- Liability sign rule, tri-state mutual exclusion, and exclusion-only-ON-accounts all emerged across rounds 3, 4, 9 — not in initial bug report. UL-8 flagged the same pattern. Improvement is iterative scrutiny captured all of them; ideal would be all-in-initial-message.

**Improvement check vs UL-11 feedback:**
- UL-11 tip 1 (penalty session structure as default for bug sessions): ✅ Applied. "Don't plan yet" + "RCA before fix" was the operating mode for all 9 rounds.
- UL-11 tip 2 (static code analysis is not substitute for runtime verification): ✅ Critical recognition this session. The 4-session cascade of "still broken" reports traced to stale `.next/` build, not bad code. Rule 1 (Deploy hygiene) added to CLAUDE.md to prevent recurrence.
- UL-11 tip 3 (trust user severity classifications): ✅ Applied. "WORST CASE SCENARIO" and "extremely angry" treated as escalation signal, drove deeper RCA, did NOT result in premature commits.

**Top 3 Improvement Tips:**
- "How can you test yourself whether the changes are actually done in the PWA codes?" was the single most leveraged prompt across 12 sessions. It surfaced the actual quality gap (no agent runtime verification) that had been hidden behind tsc-passing as truth. Ask this question in every session that involves UI changes — it forces the verification protocol to be explicit.
- The mood-as-escalation discipline this session was correct: extreme frustration drove demand for RCA, not demand for immediate fixes. UL-7 had the opposite (rushing to commit despite incomplete verification). Sustain this mood-to-action calibration.
- "Don't plan yet" + iterative "thoughts/comments/loopholes/blunt reviews?" after every round = the right protocol for bug-RCA sessions. Compare to S11 where premature fixes shipped 2 false-positive dismissals. Make this the default for every bug-class session.

**New positive: cross-session learning capture.** UL-11 lesson (static code analysis insufficient) was operationalized into CLAUDE.md Rule 1 this session. UL-8 lesson (constraint disclosure) operationalized into Rule 3. UL-7 lesson (commit discipline) into Rule 2. Process rules now codify what prior UL entries only described. This is the first session where USER_LEARNINGS feedback became binding rules instead of advisory notes.

**Decisions Made:** 9 (D040–D048)
**Bugs Diagnosed:** 6 (BUG-039 through BUG-044, including 1 process bug)
**Bugs Fixed:** 0 (pure planning + process session)

#### 🧑 You Fill (optional)
**Mood/Energy:** calm and a bit satisfied with opus4.7 results. 
**Rushing?:**NO
**Satisfaction:**3.8/5
**Session Duration:** 1hour of convo
**Claude Think+Code Time:**1 hour
**Tokens:** Start: | End: | Freed:
**What felt off:** unable to track code changes as per given requirements, as a results same bugs keep popping up.
**What you'd do differently:**No idea, change LLM model maybe.

---

### UL-13 — Linked to Session #13 | 2026-04-26

#### 🤖 Agent Fills
**Code-to-Planning Ratio:** ~95% code (C1–C7 execution) / 5% planning (only Bucket A commit-split decisions; everything else pre-locked in S12)
**QnA Count:** ~5 (mostly per-bucket "next?" + 1 spec clarification on useSafeToSpend in C7)
**Scope Creep:** N — every commit stayed within plan doc spec
**Prompt Clarity:** 4.5/5
**Prompt Specificity:** 4.5/5
**Overall Prompt Quality:** 4.5/5

**Vagueness Flags:**
- None significant. The "C1–C7 execution mode" with single-token directives ("go C", "C2 > C3 > ...", "single commit only", "don't generate what was accomplished every time") was the cleanest execution loop across 13 sessions.

**Improvement check vs UL-12 feedback:**
- UL-12 tip 1 ("how can you test yourself" question): N/A this session — execution-only. But Bucket M deferral is the open follow-through.
- UL-12 tip 2 (mood-as-escalation discipline): N/A — no frustration moments this session due to pre-locked decisions.
- UL-12 tip 3 ("Don't plan yet" + iterative scrutiny): N/A — already paid off in S12. S13 reaped the dividend with 0 ambiguity.

**Top 3 Improvement Tips:**
- The S12 → S13 pattern (deep RCA + lock decisions in one session, then execute in next) is the optimal two-session protocol for any non-trivial phase. Sustain this pattern. Never combine RCA-and-execute into a single session for >3-fix phases.
- "single commit only" + "just say which bucket next" + "don't generate what was accomplished every time" — these 3 directives together compress execution-mode response time by ~70% vs verbose mode. Make this the default execution-session protocol.
- Build verification is still the gap. Bucket M (MCP browser) deferred again — this means S13 ships 7 commits as `[CODE-ONLY]`. UL-12's #1 lesson (runtime verification) is acknowledged in plan but not yet operationalized. M must execute next session, no more deferrals.

**Decisions Made:** 0 new (all locked in S12: D040–D048)
**Bugs Fixed:** 5 (BUG-039 through BUG-043, all CODE-ONLY pending user screenshot verification)
**Bugs Codified into Process:** 1 (BUG-044 — stale .next/ build, codified as CLAUDE.md Rule 1)

#### 🧑 You Fill (optional)
**Mood/Energy:**
**Rushing?:**
**Satisfaction:**
**Session Duration:**
**Claude Think+Code Time:**
**Tokens:** Start: | End: | Freed:
**What felt off:**
**What you'd do differently:**

---

<!-- AGENT: append new UL entry above this line -->