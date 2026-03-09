# 🛡️ PRE-COMMIT CHECKLIST FOR AGENTS
## Money Mngr PWA — Conflict Prevention & Quality Assurance

---

## ⚠️ RUN THIS CHECKLIST BEFORE EVERY `git commit`

Copy this checklist into your conversation with Claude Code.  
Mark each item ✅ before committing.

---

### 📋 PHASE 1: CODE QUALITY

```bash
# 1. TypeScript Validation
☐ npx tsc --noEmit
   → Must show 0 errors
   → If errors exist, fix them before committing

# 2. Build Test
☐ npm run build
   → Must complete without errors
   → Check for warnings (acceptable if minor)

# 3. Dev Server Test
☐ npm run dev
   → Server starts on port 3000
   → No fatal errors in terminal
   → Can navigate to localhost:3000/transactions
```

---

### 🧪 PHASE 2: FUNCTIONAL TESTING

**5-Minute Smoke Test (from CLAUDE.md):**

```
☐ Homepage redirects to /transactions
☐ Can add 1 transaction (any type)
☐ Transaction appears in list immediately
☐ Account balance updates in real-time
☐ /accounts page loads without errors
☐ /stats page loads with charts visible
☐ Browser console shows 0 errors (F12 → Console tab)
```

**If you modified CSV import:**

```
☐ Upload sample.csv via /settings
☐ Import completes with progress bar
☐ Check /stats page for "Unknown" categories
☐ Verify transaction count matches CSV rows
```

**If you modified Stats page:**

```
☐ All 4 charts render (NetWorth, IncomeVsExpense, Category, Trend)
☐ Period filters work (Monthly, Quarterly, Annual)
☐ Data labels show correct values (not NaN or undefined)
```

**If you modified Account/Transaction logic:**

```
☐ Add expense → balance decreases correctly
☐ Add income → balance increases correctly
☐ Transfer → both accounts update correctly
☐ Threshold indicator (green/red) updates
```

---

### 📝 PHASE 3: DOCUMENTATION

**Update CLAUDE.md:**

```
☐ Add entry to ACTIVE SESSION LOG table
   - Date: [today]
   - Agent: [Agent1/Agent2]
   - Task: [what you completed]
   - Status: ✅ Complete
   - Commit Hash: [leave blank, fill after commit]

☐ Write HANDOFF NOTES for next agent
   - What you completed (with file paths + line numbers)
   - What next agent should do
   - Any issues you noticed but didn't fix
   - Build status (✅/❌ for dev, tsc, lighthouse)

☐ Update FILES UNDER ACTIVE EDIT
   - Mark your files as "Available" again
```

**Update Code Comments (if needed):**

```
☐ Add inline comments for complex logic
☐ Document WHY, not just WHAT
☐ Reference CLAUDE.md decision number if applicable
   Example: // See CLAUDE.md Decision #002 — CSV field fallback
```

---

### 🔍 PHASE 4: GIT HYGIENE

**Check Uncommitted Changes:**

```bash
☐ git status
   → Review list of modified files
   → Ensure you're not committing unrelated changes
   → Check for accidentally modified files (package-lock.json, .env)

☐ git diff
   → Scan through changes line-by-line
   → Remove debug console.log statements
   → Remove commented-out code blocks
   → Check for hardcoded values that should be config
```

**Commit Message Format:**

```
☐ Use conventional commit format:
   fix(component): brief description
   feat(page): brief description
   refactor(hook): brief description
   
   Examples:
   ✅ fix(csvImport): await categoryId before transaction insert
   ✅ feat(stats): add fallback to csvCategory for Unknown categories
   ❌ updated files
   ❌ changes
```

---

### 🚀 PHASE 5: FINAL CHECKS

**Service Worker Cache:**

```
☐ If you modified UI components or pages:
   → Open next.config.js
   → Increment cacheId (e.g., v3 → v4)
   → Document change in commit message
```

**Double-Entry Ledger Integrity:**

