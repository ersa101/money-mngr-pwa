'use client'

import { useDateFilter } from '@/hooks/useDateFilter'
import { CategoryComposition } from '@/components/stats/CategoryComposition'
import { CategoryTrend } from '@/components/stats/CategoryTrend'
import { SubCategoryTrend } from '@/components/stats/SubCategoryTrend'
import { IncomeVsExpense } from '@/components/stats/IncomeVsExpense'
import { AccountBalanceHistory } from '@/components/stats/AccountBalanceHistory'
import { NetWorth } from '@/components/stats/NetWorth'
import { BarChart3, Calendar } from 'lucide-react'
import { useState } from 'react'
// Phase 2 — Deep Insight Visuals
import { LifestyleInflationCurve } from '@/components/stats/LifestyleInflationCurve'
import { SeasonalHeatmap } from '@/components/stats/SeasonalHeatmap'
import { CorrelationWeb } from '@/components/stats/CorrelationWeb'
import { FinancialIdentityCard } from '@/components/stats/FinancialIdentityCard'
import { FinancialAgeScore } from '@/components/stats/FinancialAgeScore'
import { UncomfortableTruth } from '@/components/stats/UncomfortableTruth'

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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header — sticky so period selector stays visible while scrolling */}
      <div className="sticky top-14 md:top-16 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Stats & Insights</h1>
                <p className="text-sm text-gray-500">
                  Comprehensive financial analytics and trends
                </p>
              </div>
            </div>
          </div>

          {/* Period Filter — scrollable on mobile, wrapping on desktop */}
          <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide md:flex-wrap">
            <span className="text-sm text-gray-500">Period:</span>

            <button
              onClick={() => {
                setPeriod('monthly')
                setShowCustomRange(false)
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded text-sm font-medium transition border ${
                period === 'monthly'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
              }`}
            >
              Monthly
            </button>

            <button
              onClick={() => {
                setPeriod('quarterly')
                setShowCustomRange(false)
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded text-sm font-medium transition border ${
                period === 'quarterly'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
              }`}
            >
              Quarterly
            </button>

            <button
              onClick={() => {
                setPeriod('semi-annual')
                setShowCustomRange(false)
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded text-sm font-medium transition border ${
                period === 'semi-annual'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
              }`}
            >
              Semi-Annual
            </button>

            <button
              onClick={() => {
                setPeriod('annual')
                setShowCustomRange(false)
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded text-sm font-medium transition border ${
                period === 'annual'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
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
                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
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

        {/* ── Phase 2: Deep Insight Visuals ── */}
        <div className="border-t border-gray-200 pt-8">
          <p className="text-xs text-gray-400 mb-6 uppercase tracking-widest">Deep Insights</p>
        </div>

        {/* Feature 15 — Lifestyle Inflation Curve */}
        <LifestyleInflationCurve />

        {/* Feature 16 — Seasonal Heatmap */}
        <SeasonalHeatmap />

        {/* Feature 17 — Correlation Web / Spending DNA */}
        <CorrelationWeb />

        {/* Feature 18 — Financial Identity Card */}
        <FinancialIdentityCard />

        {/* Feature 19 — Financial Age Score */}
        <FinancialAgeScore />

        {/* Feature 20 — The Uncomfortable Truth */}
        <UncomfortableTruth />
      </div>
    </div>
  )
}
