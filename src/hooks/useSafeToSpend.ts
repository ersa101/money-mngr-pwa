import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';

export interface SafeToSpendResult {
  safeToSpend: number;
  accountCount: number;
  isNegative: boolean;
}

/** Computes safe-to-spend only from accounts where the user has explicitly set a threshold. */
export function useSafeToSpend(): SafeToSpendResult {
  const db = useDb();
  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db]) || [];

  return useMemo(() => {
    const thresholdAccounts = accounts.filter((a) => (a.thresholdValue ?? 0) > 0);
    const safeToSpend = thresholdAccounts.reduce(
      (sum, a) => sum + ((a.balance || 0) - (a.thresholdValue || 0)),
      0
    );
    return { safeToSpend, accountCount: thresholdAccounts.length, isNegative: safeToSpend < 0 };
  }, [accounts]);
}
