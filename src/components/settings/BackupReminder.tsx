'use client';

import { useEffect } from 'react';
import { CloudOff } from 'lucide-react';
import toast from 'react-hot-toast';

const REMINDER_DAYS = 7;

export function useBackupReminder() {
  useEffect(() => {
    const lastBackup = localStorage.getItem('lastBackupAt');
    
    if (!lastBackup) {
      // Never backed up
      toast((t) => (
        <div className="flex items-center gap-3">
          <CloudOff className="w-5 h-5 text-amber-400" />
          <div>
            <div className="font-medium">No backup found</div>
            <div className="text-sm text-slate-400">
              Backup your data to avoid losing it
            </div>
          </div>
        </div>
      ), { duration: 5000 });
      return;
    }

    const daysSinceBackup = Math.floor(
      (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceBackup >= REMINDER_DAYS) {
      toast((t) => (
        <div className="flex items-center gap-3">
          <CloudOff className="w-5 h-5 text-amber-400" />
          <div>
            <div className="font-medium">Backup reminder</div>
            <div className="text-sm text-slate-400">
              Last backup was {daysSinceBackup} days ago
            </div>
          </div>
        </div>
      ), { duration: 5000 });
    }
  }, []);
}
