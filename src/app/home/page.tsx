'use client';

import { SafeToSpendCard } from '@/components/home/SafeToSpendCard';
import { BelowThresholdCard } from '@/components/home/BelowThresholdCard';
import { DayOverDayCard } from '@/components/home/DayOverDayCard';
import { BiggestSpendCard } from '@/components/home/BiggestSpendCard';
import { DuplicateDetectorCard } from '@/components/home/DuplicateDetectorCard';
import { SpendComparisons } from '@/components/home/SpendComparisons';

export default function HomePage() {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">BRIEF</h1>
          <span className="text-sm text-gray-400">{today}</span>
        </div>

        {/* Hero — SafeToSpend full width */}
        <SafeToSpendCard />

        {/* BelowThreshold — conditional (card renders nothing if no accounts below threshold) */}
        <BelowThresholdCard />

        {/* 2-col row: BiggestSpend | DayOverDay + DuplicateDetector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BiggestSpendCard />
          <div className="flex flex-col gap-4">
            <DayOverDayCard />
            <DuplicateDetectorCard />
          </div>
        </div>

        {/* 3-col SpendComparisons */}
        <SpendComparisons />
      </div>
    </div>
  );
}
