'use client';

import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import { useFAINContext } from '@/hooks/useFAINContext';
import { useAnomalyDetection } from '@/hooks/useAnomalyDetection';
import { useRecurringDetection } from '@/hooks/useRecurringDetection';
import { AlertCard } from './AlertCard';
import { formatINR } from '@/lib/fainUtils';
import { formatCurrency } from '@/lib/currency-utils';
import { Loader2, Play, Check, X } from 'lucide-react';
import type { Budget } from '@/types/database';

async function callAlertsAPI(prompt: string, geminiKey: string, claudeKey: string): Promise<string> {
  const res = await fetch('/api/fain/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, geminiKey, claudeKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Analysis failed. Check your API key in Settings or try again.');
  return data.text;
}

export function FAINAlerts() {
  const db = useDb();
  const fainContext = useFAINContext();
  const anomalies = useAnomalyDetection();
  const recurringAlerts = useRecurringDetection();

  const geminiKeySetting = useLiveQuery(() => db?.appSettings.get('gemini_api_key'), [db]);
  const claudeKeySetting = useLiveQuery(() => db?.appSettings.get('claude_api_key'), [db]);
  const geminiKey = geminiKeySetting?.value ?? '';
  const claudeKey = claudeKeySetting?.value ?? '';
  const hasKey = !!(geminiKey || claudeKey);

  // A-3: Budget suggestions
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetSuggestions, setBudgetSuggestions] = useState<{ categoryName: string; suggested: number }[]>([]);
  const [budgetEditingIdx, setBudgetEditingIdx] = useState<number | null>(null);
  const [budgetEditValue, setBudgetEditValue] = useState('');

  // A-4/5/6 AI alerts
  const [leadLagResult, setLeadLagResult] = useState<string | null>(null);
  const [leadLagLoading, setLeadLagLoading] = useState(false);
  const [savingsResult, setSavingsResult] = useState<string | null>(null);
  const [savingsLoading, setSavingsLoading] = useState(false);
  const [lifeEventResult, setLifeEventResult] = useState<string | null>(null);
  const [lifeEventLoading, setLifeEventLoading] = useState(false);

  const runBudgetSuggestions = useCallback(async () => {
    if (!fainContext) return;
    setBudgetLoading(true);
    setBudgetSuggestions([]);
    try {
      // Pure math: 12-month category averages from fainContext
      const suggestions = fainContext.topCategories.map((c) => ({
        categoryName: c.name,
        suggested: Math.round(c.total / Math.max(fainContext.monthlyTotals.length, 1)),
      }));
      setBudgetSuggestions(suggestions);
    } finally {
      setBudgetLoading(false);
    }
  }, [fainContext]);

  const acceptBudget = useCallback(
    async (catName: string, limit: number) => {
      if (!db) return;
      const now = new Date().toISOString();
      const existing = await db.budgets.where('categoryName' as any).equals(catName).first();
      if (existing?.id) {
        await db.budgets.update(existing.id, { monthlyLimit: limit, updatedAt: now });
      } else {
        await db.budgets.add({
          categoryId: 0,
          categoryName: catName,
          monthlyLimit: limit,
          createdAt: now,
          updatedAt: now,
        });
      }
    },
    [db]
  );

  const runLeadLag = useCallback(async () => {
    if (!fainContext || !hasKey) return;
    setLeadLagLoading(true);
    try {
      const prompt = `Based on the user's category spend by month pattern below, identify 2-3 upcoming predictions: "Based on your pattern, [category] spend typically rises in [upcoming month]. Last year it was ₹X. Heads up." Only show predictions for the next 2 months.\n\nContext: ${JSON.stringify(fainContext.monthlyTotals)}`;
      const text = await callAlertsAPI(prompt, geminiKey, claudeKey);
      setLeadLagResult(text);
    } catch (e: any) {
      setLeadLagResult('Analysis failed. Check your API key in Settings or try again.');
    } finally {
      setLeadLagLoading(false);
    }
  }, [fainContext, hasKey, geminiKey, claudeKey]);

  const runSavingsGoal = useCallback(async () => {
    if (!fainContext || !hasKey) return;
    setSavingsLoading(true);
    try {
      const prompt = `Calculate the user's average monthly surplus (income - expense) over the last 6 months. Then suggest 2 savings goals based on their spending patterns. Format: "You typically have ₹X surplus monthly. Here are 2 suggested savings goals: [Goal 1 with target amount], [Goal 2 with target amount]".\n\nContext: ${JSON.stringify(fainContext.monthlyTotals)}`;
      const text = await callAlertsAPI(prompt, geminiKey, claudeKey);
      setSavingsResult(text);
    } catch (e: any) {
      setSavingsResult('Analysis failed. Check your API key in Settings or try again.');
    } finally {
      setSavingsLoading(false);
    }
  }, [fainContext, hasKey, geminiKey, claudeKey]);

  const runLifeEvent = useCallback(async () => {
    if (!fainContext || !hasKey) return;
    setLifeEventLoading(true);
    try {
      const prompt = `Look for sudden new categories or >200% spend spike sustained for 3+ months in the user's data. Format: "We noticed a significant change in your spending around [month/year]. This might indicate [event type: travel, relocation, health event, celebration]. Does this match a life event?" Show max 2 observations.\n\nContext: ${JSON.stringify(fainContext.monthlyTotals)}`;
      const text = await callAlertsAPI(prompt, geminiKey, claudeKey);
      setLifeEventResult(text);
    } catch (e: any) {
      setLifeEventResult('Analysis failed. Check your API key in Settings or try again.');
    } finally {
      setLifeEventLoading(false);
    }
  }, [fainContext, hasKey, geminiKey, claudeKey]);

  return (
    <div className="px-4 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
      {/* A-1: Anomaly detection */}
      {anomalies.length === 0 ? (
        <AlertCard
          featureId="ALERT_ANOMALY"
          title="Anomaly Detection"
          icon="🔍"
          description="No unusual spending spikes detected in any category this month."
          status="NORMAL"
          showFeedback={false}
        />
      ) : (
        anomalies.map((a) => (
          <AlertCard
            key={a.categoryId}
            featureId="ALERT_ANOMALY"
            title={`Spending Spike: ${a.categoryName}`}
            icon="🔍"
            description={`Your ${a.categoryName} spend this month (${formatCurrency(a.currentMonthTotal)}) is ${a.percentAbove.toFixed(0)}% above your 12-month average (${formatCurrency(a.twelveMonthAvg)}).`}
            status={a.status}
          />
        ))
      )}

      {/* A-2: Recurring / Bill reminder */}
      {recurringAlerts.length === 0 ? (
        <AlertCard
          featureId="ALERT_RECURRING"
          title="Bill Reminders"
          icon="🔄"
          description="No overdue recurring payments detected."
          status="NORMAL"
          showFeedback={false}
        />
      ) : (
        recurringAlerts.map((r, i) => (
          <AlertCard
            key={i}
            featureId="ALERT_RECURRING"
            title="Recurring Payment Due"
            icon="🔄"
            description={`Your ${r.description || r.categoryName} payment of ~${formatCurrency(r.approximateAmount)} may be due. Last paid: ${r.lastPaidDate} (${r.daysSinceLastPayment} days ago).`}
            status="WATCH"
          />
        ))
      )}

      {/* A-3: Budget suggestions */}
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span>📋</span>
          <span className="font-medium text-slate-200 flex-1 text-sm">Budget Auto-Suggestion</span>
        </div>
        <p className="text-sm text-slate-400">
          Computes suggested monthly budgets from your 12-month category averages.
        </p>

        <button
          onClick={runBudgetSuggestions}
          disabled={budgetLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm text-white transition"
        >
          {budgetLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {budgetLoading ? 'Computing…' : 'Run'}
        </button>

        {budgetSuggestions.length > 0 && (
          <div className="space-y-2 mt-1">
            {budgetSuggestions.slice(0, 10).map((s, idx) => (
              <div key={s.categoryName} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-slate-300">{s.categoryName}</span>
                {budgetEditingIdx === idx ? (
                  <>
                    <input
                      type="number"
                      value={budgetEditValue}
                      onChange={(e) => setBudgetEditValue(e.target.value)}
                      className="w-24 bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-white outline-none"
                    />
                    <button
                      onClick={() => {
                        acceptBudget(s.categoryName, parseFloat(budgetEditValue) || s.suggested);
                        setBudgetEditingIdx(null);
                      }}
                      className="p-1 text-green-400 hover:text-green-300"
                      title="Save"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={() => setBudgetEditingIdx(null)}
                      className="p-1 text-slate-400 hover:text-slate-300"
                      title="Cancel"
                    >
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-slate-400">{formatCurrency(s.suggested)}/mo</span>
                    <button
                      onClick={() => acceptBudget(s.categoryName, s.suggested)}
                      className="px-2 py-0.5 rounded bg-green-600/80 hover:bg-green-600 text-xs text-white transition"
                      title="Accept"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => { setBudgetEditingIdx(idx); setBudgetEditValue(String(s.suggested)); }}
                      className="px-2 py-0.5 rounded border border-slate-600 hover:border-slate-500 text-xs text-slate-300 transition"
                      title="Edit"
                    >
                      ✎
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* A-4: Lead-Lag Predictive Alert */}
      <AlertCard
        featureId="ALERT_LEAD_LAG"
        title="Lead-Lag Predictive Alert"
        icon="🔮"
        description={leadLagResult ?? 'Run to see upcoming spending predictions based on your historical patterns.'}
        status={leadLagResult ? 'WATCH' : 'NORMAL'}
        onRefresh={hasKey ? runLeadLag : undefined}
        loading={leadLagLoading}
      />

      {/* A-5: Savings Goal */}
      <AlertCard
        featureId="ALERT_SAVINGS"
        title="Savings Goal Suggestion"
        icon="🎯"
        description={savingsResult ?? 'Run to get AI-suggested savings goals based on your monthly surplus.'}
        status={savingsResult ? 'NORMAL' : 'NORMAL'}
        onRefresh={hasKey ? runSavingsGoal : undefined}
        loading={savingsLoading}
      />

      {/* A-6: Life Event Detection */}
      <AlertCard
        featureId="ALERT_LIFE_EVENT"
        title="Life Event Detection"
        icon="🌟"
        description={lifeEventResult ?? 'Run to detect significant changes in your spending that may indicate a life event.'}
        status={lifeEventResult ? 'WATCH' : 'NORMAL'}
        onRefresh={hasKey ? runLifeEvent : undefined}
        loading={lifeEventLoading}
      />

      {!hasKey && (
        <p className="text-xs text-slate-500 text-center">
          Add your Gemini API key in <span className="text-blue-400">⚙️ Settings</span> to unlock AI-powered alerts.
        </p>
      )}
    </div>
  );
}
