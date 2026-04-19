'use client';

import { useState, useCallback, useRef } from 'react';
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
  NORMAL: { dot: 'bg-green-500', badge: 'text-green-600 bg-green-50', label: 'Normal' },
  WATCH: { dot: 'bg-amber-500', badge: 'text-amber-600 bg-amber-50', label: 'Watch' },
  ALERT: { dot: 'bg-red-500', badge: 'text-red-600 bg-red-50', label: 'Alert' },
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
  const touchStartX = useRef<number | null>(null);

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

  // Swipe-to-dismiss: detect horizontal swipe > 80px
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 80) setDismissed(true);
    touchStartX.current = null;
  };

  if (dismissed) return null;

  const styles = STATUS_STYLES[status];

  return (
    <div
      className={`rounded-xl border bg-white p-4 space-y-3 relative ${
        status === 'ALERT' ? 'border-red-200' :
        status === 'WATCH' ? 'border-amber-200' :
        'border-gray-200'
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition"
        title="Dismiss"
      >
        <X size={14} />
      </button>

      {/* Title row */}
      <div className="flex items-center gap-2 pr-6">
        <span>{icon}</span>
        <span className="font-medium text-gray-800 flex-1 text-sm">{title}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${styles.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
          {styles.label}
        </span>
      </div>

      <p className="text-sm text-gray-600">{description}</p>

      {children && <div className="text-sm text-gray-700">{children}</div>}

      {(loading || refreshing) && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 size={13} className="animate-spin" />
          Refreshing…
        </div>
      )}

      {/* Actions */}
      {onRefresh && (
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-xs text-gray-600 transition disabled:opacity-50"
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
          onNegativeFeedback={() => setDismissed(true)}
        />
      )}
    </div>
  );
}
