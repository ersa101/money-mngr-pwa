'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useFAINContext } from '@/hooks/useFAINContext';
import { useAIKeys } from '@/hooks/useAIKeys';
import { InsightCard } from './InsightCard';

const WEEKLY_LAST_RUN_KEY = 'fain_weekly_summary_last_run';
const WEEKLY_AUTO_RAN_KEY = 'fain_weekly_summary_auto_ran_week';

import type { AIKeySlot } from '@/hooks/useAIKeys';

async function callInsightsAPI(
  prompt: string,
  aiKeys: AIKeySlot[]
): Promise<string> {
  const res = await fetch('/api/fain/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aiKeys }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Analysis failed. Check your API key in Settings or try again.');
  return data.text;
}

export function FAINInsights() {
  const fainContext = useFAINContext();
  const { aiKeys } = useAIKeys();

  // Build prompts
  const makePrompt = useCallback(
    (template: string) => {
      if (!fainContext) return '';
      return template + '\n\nFinancial context:\n' + JSON.stringify(fainContext);
    },
    [fainContext]
  );

  // Monday auto-generation for Weekly Summary (I-4)
  // Runs automatically if: today is Monday AND user has previously run it AND we haven't auto-run this week yet
  const weeklyCardRef = useRef<{ triggerRun?: () => void }>({});
  useEffect(() => {
    if (!fainContext) return;
    const now = new Date();
    const isMonday = now.getDay() === 1;
    if (!isMonday) return;

    const lastRun = localStorage.getItem(WEEKLY_LAST_RUN_KEY);
    if (!lastRun) return; // Never run by user — don't auto-run

    const currentWeek = `${now.getFullYear()}-W${getISOWeek(now)}`;
    const alreadyAutoRan = localStorage.getItem(WEEKLY_AUTO_RAN_KEY);
    if (alreadyAutoRan === currentWeek) return; // Already auto-ran this Monday

    // Mark as auto-ran for this week, then trigger
    localStorage.setItem(WEEKLY_AUTO_RAN_KEY, currentWeek);
    weeklyCardRef.current.triggerRun?.();
  }, [fainContext]);

  function getISOWeek(date: Date): number {
    const d = new Date(date.valueOf());
    const dayNum = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - dayNum);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
  }

  return (
    <div className="px-4 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
      <InsightCard
        featureId="INSIGHT_MONTHLY_SUMMARY"
        insightType="MONTHLY_SUMMARY"
        title="End of Month Summary"
        icon="📅"
        onRun={() =>
          callInsightsAPI(
            makePrompt(
              'Write a 150-200 word narrative summary of the user\'s current calendar month spending. Include: total spend, top 3 categories, income vs expense delta, one observation. Be specific with ₹ amounts.'
            ),
            aiKeys
          )
        }
      />

      <InsightCard
        featureId="INSIGHT_CROSS_CATEGORY"
        insightType="CROSS_CATEGORY_CORRELATION"
        title="Cross-Category Correlation"
        icon="🔗"
        onRun={() =>
          callInsightsAPI(
            makePrompt(
              'Identify 3-5 meaningful correlations in the user\'s spending across the last 6 months. Format each as: "When [Category A] increases, [Category B] tends to [increase/decrease] [X] weeks later." Add a confidence indicator: High or Medium.'
            ),
            aiKeys
          )
        }
      />

      <InsightCard
        featureId="INSIGHT_SEASONAL"
        insightType="SEASONAL_TREND"
        title="Seasonal Trend Analysis"
        icon="🗓️"
        onRun={() =>
          callInsightsAPI(
            makePrompt(
              'Analyse spending patterns across months and years. Identify seasonal peaks, likely linked to Indian festivals (Diwali Oct/Nov, Holi Mar, Eid variable, Dussehra Oct, Christmas Dec, Onam Aug/Sep). Format as 3-5 bullet observations: "Your [category] spending peaks in [month] every year, likely due to [reason]. This year it was ₹X vs ₹Y average."'
            ),
            aiKeys
          )
        }
      />

      <InsightCard
        featureId="INSIGHT_WEEKLY_SUMMARY"
        insightType="WEEKLY_SUMMARY"
        title="Weekly Summary"
        icon="📊"
        controlRef={weeklyCardRef}
        persistKey={WEEKLY_LAST_RUN_KEY}
        onRun={() =>
          callInsightsAPI(
            makePrompt(
              'Summarise the last 7 days of spending in 3-4 sentences: total spend, comparison vs previous week, top category, one actionable suggestion. Be specific with ₹ amounts.'
            ),
            aiKeys
          )
        }
      />

      <InsightCard
        featureId="INSIGHT_BIGGEST_SPEND"
        insightType="BIGGEST_SPEND_ANALYSIS"
        title="Biggest Spend Analysis"
        icon="💸"
        onRun={() =>
          callInsightsAPI(
            makePrompt(
              'Identify the top 3 largest transactions in the current week and provide context for each: "Your ₹X spend on [category] on [day] was [X]% above your weekly average for this category." Be specific.'
            ),
            aiKeys
          )
        }
      />
    </div>
  );
}
