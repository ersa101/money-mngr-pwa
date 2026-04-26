'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import { formatCurrency } from '@/lib/currency-utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function DayOverDayCard() {
  const db = useDb();
  const transactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db]) || [];

  const { todayTotal, yesterdayTotal, delta, pct } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const sum = (dateStr: string) =>
      transactions
        .filter((t) => t.transactionType === 'EXPENSE' && t.date.slice(0, 10) === dateStr)
        .reduce((s, t) => s + t.amount, 0);

    const todayTotal = sum(todayStr);
    const yesterdayTotal = sum(yesterdayStr);
    const delta = todayTotal - yesterdayTotal;
    const pct = yesterdayTotal > 0 ? Math.abs((delta / yesterdayTotal) * 100) : null;

    return { todayTotal, yesterdayTotal, delta, pct };
  }, [transactions]);

  const isUp = delta > 0;
  const isFlat = delta === 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        {isFlat ? (
          <span title="Day-over-Day Spend"><Minus className="w-5 h-5 text-gray-400" /></span>
        ) : isUp ? (
          <span title="Spending up vs yesterday"><TrendingUp className="w-5 h-5 text-red-500" /></span>
        ) : (
          <span title="Spending down vs yesterday"><TrendingDown className="w-5 h-5 text-green-600" /></span>
        )}
        <span className="text-sm font-medium text-gray-600">Today vs Yesterday</span>
      </div>

      <div className="flex items-end gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Today</div>
          <div className="text-2xl font-bold text-gray-900">
            {todayTotal === 0 ? (
              <span className="text-gray-400 text-base font-normal">No spend yet</span>
            ) : (
              formatCurrency(todayTotal)
            )}
          </div>
        </div>
        <div className="pb-1">
          <div className="text-xs text-gray-500 mb-1">Yesterday</div>
          <div className="text-base text-gray-600">{formatCurrency(yesterdayTotal)}</div>
        </div>
      </div>

      {!isFlat && yesterdayTotal > 0 && (
        <div className={`mt-2 text-sm font-medium flex items-center gap-1 ${isUp ? 'text-red-500' : 'text-green-600'}`}>
          {isUp ? '↑' : '↓'} {pct !== null ? `${pct.toFixed(0)}%` : ''} {isUp ? 'more' : 'less'} than yesterday
        </div>
      )}
    </div>
  );
}
