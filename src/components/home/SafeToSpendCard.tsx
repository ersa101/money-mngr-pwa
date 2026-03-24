'use client';

import { useSafeToSpend } from '@/hooks/useSafeToSpend';
import { formatCurrency } from '@/lib/currency-utils';
import { ShieldCheck } from 'lucide-react';

export function SafeToSpendCard() {
  const { safeToSpend, totalThreshold, isNegative } = useSafeToSpend();

  return (
    <div className={`rounded-xl border p-5 ${isNegative ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span title="Safe to Spend"><ShieldCheck className={`w-5 h-5 ${isNegative ? 'text-red-400' : 'text-green-400'}`} /></span>
        <span className="text-sm font-medium text-slate-400">Safe to Spend</span>
      </div>
      <div className={`text-3xl font-bold ${isNegative ? 'text-red-400' : 'text-green-400'}`}>
        {formatCurrency(Math.abs(safeToSpend))}
        {isNegative && <span className="text-lg ml-1 font-normal">over limit</span>}
      </div>
      {totalThreshold > 0 && (
        <div className="mt-2 text-xs text-slate-500">
          After ₹{totalThreshold.toLocaleString('en-IN')} threshold reserve
        </div>
      )}
    </div>
  );
}
