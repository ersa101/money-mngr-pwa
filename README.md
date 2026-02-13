# Money Mngr PWA (scaffold)

This repository contains a scaffold for a privacy-first Personal Finance PWA built with Next.js (App Router), TypeScript, Tailwind, Dexie (IndexedDB), and next-pwa.

What I added:

- `src/lib/db.ts` — Dexie schema for `accounts`, `categories`, and `transactions`.
- `src/hooks/useTransaction.ts` — a hook to create double-entry transactions and preview threshold effects.
- `src/lib/parseFinancialSMS.ts` — a parser scaffold that returns 5 ranked suggestions for account, category, and description from SMS text.
- `src/components/ControlGrid.tsx` and `src/components/AccountCard.tsx` — small UI pieces demonstrating the high-density control-center style.

Run locally:

```powershell
# from repository root
npm install
npm run dev
```

Notes:
- Everything is local-only (IndexedDB). No external APIs are called.
- The parser is a scaffold designed to be replaced or enhanced by a local LLM (e.g., WebLLM).
