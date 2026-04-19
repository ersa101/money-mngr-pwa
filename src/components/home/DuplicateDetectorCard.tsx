'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import { formatCurrency } from '@/lib/currency-utils';
import { AlertTriangle } from 'lucide-react';
import type { Transaction } from '@/types/database';
import { TransactionDetailModal } from '@/components/TransactionDetailModal';

interface DuplicatePair {
  a: Transaction;
  b: Transaction;
}

export function DuplicateDetectorCard() {
  const db = useDb();
  const transactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db]) || [];
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db]) || [];
  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db]) || [];
  const [selected, setSelected] = useState<Transaction | null>(null);

  const duplicates = useMemo((): DuplicatePair[] => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const recent = transactions.filter(
      (t) => t.transactionType === 'EXPENSE' && new Date(t.date) >= cutoff
    );

    const pairs: DuplicatePair[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < recent.length; i++) {
      for (let j = i + 1; j < recent.length; j++) {
        const a = recent[i];
        const b = recent[j];
        if (
          a.amount === b.amount &&
          a.fromAccountId === b.fromAccountId &&
          (a.description ?? '') === (b.description ?? '') &&
          a.categoryId === b.categoryId &&
          (a.subCategoryId ?? null) === (b.subCategoryId ?? null)
        ) {
          const diff = Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime());
          if (diff <= 24 * 60 * 60 * 1000) {
            const key = [a.id, b.id].sort().join('-');
            if (!seen.has(key)) {
              seen.add(key);
              pairs.push({ a, b });
            }
          }
        }
      }
    }

    return pairs;
  }, [transactions]);

  if (duplicates.length === 0) return null;

  return (
    <>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span title="Possible Duplicate Transactions"><AlertTriangle className="w-5 h-5 text-amber-500" /></span>
          <span className="text-sm font-medium text-gray-700">
            Possible Duplicate{duplicates.length > 1 ? 's' : ''} ({duplicates.length})
          </span>
        </div>
        <div className="space-y-3">
          {duplicates.map(({ a, b }, i) => (
            <button
              key={i}
              onClick={() => setSelected(a)}
              className="w-full text-left text-sm border border-amber-200 bg-white hover:border-amber-400 rounded-lg p-3 space-y-1 transition-colors"
            >
              <div className="font-medium text-amber-700">{formatCurrency(a.amount)}</div>
              <div className="text-xs text-gray-500">
                {new Date(a.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {' & '}
                {new Date(b.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              {a.description && <div className="text-xs text-gray-500 truncate">{a.description}</div>}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Tap a pair to review • Same amount, account & note within 24 hours.
        </p>
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
