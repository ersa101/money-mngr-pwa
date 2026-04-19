'use client';

import { useSafeToSpend } from '@/hooks/useSafeToSpend';
import { formatCurrency } from '@/lib/currency-utils';
import { ShieldCheck } from 'lucide-react';

export function SafeToSpendCard() {
  const { safeToSpend, accountCount, isNegative } = useSafeToSpend();

  return (
    <div className={`rounded-xl border p-5 ${isNegative ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span title="Safe to Spend"><ShieldCheck className={`w-5 h-5 ${isNegative ? 'text-red-600' : 'text-green-600'}`} /></span>
        <span className="text-sm font-medium text-gray-600">Safe to Spend</span>
      </div>
      <div className={`text-3xl font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
        {formatCurrency(Math.abs(safeToSpend))}
        {isNegative && <span className="text-lg ml-1 font-normal">over limit</span>}
      </div>
      {accountCount > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Based on {accountCount} account{accountCount !== 1 ? 's' : ''} with threshold set
        </div>
      )}
    </div>
  );
}
