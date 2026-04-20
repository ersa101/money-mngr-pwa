'use client'

import { useMemo, useRef, useState } from 'react'
import { useDb } from '@/contexts/DbContext'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ── Bucket configuration ──────────────────────────────────────────────────────
const BUCKET_META = [
  {
    key: 'LIFE_ESSENTIALS',
    label: 'Life essentials',
    emoji: '🏠',
    keywords: ['rent', 'groceries', 'grocery', 'utilities', 'utility', 'bills', 'bill', 'food', 'electricity', 'water', 'gas', 'internet', 'mobile', 'recharge'],
  },
  {
    key: 'PEOPLE_SOCIAL',
    label: 'People & social',
    emoji: '🥂',
    keywords: ['friends', 'family', 'meetups', 'meetup', 'gifts', 'gift', 'eating out', 'restaurant', 'dining', 'party', 'social', 'entertainment'],
  },
  {
    key: 'TRANSPORT',
    label: 'Transport',
    emoji: '🚗',
    keywords: ['auto', 'bike', 'metro', 'train', 'bus', 'flight', 'uber', 'ola', 'cab', 'taxi', 'fuel', 'petrol', 'toll', 'parking', 'transport'],
  },
  {
    key: 'YOURSELF',
    label: 'Yourself',
    emoji: '🧘',
    keywords: ['clothing', 'clothes', 'health', 'grooming', 'gym', 'calm', 'wellness', 'spa', 'haircut', 'personal', 'shopping', 'amazon', 'flipkart'],
  },
  {
    key: 'SAVINGS_INVEST',
    label: 'Savings & invest',
    emoji: '💾',
    keywords: ['investment', 'invest', 'stock', 'stocks', 'mf', 'mutual fund', 'insurance', 'sip', 'emi', 'savings', 'fd', 'ppf', 'nps'],
  },
] as const

type BucketKey = typeof BUCKET_META[number]['key']

