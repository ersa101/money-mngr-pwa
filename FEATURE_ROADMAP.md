# 📋 FEATURE ROADMAP

**Project:** Money Manager PWA  
**Last Updated:** January 16, 2026  
**Current Phase:** Phase 1 - MVP Development

---

## ROADMAP OVERVIEW

```
Phase 0: Foundation Cleanup          [========] 100% (Jan 16-17)
Phase 1: MVP - Core Experience       [==------] 30%  (Jan 17-20) ← WE ARE HERE
Phase 2: Intelligence Layer          [--------] 0%   (Feb 2026)
Phase 3: Gen Z Engagement           [--------] 0%   (Mar 2026)
Phase 4: Polish & Publish           [--------] 0%   (Apr 2026)
```

---

## PHASE 0: FOUNDATION CLEANUP ✅ COMPLETE

**Duration:** Jan 16-17, 2026  
**Status:** ✅ DONE

### Tasks Completed

- [x] Remove redundant documentation files
- [x] Create CLAUDE_CODE_INSTRUCTIONS.md
- [x] Create PRODUCT_VISION.md
- [x] Create FEATURE_ROADMAP.md (this file)
- [x] Create TECHNICAL_ARCHITECTURE.md
- [x] Create DATA_MODELS.md
- [x] Create ML_STRATEGY.md
- [x] Create UI_COMPONENT_LIBRARY.md
- [x] Create DEVELOPMENT_GUIDELINES.md
- [x] Audit current codebase structure
- [x] Set up Git workflow conventions

---

## PHASE 1: MVP - CORE EXPERIENCE 🚀 IN PROGRESS

**Duration:** Jan 17-20, 2026  
**Target:** Deployed to Vercel by Jan 20  
**Status:** 🟡 30% Complete

### Success Criteria
- [ ] All existing features work flawlessly
- [ ] Threshold warning system prevents accidental overspending
- [ ] Account organization is clear and intuitive
- [ ] Transaction entry is fast (< 10 seconds)
- [ ] App feels polished and professional
- [ ] Zero critical bugs

---

### SPRINT 1: Foundation Cleanup ✅ DONE
**Date:** Jan 16-17

- [x] Remove redundant docs
- [x] Create foundational documents
- [x] Centralize TypeScript types

---

### SPRINT 2: Threshold Warning System 🔄 IN PROGRESS
**Date:** Jan 17-18  
**Priority:** 🔴 CRITICAL

#### Task 2.1: Create Threshold Hook
**Status:** ⏳ TODO  
**Assignee:** Claude Code  
**Files:** `src/hooks/useThreshold.ts`

**Requirements:**
- [ ] Calculate spendable amount (balance - threshold)
- [ ] Determine status: SAFE / WARNING / CRITICAL
- [ ] Generate user-friendly messages
- [ ] Update in real-time as amount changes

**Acceptance Criteria:**
- Given account with balance ₹10,000 and threshold ₹2,000
- When user enters expense of ₹5,000
- Then spendable should show ₹3,000 (10,000 - 5,000 - 2,000)
- And status should be WARNING (30% of threshold)

---

#### Task 2.2: Enhanced Transaction Entry Modal
**Status:** ⏳ TODO  
**Assignee:** Claude Code  
**Files:** `src/components/transactions/AddTransactionModal.tsx`

**Requirements:**
- [ ] Display current account balance
- [ ] Display threshold value
- [ ] Display spendable amount
- [ ] Real-time preview as user types
- [ ] Color-coded warning border (green/yellow/red)
- [ ] Block submission if CRITICAL (optional: confirm)

