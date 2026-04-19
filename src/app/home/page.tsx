'use client';

import { SafeToSpendCard } from '@/components/home/SafeToSpendCard';
import { BelowThresholdCard } from '@/components/home/BelowThresholdCard';
import { DayOverDayCard } from '@/components/home/DayOverDayCard';
import { BiggestSpendCard } from '@/components/home/BiggestSpendCard';
import { DuplicateDetectorCard } from '@/components/home/DuplicateDetectorCard';
import { Home } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Home className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Overview</h1>
        </div>

        {/* SafeToSpendCard: always full-width — most important number on the page */}
        <div className="mb-4">
          <SafeToSpendCard />
        </div>

        <div className="mb-4">
          <BelowThresholdCard />
        </div>

        {/* Remaining cards: 1-col on mobile, 2-col on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DayOverDayCard />
          <BiggestSpendCard />
          <DuplicateDetectorCard />
        </div>
      </div>
    </div>
  );
}
