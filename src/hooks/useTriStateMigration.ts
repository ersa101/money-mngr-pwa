'use client';

import { useEffect } from 'react';
import { useDb } from '@/contexts/DbContext';

/**
 * V2.7.4 D040 — One-shot migration to resolve "both flags ON" anomaly.
 *
 * Liability wins per D040 tiebreaker. After migration, liability accounts
 * have includeInNetWorth=false, ensuring NetWorth's new tri-state-only
 * classifier (D041) treats them correctly.
 *
 * Idempotent: gated on appSettings.triStateMigratedAt. Safe to run twice.
 * Only runs after at least one account exists in DB (to avoid marking
 * "done" on a fresh empty DB before user data restores).
 */
export function useTriStateMigration(): void {
  const db = useDb();

  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    (async () => {
      try {
        const flag = await db.appSettings.where('key').equals('triStateMigratedAt').first();
        if (flag) return;

        const accounts = await db.accounts.toArray();
        if (!accounts.length) return; // Don't mark migrated on empty DB

        for (const acc of accounts.filter(Boolean)) {
          if (cancelled) return;
          if (acc.isLiability === true && acc.includeInNetWorth === true) {
            // Liability wins (D040). Force includeInNetWorth=false.
            await db.accounts.update(acc.id!, {
              includeInNetWorth: false,
              updatedAt: Date.now(),
            });
          }
        }
        await db.appSettings.put({
          key: 'triStateMigratedAt',
          value: new Date().toISOString(),
        });
      } catch {
        // Silent; migration is opportunistic.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);
}
