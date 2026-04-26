import type { Transaction, Account, Category } from '@/types/database';

export interface FAINChatContext {
  totalTransactions: number;
  dateRange: { from: string; to: string };
  topCategories: { name: string; total: number }[];
  topSubCategories: { name: string; total: number }[];
  monthlyTotals: { month: string; income: number; expense: number }[];
  accountSummary: { name: string; type: string; balance: number }[];
  recentTransactions: { date: string; amount: number; category: string }[];
}

export function buildFAINContext(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): FAINChatContext {
  const catMap = new Map(categories.map((c) => [c.id!, c.name]));

  const expenses = transactions.filter((t) => t.transactionType === 'EXPENSE');
  const income = transactions.filter((t) => t.transactionType === 'INCOME');

  // Top categories by spend
  const catTotals = new Map<string, number>();
  expenses.forEach((t) => {
    const name = t.categoryId ? catMap.get(t.categoryId) ?? 'Unknown' : 'Unknown';
    catTotals.set(name, (catTotals.get(name) ?? 0) + t.amount);
  });
  const topCategories = Array.from(catTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, total]) => ({ name, total }));

  // Top sub-categories by spend
  const subCatTotals = new Map<string, number>();
  expenses.forEach((t) => {
    if (!t.subCategoryId) return;
    const name = catMap.get(t.subCategoryId) ?? 'Unknown';
    subCatTotals.set(name, (subCatTotals.get(name) ?? 0) + t.amount);
  });
  const topSubCategories = Array.from(subCatTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, total]) => ({ name, total }));

  // Monthly totals — last 12 months
  const monthlyMap = new Map<string, { income: number; expense: number }>();
  transactions.forEach((t) => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap.has(key)) monthlyMap.set(key, { income: 0, expense: 0 });
    const entry = monthlyMap.get(key)!;
    if (t.transactionType === 'EXPENSE') entry.expense += t.amount;
    else if (t.transactionType === 'INCOME') entry.income += t.amount;
  });
  const monthlyTotals = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, v]) => ({ month, ...v }));

  // Account summary (strip personal names — use type + partial name)
  const accountSummary = accounts.map((a) => ({
    name: a.type,
    type: a.type,
    balance: a.balance,
  }));

  // Date range
  const dates = transactions.map((t) => t.date).sort();
  const dateRange = {
    from: dates[0] ?? '',
    to: dates[dates.length - 1] ?? '',
  };

  // Recent 50 transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50)
    .map((t) => ({
      date: t.date.slice(0, 10),
      amount: t.amount,
      category: t.categoryId ? catMap.get(t.categoryId) ?? '' : '',
    }));

  return {
    totalTransactions: transactions.length,
    dateRange,
    topCategories,
    topSubCategories,
    monthlyTotals,
    accountSummary,
    recentTransactions,
  };
}

export const FAIN_SYSTEM_PROMPT = `You are FAIN — Financial AI Native — a personal finance analyst embedded in the user's Money Mngr app.
You have access to the user's real transaction data provided below.
Answer questions conversationally, in 2-4 sentences max unless a detailed breakdown is explicitly asked.
Always respond in Indian financial context (INR, Indian festivals, Indian spending patterns).
Never make up data. If unsure, say so. Do not give generic financial advice — always refer to actual numbers from the provided data.
User's financial data context: [CONTEXT_JSON]`;

export function buildSystemPrompt(context: FAINChatContext): string {
  return FAIN_SYSTEM_PROMPT.replace('[CONTEXT_JSON]', JSON.stringify(context));
}

/** Formats amount as ₹ INR string */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
