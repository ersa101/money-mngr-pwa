'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import { formatCurrency } from '@/lib/currency-utils';
import { AlertTriangle } from 'lucide-react';
import type { Transaction } from '@/types/database';

interface DuplicatePair {
  a: Transaction;
  b: Transaction;
}

export function DuplicateDetectorCard() {
  const db = useDb();
  const transactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db]) || [];

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
          a.categoryId === b.categoryId
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
    <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span title="Possible Duplicate Transactions"><AlertTriangle className="w-5 h-5 text-yellow-400" /></span>
        <span className="text-sm font-medium text-slate-300">
          Possible Duplicate{duplicates.length > 1 ? 's' : ''} ({duplicates.length})
        </span>
      </div>
      <div className="space-y-3">
        {duplicates.map(({ a, b }, i) => (
          <div key={i} className="text-sm border border-yellow-500/20 rounded-lg p-3 space-y-1">
            <div className="font-medium text-yellow-300">{formatCurrency(a.amount)}</div>
            <div className="text-xs text-slate-400">
              {new Date(a.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {' & '}
              {new Date(b.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
            {a.description && <div className="text-xs text-slate-500 truncate">{a.description}</div>}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-3">
        Same amount, account & category within 24 hours — review in Transactions.
      </p>
    </div>
  );
}
