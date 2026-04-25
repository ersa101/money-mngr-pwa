'use client';

import { useState, useEffect, useRef } from 'react';
import { useDb } from '@/contexts/DbContext';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { CloudUpload, Download, Upload, RotateCcw, Trash2, AlertTriangle, CheckCircle, Loader2, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';

const BACKUP_TABLES = [
  'accounts', 'categories', 'transactions', 'filterPresets',
  'budgets', 'goals', 'categoryBuckets', 'appSettings',
  'lifeEvents', 'feedbackLog', 'computedInsights',
] as const;
type BackupTable = typeof BACKUP_TABLES[number];

interface BackupPayload {
  version: string;
  exportedAt: string;
  data: Partial<Record<BackupTable, any[]>>;
}

interface Snapshot {
  id: string;
  name: string;
  createdAt: string;
  size: number;
}

async function readAllTables(db: any): Promise<Partial<Record<BackupTable, any[]>>> {
  const data: Partial<Record<BackupTable, any[]>> = {};
  for (const table of BACKUP_TABLES) {
    data[table] = await db[table].toArray();
  }
  return data;
}

export function UnifiedBackupSection() {
  const db = useDb();
  const { data: session } = useSession();
  const [backing, setBacking] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState(false);

  // Snapshot (GDrive restore)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [folderLink, setFolderLink] = useState('');
  const [loadingSnaps, setLoadingSnaps] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Snapshot | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);

  // JSON import
  const [pendingImport, setPendingImport] = useState<BackupPayload | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backupTimestampKey = `lastBackupAt_${session?.user?.id || 'anon'}`;
  const lastBackupAt = typeof window !== 'undefined' ? localStorage.getItem(backupTimestampKey) : null;

  useEffect(() => {
    loadSnapshots();
  }, []);

  async function loadSnapshots() {
    setLoadingSnaps(true);
    try {
      const res = await fetch('/api/snapshots');
      const json = await res.json();
      if (json.error === 'TOKEN_EXPIRED') { setTokenExpired(true); return; }
      setSnapshots(json.snapshots || []);
      setFolderLink(json.folderLink || '');
    } catch {
      // silent
    } finally {
      setLoadingSnaps(false);
    }
  }

  // ── BACKUP (all-or-nothing) ─────────────────────────────────────────────────
  async function handleBackup() {
    if (!db) return;
    setBacking(true);
    setBackupError(null);
    setBackupSuccess(false);

    try {
      const data = await readAllTables(db);
      const payload = JSON.stringify(data);

      // Compress for GSheet API call
      let gsheetBody: BodyInit = payload;
      let gsheetHeaders: Record<string, string> = {};
      if (typeof CompressionStream !== 'undefined') {
        const cs = new CompressionStream('gzip');
        const writer = cs.writable.getWriter();
        writer.write(new TextEncoder().encode(payload));
        writer.close();
        gsheetBody = await new Response(cs.readable).arrayBuffer();
        gsheetHeaders = { 'Content-Encoding': 'gzip' };
      }

      // GSheet + GDrive in parallel
      const [gsheetRes, driveRes] = await Promise.all([
        fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...gsheetHeaders },
          body: gsheetBody,
        }),
        fetch('/api/snapshots/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }),
      ]);

      const [gsheetJson, driveJson] = await Promise.all([gsheetRes.json(), driveRes.json()]);

      if (driveJson.error === 'TOKEN_EXPIRED') { setTokenExpired(true); throw new Error('Token expired'); }
      if (!gsheetRes.ok) throw new Error(gsheetJson.error || 'GSheet backup failed');
      if (!driveJson.success) throw new Error(driveJson.error || 'Drive backup failed');

      // Both succeeded — download JSON
      const exportPayload: BackupPayload = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        data,
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `money-mngr-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      localStorage.setItem(backupTimestampKey, new Date().toISOString());
      if (driveJson.folderLink) setFolderLink(driveJson.folderLink);
      setBackupSuccess(true);
      await loadSnapshots();
    } catch (err: any) {
      if (err.message !== 'Token expired') {
        setBackupError(err.message || 'Backup failed');
      }
    } finally {
      setBacking(false);
    }
  }

  // ── GDrive restore ──────────────────────────────────────────────────────────
  async function confirmDriveRestore() {
    if (!restoreTarget || !db) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/snapshots/${restoreTarget.id}`);
      const json = await res.json();
      if (!json.success) throw new Error('Fetch failed');
      const d = json.data;
      await db.transaction('rw', [
        db.accounts, db.categories, db.transactions, db.filterPresets,
        db.budgets, db.goals, db.categoryBuckets, db.appSettings,
        db.lifeEvents, db.feedbackLog, db.computedInsights,
      ], async () => {
        await db.accounts.clear();        if (d?.accounts?.length)        await db.accounts.bulkPut(d.accounts);
        await db.categories.clear();      if (d?.categories?.length)      await db.categories.bulkPut(d.categories);
        await db.transactions.clear();    if (d?.transactions?.length)    await db.transactions.bulkPut(d.transactions);
        await db.filterPresets.clear();   if (d?.filterPresets?.length)   await db.filterPresets.bulkPut(d.filterPresets);
        await db.budgets.clear();         if (d?.budgets?.length)         await db.budgets.bulkPut(d.budgets);
        await db.goals.clear();           if (d?.goals?.length)           await db.goals.bulkPut(d.goals);
        await db.categoryBuckets.clear(); if (d?.categoryBuckets?.length) await db.categoryBuckets.bulkPut(d.categoryBuckets);
        await db.appSettings.clear();     if (d?.appSettings?.length)     await db.appSettings.bulkPut(d.appSettings);
        if (d?.lifeEvents?.length)        await db.lifeEvents.bulkPut(d.lifeEvents);
        if (d?.feedbackLog?.length)       await db.feedbackLog.bulkPut(d.feedbackLog);
        if (d?.computedInsights?.length)  await db.computedInsights.bulkPut(d.computedInsights);
      });
      setRestoreTarget(null);
      toast.success('Data restored from Drive snapshot!');
    } catch {
      toast.error('Restore failed.');
    } finally {
      setRestoring(false);
    }
  }

  async function handleDeleteSnapshot(id: string) {
    if (!confirm('Delete this snapshot? Cannot be undone.')) return;
    try {
      await fetch(`/api/snapshots/${id}`, { method: 'DELETE' });
      await loadSnapshots();
    } catch {
      toast.error('Delete failed.');
    }
  }

  // ── JSON import ─────────────────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as BackupPayload;
        if (!parsed?.data || typeof parsed.data !== 'object') {
          toast.error('Invalid backup file');
          return;
        }
        setPendingImport(parsed);
      } catch {
        toast.error('Could not parse file');
      }
    };
    reader.readAsText(file);
  }

  async function handleImportConfirm() {
    if (!db || !pendingImport) return;
    setImporting(true);
    try {
      const d = pendingImport.data;
      await db.transaction('rw', [
        db.accounts, db.categories, db.transactions, db.filterPresets,
        db.budgets, db.goals, db.categoryBuckets, db.appSettings,
        db.lifeEvents, db.feedbackLog, db.computedInsights,
      ], async () => {
        if (Array.isArray(d.accounts))        { await db.accounts.clear();        await db.accounts.bulkPut(d.accounts); }
        if (Array.isArray(d.categories))      { await db.categories.clear();      await db.categories.bulkPut(d.categories); }
        if (Array.isArray(d.transactions))    { await db.transactions.clear();    await db.transactions.bulkPut(d.transactions); }
        if (Array.isArray(d.filterPresets))   { await db.filterPresets.clear();   await db.filterPresets.bulkPut(d.filterPresets); }
        if (Array.isArray(d.budgets))         { await db.budgets.clear();         await db.budgets.bulkPut(d.budgets); }
        if (Array.isArray(d.goals))           { await db.goals.clear();           await db.goals.bulkPut(d.goals); }
        if (Array.isArray(d.categoryBuckets)) { await db.categoryBuckets.clear(); await db.categoryBuckets.bulkPut(d.categoryBuckets); }
        if (Array.isArray(d.appSettings))     { await db.appSettings.clear();     await db.appSettings.bulkPut(d.appSettings); }
        if (Array.isArray(d.lifeEvents))      await db.lifeEvents.bulkPut(d.lifeEvents);
        if (Array.isArray(d.feedbackLog))     await db.feedbackLog.bulkPut(d.feedbackLog);
        if (Array.isArray(d.computedInsights))await db.computedInsights.bulkPut(d.computedInsights);
      });
      setPendingImport(null);
      toast.success('Data restored from JSON backup!');
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  }

  // ── Token expired state ─────────────────────────────────────────────────────
  if (tokenExpired) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="text-amber-500 w-5 h-5" />
          <span className="font-medium text-amber-700">Google session expired</span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Re-sign in to re-enable Drive and Sheets backup.
        </p>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium"
        >
          Sign out & reconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
        {/* ── BACKUP ──────────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CloudUpload className="w-5 h-5 text-blue-600" />
              Backup
            </h3>
            {lastBackupAt && (
              <span className="text-xs text-gray-400">
                Last: {new Date(lastBackupAt).toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Saves to Google Sheets + Google Drive simultaneously. If both succeed, a local JSON is downloaded automatically. If either cloud tier fails, the entire backup is aborted.
          </p>

          <Button
            onClick={handleBackup}
            disabled={backing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {backing
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Backing up…</>
              : <><CloudUpload className="mr-2 h-4 w-4" /> BACKUP</>
            }
          </Button>

          {backupSuccess && (
            <div className="flex items-center gap-2 mt-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Backup complete — Sheets, Drive, and local JSON saved.
              {folderLink && (
                <a href={folderLink} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-600 underline text-xs whitespace-nowrap">
                  Open Drive →
                </a>
              )}
            </div>
          )}
          {backupError && (
            <div className="flex items-center gap-2 mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {backupError}
            </div>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* ── RESTORE ─────────────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Restore</h3>

          {/* Drive snapshots */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Drive Snapshots</p>
              {folderLink && (
                <a
                  href={folderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Open folder
                </a>
              )}
            </div>

            {loadingSnaps ? (
              <p className="text-sm text-gray-400">Loading snapshots…</p>
            ) : snapshots.length === 0 ? (
              <p className="text-sm text-gray-400">No Drive snapshots yet. Run a backup first.</p>
            ) : (
              <div className="space-y-2">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(snap.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">{(snap.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setRestoreTarget(snap)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-green-600"
                        title="Restore"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* JSON import */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Import from JSON</p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              <Upload className="mr-2 h-4 w-4" />
              Import JSON backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>
      </div>

      {/* Drive restore confirm modal */}
      {restoreTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Restore snapshot?
            </h4>
            <p className="text-sm text-gray-600 mb-1">
              This will <strong>replace all current data</strong> with the snapshot from:
            </p>
            <p className="text-sm text-blue-600 font-medium mb-4">
              {new Date(restoreTarget.createdAt).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mb-5">Cannot be undone. Consider running a backup first.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setRestoreTarget(null)}
                disabled={restoring}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDriveRestore}
                disabled={restoring}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                {restoring && <Loader2 className="w-4 h-4 animate-spin" />}
                Yes, restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON import confirm modal */}
      {pendingImport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Replace all local data?</h3>
            </div>
            <p className="text-sm text-gray-600">
              This will permanently overwrite your local data with the JSON backup.
              <strong className="block mt-2 text-gray-900">This cannot be undone.</strong>
            </p>
            {pendingImport.exportedAt && (
              <p className="text-xs text-gray-400">
                Backup dated: {new Date(pendingImport.exportedAt).toLocaleString()}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPendingImport(null)}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleImportConfirm}
                disabled={importing}
              >
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, restore
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
