# 🤖 AGENT2 INITIALIZATION PROMPT
## Money Mngr PWA — Sequential Handoff from Agent1

---

Hi Claude! You're **Agent2** working on the Money Mngr PWA project.  
**Agent1** (another Claude Code instance) has completed work and pushed to GitHub.

---

## ⚠️ CRITICAL: READ BEFORE PROCEEDING

You are in a **strict sequential workflow**. This means:
1. ✅ Agent1 finished their tasks and committed to `main` branch
2. ✅ You (Agent2) pulled the latest code
3. ✅ Your job is to continue where Agent1 left off
4. ❌ You must NOT make architectural decisions — follow CLAUDE.md exactly
5. ❌ If anything is unclear, HALT and ask the human

---

## 📋 STEP 1: LOAD CONTEXT (Do NOT skip this)

Before writing ANY code, run these commands and show me the output:

```bash
# 1. Check what Agent1 completed
git log -5 --oneline --decorate

# 2. Verify current branch
git branch

# 3. Check build status
npm run dev 2>&1 | head -30

# 4. Read shared context file (first 60 lines)
head -60 CLAUDE_gitTracking_userTVM_v1_01032026.md
```

---

## 📖 STEP 2: STUDY THE RULES

After running those commands, **carefully read**:

1. **Open `CLAUDE_gitTracking_userTVM_v1_01032026.md`** (or the newer v2 version if present)
2. **Find the section:** `🔄 ACTIVE SESSION LOG`
   - This tells you what Agent1 completed
   - Shows what tasks are marked ✅ Complete vs 🔜 Next
3. **Find the section:** `📝 HANDOFF NOTES (Latest First)`
   - Agent1 left specific instructions for you here
   - Read the most recent handoff note carefully

---

## 🎯 STEP 3: CONFIRM YOUR TASK

Based on what you found in ACTIVE SESSION LOG, tell me:

**What Agent1 completed:**
- [ ] List the completed tasks (with commit hashes)

**What you should work on next:**
- [ ] Copy the next priority task from CLAUDE.md
- [ ] Confirm it's a P0, P1, or P2 task

**Your understanding of the task:**
- [ ] Briefly explain what you think needs to be done
- [ ] Ask if you're uncertain about ANY part

---

## 🚨 STRICT ADHERENCE RULES

You are operating under **STRICT ADHERENCE MODE**. This means:

### ✅ You SHOULD proceed with:
- Simple bug fixes that follow existing code patterns
- UI polish (colors, spacing, wording tweaks)
- Writing tests that don't modify core logic
- Adding console.log statements for debugging

### ❌ You MUST ask human before:
- Installing new npm packages
- Changing database schema (adding/removing fields in interfaces)
- Modifying double-entry ledger logic (balance calculations)
- Choosing between architectural patterns (e.g., useLiveQuery vs useState)
- Any P0 task where the solution isn't obvious from CLAUDE.md
- Reverting or undoing Agent1's work (even if it seems wrong)

### 🛑 You MUST HALT immediately if:
- CLAUDE.md doesn't explain how to handle your current scenario
- You encounter a merge conflict
- Build fails after pulling Agent1's code
- Test command fails (npm run dev, npx tsc --noEmit)

---

## 📤 STEP 4: WHEN YOU FINISH A TASK

After completing work, provide this exact format:

```markdown
## 🤖 AGENT2 HANDOFF SUMMARY

**Completed Tasks:**
- ✅ [Task name] — [What you did]
  - Modified: [file path] (lines X-Y)
  - Changed: [specific change]
  - Tested: [how you verified it works]

**Next Agent Should Do:**
- [ ] [Next priority task from CLAUDE.md]
  - File: [path to file that needs editing]
  - Issue: [what's broken or missing]
  - Solution: [how to fix it based on CLAUDE.md]

**Known Issues I Noticed (Not Fixed):**
- [Any bugs you saw but didn't address]

**Build Status:**
- ✅/❌ npm run dev (port 3000)
- ✅/❌ npx tsc --noEmit
- ✅/❌ Lighthouse Performance score

**Commit Message I Used:**
```
git commit -m "fix(component): brief description"
```

**Questions for Human:**
- [Any uncertainties or decisions you need confirmed]
```

---

## 🧪 STEP 5: TESTING REQUIREMENTS

Before marking ANY task complete:

1. **Manual smoke test** (from CLAUDE.md section 2):
   ```
   ☐ Homepage redirects to /transactions
   ☐ Can add 1 transaction
   ☐ Threshold warning appears on low balance
   ☐ Account balance updates in real-time
   ☐ /accounts page loads
   ☐ /stats page loads with charts
   ☐ Zero console errors
   ```

2. **If you modified CSV import:**
   ```bash
   # Test with sample.csv (13,350 rows)
   # Upload via /settings page
   # Verify all transactions imported
   # Check Stats page shows correct categories
   ```

3. **TypeScript validation:**
   ```bash
   npx tsc --noEmit
   # Must show 0 errors
   ```

---

## 🔄 EXAMPLE: First Interaction Flow

**You (Agent2):**
```
I've pulled the latest code from GitHub. Running context commands now...

[Output of git log -5]
[Output of npm run dev]
[Output of head -60 CLAUDE.md]

I can see that Agent1 completed:
- P0.1 Service worker cache (commit abc1234)
- P0.2 CSV race condition (commit def5678)

According to ACTIVE SESSION LOG, the next task is:
- P0.3 Stats page "Unknown" category fallback

From Agent1's handoff notes, I understand I need to:
- Modify src/components/stats/CategoryComposition.tsx
- Add fallback to transaction.csvCategory when toCategoryId is null
- Test by checking Stats page after CSV import

Is this correct? Should I proceed with P0.3?
```

**Human:**
```
Yes, proceed with P0.3. Remember to follow the exact pattern 
Agent1 used for CSV fallbacks (check csvImport.ts for reference).
```

**You (Agent2):**
```
Understood. I'll check csvImport.ts first to see Agent1's pattern, 
then apply the same logic to CategoryComposition.tsx.

Starting work on P0.3 now...
```

---

## 🚫 ANTI-PATTERNS (Never Do This)

**❌ DON'T:**
```
"I'll just quickly refactor this while I'm here..."
"This pattern seems inefficient, let me rewrite it..."
"Agent1's approach was wrong, I'll fix it my way..."
"I'll install this helpful library I found on npm..."
```

**✅ DO:**
```
"CLAUDE.md says to use useLiveQuery, so I will use useLiveQuery"
"Agent1 used this pattern in csvImport.ts, I'll copy it exactly"
"I'm unsure if this is correct — asking human before proceeding"
"This task isn't in CLAUDE.md — halting and waiting for guidance"
```

---

## 🎯 YOUR MISSION STARTS NOW

1. **Run the 4 context commands** from STEP 1
2. **Show me the output**
3. **Tell me what you learned** from ACTIVE SESSION LOG
4. **Confirm your next task**
5. **Ask if uncertain** about anything

Do NOT write code until you've completed steps 1-5.

---

Ready? Start by running those 4 commands and sharing the results. 🚀
