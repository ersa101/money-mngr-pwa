'use client';

import { useState, useRef } from 'react';
import { useDb } from '@/contexts/DbContext';
import { Button } from '@/components/ui/button';
import { Download, Upload, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// All 11 DB tables
const BACKUP_TABLES = [
  'accounts',
  'categories',
  'transactions',
  'filterPresets',
  'budgets',
  'goals',
  'categoryBuckets',
  'appSettings',
  'lifeEvents',
  'feedbackLog',
  'computedInsights',
] as const;


type BackupTable = typeof BACKUP_TABLES[number];

interface BackupPayload {
  version: string;
  exportedAt: string;
  data: Partial<Record<BackupTable, any[]>>;
}

export function LocalBackupSection() {
  const db = useDb();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Export ────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    if (!db) return;
    setIsExporting(true);
    try {
      const data: Partial<Record<BackupTable, any[]>> = {};
      for (const table of BACKUP_TABLES) {
        data[table] = await (db as any)[table].toArray();
      }
      const payload: BackupPayload = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        data,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `money-mngr-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup exported!');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // ─── Import — file select ──────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected if cancelled
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as BackupPayload;
        if (!parsed?.data || typeof parsed.data !== 'object') {
          toast.error('Invalid backup file — missing data field');
          return;
        }
        setPendingBackup(parsed);
      } catch {
        toast.error('Could not read file — invalid JSON');
      }
    };
    reader.readAsText(file);
  };

  // ─── Import — confirmed ────────────────────────────────────────────────────

  const handleImportConfirm = async () => {
    if (!db || !pendingBackup) return;
    setIsImporting(true);
    try {
      const d = pendingBackup.data;
      await db.transaction(
        'rw',
        [db.accounts, db.categories, db.transactions, db.filterPresets,
         db.budgets, db.goals, db.categoryBuckets, db.appSettings,
         db.lifeEvents, db.feedbackLog, db.computedInsights],
        async () => {
          // Replace tables: clear then bulkPut
          if (Array.isArray(d.accounts))       { await db.accounts.clear();       await db.accounts.bulkPut(d.accounts); }
          if (Array.isArray(d.categories))     { await db.categories.clear();     await db.categories.bulkPut(d.categories); }
          if (Array.isArray(d.transactions))   { await db.transactions.clear();   await db.transactions.bulkPut(d.transactions); }
          if (Array.isArray(d.filterPresets))  { await db.filterPresets.clear();  await db.filterPresets.bulkPut(d.filterPresets); }
          if (Array.isArray(d.budgets))        { await db.budgets.clear();        await db.budgets.bulkPut(d.budgets); }
          if (Array.isArray(d.goals))          { await db.goals.clear();          await db.goals.bulkPut(d.goals); }
          if (Array.isArray(d.categoryBuckets)){ await db.categoryBuckets.clear();await db.categoryBuckets.bulkPut(d.categoryBuckets); }
          if (Array.isArray(d.appSettings))    { await db.appSettings.clear();    await db.appSettings.bulkPut(d.appSettings); }
          // Append tables: bulkPut only (preserve accumulated history)
          if (Array.isArray(d.lifeEvents))     await db.lifeEvents.bulkPut(d.lifeEvents);
          if (Array.isArray(d.feedbackLog))    await db.feedbackLog.bulkPut(d.feedbackLog);
          if (Array.isArray(d.computedInsights))await db.computedInsights.bulkPut(d.computedInsights);
        }
      );
      setPendingBackup(null);
      toast.success('Data restored from local backup!');
    } catch (err) {
      console.error(err);
      toast.error('Import failed — see console for details');
    } finally {
      setIsImporting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-gray-900">Local JSON Backup</h3>
        <p className="mt-2 text-gray-500">
          Export all your data as a JSON file. Restore it anytime — no internet required.
        </p>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row">
          <Button
            onClick={handleExport}
            disabled={isExporting || isImporting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isExporting
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Download className="mr-2 h-4 w-4" />}
            Export JSON
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isExporting || isImporting}
            variant="outline"
            className="flex-1 bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Includes all 11 tables. Replace tables (accounts, categories, transactions, presets, budgets, goals, buckets, settings) are overwritten on import. Append tables (life events, feedback, insights) are merged.
        </p>
      </div>

      {/* Disclaimer overlay */}
      {pendingBackup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Replace all local data?</h3>
            </div>
            <p className="text-sm text-gray-600">
              This will permanently overwrite all your accounts, categories, transactions, budgets, goals,
              life events, and settings with the contents of the backup file.
              <strong className="block mt-2 text-gray-900">This cannot be undone.</strong>
            </p>
            {pendingBackup.exportedAt && (
              <p className="text-xs text-gray-400">
                Backup dated: {new Date(pendingBackup.exportedAt).toLocaleString()}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPendingBackup(null)}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleImportConfirm}
                disabled={isImporting}
              >
                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, restore
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
