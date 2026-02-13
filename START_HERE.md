# 🚀 START HERE - Claude Code Setup Instructions

**Date:** January 16, 2026  
**Goal:** Get Claude Code running and start Sprint 2  
**Estimated Time:** 30 minutes

---

## ⚡ QUICK START (Do This First)

### Step 1: Add Files to Your Project

**Action:** Copy these files from the outputs folder to your project root:

```
Your Project Root (money-mngr-pwa/)
├── CLAUDE_CODE_INSTRUCTIONS.md    ← Main instructions for Claude Code
├── PRODUCT_VISION.md              ← Vision & strategy
├── FEATURE_ROADMAP.md             ← Task tracking
├── TECHNICAL_ARCHITECTURE.md      ← System design
└── useThreshold.ts                ← First code file to implement
```

**How to do it:**
1. Download all files from the outputs folder
2. Place them in: `c:\Users\ershr\Downloads\random codes\Money mngr\money-mngr-pwa\`

---

### Step 2: Remove Redundant Documentation

**Action:** Delete these outdated files from your project:

```bash
# Navigate to your project folder
cd "c:\Users\ershr\Downloads\random codes\Money mngr\money-mngr-pwa"

# Delete redundant docs (Windows PowerShell)
Remove-Item CSV_IMPORT.md
Remove-Item ERROR_LOG.md
Remove-Item ERROR_STATUS.md
Remove-Item TROUBLESHOOTING.md
Remove-Item SESSION_SUMMARY.md
Remove-Item CHANGELOG_JAN14.md
```

**Why:** These are outdated and superseded by newer documentation.

---

### Step 3: Open Project in VSCode with Claude Code

**Action:**
1. Open VSCode
2. Install Claude Code extension (if not already installed)
3. Open your project folder: `File > Open Folder > money-mngr-pwa`
4. Open Claude Code panel (click Claude icon in sidebar)

---

### Step 4: Give Claude Code Its Instructions

**Action:** In the Claude Code chat, paste this:

```
I have a Next.js PWA project for expense tracking. 

Please read these files in this exact order:
1. CLAUDE_CODE_INSTRUCTIONS.md (complete development guide)
2. PRODUCT_VISION.md (what we're building and why)
3. FEATURE_ROADMAP.md (task breakdown)

After reading, confirm you understand the project and are ready to start Sprint 2, Task 2.1 (creating the useThreshold hook).

The useThreshold.ts file is already created as a reference - you need to:
1. Move it to src/hooks/useThreshold.ts
2. Update imports to match our project structure
3. Create TypeScript types in src/types/index.ts if they don't exist
4. Test the hook

Start with Sprint 2, Task 2.1 as detailed in CLAUDE_CODE_INSTRUCTIONS.md.
```

---

## 📋 What Happens Next

Claude Code will:

### Phase 1 - File Setup (5 mins)
- [x] Read all instruction files
- [ ] Create `src/types/index.ts` (centralized types)
- [ ] Move `useThreshold.ts` to `src/hooks/`
- [ ] Update imports

### Phase 2 - Sprint 2 Implementation (2-3 hours)
- [ ] Task 2.1: Implement useThreshold hook ✅ (file already created)
- [ ] Task 2.2: Update AddTransactionModal.tsx
  - Add threshold preview
  - Real-time balance updates
  - Color-coded warnings
- [ ] Task 2.3: Update AccountCard.tsx
  - Add progress bar
  - Color-coded borders
  - Spendable amount badge

### Phase 3 - Testing (30 mins)
- [ ] Test threshold calculations
- [ ] Test UI updates
- [ ] Test edge cases (negative balance, zero threshold, etc.)

### Phase 4 - Git Commit
- [ ] Commit with message: `feat(threshold): add threshold warning system`
- [ ] Push to GitHub

---

## 🎯 Success Criteria

You'll know Sprint 2 is complete when:

1. **Transaction Entry Modal shows:**
   - Current balance
   - Threshold value
   - Spendable amount
   - Real-time preview as user types
   - Color-coded warning (green/yellow/red)
   - Button disabled if CRITICAL

2. **Account Card shows:**
   - Progress bar (balance vs threshold)
   - Color-coded left border
   - Spendable amount badge
   - Status indicator

3. **Everything works:**
   - No TypeScript errors
   - No console errors
   - Smooth UX (updates within 100ms)

---

## 📞 If You Get Stuck

### Check Documentation
1. `CLAUDE_CODE_INSTRUCTIONS.md` - Has detailed implementation steps
2. `FEATURE_ROADMAP.md` - Has acceptance criteria for each task
3. `TECHNICAL_ARCHITECTURE.md` - Has system design details

### Common Issues

**Issue: TypeScript errors about missing types**
Solution: Create `src/types/index.ts` and centralize all interfaces

**Issue: Dexie not found**
Solution: Make sure you're in the right project directory and `npm install` was run

**Issue: Components not updating in real-time**
Solution: Verify `useLiveQuery` is being used for database queries

---

## 🗓️ Timeline

**Today (Jan 16):** Setup + Start Sprint 2  
**Jan 17:** Complete Sprint 2 (Threshold System)  
**Jan 18:** Sprint 3 (Account Headers)  
**Jan 19:** Sprint 4 & 5 (Quick Transactions + Filters)  
**Jan 20:** Sprint 6 (Polish) + Deploy to Vercel  

---

## ✅ Checklist

Before starting development:
- [ ] All files copied to project root
- [ ] Redundant docs deleted
- [ ] Project open in VSCode
- [ ] Claude Code extension installed
- [ ] Instructions pasted to Claude Code
- [ ] Claude Code confirmed it read the files

---

## 🎉 You're Ready!

Give Claude Code the instruction above and let it work its magic. Check in every hour or so to review progress.

**Target:** By end of today, threshold warning system should be functional.

Good luck! 🚀

---

*For questions or issues, refer to CLAUDE_CODE_INSTRUCTIONS.md Section 10*
