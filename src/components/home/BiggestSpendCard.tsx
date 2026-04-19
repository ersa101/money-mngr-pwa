'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import { formatCurrency } from '@/lib/currency-utils';
import { Flame } from 'lucide-react';
import { TransactionDetailModal } from '@/components/TransactionDetailModal';
import type { Transaction } from '@/types/database';

export function BiggestSpendCard() {
  const db = useDb();
  const transactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db]) || [];
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db]) || [];
  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db]) || [];
  const [selected, setSelected] = useState<Transaction | null>(null);

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
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-2">
          <span title="Biggest Spend This Week"><Flame className="w-5 h-5 text-orange-500" /></span>
          <span className="text-sm font-medium text-gray-600">Biggest Spend This Week</span>
        </div>
        <p className="text-gray-500 text-sm">No expenses recorded this week.</p>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setSelected(biggest)}
        className="w-full text-left rounded-xl border border-orange-200 bg-orange-50 p-5 hover:border-orange-400 transition-colors"
      >
        <div className="flex items-center gap-2 mb-3">
          <span title="Biggest Spend This Week"><Flame className="w-5 h-5 text-orange-500" /></span>
          <span className="text-sm font-medium text-gray-600">Biggest Spend This Week</span>
        </div>
        <div className="text-2xl font-bold text-orange-600">{formatCurrency(biggest.amount)}</div>
        <div className="mt-1 text-sm text-gray-700">{biggest.categoryName}</div>
        {biggest.description && (
          <div className="mt-0.5 text-xs text-gray-500 truncate">{biggest.description}</div>
        )}
        <div className="mt-1 text-xs text-gray-500">
          {new Date(biggest.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </button>

      <TransactionDetailModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        transaction={selected}
        accounts={accounts}
        categories={categories}
      />
    </>
  );
}
