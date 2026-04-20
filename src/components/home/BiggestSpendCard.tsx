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

  const topSpends = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const catMap = new Map(categories.map((c) => [c.id!, c.name]));

    const weekExpenses = transactions.filter((t) => {
      if (t.transactionType !== 'EXPENSE') return false;
      const d = new Date(t.date);
      return d >= sevenDaysAgo && d <= now;
    });

    if (weekExpenses.length === 0) return [];

    return weekExpenses
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((t) => ({
        ...t,
        categoryName: t.categoryId ? catMap.get(t.categoryId) ?? 'Uncategorised' : 'Uncategorised',
      }));
  }, [transactions, categories]);

  if (topSpends.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-2">
          <span title="Biggest expense in 7 days"><Flame className="w-5 h-5 text-orange-500" /></span>
          <span className="text-sm font-medium text-gray-600">Biggest expense in 7 days</span>
        </div>
        <p className="text-gray-500 text-sm">No expenses in the last 7 days.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span title="Biggest expense in 7 days"><Flame className="w-5 h-5 text-orange-500" /></span>
          <span className="text-sm font-medium text-gray-600">Biggest expense in 7 days</span>
        </div>
        <div className="space-y-2">
          {topSpends.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className="w-full text-left rounded-lg border border-orange-100 bg-white hover:border-orange-300 p-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-600">{formatCurrency(t.amount)}</span>
                <span className="text-xs text-gray-400">
                  {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className="text-sm text-gray-700 mt-0.5">{t.categoryName}</div>
              {t.description && (
                <div className="text-xs text-gray-500 truncate mt-0.5">{t.description}</div>
              )}
            </button>
          ))}
        </div>
      </div>

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
