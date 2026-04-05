'use client'

import { useMemo, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { Camera } from 'lucide-react'

type BucketKey = 'LIFE_ESSENTIALS' | 'PEOPLE_SOCIAL' | 'TRANSPORT' | 'YOURSELF' | 'SAVINGS_INVEST'

const BUCKET_META: Record<BucketKey, { label: string; emoji: string; color: string }> = {
  LIFE_ESSENTIALS: { label: 'Life essentials', emoji: '🏠', color: '#10b981' },
  PEOPLE_SOCIAL:   { label: 'People & social', emoji: '👥', color: '#6366f1' },
  TRANSPORT:       { label: 'Transport',        emoji: '🚗', color: '#f59e0b' },
  YOURSELF:        { label: 'Yourself',         emoji: '🧘', color: '#8b5cf6' },
  SAVINGS_INVEST:  { label: 'Savings & invest', emoji: '💾', color: '#06b6d4' },
}

const BUCKET_KEYWORDS: Record<BucketKey, string[]> = {
  LIFE_ESSENTIALS: ['rent', 'groceries', 'grocery', 'utilities', 'bills', 'bill', 'food', 'electricity', 'water', 'gas', 'mobile', 'internet'],
  PEOPLE_SOCIAL:   ['friends', 'family', 'meetup', 'gifts', 'gift', 'eating out', 'restaurant', 'party', 'social', 'dining'],
  TRANSPORT:       ['auto', 'bike', 'metro', 'train', 'bus', 'flight', 'cab', 'uber', 'ola', 'petrol', 'fuel', 'transport', 'travel'],
  YOURSELF:        ['clothing', 'clothes', 'health', 'grooming', 'entertainment', 'calm', 'gym', 'fitness', 'shopping', 'personal'],
  SAVINGS_INVEST:  ['investment', 'invest', 'stock', 'stocks', 'mf', 'mutual fund', 'insurance', 'sip', 'fd', 'ppf', 'nps'],
}

function assignBucket(name: string): BucketKey | null {
  const lower = name.toLowerCase()
  for (const [bucket, keywords] of Object.entries(BUCKET_KEYWORDS) as [BucketKey, string[]][]) {
    if (keywords.some((kw) => lower.includes(kw))) return bucket
  }
  return null
}

function formatINR(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`
  return `₹${v.toFixed(0)}`
}

function getYearRange(): { start: string; end: string; year: number } {
  const now = new Date()
  const year = now.getFullYear()
  // Use last 12 months if current year < 6 months complete
  if (now.getMonth() < 6) {
    return {
      start: `${year - 1}-01-01`,
      end: `${year - 1}-12-31`,
      year: year - 1,
    }
  }
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    year,
  }
}

export function FinancialIdentityCard() {
  const cardRef = useRef<HTMLDivElement>(null)
  const { start, end, year } = useMemo(getYearRange, [])

  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const data = useMemo(() => {
    if (!transactions || !categories) return null

    const catMap = new Map(categories.map((c) => [c.id!, c.name]))

    const yearTxns = transactions.filter(
      (t) => t.date >= start && t.date <= end
    )
    const prevYearTxns = transactions.filter(
      (t) => t.date >= `${year - 1}-01-01` && t.date <= `${year - 1}-12-31`
    )

    const totalExpense = yearTxns
      .filter((t) => t.transactionType === 'EXPENSE')
      .reduce((s, t) => s + t.amount, 0)

    const totalIncome = yearTxns
      .filter((t) => t.transactionType === 'INCOME')
      .reduce((s, t) => s + t.amount, 0)

    const prevIncome = prevYearTxns
      .filter((t) => t.transactionType === 'INCOME')
      .reduce((s, t) => s + t.amount, 0)
    const prevExpense = prevYearTxns
      .filter((t) => t.transactionType === 'EXPENSE')
      .reduce((s, t) => s + t.amount, 0)

    const savingsRate = totalIncome > 0
      ? ((totalIncome - totalExpense) / totalIncome) * 100
      : 0
    const prevSavingsRate = prevIncome > 0
      ? ((prevIncome - prevExpense) / prevIncome) * 100
      : 0

    const days = Math.max(
      1,
      Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
    )
    const perDay = totalExpense / days

    // Bucket breakdown
    const bucketTotals: Record<BucketKey, number> = {
      LIFE_ESSENTIALS: 0, PEOPLE_SOCIAL: 0, TRANSPORT: 0, YOURSELF: 0, SAVINGS_INVEST: 0,
    }
    let bucketed = 0

    for (const t of yearTxns) {
      if (t.transactionType !== 'EXPENSE') continue
      const catName = t.categoryId ? catMap.get(t.categoryId) ?? '' : ''
      const bucket = assignBucket(catName)
      if (bucket) {
        bucketTotals[bucket] += t.amount
        bucketed += t.amount
      }
    }

    const buckets = (Object.keys(BUCKET_META) as BucketKey[]).map((key) => ({
      key,
      ...BUCKET_META[key],
      amount: bucketTotals[key],
      pct: bucketed > 0 ? Math.round((bucketTotals[key] / bucketed) * 100) : 0,
    })).filter((b) => b.amount > 0)

    return { totalExpense, totalIncome, perDay, savingsRate, prevSavingsRate, buckets, year }
  }, [transactions, categories, start, end, year])

  const handleShare = async () => {
    if (!cardRef.current) return
    try {
      // Dynamically import html2canvas only when needed
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
      })
      const link = document.createElement('a')
      link.download = `financial-identity-${data?.year ?? ''}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch {
      console.error('html2canvas not available — install it with: npm install html2canvas')
    }
  }

  if (!data) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
          Loading financial identity…
        </div>
      </div>
    )
  }

  const savingsTrend = data.savingsRate >= data.prevSavingsRate

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">Financial Identity</h3>
          <p className="text-xs text-slate-400 mt-0.5">Based on all available data</p>
        </div>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition"
        >
          <Camera className="w-3.5 h-3.5" />
          Share
        </button>
      </div>

      {/* Card (shareable area — no amounts shown in share, only percentages visible) */}
      <div
        ref={cardRef}
        className="bg-slate-900 rounded-xl border border-slate-700 p-5"
      >
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">
          YOUR FINANCIAL IDENTITY — {data.year}
        </p>

        <div className="mb-4">
          <p className="text-sm text-slate-300">
            You spent <span className="text-white font-semibold">{formatINR(data.totalExpense)}</span> this year
          </p>
          <p className="text-sm text-slate-300 mt-0.5">
            That's <span className="text-white font-semibold">{formatINR(data.perDay)}</span> per day
          </p>
        </div>

        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Where your money went</p>
        <div className="space-y-2 mb-4">
          {data.buckets.map((b) => (
            <div key={b.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{b.emoji}</span>
                <span className="text-sm text-slate-300">{b.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${b.pct}%`, background: b.color }}
                  />
                </div>
                <span className="text-sm font-semibold text-white w-8 text-right">{b.pct}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-700 pt-3">
          <p className="text-sm text-slate-300">
            You saved{' '}
            <span className="font-semibold text-white">{data.savingsRate.toFixed(1)}%</span> of income
          </p>
          <p className="text-sm text-slate-400 mt-0.5">
            Last year: {data.prevSavingsRate.toFixed(1)}%
          </p>
          <p className={`text-sm font-medium mt-1 ${savingsTrend ? 'text-emerald-400' : 'text-red-400'}`}>
            {savingsTrend ? '↑ Improving' : '↓ Declining'}
          </p>
        </div>
      </div>
    </div>
  )
}
