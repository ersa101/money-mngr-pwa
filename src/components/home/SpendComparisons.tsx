'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import { formatCurrency } from '@/lib/currency-utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PeriodData {
  label: string;
  current: number;
  previous: number;
}

function CompareCard({ label, current, previous }: PeriodData) {
  const delta = current - previous;
  const pct = previous > 0 ? Math.abs((delta / previous) * 100) : null;
  const isUp = delta > 0;
  const isFlat = delta === 0 && current === 0 && previous === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 mb-3">{label}</p>
      <div className="space-y-2">
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Current</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(current)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Previous</p>
          <p className="text-sm text-gray-500">{formatCurrency(previous)}</p>
        </div>
      </div>
      {isFlat ? (
        <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
          <Minus className="w-3.5 h-3.5" /> No data
        </div>
      ) : (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${isUp ? 'text-red-500' : 'text-green-600'}`}>
          {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {pct !== null ? `${pct.toFixed(0)}%` : ''} {isUp ? 'more' : 'less'}
        </div>
      )}
    </div>
  );
}

function getWeekStart(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

export function SpendComparisons() {
  const db = useDb();
  const transactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db]) || [];

  const periods = useMemo((): PeriodData[] => {
    const now = new Date();

    const sumBetween = (from: string, to: string) =>
      transactions
        .filter((t) => t && t.transactionType === 'EXPENSE' && t.date >= from && t.date <= to)
        .reduce((s, t) => s + t.amount, 0);

    // This week vs last week
    const thisWeekStart = getWeekStart(now);
    const todayStr = now.toISOString().slice(0, 10);
    const lastWeekStartDate = new Date(now);
    lastWeekStartDate.setDate(lastWeekStartDate.getDate() - 7);
    const lastWeekStart = getWeekStart(lastWeekStartDate);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const lastWeekEndStr = lastWeekEnd.toISOString().slice(0, 10);

    // This month vs last month
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthEndStr = lastMonthEnd.toISOString().slice(0, 10);

    // YTD vs same period last year
    const ytdStart = `${now.getFullYear()}-01-01`;
    const ytdDayMonth = now.toISOString().slice(5, 10);
    const lastYtdStart = `${now.getFullYear() - 1}-01-01`;
    const lastYtdEnd = `${now.getFullYear() - 1}-${ytdDayMonth}`;

    return [
      {
        label: 'This Week vs Last Week',
        current: sumBetween(thisWeekStart, todayStr),
        previous: sumBetween(lastWeekStart, lastWeekEndStr),
      },
      {
        label: 'This Month vs Last Month',
        current: sumBetween(thisMonthStart, todayStr),
        previous: sumBetween(lastMonthStart, lastMonthEndStr),
      },
      {
        label: `YTD vs Last Year`,
        current: sumBetween(ytdStart, todayStr),
        previous: sumBetween(lastYtdStart, lastYtdEnd),
      },
    ];
  }, [transactions]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {periods.map((p) => (
        <CompareCard key={p.label} {...p} />
      ))}
    </div>
  );
}
