import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import { buildFAINContext, type FAINChatContext } from '@/lib/fainUtils';

export function useFAINContext(): FAINChatContext | null {
  const db = useDb();
  const transactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db]);
  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db]);
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db]);

  return useMemo(() => {
    if (!transactions || !accounts || !categories) return null;
    return buildFAINContext(transactions, accounts, categories);
  }, [transactions, accounts, categories]);
}
