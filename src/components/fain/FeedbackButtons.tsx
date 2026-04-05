'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useDb } from '@/contexts/DbContext';

interface FeedbackButtonsProps {
  featureId: string;
  insightType: string;
  insightSummary: string;
  categoryContext?: string;
  subcategoryContext?: string;
}

export function FeedbackButtons({
  featureId,
  insightType,
  insightSummary,
  categoryContext,
  subcategoryContext,
}: FeedbackButtonsProps) {
  const db = useDb();
  const [voted, setVoted] = useState<'POSITIVE' | 'NEGATIVE' | null>(null);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = async (response: 'POSITIVE' | 'NEGATIVE', userReason?: string) => {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const entry = {
      timestamp: now.toISOString(),
      featureId,
      insightType,
      insightSummary: insightSummary.slice(0, 200),
      userResponse: response,
      userReason: userReason?.trim() || undefined,
      categoryContext,
      subcategoryContext,
      monthYear,
      syncedToSheet: false,
    };

    try {
      await db?.feedbackLog.add(entry);
      // Fire-and-forget to sheet API
      fetch('/api/fain/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(() => {/* silent — stored in IndexedDB */});
    } catch (_e) {
      // Already stored locally
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (saved) {
    return <span className="text-xs text-green-400">Saved ✓</span>;
  }

  if (voted) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setVoted('POSITIVE'); submit('POSITIVE'); }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-green-400 hover:bg-green-400/10 transition"
          title="Accurate"
        >
          <ThumbsUp size={14} /> Accurate
        </button>
        <button
          onClick={() => { setVoted('NEGATIVE'); setShowReason(true); }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition"
          title="Not accurate"
        >
          <ThumbsDown size={14} /> Not accurate
        </button>
      </div>

      {showReason && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            maxLength={150}
            placeholder="What was wrong? (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="flex-1 text-xs bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-slate-200 placeholder-slate-500 outline-none focus:border-slate-500"
            autoFocus
          />
          <button
            onClick={() => submit('NEGATIVE', reason)}
            className="text-xs px-3 py-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg text-white transition"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