**UI Mockup:**
```
┌──────────────────────────────────────┐
│ Add Expense                      [X] │
├──────────────────────────────────────┤
│                                      │
│ Account: [HDFC Bank ▼]              │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Balance: ₹10,000              │  │
│ │ Threshold: ₹2,000             │  │
│ │ ✅ Spendable: ₹8,000          │  │
│ └────────────────────────────────┘  │
│                                      │
│ Category: [Food ▼]                   │
│ Amount: [5000_____________]          │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ ⚠️ After this transaction:     │  │
│ │ New balance: ₹5,000           │  │
│ │ Spendable: ₹3,000 (30%)       │  │
│ │ ⚠️ Approaching threshold!      │  │
│ └────────────────────────────────┘  │
│                                      │
│ Description: [________________]      │
│                                      │
│        [Cancel]  [Record] ⚠️        │
└──────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Preview updates within 100ms of typing
- [ ] Warning colors match design system
- [ ] Button disabled if CRITICAL status
- [ ] Tooltip explains why disabled

---

#### Task 2.3: Account Card Threshold Indicator
**Status:** ⏳ TODO  
**Assignee:** Claude Code  
**Files:** `src/components/accounts/AccountCard.tsx`

**Requirements:**
- [ ] Progress bar: (balance / threshold) ratio
- [ ] Color-coded left border (green/yellow/red)
- [ ] Badge showing spendable amount
- [ ] Trend indicator (↑↓ from last week - optional for MVP)

**Visual Design:**
```
┌─────────────────────────────────────┐
│🟢 HDFC Bank                   [✏️][🗑️] │
│                                      │
│ Balance: ₹10,000                    │
│ Threshold: ₹2,000                   │
│ ✅ Spendable: ₹8,000 (400%)         │
│                                      │
│ [████████░░] 80% of threshold       │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│🔴 Cash Wallet                  [✏️][🗑️] │
│                                       │
│ Balance: ₹500                        │
│ Threshold: ₹1,000                    │
│ 🚨 Below threshold by ₹500           │
│                                       │
│ [███░░░░░░░] 50% of threshold        │
└───────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Border color updates immediately
- [ ] Progress bar animated (smooth transition)
- [ ] Spendable amount always visible
- [ ] Works in mobile view (responsive)

---

### SPRINT 3: Account Header UI 🔄 NEXT
**Date:** Jan 18  
**Priority:** 🟡 HIGH

#### Task 3.1: Distinguish Headers from Accounts
**Status:** ⏳ TODO  
**Assignee:** Claude Code  
**Files:** `src/lib/db.ts`, `src/app/api/data/route.ts`

**Requirements:**
- [ ] Add `isHeader` boolean field to Account interface
- [ ] Seed default headers: "Cash Accounts", "Bank Accounts", "Wallets", "Investments"
- [ ] Update CSV headers to include isHeader column
- [ ] Migration script for existing data (mark all as isHeader: false)

---

#### Task 3.2: Create Collapsible Account Header Component
**Status:** ⏳ TODO  
**Assignee:** Claude Code  
**Files:** `src/components/accounts/AccountHeader.tsx`

**Requirements:**
- [ ] Header row shows: Icon, Name, Total Balance, Account Count
- [ ] Click to expand/collapse
- [ ] Smooth animation (slide down/up)
- [ ] Persist expanded state (localStorage)
- [ ] Show summary on hover even when collapsed

**Acceptance Criteria:**
- [ ] Default state: all expanded on first load
- [ ] Animation smooth (200ms transition)
- [ ] Total balance accurate
- [ ] Works on mobile

---

#### Task 3.3: Update Accounts Page Layout
**Status:** ⏳ TODO  
**Assignee:** Claude Code  
**Files:** `src/app/accounts/page.tsx`

**Requirements:**
- [ ] Group accounts by header
- [ ] Render headers with collapsible sections
- [ ] Add "Create Header" button
- [ ] Drag-and-drop to reassign accounts (nice-to-have, defer if time-constrained)

**Acceptance Criteria:**
- [ ] All accounts visible when expanded
- [ ] Empty headers show "+ Add Account" prompt
- [ ] Header totals update in real-time

---

