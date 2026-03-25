// src/hooks/useBackup.ts
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useDb } from '@/contexts/DbContext';
import toast from 'react-hot-toast';

export function useBackup() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const db = useDb();
  const { data: session } = useSession();
  // Use a per-user localStorage key so the timestamp is scoped to the Google account
  const backupTimestampKey = `lastBackupAt_${session?.user?.id || 'anonymous'}`;

  const backupNow = async () => {
    setIsBackingUp(true);
    toast.loading('Starting backup...');

    try {
      const accounts = await db.accounts.toArray();
      const categories = await db.categories.toArray();
      const transactions = await db.transactions.toArray();
      const filterPresets = await db.filterPresets.toArray();

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts, categories, transactions, filterPresets }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Backup failed');
      }

      localStorage.setItem(backupTimestampKey, new Date().toISOString());
      toast.dismiss();
      toast.success('Backup completed successfully!');
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Backup failed: ${error.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const restoreNow = async () => {
    if (!confirm('This will overwrite all local data. Are you sure you want to restore from Google Sheets?')) {
      return;
    }

    setIsRestoring(true);
    toast.loading('Restoring from backup...');

    try {
      const response = await fetch('/api/restore');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Restore failed');
      }

      const totalRecords =
        (result.data?.accounts?.length || 0) +
        (result.data?.categories?.length || 0) +
        (result.data?.transactions?.length || 0) +
        (result.data?.filterPresets?.length || 0);

      if (totalRecords === 0) {
        throw new Error('No backup data found for your account in Google Sheets. Backup first or check your account.');
      }

      await db.transaction('rw', db.accounts, db.categories, db.transactions, db.filterPresets, async () => {
        await db.accounts.clear();
        await db.categories.clear();
        await db.transactions.clear();
        await db.filterPresets.clear();

        if (result.data?.accounts?.length) {
          await db.accounts.bulkAdd(result.data.accounts);
        }
        if (result.data?.categories?.length) {
          await db.categories.bulkAdd(result.data.categories);
        }
        if (result.data?.transactions?.length) {
          await db.transactions.bulkAdd(result.data.transactions);
        }
        if (result.data?.filterPresets?.length) {
          await db.filterPresets.bulkAdd(result.data.filterPresets);
        }
      });

      toast.dismiss();
      toast.success('Data restored successfully!');
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Restore failed: ${error.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return { isBackingUp, isRestoring, backupNow, restoreNow };
}
