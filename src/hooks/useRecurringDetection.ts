import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import type { Transaction } from '@/types/database';

export interface RecurringAlert {
  categoryId?: number;
  categoryName: string;
  description: string;
  approximateAmount: number;
  lastPaidDate: string;
  daysSinceLastPayment: number;
  isDueSoon: boolean; // last payment was 20+ days ago
}

export function useRecurringDetection(): RecurringAlert[] {
  const db = useDb();
  const transactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db]) || [];
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db]) || [];

  return useMemo(() => {
    const catMap = new Map(categories.map((c) => [c.id!, c.name]));
    const expenses = transactions
      .filter((t: Transaction) => t.transactionType === 'EXPENSE')
      .sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Group by category + description similarity
    type GroupKey = string;
    const groups = new Map<GroupKey, Transaction[]>();

    expenses.forEach((t: Transaction) => {
      const key = `${t.categoryId ?? 0}__${(t.description ?? '').toLowerCase().trim().slice(0, 30)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    });

    const alerts: RecurringAlert[] = [];
    const now = new Date();

    groups.forEach((txns, _key) => {
      if (txns.length < 2) return;

      // Check if transactions repeat in a 25-35 day window
      const sorted = [...txns].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      let isRecurring = false;
      for (let i = 1; i < sorted.length; i++) {
        const diff =
          (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) /
          (1000 * 60 * 60 * 24);
        if (diff >= 25 && diff <= 35) {
          isRecurring = true;
          break;
        }
      }

      if (!isRecurring) return;

      const latest = sorted[sorted.length - 1];
      const daysSince =
        (now.getTime() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince >= 20) {
        const avgAmount = txns.reduce((s, t) => s + t.amount, 0) / txns.length;
        alerts.push({
          categoryId: latest.categoryId,
          categoryName: latest.categoryId ? catMap.get(latest.categoryId) ?? 'Unknown' : 'Unknown',
          description: latest.description ?? '',
          approximateAmount: Math.round(avgAmount),
          lastPaidDate: latest.date.slice(0, 10),
          daysSinceLastPayment: Math.floor(daysSince),
          isDueSoon: true,
        });
      }
    });

    return alerts.sort((a, b) => b.daysSinceLastPayment - a.daysSinceLastPayment);
  }, [transactions, categories]);
}