### SPRINT 4: Quick Transaction Improvements 🔄 NEXT
**Date:** Jan 19  
**Priority:** 🟡 HIGH

#### Task 4.1: Recent Transactions Quick Access
**Status:** ⏳ TODO  
**Assignee:** Claude Code  
**Files:** `src/components/transactions/AddTransactionModal.tsx`

**Requirements:**
- [ ] Show last 4 transactions at top of modal
- [ ] Click to duplicate and edit
- [ ] Preserve account, category, amount (let user modify)

**Acceptance Criteria:**
- [ ] Transactions sorted by most recent
- [ ] One-click fills form
- [ ] User can still edit before saving

---

#### Task 4.2: Smart Category Suggestions
**Status:** ⏳ TODO  
**Assignee:** Claude Code  
**Files:** `src/lib/categorySuggestions.ts`

**Requirements:**
- [ ] Keyword matching (Zomato → Food)
- [ ] Frequency-based (similar description history)
- [ ] Display as suggestions below description field
- [ ] Click to auto-fill category

**Keywords to Support:**
```
Food: zomato, swiggy, food, restaurant, cafe, coffee
Transport: uber, ola, rapido, metro, bus, petrol
Entertainment: netflix, prime, hotstar, movie, bookmyshow
Shopping: amazon, flipkart, myntra, ajio
Health: pharmacy, medicine, doctor, hospital, gym
```

**Acceptance Criteria:**
- [ ] Suggestions appear within 200ms of typing
- [ ] Max 3 suggestions shown
- [ ] Confidence score visible (optional)

---

### SPRINT 5: Enhanced Filtering & Search 🔄 NEXT
**Date:** Jan 19-20  
**Priority:** 🟢 MEDIUM

#### Task 5.1: Advanced Date Range Picker
**Status:** ⏳ TODO  
**Assignee:** Claude Code  
**Files:** `src/components/DateRangePicker.tsx`

**Requirements:**
- [ ] Presets: Today, Yesterday, This Week, Last 7 Days, This Month, Last 30 Days, Custom
- [ ] Custom: Calendar widget (react-day-picker or similar)
- [ ] Display selected range in human-readable format

**Acceptance Criteria:**
- [ ] Presets work correctly
- [ ] Custom range accurate (inclusive dates)
- [ ] Mobile-friendly calendar picker

---

#### Task 5.2: Transaction Search
**Status:** ⏳ TODO  
**Assignee:** Claude Code  
**Files:** `src/app/transactions/page.tsx`

**Requirements:**
- [ ] Search bar above transaction list
- [ ] Search across: description, category, subcategory, note, amount
- [ ] Debounced input (300ms delay)
- [ ] Clear button

**Acceptance Criteria:**
- [ ] Returns results instantly (< 200ms)
- [ ] Highlights matching text (optional)
- [ ] Works with filters

---

#### Task 5.3: Multi-Filter Support
**Status:** ⏳ TODO  
**Assignee:** Claude Code  
**Files:** `src/app/transactions/page.tsx`

**Requirements:**
- [ ] Combine: Type + Time + Account + Category + Amount Range
- [ ] Chip-based UI showing active filters
- [ ] "Clear All" button
- [ ] Persist filters in URL query params (optional)

**Acceptance Criteria:**
- [ ] All filters work together (AND logic)
- [ ] Performance: < 500ms for 1000 transactions
- [ ] Clear visual feedback

---

### SPRINT 6: Final Polish & Testing ✅ FINAL
**Date:** Jan 20  
**Priority:** 🔴 CRITICAL

#### Task 6.1: Performance Optimization
**Status:** ⏳ TODO

**Checklist:**
- [ ] Add React.memo to AccountCard, TransactionCard
- [ ] Optimize re-renders in lists
- [ ] Implement virtual scrolling (if > 500 transactions)
- [ ] Lazy load chart components
- [ ] Run Lighthouse audit (target: 90+ performance)

