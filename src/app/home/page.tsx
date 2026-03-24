'use client';

import { SafeToSpendCard } from '@/components/home/SafeToSpendCard';
import { DayOverDayCard } from '@/components/home/DayOverDayCard';
import { BiggestSpendCard } from '@/components/home/BiggestSpendCard';
import { DuplicateDetectorCard } from '@/components/home/DuplicateDetectorCard';
import { Home } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Home className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Overview</h1>
        </div>

        <div className="space-y-4">
          <SafeToSpendCard />
          <DayOverDayCard />
          <BiggestSpendCard />
          <DuplicateDetectorCard />
        </div>
      </div>
    </div>
  );
}
