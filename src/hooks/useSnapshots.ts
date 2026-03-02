// src/hooks/useSnapshots.ts
import { useState, useEffect } from 'react';
import { useDb } from '@/contexts/DbContext';
import toast from 'react-hot-toast';
import type { SnapshotInfo } from '@/lib/google-drive';

export function useSnapshots() {
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiNotEnabled, setApiNotEnabled] = useState(false);
  const db = useDb();

  const fetchSnapshots = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/snapshots');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSnapshots(data.snapshots);
      setApiNotEnabled(false);
    } catch (error: any) {
      // Check if this is a "Google Drive API not enabled" error - handle silently
      const errorMsg = error.message || '';
      if (errorMsg.includes('Google Drive API has not been used') ||
          errorMsg.includes('accessNotConfigured') ||
          errorMsg.includes('API has not been enabled')) {
        // Silently handle - user hasn't set up Google Drive yet
        console.log('Google Drive API not enabled - snapshots feature unavailable');
        setApiNotEnabled(true);
        setSnapshots([]);
      } else {
        // Only show toast for other errors (actual failures, not config issues)
        toast.error(`Failed to load snapshots: ${errorMsg}`);
      }
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

        if (result.data?.accounts?.length) {
          await db.accounts.bulkAdd(result.data.accounts);
        }
        if (result.data?.categories?.length) {
          await db.categories.bulkAdd(result.data.categories);
        }
        if (result.data?.transactions?.length) {
          await db.transactions.bulkAdd(result.data.transactions);
        }
      });

      toast.dismiss();
      toast.success('Successfully restored from snapshot!');
    } catch (error: any) {
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

  return { snapshots, isLoading, apiNotEnabled, createSnapshot, restoreSnapshot, deleteSnapshot, refresh: fetchSnapshots };
}