---

#### Task 6.2: Responsive Design Audit
**Status:** ⏳ TODO

**Test Devices:**
- [ ] Mobile 375px (iPhone SE)
- [ ] Mobile 390px (iPhone 12)
- [ ] Tablet 768px (iPad)
- [ ] Desktop 1920px

**Fix:**
- [ ] All modals fit on screen
- [ ] Buttons not too small on mobile
- [ ] No horizontal scroll
- [ ] Text readable (min 14px)

---

#### Task 6.3: Error Boundaries
**Status:** ⏳ TODO

**Files:** `src/components/ErrorBoundary.tsx`

**Wrap sections:**
- [ ] TransactionList
- [ ] AccountsList
- [ ] StatsCharts
- [ ] CSVImport

---

#### Task 6.4: Deployment to Vercel ✅ FINAL
**Status:** ⏳ TODO

**Steps:**
- [ ] Run production build locally
- [ ] Fix any build errors
- [ ] Test production build (npm run start)
- [ ] Deploy to Vercel
- [ ] Test deployed app on real devices
- [ ] Share link with user for feedback

---

## PHASE 2: INTELLIGENCE LAYER (FEB 2026)

**Duration:** 2-3 weeks  
**Status:** 📝 PLANNED

### 2.1: Festive/Seasonal Spending Alerts 🎯 TOP PRIORITY
**Goal:** Warn users about upcoming expensive periods

**Technical Approach:**
1. Detect spending spikes using time-series analysis
2. Cluster dates with high spending
3. Label patterns (Diwali, Christmas, Birthdays, Weekends, etc.)
4. Predict future occurrences
5. Send proactive alerts 2-3 weeks in advance

**Files to Create:**
- `src/lib/ml/patternDetection.ts`
- `src/lib/ml/predictions.ts`
- `src/components/insights/SpendingAlert.tsx`

**User Experience:**
```
[Notification 2 weeks before Diwali]
💡 Heads Up!
Last year during Diwali (Oct 24 - Nov 1), you spent ₹15,000 extra.
Current spendable: ₹12,000

[Tap for details]
```

**Metrics:**
- Prediction accuracy > 70%
- False positive rate < 20%
- User engagement: >50% tap on alert

---

### 2.2: Smart Categorization
**Goal:** Auto-suggest categories based on description

**Approach:**
- Simple keyword matching (Phase 2A)
- TensorFlow.js model (Phase 2B - train on user data)

**Accuracy Target:** 70%+ correct suggestions

---

### 2.3: Spending Trend Visualization
**Goal:** Show spending patterns over time

**Charts to Add:**
- Weekly spending (bar chart)
- Category trends (line chart)
- Anomaly detection (highlight unusual spikes)

---

### 2.4: Weekly Burn Rate Tracker
**Goal:** Warn if spending faster than average

**Formula:**
```
Daily average = Monthly budget / 30
Current rate = This week's spending / 7
Alert if: Current rate > Daily average * 1.5
```

**User Experience:**
```
⚠️ Spending Alert
You're averaging ₹650/day this week.
Your usual rate: ₹400/day
At this pace, you'll exceed budget by ₹7,500 this month.
```

---

### 2.5: Monthly Expense Predictions
**Goal:** Forecast next month's spending

**Approach:**
- Average of last 3 months
- Adjust for known events (festivals, etc.)
- Show confidence range (±₹X,XXX)

---

## PHASE 3: GEN Z ENGAGEMENT (MAR 2026)

**Duration:** 2-3 weeks  
**Status:** 📝 PLANNED

### 3.1: Gamification

**Features:**
- [ ] Streak tracking (consecutive days logging expenses)
- [ ] Achievements (badges for milestones)
- [ ] Challenges (No-Food-Delivery Weekend, etc.)
- [ ] Leaderboard (anonymous, opt-in)

---

