'use client';

import { useSnapshots } from '@/hooks/useSnapshots';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Download, Upload, RefreshCw } from 'lucide-react';
import { formatDateTime } from '@/lib/date-utils';

export function SnapshotSection() {
  const { snapshots, isLoading, createSnapshot, restoreSnapshot, deleteSnapshot, refresh } = useSnapshots();

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Drive Snapshots</h3>
          <p className="mt-2 text-slate-400">
            Create point-in-time JSON snapshots of your entire database in Google Drive.
          </p>
        </div>
        <Button onClick={createSnapshot} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Create Snapshot
        </Button>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-medium text-slate-300">Available Snapshots</h4>
            <Button variant="ghost" size="sm" onClick={refresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
        </div>
        {isLoading && snapshots.length === 0 ? (
          <div className="text-center text-slate-400">Loading snapshots...</div>
        ) : snapshots.length === 0 ? (
          <div className="text-center text-slate-500 py-4">No snapshots found.</div>
        ) : (
          <ul className="space-y-2">
            {snapshots.map((snapshot) => (
              <li
                key={snapshot.id}
                className="flex items-center justify-between rounded-md bg-slate-700/50 p-3"
              >
                <div>
                  <p className="font-medium text-white">{snapshot.name}</p>
                  <p className="text-sm text-slate-400">
                    {formatDateTime(snapshot.createdAt)} - {(snapshot.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreSnapshot(snapshot.id)}
                    disabled={isLoading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Restore
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteSnapshot(snapshot.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
