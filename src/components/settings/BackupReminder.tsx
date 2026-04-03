'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CloudOff, X } from 'lucide-react';
import toast from 'react-hot-toast';

const REMINDER_DAYS = 7;

export function useBackupReminder() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Wait until session is fully loaded to avoid double-firing with 'anonymous' key
    if (status !== 'authenticated') return;

    const userId = session?.user?.id || 'anonymous';
    const key = `lastBackupAt_${userId}`;
    const lastBackup = localStorage.getItem(key);

    if (!lastBackup) {
      // Never backed up - subtle reminder with close button
      toast((t) => (
        <div className="flex items-center gap-3">
          <CloudOff className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-sm">No backup found</div>
            <div className="text-xs text-slate-400">
              Backup your data to avoid losing it
            </div>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="p-1 hover:bg-slate-700 rounded flex-shrink-0"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      ), { duration: 8000, position: 'top-center' });
      return;
    }

    const daysSinceBackup = Math.floor(
      (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceBackup >= REMINDER_DAYS) {
      toast((t) => (
        <div className="flex items-center gap-3">
          <CloudOff className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-sm">Backup reminder</div>
            <div className="text-xs text-slate-400">
              Last backup was {daysSinceBackup} days ago
            </div>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="p-1 hover:bg-slate-700 rounded flex-shrink-0"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      ), { duration: 8000, position: 'top-center' });
    }
  }, [session?.user?.id, status]);
}