### 3.2: Swipeable Insight Cards

**Design:** Instagram Stories style

**Cards:**
- Daily recap
- Week comparison
- Top spending categories
- Money-saving tips
- Peer benchmarks

---

### 3.3: Visual Customization

**Options:**
- [ ] Theme colors (accent color picker)
- [ ] Custom icons for accounts
- [ ] Dark/Light/Auto mode
- [ ] Font size adjustment

---

### 3.4: Shareable Summaries

**Export as image:**
- Monthly recap card
- Year-in-review
- Savings achievement
- "My spending personality"

**Social Media Ready:** Optimized for Instagram, Twitter

---

## PHASE 4: POLISH & PUBLISH (APR 2026)

**Duration:** 2-3 weeks  
**Status:** 📝 PLANNED

### 4.1: Performance Optimization
- [ ] Bundle size < 500KB
- [ ] First Contentful Paint < 1s
- [ ] Time to Interactive < 2s
- [ ] Lighthouse score > 95

---

### 4.2: Offline-First Enhancements
- [ ] Service worker for offline support
- [ ] Background sync when back online
- [ ] Offline indicator in UI
- [ ] Cache API responses

---

### 4.3: Push Notifications
- [ ] Daily recap (evening)
- [ ] Threshold warnings (real-time)
- [ ] Weekly review (Sunday)
- [ ] Spending alerts (predictive)

---

### 4.4: Advanced Reporting
- [ ] PDF export (monthly/yearly)
- [ ] Excel export with formulas
- [ ] Tax-ready categorization
- [ ] Custom report builder

---

### 4.5: Beta Testing
- [ ] Recruit 100 beta testers (friends, family, Reddit)
- [ ] Collect feedback (surveys, interviews)
- [ ] Fix top 10 reported bugs
- [ ] Iterate based on feedback

---

### 4.6: Play Store Submission
- [ ] Create store listing (screenshots, description)
- [ ] Generate APK from PWA (TWA - Trusted Web Activity)
- [ ] Submit for review
- [ ] Launch! 🚀

---

## BACKLOG (FUTURE PHASES)

### Ideas Not Yet Prioritized

**Social Features:**
- Split expense tracking (with friends)
- Shared budgets (roommates, couples)
- Anonymous peer comparison

**Advanced Analytics:**
- Cashflow projection
- Savings goal tracker
- Investment portfolio tracking

**Integrations:**
- SMS auto-parsing (requires permissions)
- Bank API integration (requires partnerships)
- Email receipt parsing

**Accessibility:**
- Voice input for transactions
- Screen reader optimization
- High contrast mode

---

## MEASURING SUCCESS

### Key Metrics to Track

**Engagement:**
- Daily Active Users (DAU)
- Transactions logged per user per week
- Feature adoption rate

**Quality:**
- Crash rate (< 1%)
- Bug report count
- Average rating (target: 4.5+)

**Performance:**
- Page load time (< 2s)
- Transaction entry time (< 10s)
- Search response time (< 500ms)

**Retention:**
- 7-day retention (target: 60%+)
- 30-day retention (target: 40%+)
- 90-day retention (target: 30%+)

---

## DECISION LOG

**Jan 16, 2026:** Prioritized threshold warnings over ML features for MVP  
**Jan 16, 2026:** Decided to use TensorFlow.js (client-side) over backend ML  
**Jan 16, 2026:** Deferred social features to Phase 3+

---

## CHANGELOG

**v0.1.0 (Jan 16, 2026):**
- Initial roadmap created
- Phase 1 tasks defined
- Documentation foundation complete

---

**Next Update:** Jan 20, 2026 (after MVP deployment)

---

*For detailed technical implementation, see `CLAUDE_CODE_INSTRUCTIONS.md`*  
*For system design, see `TECHNICAL_ARCHITECTURE.md`*  
*For product strategy, see `PRODUCT_VISION.md`*
