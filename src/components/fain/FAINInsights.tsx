'use client';

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import { useFAINContext } from '@/hooks/useFAINContext';
import { InsightCard } from './InsightCard';

async function callInsightsAPI(
  prompt: string,
  geminiKey: string,
  claudeKey: string
): Promise<string> {
  const res = await fetch('/api/fain/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, geminiKey, claudeKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Analysis failed. Check your API key in Settings or try again.');
  return data.text;
}

export function FAINInsights() {
  const db = useDb();
  const fainContext = useFAINContext();

  const geminiKeySetting = useLiveQuery(() => db?.appSettings.get('gemini_api_key'), [db]);
  const claudeKeySetting = useLiveQuery(() => db?.appSettings.get('claude_api_key'), [db]);
  const geminiKey = geminiKeySetting?.value ?? '';
  const claudeKey = claudeKeySetting?.value ?? '';
  const hasKey = !!(geminiKey || claudeKey);

  // Build prompts
  const makePrompt = useCallback(
    (template: string) => {
      if (!fainContext) return '';
      return template + '\n\nFinancial context:\n' + JSON.stringify(fainContext);
    },
    [fainContext]
  );

  if (!hasKey) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        Add your Gemini API key in <span className="text-blue-400">⚙️ Settings</span> to unlock FAIN Insights.
      </div>
    );
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
            geminiKey,
            claudeKey
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
            geminiKey,
            claudeKey
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
            geminiKey,
            claudeKey
          )
        }
      />

      <InsightCard
        featureId="INSIGHT_WEEKLY_SUMMARY"
        insightType="WEEKLY_SUMMARY"
        title="Weekly Summary"
        icon="📊"
        onRun={() =>
          callInsightsAPI(
            makePrompt(
              'Summarise the last 7 days of spending in 3-4 sentences: total spend, comparison vs previous week, top category, one actionable suggestion. Be specific with ₹ amounts.'
            ),
            geminiKey,
            claudeKey
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
            geminiKey,
            claudeKey
          )
        }
      />
    </div>
  );
}
