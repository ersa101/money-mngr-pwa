import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import type { Transaction } from '@/types/database';

export interface AnomalyAlert {
  categoryId: number;
  categoryName: string;
  currentMonthTotal: number;
  twelveMonthAvg: number;
  percentAbove: number;
  status: 'WATCH' | 'ALERT';
}

export function useAnomalyDetection(): AnomalyAlert[] {
  const db = useDb();
  const transactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db]) || [];
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db]) || [];

  return useMemo(() => {
    const catMap = new Map(categories.map((c) => [c.id!, c.name]));
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate 12-month averages per category (excluding current month)
    const categoryMonthlyTotals = new Map<number, Map<string, number>>();
    const expenses = transactions.filter((t: Transaction) => t.transactionType === 'EXPENSE');

    expenses.forEach((t: Transaction) => {
      if (!t.categoryId) return;
      const d = new Date(t.date);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;

      if (!categoryMonthlyTotals.has(t.categoryId)) {
        categoryMonthlyTotals.set(t.categoryId, new Map());
      }
      const monthly = categoryMonthlyTotals.get(t.categoryId)!;
      monthly.set(monthKey, (monthly.get(monthKey) ?? 0) + t.amount);
    });

    const alerts: AnomalyAlert[] = [];

    categoryMonthlyTotals.forEach((monthly, catId) => {
      const currentKey = `${currentYear}-${currentMonth}`;
      const currentTotal = monthly.get(currentKey) ?? 0;

      if (currentTotal === 0) return;

      // Average of previous 12 months (exclude current month)
      const historical = Array.from(monthly.entries())
        .filter(([k]) => k !== currentKey)
        .slice(-12)
        .map(([, v]) => v);

      if (historical.length === 0) return;

      const avg = historical.reduce((s, v) => s + v, 0) / historical.length;
      if (avg === 0) return;

      const percentAbove = ((currentTotal - avg) / avg) * 100;

      if (percentAbove >= 100) {
        alerts.push({
          categoryId: catId,
          categoryName: catMap.get(catId) ?? 'Unknown',
          currentMonthTotal: currentTotal,
          twelveMonthAvg: avg,
          percentAbove,
          status: percentAbove >= 150 ? 'ALERT' : 'WATCH',
        });
      }
    });

    return alerts.sort((a, b) => b.percentAbove - a.percentAbove);
  }, [transactions, categories]);
}
