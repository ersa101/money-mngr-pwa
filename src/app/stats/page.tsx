'use client'

import { useDateFilter } from '@/hooks/useDateFilter'
import { CategoryComposition } from '@/components/stats/CategoryComposition'
import { CategoryTrend } from '@/components/stats/CategoryTrend'
import { SubCategoryTrend } from '@/components/stats/SubCategoryTrend'
import { IncomeVsExpense } from '@/components/stats/IncomeVsExpense'
import { AccountBalanceHistory } from '@/components/stats/AccountBalanceHistory'
import { NetWorth } from '@/components/stats/NetWorth'
// Phase 2 deep insight components
import { LifestyleInflationCurve } from '@/components/stats/LifestyleInflationCurve'
import { SeasonalHeatmap } from '@/components/stats/SeasonalHeatmap'
import { CorrelationWeb } from '@/components/stats/CorrelationWeb'
import { FinancialIdentityCard } from '@/components/stats/FinancialIdentityCard'
import { FinancialAgeScore } from '@/components/stats/FinancialAgeScore'
import { UncomfortableTruth } from '@/components/stats/UncomfortableTruth'
import { BarChart3, Calendar } from 'lucide-react'
import { useState } from 'react'

export default function StatsPage() {
  const {
    period,
    setPeriod,
    dateRange,
    customRange,
    setCustomRange,
    formatDate,
  } = useDateFilter()

  const [showCustomRange, setShowCustomRange] = useState(false)
  const [categoryClick, setCategoryClick] = useState<{ name: string; type: 'EXPENSE' | 'INCOME'; _t: number } | null>(null)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header — sticky so period selector stays visible while scrolling */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-6">
          <div className="flex items-center justify-between mb-3 md:mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <BarChart3 className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Stats & Insights</h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                  Comprehensive financial analytics and trends
                </p>
              </div>
            </div>
          </div>

          {/* Period Filter — horizontally scrollable on mobile */}
          <div className="flex overflow-x-auto gap-2 items-center pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <span className="text-sm text-muted-foreground">Period:</span>

            <button
              onClick={() => {
                setPeriod('monthly')
                setShowCustomRange(false)
              }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition border ${
                period === 'monthly'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary/50 text-foreground'
              }`}
            >
              Monthly
            </button>

            <button
              onClick={() => {
                setPeriod('quarterly')
                setShowCustomRange(false)
              }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition border ${
                period === 'quarterly'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary/50 text-foreground'
              }`}
            >
              Quarterly
            </button>

            <button
              onClick={() => {
                setPeriod('semi-annual')
                setShowCustomRange(false)
              }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition border ${
                period === 'semi-annual'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary/50 text-foreground'
              }`}
            >
              Semi-Annual
            </button>

            <button
              onClick={() => {
                setPeriod('annual')
                setShowCustomRange(false)
              }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition border ${
                period === 'annual'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary/50 text-foreground'
              }`}
            >
              Annual
            </button>

            <button
              onClick={() => {
                setPeriod('custom')
                setShowCustomRange(!showCustomRange)
              }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition border flex items-center gap-1 ${
                period === 'custom'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary/50 text-foreground'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Custom
            </button>

            {/* Current Range Display */}
            <div className="ml-auto">
              <div className="text-sm text-muted-foreground">
                {formatDate(dateRange.startDate)} → {formatDate(dateRange.endDate)}
              </div>
            </div>
          </div>

          {/* Custom Range Picker */}
          {showCustomRange && period === 'custom' && (
            <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customRange.startDate.toISOString().split('T')[0]}
                    onChange={(e) =>
                      setCustomRange({
                        ...customRange,
                        startDate: new Date(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <input
                    type="date"
                    value={customRange.endDate.toISOString().split('T')[0]}
                    onChange={(e) =>
                      setCustomRange({
                        ...customRange,
                        endDate: new Date(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Net Worth - Full Width */}
        <NetWorth dateRange={dateRange} period={period} />

        {/* Income vs Expense - Full Width */}
        <IncomeVsExpense dateRange={dateRange} />

        {/* Category Composition - Expense & Income Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CategoryComposition
            dateRange={dateRange}
            type="EXPENSE"
            onCategoryClick={(name) => setCategoryClick({ name, type: 'EXPENSE', _t: Date.now() })}
          />
          <CategoryComposition
            dateRange={dateRange}
            type="INCOME"
            onCategoryClick={(name) => setCategoryClick({ name, type: 'INCOME', _t: Date.now() })}
          />
        </div>

        {/* Category Trend - Full Width */}
        <CategoryTrend dateRange={dateRange} categoryClick={categoryClick} />

        {/* Sub-Category Trend - Full Width */}
        <SubCategoryTrend dateRange={dateRange} />

        {/* Account Balance History - Full Width */}
        <AccountBalanceHistory dateRange={dateRange} />

        {/* ── Phase 2: Deep Financial Insight Visuals ─────────────────── */}
        <div className="pt-4 border-t border-slate-700">
          <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-6">
            Deep Insights — Based on All Available Data
          </h2>

          <div className="space-y-8">
            {/* Feature 15 — Lifestyle Inflation Curve */}
            <LifestyleInflationCurve />

            {/* Feature 16 — Seasonal Heatmap */}
            <SeasonalHeatmap />

            {/* Feature 17 — Correlation Web / Spending DNA */}
            <CorrelationWeb />

            {/* Feature 18 & 19 — Identity Card + Age Score side by side on large screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <FinancialIdentityCard />
              <FinancialAgeScore />
            </div>

            {/* Feature 20 — The Uncomfortable Truth */}
            <UncomfortableTruth />
          </div>
        </div>
      </div>
    </div>
  )
}
