'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import { formatCurrency } from '@/lib/currency-utils';
import { Flame } from 'lucide-react';

export function BiggestSpendCard() {
  const db = useDb();
  const transactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db]) || [];
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db]) || [];

  const biggest = useMemo(() => {
    const now = new Date();
    // Start of current calendar week (Monday)
    const dayOfWeek = now.getDay(); // 0 = Sun
    const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMon);
    weekStart.setHours(0, 0, 0, 0);

    const catMap = new Map(categories.map((c) => [c.id!, c.name]));

    const weekExpenses = transactions.filter((t) => {
      if (t.transactionType !== 'EXPENSE') return false;
      const d = new Date(t.date);
      return d >= weekStart && d <= now;
    });

    if (weekExpenses.length === 0) return null;

    const top = weekExpenses.reduce((max, t) => (t.amount > max.amount ? t : max));
    return {
      ...top,
      categoryName: top.categoryId ? catMap.get(top.categoryId) ?? 'Uncategorised' : 'Uncategorised',
    };
  }, [transactions, categories]);

  if (!biggest) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span title="Biggest Spend This Week"><Flame className="w-5 h-5 text-orange-400" /></span>
          <span className="text-sm font-medium text-slate-400">Biggest Spend This Week</span>
        </div>
        <p className="text-slate-500 text-sm">No expenses recorded this week.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-5 h-5 text-orange-400" title="Biggest Spend This Week" />
        <span className="text-sm font-medium text-slate-400">Biggest Spend This Week</span>
      </div>
      <div className="text-2xl font-bold text-orange-400">{formatCurrency(biggest.amount)}</div>
      <div className="mt-1 text-sm text-slate-300">{biggest.categoryName}</div>
      {biggest.description && (
        <div className="mt-0.5 text-xs text-slate-500 truncate">{biggest.description}</div>
      )}
      <div className="mt-1 text-xs text-slate-500">
        {new Date(biggest.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
      </div>
    </div>
  );
}
