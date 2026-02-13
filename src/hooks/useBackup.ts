// src/hooks/useBackup.ts
import { useState } from 'react';
import { db } from '@/lib/db';
import toast from 'react-hot-toast';

export function useBackup() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const backupNow = async () => {
    setIsBackingUp(true);
    toast.loading('Starting backup...');

    try {
      const accounts = await db.accounts.toArray();
      const categories = await db.categories.toArray();
      const transactions = await db.transactions.toArray();

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts, categories, transactions }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Backup failed');
      }
      
      localStorage.setItem('lastBackupAt', new Date().toISOString());
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

      await db.transaction('rw', db.accounts, db.categories, db.transactions, async () => {
        await db.accounts.clear();
        await db.categories.clear();
        await db.transactions.clear();

        await db.accounts.bulkAdd(result.data.accounts);
        await db.categories.bulkAdd(result.data.categories);
        await db.transactions.bulkAdd(result.data.transactions);
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
