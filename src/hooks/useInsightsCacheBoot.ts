'use client';

import { useEffect } from 'react';
import { useDb } from '@/contexts/DbContext';

// V2.7.4 D043 — bump this whenever computedInsights schemas change
// (CorrelationWeb v3->v4 in C5, SeasonalHeatmap, etc.). The clear runs once
// per user when their stored clearedInsightsAt < INSIGHTS_BUILD_DATE.
const INSIGHTS_BUILD_DATE = '2026-04-26T00:00:00.000Z';

/**
 * One-shot computedInsights clear on app boot.
 * Silent (no toast) per user spec, S12.
 * Idempotent: gated on appSettings.clearedInsightsAt flag.
 */
export function useInsightsCacheBoot(): void {
  const db = useDb();

  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    (async () => {
      try {
        const flag = await db.appSettings.where('key').equals('clearedInsightsAt').first();
        const lastCleared = flag?.value ? new Date(flag.value) : null;
        const buildDate = new Date(INSIGHTS_BUILD_DATE);
        if (lastCleared && lastCleared >= buildDate) return;
        if (cancelled) return;

        await db.computedInsights.clear();
        await db.appSettings.put({
          key: 'clearedInsightsAt',
          value: new Date().toISOString(),
        });
      } catch {
        // Silent — clear is opportunistic; charts will fall back to recompute on demand.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);
}
