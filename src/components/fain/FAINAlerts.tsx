'use client';

import { useState, useCallback } from 'react';
import { useDb } from '@/contexts/DbContext';
import { useFAINContext } from '@/hooks/useFAINContext';
import { useAIKeys, type AIKeySlot } from '@/hooks/useAIKeys';
import { useAnomalyDetection } from '@/hooks/useAnomalyDetection';
import { useRecurringDetection } from '@/hooks/useRecurringDetection';
import { AlertCard } from './AlertCard';
import { FeedbackButtons } from './FeedbackButtons';
import { formatCurrency } from '@/lib/currency-utils';
import { Loader2, Play, Check, X } from 'lucide-react';

async function callAlertsAPI(prompt: string, aiKeys: AIKeySlot[]): Promise<string> {
  const res = await fetch('/api/fain/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aiKeys }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Analysis failed. Check your API key in Settings or try again.');
  return data.text;
}

export function FAINAlerts() {
  const db = useDb();
  const fainContext = useFAINContext();
  const { aiKeys } = useAIKeys();
  const anomalies = useAnomalyDetection();
  const recurringAlerts = useRecurringDetection();

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
  const [savingsDismissed, setSavingsDismissed] = useState(false);
  const [lifeEventResult, setLifeEventResult] = useState<string | null>(null);
  const [lifeEventLoading, setLifeEventLoading] = useState(false);
  // A-6: confirm state
  const [lifeEventConfirming, setLifeEventConfirming] = useState(false);
  const [lifeEventText, setLifeEventText] = useState('');

  const runBudgetSuggestions = useCallback(async () => {
    if (!fainContext || !db) return;
    setBudgetLoading(true);
    setBudgetSuggestions([]);
    try {
      const activeMonths = fainContext.monthlyTotals.filter((m) => m.expense > 0).length || 1;
      const suggestions = fainContext.topSubCategories.map((c) => ({
        categoryName: c.name,
        suggested: Math.round(c.total / activeMonths),
      }));
      setBudgetSuggestions(suggestions);
    } finally {
      setBudgetLoading(false);
    }
  }, [fainContext, db]);

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

  const saveGoal = useCallback(async (name: string, targetAmount: number) => {
    if (!db) return;
    await db.goals.add({
      name,
      targetAmount,
      currentAmount: 0,
      suggestedByAI: true,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
    });
    setSavingsDismissed(true);
  }, [db]);

  const saveLifeEvent = useCallback(async () => {
    if (!db || !lifeEventResult) return;
    await db.lifeEvents.add({
      detectedMonth: new Date().toISOString().slice(0, 7),
      eventType: lifeEventText.trim() || 'Unspecified',
      aiSummary: lifeEventResult.slice(0, 300),
      confirmedByUser: true,
      createdAt: new Date().toISOString(),
    });
    setLifeEventConfirming(false);
    setLifeEventText('');
    setLifeEventResult('Event saved to your life events log.');
  }, [db, lifeEventResult, lifeEventText]);

  const runLeadLag = useCallback(async () => {
    if (!fainContext) return;
    setLeadLagLoading(true);
    try {
      const prompt = `Based on the user's category spend by month pattern below, identify 2-3 upcoming predictions: "Based on your pattern, [category] spend typically rises in [upcoming month]. Last year it was ₹X. Heads up." Only show predictions for the next 2 months.\n\nContext: ${JSON.stringify(fainContext.monthlyTotals)}`;
      const text = await callAlertsAPI(prompt, aiKeys);
      setLeadLagResult(text);
    } catch (e: any) {
      setLeadLagResult('Analysis failed. Check your API key in Settings or try again.');
    } finally {
      setLeadLagLoading(false);
    }
  }, [fainContext, aiKeys]);

  const runSavingsGoal = useCallback(async () => {
    if (!fainContext) return;
    setSavingsLoading(true);
    try {
      const prompt = `Calculate the user's average monthly surplus (income - expense) over the last 6 months. Then suggest 2 savings goals based on their spending patterns. Format: "You typically have ₹X surplus monthly. Here are 2 suggested savings goals: [Goal 1 with target amount], [Goal 2 with target amount]".\n\nContext: ${JSON.stringify(fainContext.monthlyTotals)}`;
      const text = await callAlertsAPI(prompt, aiKeys);
      setSavingsResult(text);
    } catch (e: any) {
      setSavingsResult('Analysis failed. Check your API key in Settings or try again.');
    } finally {
      setSavingsLoading(false);
    }
  }, [fainContext, aiKeys]);

  const runLifeEvent = useCallback(async () => {
    if (!fainContext) return;
    setLifeEventLoading(true);
    try {
      const prompt = `Look for sudden new categories or >200% spend spike sustained for 3+ months in the user's data. Format: "We noticed a significant change in your spending around [month/year]. This might indicate [event type: travel, relocation, health event, celebration]. Does this match a life event?" Show max 2 observations.\n\nContext: ${JSON.stringify(fainContext.monthlyTotals)}`;
      const text = await callAlertsAPI(prompt, aiKeys);
      setLifeEventResult(text);
    } catch (e: any) {
      setLifeEventResult('Analysis failed. Check your API key in Settings or try again.');
    } finally {
      setLifeEventLoading(false);
    }
  }, [fainContext, aiKeys]);

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
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span>📋</span>
          <span className="font-medium text-gray-800 flex-1 text-sm">Budget Auto-Suggestion</span>
        </div>
        <p className="text-sm text-gray-500">
          Computes suggested monthly budgets from your 12-month sub-category averages (excluding zero-spend months).
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
                <span className="flex-1 text-gray-700">{s.categoryName}</span>
                {budgetEditingIdx === idx ? (
                  <>
                    <input
                      type="number"
                      value={budgetEditValue}
                      onChange={(e) => setBudgetEditValue(e.target.value)}
                      className="w-24 bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 outline-none"
                    />
                    <button
                      onClick={() => {
                        acceptBudget(s.categoryName, parseFloat(budgetEditValue) || s.suggested);
                        setBudgetSuggestions((prev) => prev.filter((_, i) => i !== idx));
                        setBudgetEditingIdx(null);
                      }}
                      className="p-1 text-green-600 hover:text-green-700"
                      title="Save"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={() => setBudgetEditingIdx(null)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Cancel"
                    >
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-gray-500">{formatCurrency(s.suggested)}/mo</span>
                    <button
                      onClick={() => { acceptBudget(s.categoryName, s.suggested); setBudgetSuggestions((prev) => prev.filter((_, i) => i !== idx)); }}
                      className="px-2 py-0.5 rounded bg-green-600/80 hover:bg-green-600 text-xs text-white transition"
                      title="Accept"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => { setBudgetEditingIdx(idx); setBudgetEditValue(String(s.suggested)); }}
                      className="px-2 py-0.5 rounded border border-gray-200 hover:border-gray-300 text-xs text-gray-600 transition"
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

        {budgetSuggestions.length > 0 && (
          <FeedbackButtons
            featureId="ALERT_BUDGET_SUGGESTION"
            insightType="BUDGET_SUGGESTION"
            insightSummary={budgetSuggestions.map((s) => `${s.categoryName}: ${formatCurrency(s.suggested)}/mo`).join(', ')}
          />
        )}
      </div>

      {/* A-4: Lead-Lag Predictive Alert */}
      <AlertCard
        featureId="ALERT_LEAD_LAG"
        title="Lead-Lag Predictive Alert"
        icon="🔮"
        description={leadLagResult ?? 'Run to see upcoming spending predictions based on your historical patterns.'}
        status={leadLagResult ? 'WATCH' : 'NORMAL'}
        onRefresh={runLeadLag}
        loading={leadLagLoading}
      />

      {/* A-5: Savings Goal */}
      {!savingsDismissed && (
        <AlertCard
          featureId="ALERT_SAVINGS"
          title="Savings Goal Suggestion"
          icon="🎯"
          description={savingsResult ?? 'Run to get AI-suggested savings goals based on your monthly surplus.'}
          status="NORMAL"
          onRefresh={runSavingsGoal}
          loading={savingsLoading}
        >
          {savingsResult && (
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={() => saveGoal('AI Savings Goal', 0)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-600 text-xs text-white transition"
              >
                <Check size={13} /> Accept Goal
              </button>
              <button
                onClick={() => setSavingsDismissed(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-xs text-gray-600 transition"
              >
                <X size={13} /> Dismiss
              </button>
            </div>
          )}
        </AlertCard>
      )}

      {/* A-6: Life Event Detection */}
      <AlertCard
        featureId="ALERT_LIFE_EVENT"
        title="Life Event Detection"
        icon="🌟"
        description={lifeEventResult ?? 'Run to detect significant changes in your spending that may indicate a life event.'}
        status={lifeEventResult ? 'WATCH' : 'NORMAL'}
        onRefresh={runLifeEvent}
        loading={lifeEventLoading}
      >
        {lifeEventResult && !lifeEventConfirming && (
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              onClick={() => setLifeEventConfirming(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-xs text-white transition"
            >
              <Check size={13} /> Yes, this matches
            </button>
            <button
              onClick={() => setLifeEventResult(null)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-xs text-gray-600 transition"
            >
              <X size={13} /> No, dismiss
            </button>
          </div>
        )}
        {lifeEventConfirming && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-gray-500">What was this life event?</p>
            <input
              type="text"
              maxLength={100}
              placeholder="e.g. Wedding, Relocation, New job…"
              value={lifeEventText}
              onChange={(e) => setLifeEventText(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={saveLifeEvent}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-600 text-xs text-white transition"
              >
                <Check size={13} /> Save
              </button>
              <button
                onClick={() => setLifeEventConfirming(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 transition hover:border-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </AlertCard>

    </div>
  );
}
