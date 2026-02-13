// src/hooks/useSnapshots.ts
import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import toast from 'react-hot-toast';
import type { SnapshotInfo } from '@/lib/google-drive';

export function useSnapshots() {
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSnapshots = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/snapshots');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSnapshots(data.snapshots);
    } catch (error: any) {
      toast.error(`Failed to load snapshots: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createSnapshot = async () => {
    setIsLoading(true);
    toast.loading('Creating snapshot...');
    try {
      const accounts = await db.accounts.toArray();
      const categories = await db.categories.toArray();
      const transactions = await db.transactions.toArray();

      const response = await fetch('/api/snapshots/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts, categories, transactions }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      toast.dismiss();
      toast.success('Snapshot created!');
      fetchSnapshots(); // Refresh list
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Failed to create snapshot: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const restoreSnapshot = async (snapshotId: string) => {
    if (!confirm('This will overwrite all local data. Are you sure you want to restore from this snapshot?')) {
      return;
    }
    
    setIsLoading(true);
    toast.loading('Restoring from snapshot...');
    try {
      const response = await fetch(`/api/snapshots/${snapshotId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      await db.transaction('rw', db.accounts, db.categories, db.transactions, async () => {
        await db.accounts.clear();
        await db.categories.clear();
        await db.transactions.clear();

        await db.accounts.bulkAdd(result.data.accounts);
        await db.categories.bulkAdd(result.data.categories);
        await db.transactions.bulkAdd(result.data.transactions);
      });

      toast.dismiss();
      toast.success('Successfully restored from snapshot!');
    } catch (error: any)
    {
      toast.dismiss();
      toast.error(`Restore failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSnapshot = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to delete this snapshot? This cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      await fetch(`/api/snapshots/${snapshotId}`, { method: 'DELETE' });
      toast.success('Snapshot deleted.');
      fetchSnapshots(); // Refresh list
    } catch (error: any) {
      toast.error(`Failed to delete snapshot: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  return { snapshots, isLoading, createSnapshot, restoreSnapshot, deleteSnapshot, refresh: fetchSnapshots };
}
