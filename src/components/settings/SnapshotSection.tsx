'use client';

import { useState, useEffect } from 'react';
import { useDb } from '@/contexts/DbContext';
import { signOut } from 'next-auth/react';
import { CloudIcon, FolderOpen, RefreshCw, Trash2, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';

interface Snapshot {
  id: string;
  name: string;
  createdAt: string;
  size: number;
}

export function SnapshotSection() {
  const db = useDb();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [folderLink, setFolderLink] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(
    () => typeof window !== 'undefined' ? localStorage.getItem('lastSnapshotAt') : null
  );
  const [tokenExpired, setTokenExpired] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Snapshot | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSnapshots();
  }, []);

  async function loadSnapshots() {
    setLoading(true);
    try {
      const res = await fetch('/api/snapshots');
      const json = await res.json();

      if (json.error === 'TOKEN_EXPIRED') {
        setTokenExpired(true);
        return;
      }

      setSnapshots(json.snapshots || []);
      setFolderLink(json.folderLink || '');
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to load snapshots' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSnapshot() {
    setCreating(true);
    setStatusMsg(null);
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

      const res = await fetch('/api/snapshots/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts, categories, transactions, filterPresets, budgets, goals, lifeEvents, feedbackLog, appSettings, computedInsights, categoryBuckets }),
      });

      const json = await res.json();

      if (json.error === 'TOKEN_EXPIRED') {
        setTokenExpired(true);
        return;
      }

      if (json.success) {
        const now = new Date().toISOString();
        localStorage.setItem('lastSnapshotAt', now);
        setLastBackupAt(now);
        setFolderLink(json.folderLink);
        setStatusMsg({ type: 'success', text: 'Snapshot saved to your Drive' });
        await loadSnapshots();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Snapshot failed. Try again.' });
    } finally {
      setCreating(false);
    }
  }

  async function confirmRestore() {
    if (!restoreTarget) return;
    try {
      const res = await fetch(`/api/snapshots/${restoreTarget.id}`);
      const json = await res.json();

      if (json.success) {
        const d = json.data;
        await db.transaction('rw', [
          db.accounts, db.categories, db.transactions, db.filterPresets,
          db.budgets, db.goals, db.categoryBuckets, db.appSettings,
          db.lifeEvents, db.feedbackLog, db.computedInsights,
        ], async () => {
          // Replace tables: clear then bulkPut
          await db.accounts.clear();       if (d?.accounts?.length)       await db.accounts.bulkPut(d.accounts);
          await db.categories.clear();     if (d?.categories?.length)     await db.categories.bulkPut(d.categories);
          await db.transactions.clear();   if (d?.transactions?.length)   await db.transactions.bulkPut(d.transactions);
          await db.filterPresets.clear();  if (d?.filterPresets?.length)  await db.filterPresets.bulkPut(d.filterPresets);
          await db.budgets.clear();        if (d?.budgets?.length)        await db.budgets.bulkPut(d.budgets);
          await db.goals.clear();          if (d?.goals?.length)          await db.goals.bulkPut(d.goals);
          await db.categoryBuckets.clear();if (d?.categoryBuckets?.length)await db.categoryBuckets.bulkPut(d.categoryBuckets);
          await db.appSettings.clear();    if (d?.appSettings?.length)    await db.appSettings.bulkPut(d.appSettings);
          // Append tables: bulkPut only
          if (d?.lifeEvents?.length)       await db.lifeEvents.bulkPut(d.lifeEvents);
          if (d?.feedbackLog?.length)      await db.feedbackLog.bulkPut(d.feedbackLog);
          if (d?.computedInsights?.length) await db.computedInsights.bulkPut(d.computedInsights);
        });
        setStatusMsg({ type: 'success', text: 'Data restored successfully!' });
        setRestoreTarget(null);
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Restore failed.' });
    }
  }

  async function handleDelete(snapshotId: string) {
    if (!confirm('Delete this snapshot? This cannot be undone.')) return;
    try {
      await fetch(`/api/snapshots/${snapshotId}`, { method: 'DELETE' });
      await loadSnapshots();
    } catch {
      setStatusMsg({ type: 'error', text: 'Delete failed.' });
    }
  }

  // ── Token Expired State ────────────────────────────────────────────────────
  if (tokenExpired) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="text-amber-500 w-5 h-5" />
          <span className="font-medium text-amber-700">Session expired</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Your Google session has expired. Please sign out and sign in again to re-enable Drive backups.
        </p>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium"
        >
          Sign out & reconnect
        </button>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
    <div className="space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CloudIcon className="w-5 h-5 text-blue-600" />
            Drive Snapshots
          </h3>
          {lastBackupAt && (
            <p className="text-xs text-gray-500 mt-0.5">
              Last backup: {new Date(lastBackupAt).toLocaleString()}
            </p>
          )}
          {!lastBackupAt && (
            <p className="text-xs text-orange-500 mt-0.5">No backups yet</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {folderLink && (
            <a
              href={folderLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600"
            >
              <FolderOpen className="w-4 h-4" />
              Open in Drive
            </a>
          )}

          <button
            onClick={handleCreateSnapshot}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {creating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CloudIcon className="w-4 h-4" />
            )}
            {creating ? 'Saving...' : 'Backup Now'}
          </button>
        </div>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
          statusMsg.type === 'success'
            ? 'bg-green-50 text-green-600 border border-green-200'
            : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          {statusMsg.type === 'success'
            ? <CheckCircle className="w-4 h-4" />
            : <AlertTriangle className="w-4 h-4" />
          }
          {statusMsg.text}
          {statusMsg.type === 'success' && folderLink && (
            <a
              href={folderLink}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-blue-600 underline text-xs"
            >
              View in Drive →
            </a>
          )}
        </div>
      )}

      {/* Snapshot list */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading snapshots...</p>
      ) : snapshots.length === 0 ? (
        <p className="text-sm text-gray-500">
          No snapshots yet. Your backups will appear here and in your Google Drive.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">{snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} stored in your Drive</p>
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(snap.createdAt).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">
                  {(snap.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setRestoreTarget(snap)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-green-600"
                  title="Restore this snapshot"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(snap.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-red-600"
                  title="Delete snapshot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoreTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Restore Snapshot?
            </h4>
            <p className="text-sm text-gray-600 mb-1">
              This will <strong className="text-gray-900">replace all current data</strong> with the snapshot from:
            </p>
            <p className="text-sm text-blue-600 font-medium mb-4">
              {new Date(restoreTarget.createdAt).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mb-6">
              This action cannot be undone. Consider creating a new snapshot first.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRestoreTarget(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium"
              >
                Yes, Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
