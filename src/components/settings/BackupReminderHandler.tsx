'use client';

import { useBackupReminder } from './BackupReminder';

export function BackupReminderHandler() {
  useBackupReminder();
  return null; // This component doesn't render anything
}
