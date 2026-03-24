import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';

export interface SafeToSpendResult {
  safeToSpend: number;
  totalBalance: number;
  totalThreshold: number;
  isNegative: boolean;
}

/** Computes the aggregate safe-to-spend across all active accounts that include in net worth. */
export function useSafeToSpend(): SafeToSpendResult {
  const db = useDb();
  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db]) || [];

  return useMemo(() => {
    const activeAccounts = accounts.filter(
      (a) => a.includeInNetWorth !== false && !a.isLiability
    );
    const totalBalance = activeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalThreshold = activeAccounts.reduce((sum, a) => sum + (a.thresholdValue || 0), 0);
    const safeToSpend = totalBalance - totalThreshold;
    return { safeToSpend, totalBalance, totalThreshold, isNegative: safeToSpend < 0 };
  }, [accounts]);
}
