'use client';

import { useState, useCallback } from 'react';
import { Play, Loader2, Save, Download, Clock } from 'lucide-react';
import { FeedbackButtons } from './FeedbackButtons';

interface InsightCardProps {
  featureId: string;
  insightType: string;
  title: string;
  icon: React.ReactNode;
  onRun: () => Promise<string>;
}

export function InsightCard({ featureId, insightType, title, icon, onRun }: InsightCardProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDisabled(true);
    try {
      const text = await onRun();
      setResult(text);
      setLastRun(new Date());
    } catch (e: any) {
      setError(e.message ?? 'Analysis failed. Check your API key in Settings or try again.');
    } finally {
      setLoading(false);
      // Re-enable button after 30s
      setTimeout(() => setDisabled(false), 30_000);
    }
  }, [onRun]);

  const downloadTxt = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${featureId}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
      {/* Title row */}
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="font-medium text-slate-200 flex-1">{title}</span>
        {lastRun && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock size={11} />
            {lastRun.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900 rounded-lg p-3">
          {result}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{error}</div>
      )}

      {!lastRun && !loading && (
        <p className="text-xs text-slate-500">Never run — click ▶ Run to analyse</p>
      )}

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={run}
          disabled={loading || disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white font-medium transition"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Analysing…
            </>
          ) : (
            <>
              <Play size={14} />
              Run
            </>
          )}
        </button>

        {result && (
          <>
            <button
              onClick={downloadTxt}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-600 hover:border-slate-500 text-xs text-slate-300 transition"
              title="Download"
            >
              <Download size={13} /> Download
            </button>
          </>
        )}
      </div>

      {/* Feedback */}
      {result && (
        <FeedbackButtons
          featureId={featureId}
          insightType={insightType}
          insightSummary={result}
        />
      )}
    </div>
  );
}
