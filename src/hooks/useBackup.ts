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
  const backupTimestampKey = `lastBackupAt_${session?.user?.id || 'anonymous'}`;

  const backupNow = async () => {
    setIsBackingUp(true);
    toast.loading('Starting backup...');

    try {
      const [accounts, categories, transactions, filterPresets, budgets, goals, lifeEvents, feedbackLog, appSettings, computedInsights, categoryBuckets] = await Promise.all([
        db.accounts.toArray(),
        db.categories.toArray(),
        db.transactions.toArray(),
        db.filterPresets.toArray(),
        db.budgets.toArray(),
        db.goals.toArray(),
        db.lifeEvents.toArray(),
        db.feedbackLog.toArray(),
        db.appSettings.toArray(),
        db.computedInsights.toArray(),
        db.categoryBuckets.toArray(),
      ]);

      const payload = JSON.stringify({ accounts, categories, transactions, filterPresets, budgets, goals, lifeEvents, feedbackLog, appSettings, computedInsights, categoryBuckets });

      // Gzip-compress to stay under Vercel's 4.5 MB serverless payload limit.
      let body: BodyInit = payload;
      let extraHeaders: Record<string, string> = {};
      if (typeof CompressionStream !== 'undefined') {
        const cs = new CompressionStream('gzip');
        const writer = cs.writable.getWriter();
        writer.write(new TextEncoder().encode(payload));
        writer.close();
        body = await new Response(cs.readable).arrayBuffer();
        extraHeaders = { 'Content-Encoding': 'gzip' };
      }

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        body,
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

      const d = result.data;
      await db.transaction('rw', [
        db.accounts, db.categories, db.transactions, db.filterPresets,
        db.budgets, db.goals, db.categoryBuckets, db.appSettings,
        db.lifeEvents, db.feedbackLog, db.computedInsights,
      ], async () => {
        // Replace tables: clear then bulkPut
        await db.accounts.clear();      if (d?.accounts?.length)      await db.accounts.bulkPut(d.accounts);
        await db.categories.clear();    if (d?.categories?.length)    await db.categories.bulkPut(d.categories);
        await db.transactions.clear();  if (d?.transactions?.length)  await db.transactions.bulkPut(d.transactions);
        await db.filterPresets.clear(); if (d?.filterPresets?.length) await db.filterPresets.bulkPut(d.filterPresets);
        await db.budgets.clear();       if (d?.budgets?.length)       await db.budgets.bulkPut(d.budgets);
        await db.goals.clear();         if (d?.goals?.length)         await db.goals.bulkPut(d.goals);
        await db.categoryBuckets.clear();if (d?.categoryBuckets?.length) await db.categoryBuckets.bulkPut(d.categoryBuckets);
        await db.appSettings.clear();   if (d?.appSettings?.length)   await db.appSettings.bulkPut(d.appSettings);
        // Append tables: bulkPut only (never clear — preserve accumulated history)
        if (d?.lifeEvents?.length)      await db.lifeEvents.bulkPut(d.lifeEvents);
        if (d?.feedbackLog?.length)     await db.feedbackLog.bulkPut(d.feedbackLog);
        if (d?.computedInsights?.length)await db.computedInsights.bulkPut(d.computedInsights);
      });

      localStorage.setItem(backupTimestampKey, new Date().toISOString());
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
