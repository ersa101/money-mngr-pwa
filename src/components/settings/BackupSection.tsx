'use client';

import { useBackup } from '@/hooks/useBackup';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function BackupSection() {
  const { isBackingUp, isRestoring, backupNow, restoreNow } = useBackup();

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <h3 className="text-xl font-semibold text-white">Google Sheets Backup</h3>
      <p className="mt-2 text-slate-400">
        Sync your data to a Google Sheet for easy access and as a live backup.
      </p>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <Button
          onClick={backupNow}
          disabled={isBackingUp || isRestoring}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {isBackingUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Backup to Sheets
        </Button>
        <Button
          onClick={restoreNow}
          disabled={isBackingUp || isRestoring}
          variant="outline"
          className="flex-1 bg-slate-700 text-white border-slate-500 hover:bg-slate-600"
        >
          {isRestoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Restore from Sheets
        </Button>
      </div>
       <p className="mt-4 text-xs text-slate-500">
        Backup is stored securely in Google Sheets. Restore replaces all local data.
      </p>
    </div>
  );
}