function assignBucket(categoryName: string, subCategoryName?: string): BucketKey | null {
  const haystack = `${categoryName} ${subCategoryName ?? ''}`.toLowerCase()
  for (const bucket of BUCKET_META) {
    if (bucket.keywords.some((kw) => haystack.includes(kw))) {
      return bucket.key
    }
  }
  return null
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

interface BucketStat {
  key: BucketKey
  label: string
  emoji: string
  amount: number
  pct: number
}

export function FinancialIdentityCard() {
  const db = useDb()
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)

  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const stats = useMemo(() => {
    if (!transactions || !categories) return null

    const catMap = new Map(categories.filter(Boolean).map((c) => [c.id!, c.name]))
    const subCatMap = new Map(categories.filter(Boolean).map((c) => [c.id!, c.name]))

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentYearMonths = new Set(
      Array.from({ length: now.getMonth() + 1 }, (_, i) => `${currentYear}-${String(i + 1).padStart(2, '0')}`)
    )
    const lastYear = currentYear - 1
    const lastYearMonths = new Set(
      Array.from({ length: 12 }, (_, i) => `${lastYear}-${String(i + 1).padStart(2, '0')}`)
    )

    // Use last 12 months if current year < 6 months old (i.e., before July)
    const useLast12 = now.getMonth() < 5
    const targetMonths = useLast12
      ? new Set(
          Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now)
            d.setMonth(d.getMonth() - 11 + i)
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          })
        )
      : currentYearMonths

    const yearLabel = useLast12 ? 'Last 12 Months' : String(currentYear)

    let totalExpense = 0
    let totalIncome = 0
    let lastYearExpense = 0
    let lastYearIncome = 0
    const bucketAmounts: Record<BucketKey, number> = {
      LIFE_ESSENTIALS: 0, PEOPLE_SOCIAL: 0, TRANSPORT: 0, YOURSELF: 0, SAVINGS_INVEST: 0,
    }

    for (const t of transactions.filter(Boolean)) {
      const month = t.date.slice(0, 7)
      const catName = t.categoryId ? catMap.get(t.categoryId) ?? '' : ''
      const subCatName = t.subCategoryId ? subCatMap.get(t.subCategoryId) : undefined

      if (targetMonths.has(month)) {
        if (t.transactionType === 'EXPENSE') {
          totalExpense += t.amount
          const bucket = assignBucket(catName, subCatName)
          if (bucket) bucketAmounts[bucket] += t.amount
        } else if (t.transactionType === 'INCOME') {
          totalIncome += t.amount
        }
      }

      if (lastYearMonths.has(month)) {
        if (t.transactionType === 'EXPENSE') lastYearExpense += t.amount
        else if (t.transactionType === 'INCOME') lastYearIncome += t.amount
      }
    }

    const days = useLast12 ? 365 : (now.getMonth() + 1) * 30
    const dailySpend = totalExpense / Math.max(days, 1)

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
    const lastYearSavingsRate = lastYearIncome > 0
      ? ((lastYearIncome - lastYearExpense) / lastYearIncome) * 100
      : 0

    // Compute bucket percentages (of total expense)
    const bucketStats: BucketStat[] = BUCKET_META.map((b) => ({
      key: b.key,
      label: b.label,
      emoji: b.emoji,
      amount: bucketAmounts[b.key],
      pct: totalExpense > 0 ? Math.round((bucketAmounts[b.key] / totalExpense) * 100) : 0,
    }))

    return { yearLabel, totalExpense, totalIncome, dailySpend, savingsRate, lastYearSavingsRate, bucketStats }
  }, [transactions, categories])

  const handleShare = async () => {
    if (!cardRef.current) return
    setSharing(true)
    try {
      // Dynamic import to keep bundle lean
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = 'financial-identity.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      // silently fail — share is non-critical
    } finally {
      setSharing(false)
    }
  }

  if (!stats) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse h-64" />
    )
  }

  const trendDelta = stats.savingsRate - stats.lastYearSavingsRate
  const TrendIcon = trendDelta > 0 ? TrendingUp : trendDelta < 0 ? TrendingDown : Minus
  const trendColor = trendDelta > 0 ? 'text-emerald-600' : trendDelta < 0 ? 'text-red-600' : 'text-gray-500'
  const trendLabel = trendDelta > 0 ? 'Improving' : trendDelta < 0 ? 'Declining' : 'Stable'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Financial Identity Card</h3>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600 transition disabled:opacity-50"
        >
          <Camera className="w-3.5 h-3.5" />
          {sharing ? 'Saving…' : 'Share'}
        </button>
      </div>

      {/* The shareable card — amounts hidden in share image, only percentages shown */}
      <div ref={cardRef} className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">Your Financial Identity</p>
          <p className="text-xs text-gray-400">{stats.yearLabel}</p>
        </div>

        {/* Spend summary — hidden in share */}
        <div className="mb-5 share-hide">
          <p className="text-2xl font-bold text-gray-900">{formatINR(Math.round(stats.totalExpense))}</p>
          <p className="text-xs text-gray-500 mt-0.5">spent · {formatINR(Math.round(stats.dailySpend))} per day</p>
        </div>

        {/* Where money went — percentages only (safe to share) */}
        <p className="text-xs text-gray-500 mb-3 font-medium">Where your money went:</p>
        <div className="space-y-2 mb-5">
          {stats.bucketStats
            .filter((b) => b.pct > 0)
            .sort((a, b) => b.pct - a.pct)
            .map((b) => (
              <div key={b.key} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{b.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-gray-700">{b.label}</span>
                    <span className="text-xs font-semibold text-gray-900">{b.pct}%</span>
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Savings rate */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Savings rate</p>
              <p className="text-xl font-bold text-gray-900">{stats.savingsRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-400">
                Last year: {stats.lastYearSavingsRate.toFixed(1)}%
              </p>
            </div>
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{trendLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
