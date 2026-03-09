# 🎯 DUAL-AGENT WORKFLOW SYSTEM — COMPLETE GUIDE
## Money Mngr PWA | Sequential Claude Code Collaboration

**Created:** March 2, 2026  
**Purpose:** Enable two Claude Code instances (Agent1 & Agent2) to work seamlessly on the same codebase without conflicts  
**Workflow Type:** Sequential (Agent1 → commit → Agent2 → commit)

---

## 📚 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [File Inventory](#file-inventory)
3. [Workflow Steps](#workflow-steps)
4. [Agent2 Onboarding](#agent2-onboarding)
5. [Conflict Prevention](#conflict-prevention)
6. [Troubleshooting](#troubleshooting)
7. [Quality Metrics](#quality-metrics)

---

## 🎯 SYSTEM OVERVIEW

### The Problem You're Solving

You have:
- ✅ 2 Claude Pro accounts
- ✅ 2 computers (or 2 VSCode windows)
- ✅ 1 shared GitHub repository
- ❌ Risk of: context drift, merge conflicts, lost work, unclear handoffs

### The Solution

**Sequential Workflow with Shared Context:**

```
Agent1 (Computer A)          Agent2 (Computer B)
       ↓                            ↓
  1. Pull latest             1. Pull latest
  2. Read CLAUDE.md          2. Read CLAUDE.md
  3. Work on P0 task         3. (Wait for Agent1)
  4. Update CLAUDE.md        4. Read Agent1's handoff
  5. Commit + Push           5. Work on next task
  6. → HANDOFF →             6. Update CLAUDE.md
                             7. Commit + Push
                             8. → HANDOFF → (back to Agent1)
```

### Key Principles

1. **Single Source of Truth:** CLAUDE.md contains all context
2. **Strict Adherence:** Agents follow CLAUDE.md without deviation
3. **Explicit Handoffs:** Every commit includes notes for next agent
4. **Sequential Only:** Never both work simultaneously on same files
5. **Human as Tiebreaker:** Uncertain decisions escalate to you

---

## 📦 FILE INVENTORY

Here's what you received:

| File | Purpose | When to Use |
|------|---------|-------------|
| `CLAUDE_gitTracking_v2_ENHANCED.md` | **Master context file** — rules, session log, handoff notes | Replace your current CLAUDE.md with this |
| `AGENT2_INIT_PROMPT.md` | **First message to Agent2** when they start work | Copy-paste into Agent2's VSCode Claude Code |
| `generate-agent-context.sh` | **Auto-generate handoff report** — bash script | Run before Agent1 → Agent2 handoff |
| `PRE_COMMIT_CHECKLIST.md` | **Quality checklist** before every commit | Review before `git commit` |
| `AGENT_QUICK_REFERENCE.txt` | **One-page cheat sheet** — print and keep visible | Keep open in VSCode sidebar |
| `money-mngr-pwa.code-workspace` | **VSCode workspace config** — auto-tasks, settings | Open in VSCode: File → Open Workspace |

---

## 🚀 WORKFLOW STEPS

### **PHASE 1: Setup (One-Time)**

#### On Computer A (Agent1's Machine):

```bash
# 1. Navigate to your project
cd "c:\Users\ershr\Downloads\random codes\Money mngr\money-mngr-pwa"

# 2. Replace old CLAUDE.md with new enhanced version
# (Copy CLAUDE_gitTracking_v2_ENHANCED.md to your project root)
mv CLAUDE.md CLAUDE.md.backup
cp /path/to/CLAUDE_gitTracking_v2_ENHANCED.md ./CLAUDE.md

# 3. Add automation scripts to project root
cp /path/to/generate-agent-context.sh ./
chmod +x generate-agent-context.sh

cp /path/to/PRE_COMMIT_CHECKLIST.md ./
cp /path/to/AGENT_QUICK_REFERENCE.txt ./

# 4. Commit the new files
git add CLAUDE.md generate-agent-context.sh PRE_COMMIT_CHECKLIST.md AGENT_QUICK_REFERENCE.txt
git commit -m "docs: add dual-agent workflow system"
git push origin main
```

#### On Computer B (Agent2's Machine):

```bash
# 1. Clone or pull the repository
cd "c:\Users\[Agent2Username]\Documents\Projects"
git clone https://github.com/ersa101/money-mngr-pwa.git
# OR if already cloned:
cd money-mngr-pwa
git pull origin main

# 2. Install dependencies
npm install

# 3. Verify setup
npm run dev  # Should start on port 3000
# If port conflict: PORT=3001 npm run dev

# 4. Open VSCode workspace
code money-mngr-pwa.code-workspace
```

---

### **PHASE 2: Agent1 Work Session**

#### Step 1: Pre-Work Checklist

```bash
# Pull latest (in case Agent2 pushed while you were offline)
git pull origin main

# Verify build works
npm run dev

# Read current state
cat CLAUDE.md | grep -A 10 "ACTIVE SESSION LOG"
cat CLAUDE.md | grep -A 20 "HANDOFF NOTES"
```

#### Step 2: Identify Task

```bash
# Check priorities in CLAUDE.md
# Look for tasks marked with ☐ (unchecked)
# Start with P0, then P1, then P2

# Example:
# - [ ] P0.3 — Stats page "Unknown" category fallback
```

#### Step 3: Mark Task as In Progress

**Edit CLAUDE.md:**

```markdown
| 2026-03-02 | Agent1 | P0.3 Stats Fallback | 🚧 In Progress | - | Working on csvCategory fallback |
```

**Update FILES UNDER ACTIVE EDIT:**

```markdown
| `stats/CategoryComposition.tsx` | Agent1 | 2026-03-02 14:30 | P0.3 fix | 15:00 |
```

#### Step 4: Do the Work

```bash
# Work on the task following CLAUDE.md patterns
# Ask human if uncertain about anything architectural
```

#### Step 5: Pre-Commit Validation

**Run through PRE_COMMIT_CHECKLIST.md:**

```bash
npx tsc --noEmit                    # 0 errors
npm run build                       # Successful build
npm run dev                         # Server starts
# Manual smoke test via browser
git status                          # Review changes
git diff                            # Scan line-by-line
```

#### Step 6: Update Documentation

**Edit CLAUDE.md:**

1. **Update ACTIVE SESSION LOG:**
   ```markdown
   | 2026-03-02 | Agent1 | P0.3 Stats Fallback | ✅ Complete | abc1234 | Added csvCategory fallback |
   ```

2. **Write HANDOFF NOTES:**
   ```markdown
   ### 🤖 Agent1 → Agent2 (2026-03-02 15:00)

   **Completed Tasks:**
   - ✅ P0.3 — Stats page "Unknown" category fallback
     - Modified: `src/components/stats/CategoryComposition.tsx` (lines 85-102)
     - Changed: Added fallback to `transaction.csvCategory` when `toCategoryId` is null
     - Tested: Stats page now shows category names from CSV import

   **Next Agent Should Do:**
   - [ ] P1.1 — Date filters on Transactions page
     - File: `src/app/transactions/page.tsx`
     - Add dropdown with: Daily | Weekly | Monthly | Quarterly | Annual
     - Group transactions by selected period
   
   **Known Issues I Noticed:**
   - Sub-category dropdown still missing (P1.2)
   - Net Worth chart only shows one line (P2.1)
   
   **Build Status:**
   - ✅ npm run dev (port 3000)
   - ✅ npx tsc --noEmit (0 errors)
   - ✅ Smoke test passed
   ```

3. **Update FILES UNDER ACTIVE EDIT:**
   ```markdown
   | `stats/CategoryComposition.tsx` | - | - | Available | - |
   ```

#### Step 7: Commit

```bash
git add .
git commit -m "fix(stats): add csvCategory fallback for Unknown categories (P0.3)"

# Get commit hash
git log -1 --oneline
# Output: abc1234 fix(stats): add csvCategory fallback...

# Update CLAUDE.md with commit hash
# (Replace "abc1234" placeholder in ACTIVE SESSION LOG)
git add CLAUDE.md
git commit -m "docs: update session log with P0.3 commit hash"

# Push to GitHub
git push origin main
```

#### Step 8: Generate Handoff Report (Optional but Recommended)

```bash
./generate-agent-context.sh > handoff-$(date +%Y%m%d-%H%M).txt

# Review the report
cat handoff-20260302-1500.txt

# Send this file to Agent2 via:
# - Email attachment
# - Shared cloud folder (Google Drive, Dropbox)
# - Slack/Discord message
```

---

### **PHASE 3: Agent2 Work Session**

#### Step 1: Initial Setup (First Time Only)

**In VSCode on Computer B, open Claude Code and paste:**

Copy the entire contents of `AGENT2_INIT_PROMPT.md` into the chat.

**Claude will respond with:**
```
I've pulled the latest code. Running context commands now...

[git log output]
[npm run dev output]
[CLAUDE.md excerpt]

I can see Agent1 completed:
- P0.3 Stats fallback (commit abc1234)

Next task is P1.1 Date filters. Should I proceed?
```

**You respond:**
```
Yes, proceed with P1.1. Follow the pattern from 
Agent1's handoff notes.
```

#### Step 2: Work & Commit (Same as Agent1)

Follow the exact same steps from PHASE 2:
- Mark task in progress in CLAUDE.md
- Do the work
- Run pre-commit checklist
- Update documentation
- Commit with proper message
- Generate handoff report

---

### **PHASE 4: Handoff Back to Agent1**

Agent2 pushes their work, and Agent1 pulls:

```bash
# Agent1's machine
git pull origin main

# Read Agent2's handoff notes
cat CLAUDE.md | grep -A 30 "Agent2 → Agent1"

# Continue the cycle...
```

---

## 🤖 AGENT2 ONBOARDING

### First Day Setup

1. **Computer B:** Clone repository, install dependencies
2. **VSCode:** Open `money-mngr-pwa.code-workspace`
3. **Install Extensions:** Accept VSCode's recommendations
4. **Verify Build:** Run `npm run dev` → should see app on localhost:3000
5. **Read Docs:**
   - Print `AGENT_QUICK_REFERENCE.txt` (keep visible)
   - Bookmark `CLAUDE.md` in VSCode
   - Bookmark `PRE_COMMIT_CHECKLIST.md` in VSCode

### First Work Session

1. **Wait for Agent1's handoff:** Don't start until Agent1 commits & pushes
2. **Pull latest:** `git pull origin main`
3. **Copy AGENT2_INIT_PROMPT.md** into Claude Code
4. **Follow Claude's guidance:** It will ask for context commands
5. **Confirm task:** Before coding, verify you're working on correct priority
6. **Code with confidence:** CLAUDE.md has all the patterns you need

---

## 🛡️ CONFLICT PREVENTION

### Rule 1: Never Work on Same Files Simultaneously

**Check FILES UNDER ACTIVE EDIT before starting:**

```markdown
| File | Agent | Started | Reason | ETA |
|------|-------|---------|--------|-----|
| `csvImport.ts` | Agent1 | 2026-03-02 14:00 | P0.2 | 15:00 |
```

If Agent1 is editing a file you need, **ask human to coordinate.**

### Rule 2: Always Pull Before Starting

```bash
# EVERY work session starts with:
git pull origin main
```

### Rule 3: Use Feature Branches (Optional Advanced)

If you want to work in parallel on different features:

```bash
# Agent1
git checkout -b agent1/P0-critical-fixes
# Work, commit
git push origin agent1/P0-critical-fixes

# Agent2 (different feature)
git checkout -b agent2/P1-date-filters
# Work, commit
git push origin agent2/P1-date-filters

# Human merges both branches after review
```

---

## 🔧 TROUBLESHOOTING

### Problem: "Build fails after pulling Agent1's code"

**Solution:**
```bash
# 1. Check what changed
git log -1 --stat

# 2. Verify dependencies
npm install

# 3. Clear cache
rm -rf .next node_modules
npm install
npm run dev

# 4. If still broken, ask Agent1 or human
```

### Problem: "Merge conflict detected"

**Solution:**
```bash
# HALT immediately — do not attempt auto-resolution
# Ask human to resolve manually

# Show conflicting files
git status | grep "both modified"

# Document in conversation:
"Merge conflict in [filename]. Waiting for human to resolve."
```

### Problem: "Agent2 can't understand Agent1's changes"

**Solution:**
- Check `HANDOFF NOTES` in CLAUDE.md
- Read commit message: `git log -1`
- View full diff: `git show [commit-hash]`
- If still unclear, ask human for clarification

### Problem: "Context drift — Agent2 ignoring CLAUDE.md rules"

**Solution:**
1. Stop Agent2 immediately
2. Send them `AGENT2_INIT_PROMPT.md` again
3. Emphasize **STRICT ADHERENCE MODE** section
4. Have them re-read GOLDEN RULES in Quick Reference
5. If persists, escalate to human supervision

---

## 📊 QUALITY METRICS

Track these weekly to ensure workflow health:

| Metric | Target | How to Check |
|--------|--------|--------------|
| Broken Commits | 0 | `git log --oneline` (no "revert" or "fix build") |
| Merge Conflicts | 0 | Check GitHub PR history |
| TypeScript Errors | 0 | `npx tsc --noEmit` in latest commit |
| Lighthouse Score | > 85 | Run in browser DevTools |
| Handoff Clarity | 100% | Agent2 never asks "what did Agent1 mean?" |
| Context Drift | 0 incidents | Agents follow CLAUDE.md without asking |

---

## 🎯 SUCCESS CRITERIA

**You'll know this system works when:**

✅ Agent2 can start work without asking you what to do  
✅ Zero merge conflicts over 10+ commits  
✅ Every commit passes TypeScript + smoke test  
✅ ACTIVE SESSION LOG accurately reflects all work  
✅ You can leave agents unsupervised for 1-2 tasks  
✅ Handoff reports are clear and actionable  
✅ Build never breaks in main branch  

---

## 📖 APPENDIX: File Templates

### A. Commit Message Template

```
<type>(<scope>): <brief description> (<priority>)

Examples:
fix(csvImport): await categoryId before transaction insert (P0.2)
feat(transactions): add date filter dropdown (P1.1)
refactor(hooks): centralize category lookup logic (P3.2)
docs: update session log with P0.3 commit hash
```

### B. CLAUDE.md Session Log Entry

```markdown
| Date | Agent | Task | Status | Commit Hash | Notes |
|------|-------|------|--------|-------------|-------|
| 2026-03-02 | Agent1 | P0.3 Stats Fallback | ✅ Complete | abc1234 | Added csvCategory fallback |
```

### C. Handoff Note Template

```markdown
### 🤖 Agent[X] → Agent[Y] (YYYY-MM-DD HH:MM)

**Completed Tasks:**
- ✅ [Task name] — [What you did]
  - Modified: [file path] (lines X-Y)
  - Changed: [specific change]
  - Tested: [how you verified]

**Next Agent Should Do:**
- [ ] [Next priority from CLAUDE.md]
  - File: [path]
  - Issue: [what's wrong]
  - Solution: [how to fix]

**Known Issues I Noticed:**
- [Bugs you saw but didn't fix]

**Build Status:**
- ✅/❌ npm run dev
- ✅/❌ npx tsc --noEmit
- ✅/❌ Lighthouse score
```

---

## 🎓 ADVANCED TIPS

### Tip 1: Use Git Aliases for Common Commands

```bash
# Add to ~/.gitconfig or ~/.bashrc
alias gs='git status'
alias gl='git log -5 --oneline'
alias gd='git diff'
alias gp='git pull origin main'
alias gc='git commit -m'
```

### Tip 2: Schedule Agent Work Sessions

```
Week 1:
- Mon/Wed/Fri: Agent1 works (odd days)
- Tue/Thu: Agent2 works (even days)

Week 2: Reverse
```

### Tip 3: Use GitHub Projects for Task Tracking

Create columns:
- **Backlog** (P1/P2/P3 tasks)
- **Next** (P0 tasks)
- **Agent1 Working**
- **Agent2 Working**
- **Done**

### Tip 4: Record Video Handoffs (Optional)

Agent1 records a 2-min Loom video explaining:
- What they built
- Why they made certain choices
- Gotchas Agent2 should know

Attach video link to commit message or handoff note.

---

## 📝 CHANGELOG

| Date | Version | Changes |
|------|---------|---------|
| 2026-03-02 | 1.0 | Initial dual-agent workflow system created |

---

## 📞 SUPPORT

**If you encounter issues:**

1. Check `PRE_COMMIT_CHECKLIST.md` first
2. Review `TROUBLESHOOTING` section above
3. Read `CLAUDE.md` DECISION LOG for architectural context
4. Ask in conversation: "Check CLAUDE.md section X for guidance"
5. If all else fails, pause work and consult human

**Remember:** The goal is **zero broken commits**, not speed.  
Better to halt and ask than to commit buggy code.

---

**🎯 NEXT STEPS FOR YOU:**

1. ✅ Copy all 7 files to your project directory
2. ✅ Replace old CLAUDE.md with enhanced v2
3. ✅ Commit the new files to GitHub
4. ✅ Set up Computer B with cloned repo
5. ✅ Test the workflow with a simple P3 task
6. ✅ Refine CLAUDE.md based on your team's needs

**Good luck! You now have a production-grade dual-agent collaboration system.** 🚀
