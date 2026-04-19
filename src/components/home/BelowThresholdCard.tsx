'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import { formatCurrency } from '@/lib/currency-utils';
import { AlertTriangle } from 'lucide-react';

export function BelowThresholdCard() {
  const db = useDb();
  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db]) || [];

  const belowThreshold = accounts.filter(
    (a) => (a.thresholdValue ?? 0) > 0 && (a.balance || 0) < (a.thresholdValue || 0)
  );

  if (belowThreshold.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <span className="text-sm font-medium text-gray-700">
          Below Threshold ({belowThreshold.length})
        </span>
      </div>
      <div className="space-y-2">
        {belowThreshold.map((a) => (
          <div key={a.id} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">{a.name}</span>
            <span className="font-medium text-red-600">
              {formatCurrency((a.thresholdValue || 0) - (a.balance || 0))} short
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