```
☐ If you touched balance calculations:
   → Add test transaction via UI
   → Check account balance matches expectation
   → Delete transaction → balance reverts correctly
```

**CSV Metadata Preservation:**

```
☐ If you modified Transaction schema:
   → Ensure csvAccount, csvCategory, csvSubcategory still exist
   → Check fallback logic in display components
```

---

### ✅ COMMIT APPROVAL CHECKLIST

Only commit if ALL of these are true:

```
☐ All PHASE 1 tests pass (TypeScript, build, dev server)
☐ All relevant PHASE 2 tests pass (smoke test + feature-specific)
☐ CLAUDE.md is updated with handoff notes
☐ git diff shows only relevant changes (no accidental files)
☐ Commit message follows conventional format
☐ If UI changed, cacheId was incremented
☐ No console.log or commented code left in final version
```

---

### 🔴 HALT CONDITIONS (Do NOT commit if true)

```
❌ TypeScript errors exist
❌ Build fails
❌ Dev server crashes on startup
❌ Smoke test reveals broken core functionality
❌ You're unsure if your changes are correct
❌ Files from another agent's work are in your git diff
❌ CLAUDE.md says "ask human" for this type of change
```

**If any HALT condition is true:**
1. STOP immediately
2. Ask human for guidance
3. Do NOT attempt to "fix quickly"
4. Document the blocker in conversation

---

### 📤 POST-COMMIT ACTIONS

**After successful commit:**

```bash
# 1. Copy commit hash
☐ git log -1 --oneline
   → Copy the hash (e.g., abc1234)

# 2. Update CLAUDE.md ACTIVE SESSION LOG
☐ Fill in the "Commit Hash" column with hash from step 1

# 3. Push to GitHub
☐ git push origin main
   → Verify push succeeded
   → Check GitHub web UI to confirm commit appears

# 4. Generate context for next agent (optional but recommended)
☐ ./generate-agent-context.sh > agent-handoff-$(date +%Y%m%d).txt
   → Save this file for next agent to read
```

---

### 🎯 EXAMPLE: Complete Workflow

```bash
# ===== PHASE 1: Quality =====
npx tsc --noEmit          # ✅ No errors
npm run build             # ✅ Build successful
npm run dev               # ✅ Server started

# ===== PHASE 2: Testing =====
# (Manually test via browser)
# ✅ Added transaction
# ✅ Balance updated
# ✅ Stats page loads
# ✅ No console errors

# ===== PHASE 3: Documentation =====
# (Update CLAUDE.md)
# ✅ Added entry to ACTIVE SESSION LOG
# ✅ Wrote handoff notes

# ===== PHASE 4: Git Hygiene =====
git status                # Review files
git diff                  # Scan changes
# ✅ Removed debug logs
# ✅ Fixed commit message

# ===== PHASE 5: Final Checks =====
# ✅ Incremented cacheId in next.config.js
# ✅ All checklist items passed

# ===== COMMIT =====
git add .
git commit -m "fix(csvImport): await categoryId before transaction insert (P0.2)"

# ===== POST-COMMIT =====
git log -1 --oneline      # Get hash: def5678
# Update CLAUDE.md with hash
git add CLAUDE.md
git commit -m "docs: update session log with commit hash"
git push origin main      # ✅ Pushed successfully

./generate-agent-context.sh > handoff-20260302.txt
# ✅ Context file saved for Agent2
```

---

## 📊 QUALITY METRICS

Track these across commits to maintain codebase health:

| Metric | Target | Check With |
|--------|--------|------------|
| TypeScript Errors | 0 | `npx tsc --noEmit` |
| Build Time | < 30 sec | `time npm run build` |
| Lighthouse Performance | > 85 | Browser DevTools |
| Bundle Size | < 500 KB | `npm run build` output |
| Console Errors | 0 | Browser F12 Console |

---

## 🔄 VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-02 | Initial checklist created |

---

**💡 TIP:** Bookmark this file in your Claude Code conversation.  
Reference it every time before committing.

**🎯 GOAL:** Zero broken commits. Zero context drift. Zero merge conflicts.
