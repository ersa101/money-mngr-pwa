'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, Loader2, X } from 'lucide-react';
import { FeedbackButtons } from './FeedbackButtons';

export type AlertStatus = 'NORMAL' | 'WATCH' | 'ALERT';

interface AlertCardProps {
  featureId: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  status?: AlertStatus;
  children?: React.ReactNode;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
  showFeedback?: boolean;
}

const STATUS_STYLES: Record<AlertStatus, { dot: string; badge: string; label: string }> = {
  NORMAL: { dot: 'bg-green-400', badge: 'text-green-400 bg-green-400/10', label: 'Normal' },
  WATCH: { dot: 'bg-yellow-400', badge: 'text-yellow-400 bg-yellow-400/10', label: 'Watch' },
  ALERT: { dot: 'bg-red-400', badge: 'text-red-400 bg-red-400/10', label: 'Alert' },
};

export function AlertCard({
  featureId,
  title,
  icon,
  description,
  status = 'NORMAL',
  children,
  onRefresh,
  loading,
  showFeedback = true,
}: AlertCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    setDismissed(false);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  if (dismissed) return null;

  const styles = STATUS_STYLES[status];

  return (
    <div className={`rounded-xl border bg-slate-800 p-4 space-y-3 relative ${
      status === 'ALERT' ? 'border-red-500/40' :
      status === 'WATCH' ? 'border-yellow-500/40' :
      'border-slate-700'
    }`}>
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 text-slate-500 hover:text-slate-300 transition"
        title="Dismiss"
      >
        <X size={14} />
      </button>

      {/* Title row */}
      <div className="flex items-center gap-2 pr-6">
        <span>{icon}</span>
        <span className="font-medium text-slate-200 flex-1 text-sm">{title}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${styles.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
          {styles.label}
        </span>
      </div>

      <p className="text-sm text-slate-400">{description}</p>

      {children && <div className="text-sm text-slate-300">{children}</div>}

      {(loading || refreshing) && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 size={13} className="animate-spin" />
          Refreshing…
        </div>
      )}

      {/* Actions */}
      {onRefresh && (
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 hover:border-slate-500 text-xs text-slate-300 transition disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      )}

      {showFeedback && (
        <FeedbackButtons
          featureId={featureId}
          insightType="ALERT"
          insightSummary={description}
        />
      )}
    </div>
  );
}
