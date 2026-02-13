# Quick Reference Guide

## 🚀 Running the Application

### Start Development Server
```bash
cd "c:\Users\ershr\Downloads\random codes\Money mngr\money-mngr-pwa"
npm run dev
```

**Default Port:** http://localhost:3000

**Custom Port:**
```bash
PORT=3001 npm run dev
```

---

## 📁 Master CSV Database

**Location:** `.data/` folder (project root)

### Files Structure
```
.data/
├── accounts.csv      # Banks, wallets, cash, investments
├── categories.csv    # Expense & income categories
└── transactions.csv  # All financial transactions
```

### CSV Headers

**accounts.csv:**
```csv
id,name,type,balance,thresholdValue,color,icon,group
```

**categories.csv:**
```csv
id,name,parentId,type,icon
```

**transactions.csv:**
```csv
id,date,amount,fromAccountId,toCategoryId,toAccountId,description,isTransfer,smsRaw,transactionType,category,subCategory,note,csvAccount,csvCategory,csvSubcategory,csvIncomeExpense,csvDescription,csvCurrency,importedAt
```

---

## 🎯 Key Features (January 2026)

### ✅ Transaction Filters
**Type Filters:** All | Expense | Income | Transfer
**Time Filters:** Daily | Weekly | Monthly | Quarterly | Annually | All-Time

**Default View:** Monthly + All Types

### ✅ CSV Import with Progress
- Upload CSV → See real-time progress bar
- Stage indicators: Reading → Parsing → Importing
- Error reporting per row
- Auto-creates missing accounts/categories

### ✅ Account Management
- CRUD operations (Create, Read, Update, Delete)
- Account types: BANK | CASH | WALLET | INVESTMENT
- Optional grouping (e.g., "Primary Banking", "Digital Wallets")
- Threshold-based safety indicators

### ✅ Real-Time Sync
- Changes reflect instantly across all pages
- No manual refresh needed
- Powered by Dexie.js live queries

---

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| [README.md](README.md) | Project overview |
| [FEATURES.md](FEATURES.md) | Complete feature list |
| [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) | CSV backend & Google Sheets analysis |
| [RECENT_ENHANCEMENTS.md](RECENT_ENHANCEMENTS.md) | Latest updates (Jan 2026) |
| [SESSION_SUMMARY_JAN16.md](SESSION_SUMMARY_JAN16.md) | Development session log |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Technical implementation |
| [PROJECT_REFERENCE.md](PROJECT_REFERENCE.md) | Project structure |
| [CSV_ANALYSIS.md](CSV_ANALYSIS.md) | CSV import analysis |

---

## 🛠️ Common Tasks

### Build for Production
```bash
npm run build
```

### Type Check
```bash
npx tsc --noEmit
```

### Lint Code
```bash
npm run lint
```

### Clear Data (Development)
Delete `.data/` folder and restart server.

### Backup Data
Copy `.data/` folder to safe location.

### Import CSV
1. Go to Transactions page
2. Click "Import CSV" button
3. Select CSV file
4. Watch progress bar
5. Review import summary

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Or use different port
PORT=3001 npm run dev
```

### CSV Import Stuck
- Check console for errors
- Ensure CSV has proper headers
- Verify date format: `dd/MM/yyyy HH:mm:ss` or ISO
- Check amount is positive number

### No Transactions Showing
- Check time filter (try "All-Time")
- Check type filter (try "All")
- Verify CSV import succeeded
- Check browser console for errors

### Home Page Not Redirecting
- Clear browser cache
- Check that `src/app/page.tsx` uses `router.replace()`
- Restart dev server

---

## 📊 Performance Guidelines

### Optimal Performance
- **< 1,000 transactions:** Excellent performance
- **1,000 - 5,000 transactions:** Good performance
- **> 5,000 transactions:** Consider pagination

### CSV Import Performance
- **100 rows:** ~2-3 seconds
- **1,000 rows:** ~15-20 seconds
- **5,000 rows:** ~60-90 seconds

---

## 🔮 Future Enhancements (Roadmap)

### High Priority
1. Account Group UI (drag-and-drop, collapsible sections)
2. Custom date range picker
3. Transaction search & sorting

### Medium Priority
4. Budget tracking per category
5. Recurring transactions
6. Receipt attachments

### Low Priority
7. Google Sheets sync (optional)
8. Mobile app (React Native)
9. Multi-currency support

**See [RECENT_ENHANCEMENTS.md](RECENT_ENHANCEMENTS.md) for detailed roadmap**

---

## 🔑 Key Directories

```
src/
├── app/                    # Next.js pages
│   ├── page.tsx           # Home (redirects to /transactions)
│   ├── transactions/      # Transaction management
│   ├── accounts/          # Account management
│   ├── stats/             # Analytics dashboard
│   └── api/               # API routes
│       └── data/          # CSV CRUD operations
├── components/            # React components
├── hooks/                 # Custom React hooks
└── lib/                   # Utilities & database
    ├── db.ts             # Dexie database & CSV adapter
    └── csvImport.ts      # CSV parsing & import

.data/                     # 🗄️ MASTER DATABASE (CSV files)
```

---

## 💡 Tips & Best Practices

### Data Entry
- Use descriptive transaction descriptions
- Assign accounts to groups for better organization
- Set realistic threshold values for alerts
- Review CSV imports for errors

### Performance
- Filter by time period to reduce data load
- Use "Monthly" view as default
- Clear old test data periodically
- Keep CSV files under 10,000 rows

### Backup Strategy
1. Copy `.data/` folder weekly
2. Export important transactions to CSV
3. Keep CSV imports in safe location
4. Version control `.data/` folder (optional)

### Development
- Use port 3000 for main development
- Use port 3001 for testing
- Both ports share same `.data/` files
- Restart server after schema changes

---

## 📞 Getting Help

### Check Documentation
1. [FEATURES.md](FEATURES.md) - Feature list
2. [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) - Backend details
3. [RECENT_ENHANCEMENTS.md](RECENT_ENHANCEMENTS.md) - Latest changes

### Common Questions

**Q: Can I use Google Sheets instead of CSV?**
A: Yes, but requires OAuth setup. See [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) for full analysis.

**Q: How do I group accounts?**
A: Edit account and add group name (e.g., "Primary Banking"). UI grouping coming soon.

**Q: Why are transactions not showing?**
A: Check time filter - try "All-Time" view.

**Q: How do I backup my data?**
A: Copy the `.data/` folder to safe location.

**Q: Can I edit CSV files directly?**
A: Yes! CSV files are human-readable. Just maintain proper formatting.

---

## 🎉 Quick Start Checklist

- [ ] Install dependencies: `npm install`
- [ ] Start dev server: `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Create first account on /accounts page
- [ ] Add first transaction on /transactions page
- [ ] Import CSV if you have historical data
- [ ] Set time filter to "Monthly" for best view
- [ ] Set threshold values for safety alerts
- [ ] Explore stats dashboard at /stats

---

**Last Updated:** January 16, 2026
**App Version:** 0.1.0
**Backend:** CSV-based (`.data/` folder)
**Framework:** Next.js 15.5.9 + React 19

