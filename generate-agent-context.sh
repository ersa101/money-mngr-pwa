#!/bin/bash

# generate-agent-context.sh
# Purpose: Auto-generate context summary for next agent
# Usage: ./generate-agent-context.sh > agent-context-report.txt

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       MONEY MNGR PWA — AGENT CONTEXT REPORT                ║"
echo "║       Generated: $(date '+%Y-%m-%d %H:%M:%S')                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ========================================
# 1. GIT STATUS
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 GIT STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Current Branch:"
git branch | grep '^\*'
echo ""
echo "Last 5 Commits:"
git log -5 --oneline --decorate --graph
echo ""
echo "Uncommitted Changes:"
if [ -z "$(git status --porcelain)" ]; then
  echo "✅ Working directory clean"
else
  echo "⚠️  Uncommitted files detected:"
  git status --short
fi
echo ""

# ========================================
# 2. BUILD STATUS
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 BUILD STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
  echo "✅ node_modules installed"
else
  echo "❌ node_modules missing — run 'npm install'"
fi

# Check TypeScript compilation
echo ""
echo "TypeScript Check:"
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  echo "❌ TypeScript errors detected:"
  npx tsc --noEmit 2>&1 | grep "error TS" | head -5
  echo "   (showing first 5 errors)"
else
  echo "✅ TypeScript compilation successful"
fi

# Try to start dev server (non-blocking check)
echo ""
echo "Dev Server Quick Check:"
echo "(Attempting to verify Next.js config...)"
if [ -f "next.config.js" ]; then
  echo "✅ next.config.js exists"
  echo ""
  echo "Current cacheId:"
  grep -A 2 "cacheId:" next.config.js | head -3
else
  echo "⚠️  next.config.js not found"
fi
echo ""

# ========================================
# 3. CLAUDE.MD ANALYSIS
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📖 CLAUDE.MD CONTEXT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for CLAUDE.md file
CLAUDE_FILE=""
if [ -f "CLAUDE_gitTracking_v2_ENHANCED.md" ]; then
  CLAUDE_FILE="CLAUDE_gitTracking_v2_ENHANCED.md"
elif [ -f "CLAUDE_gitTracking_userTVM_v1_01032026.md" ]; then
  CLAUDE_FILE="CLAUDE_gitTracking_userTVM_v1_01032026.md"
elif [ -f "CLAUDE.md" ]; then
  CLAUDE_FILE="CLAUDE.md"
fi

if [ -z "$CLAUDE_FILE" ]; then
  echo "❌ No CLAUDE.md file found!"
  echo "   Expected files:"
  echo "   - CLAUDE_gitTracking_v2_ENHANCED.md"
  echo "   - CLAUDE_gitTracking_userTVM_v1_01032026.md"
  echo "   - CLAUDE.md"
else
  echo "✅ Using: $CLAUDE_FILE"
  echo ""
  
  # Extract Active Session Log
  echo "📋 ACTIVE SESSION LOG:"
  echo "──────────────────────────────────────────────────────────"
  if grep -q "ACTIVE SESSION LOG" "$CLAUDE_FILE"; then
    # Extract table between "ACTIVE SESSION LOG" and next "##" heading
    awk '/ACTIVE SESSION LOG/,/^##/' "$CLAUDE_FILE" | head -20
  else
    echo "⚠️  No ACTIVE SESSION LOG found in $CLAUDE_FILE"
  fi
  echo ""
  
  # Extract Current Priority Tasks
  echo "🎯 CURRENT PRIORITIES (from P0 section):"
  echo "──────────────────────────────────────────────────────────"
  if grep -q "Priority P0" "$CLAUDE_FILE"; then
    awk '/Priority P0/,/^###/' "$CLAUDE_FILE" | grep '^\- \[ \]' | head -5
  else
    echo "⚠️  No P0 priorities found"
  fi
  echo ""
  
  # Extract Most Recent Handoff
  echo "🤝 LAST HANDOFF NOTES:"
  echo "──────────────────────────────────────────────────────────"
  if grep -q "HANDOFF NOTES" "$CLAUDE_FILE"; then
    # Extract content between "HANDOFF NOTES" and "### 🤖" (second agent handoff)
    awk '/HANDOFF NOTES/,/^### 🤖.*Template/' "$CLAUDE_FILE" | head -40
  else
    echo "⚠️  No handoff notes found"
  fi
fi
echo ""

# ========================================
# 4. FILES MODIFIED RECENTLY
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 FILES MODIFIED IN LAST COMMIT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
git diff HEAD~1 --stat | head -20
echo ""

# ========================================
# 5. PROJECT STRUCTURE QUICK VIEW
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 PROJECT STRUCTURE (Key Directories)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
if [ -d "src" ]; then
  echo "src/"
  tree -L 2 -d src 2>/dev/null || (
    echo "  app/"
    ls -1 src/app/ | head -5
    echo "  components/"
    ls -1 src/components/ | head -5
    echo "  hooks/"
    ls -1 src/hooks/ 2>/dev/null | head -5
    echo "  lib/"
    ls -1 src/lib/ 2>/dev/null | head -5
  )
else
  echo "⚠️  src/ directory not found"
fi
echo ""

# ========================================
# 6. SUMMARY & NEXT STEPS
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SUMMARY & RECOMMENDED NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. ✅ Review ACTIVE SESSION LOG above to see completed tasks"
echo "2. ✅ Read LAST HANDOFF NOTES for Agent1's instructions"
echo "3. ✅ Check CURRENT PRIORITIES (P0) for your next task"
echo "4. ⚠️  Verify build works: npm run dev"
echo "5. ⚠️  Read full CLAUDE.md before writing code"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Report generated successfully!"
echo "Save this output and share with next agent for context."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
