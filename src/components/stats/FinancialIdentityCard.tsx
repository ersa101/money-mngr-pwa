'use client'

import { useMemo, useRef, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'
import { CreditCard, Share2 } from 'lucide-react'
import type { CategoryBucket } from '@/types/database'

// ── Bucket config ─────────────────────────────────────────────────────────────
type BucketKey = 'LIFE_ESSENTIALS' | 'PEOPLE_SOCIAL' | 'TRANSPORT' | 'YOURSELF' | 'SAVINGS_INVEST'

const BUCKET_LABELS: Record<BucketKey, string> = {
  LIFE_ESSENTIALS: 'Life essentials',
  PEOPLE_SOCIAL: 'People & social',
  TRANSPORT: 'Transport',
  YOURSELF: 'Yourself',
  SAVINGS_INVEST: 'Savings & invest',
}

const BUCKET_ICONS: Record<BucketKey, string> = {
  LIFE_ESSENTIALS: '🏠',
  PEOPLE_SOCIAL: '👥',
  TRANSPORT: '🚗',
  YOURSELF: '🧘',
  SAVINGS_INVEST: '💾',
}

const DEFAULT_BUCKET_KEYWORDS: Record<BucketKey, string[]> = {
  LIFE_ESSENTIALS: ['rent', 'groceries', 'utilities', 'bills', 'food', 'electricity', 'water', 'gas'],
  PEOPLE_SOCIAL: ['friends', 'family', 'meetup', 'gift', 'eating out', 'dining', 'social', 'party'],
  TRANSPORT: ['auto', 'bike', 'metro', 'train', 'bus', 'flight', 'cab', 'petrol', 'fuel', 'commute'],
  YOURSELF: ['clothing', 'health', 'grooming', 'entertainment', 'calm', 'fitness', 'gym', 'beauty'],
  SAVINGS_INVEST: ['investment', 'stock', 'mf', 'mutual fund', 'insurance', 'savings', 'sip', 'epf'],
}

function guessBucket(catName: string, overrides: CategoryBucket[]): BucketKey {
  const override = overrides.find(
    (o) => o.categoryName.toLowerCase() === catName.toLowerCase()
  )
  if (override) return override.bucketName

  const lower = catName.toLowerCase()
  for (const [bucket, keywords] of Object.entries(DEFAULT_BUCKET_KEYWORDS) as [BucketKey, string[]][]) {
    if (keywords.some((kw) => lower.includes(kw))) return bucket
  }
  return 'YOURSELF'
}

// ── Canvas-based share image (no html2canvas dependency) ──────────────────────
function generateShareCanvas(
  year: string,
  buckets: { key: BucketKey; pct: number }[],
  savingsRate: number,
  prevSavingsRate: number | null
): HTMLCanvasElement {
  const W = 600, H = 400
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, W, H)

  // Border gradient
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, W - 2, H - 2)

  // Title
  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 13px monospace'
  ctx.fillText(`YOUR FINANCIAL IDENTITY — ${year}`, 40, 52)

  // Divider
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(40, 70)
  ctx.lineTo(W - 40, 70)
  ctx.stroke()

  // Subtitle
  ctx.fillStyle = '#64748b'
  ctx.font = '12px sans-serif'
  ctx.fillText('Where your money went:', 40, 96)

  // Buckets (percentages only — no amounts for privacy)
  let y = 118
  for (const { key, pct } of buckets) {
    ctx.fillStyle = '#f1f5f9'
    ctx.font = '14px sans-serif'
    ctx.fillText(`${BUCKET_ICONS[key]}  ${BUCKET_LABELS[key]}`, 40, y)
    ctx.fillStyle = '#6366f1'
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText(`${pct.toFixed(1)}%`, W - 80, y)
    y += 26
  }

  // Divider
  y += 4
  ctx.strokeStyle = '#334155'
  ctx.beginPath()
  ctx.moveTo(40, y)
  ctx.lineTo(W - 40, y)
  ctx.stroke()
  y += 20

  // Savings line
  ctx.fillStyle = '#94a3b8'
  ctx.font = '13px sans-serif'
  ctx.fillText(`You saved ${savingsRate.toFixed(1)}% of income`, 40, y)
  if (prevSavingsRate !== null) {
    y += 20
    const improving = savingsRate >= prevSavingsRate
    ctx.fillStyle = improving ? '#22c55e' : '#ef4444'
    ctx.fillText(`${improving ? '↑ Improving' : '↓ Declining'} vs last year (${prevSavingsRate.toFixed(1)}%)`, 40, y)
  }

  // Footer
  ctx.fillStyle = '#334155'
  ctx.font = '11px sans-serif'
  ctx.fillText('Money Mngr — Financial Identity', 40, H - 24)

  return canvas
}

export function FinancialIdentityCard() {
  const db = useDb()
  const cardRef = useRef<HTMLDivElement>(null)

  const transactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db])
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db])
  const bucketOverrides = useLiveQuery(() => db?.categoryBuckets?.toArray() ?? [], [db])

  const data = useMemo(() => {
    if (!transactions?.length || !categories) return null

    const catMap = new Map(categories.map((c) => [c.id!, c.name]))
    const overrides: CategoryBucket[] = bucketOverrides ?? []

    const now = new Date()
    const curYear = now.getFullYear()
    const prevYear = curYear - 1

    // Use current year if ≥ 6 months of data, else last 12 months
    const curYearTxns = transactions.filter(
      (t) => t.transactionType === 'EXPENSE' && t.date.startsWith(String(curYear))
    )
    const useCurrentYear = new Set(curYearTxns.map((t) => t.date.slice(0, 7))).size >= 6

    const startDate = useCurrentYear
      ? `${curYear}-01-01`
      : new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10)
    const endDate = now.toISOString().slice(0, 10)
    const year = useCurrentYear ? String(curYear) : `${prevYear}–${curYear}`

    const periodExpense = transactions.filter(
      (t) => t.transactionType === 'EXPENSE' && t.date >= startDate && t.date <= endDate
    )
    const periodIncome = transactions.filter(
      (t) => t.transactionType === 'INCOME' && t.date >= startDate && t.date <= endDate
    )

    const totalExpense = periodExpense.reduce((s, t) => s + t.amount, 0)
    const totalIncome = periodIncome.reduce((s, t) => s + t.amount, 0)
    const days = Math.max(1, (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)
    const perDay = totalExpense / days
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0

    // Bucket breakdown
    const bucketTotals = new Map<BucketKey, number>()
    for (const t of periodExpense) {
      const catName = catMap.get(t.categoryId!) ?? 'Other'
      const bucket = guessBucket(catName, overrides)
      bucketTotals.set(bucket, (bucketTotals.get(bucket) ?? 0) + t.amount)
    }

    const buckets: { key: BucketKey; amount: number; pct: number }[] = (
      Object.keys(BUCKET_LABELS) as BucketKey[]
    ).map((key) => {
      const amount = bucketTotals.get(key) ?? 0
      return { key, amount, pct: totalExpense > 0 ? (amount / totalExpense) * 100 : 0 }
    }).sort((a, b) => b.pct - a.pct)

    // Previous year savings rate
    const prevExpense = transactions
      .filter((t) => t.transactionType === 'EXPENSE' && t.date.startsWith(String(prevYear)))
      .reduce((s, t) => s + t.amount, 0)
    const prevIncome = transactions
      .filter((t) => t.transactionType === 'INCOME' && t.date.startsWith(String(prevYear)))
      .reduce((s, t) => s + t.amount, 0)
    const prevSavingsRate = prevIncome > 0 ? ((prevIncome - prevExpense) / prevIncome) * 100 : null

    return { year, totalExpense, totalIncome, perDay, savingsRate, prevSavingsRate, buckets }
  }, [transactions, categories, bucketOverrides])

  const handleShare = useCallback(() => {
    if (!data) return
    const canvas = generateShareCanvas(
      data.year,
      data.buckets.map(({ key, pct }) => ({ key, pct })),
      data.savingsRate,
      data.prevSavingsRate
    )
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financial-identity-${data.year}.png`
      a.click()
      URL.revokeObjectURL(url)
    })
  }, [data])

  if (!data) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-blue-400" />
          <h2 className="text-base md:text-lg font-semibold text-white">Financial Identity Card</h2>
        </div>
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    )
  }

  const fmt = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
    return `₹${n.toFixed(0)}`
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-400" />
          <h2 className="text-base md:text-lg font-semibold text-white">Financial Identity Card</h2>
        </div>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-lg transition"
        >
          <Share2 className="w-3 h-3" />
          📸 Share
        </button>
      </div>

      <div ref={cardRef} className="border border-slate-700 rounded-xl bg-slate-900 p-5 font-mono">
        {/* Header */}
        <p className="text-slate-400 text-xs mb-4 tracking-widest">YOUR FINANCIAL IDENTITY — {data.year}</p>

        {/* Spend summary */}
        <div className="mb-4 space-y-1">
          <p className="text-white text-sm">
            You spent <span className="text-blue-400 font-bold">{fmt(data.totalExpense)}</span> this year
          </p>
          <p className="text-slate-400 text-xs">
            That&apos;s <span className="text-slate-200">{fmt(data.perDay)}</span> per day
          </p>
        </div>

        {/* Bucket breakdown */}
        <p className="text-slate-500 text-xs mb-2">Where your money went:</p>
        <div className="space-y-2 mb-4">
          {data.buckets.map(({ key, pct, amount }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-base">{BUCKET_ICONS[key]}</span>
              <span className="text-slate-300 text-xs flex-1">{BUCKET_LABELS[key]}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <span className="text-blue-400 text-xs w-10 text-right">{pct.toFixed(1)}%</span>
                <span className="text-slate-500 text-xs w-14 text-right">{fmt(amount)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Savings */}
        <div className="border-t border-slate-700 pt-3 space-y-1">
          <p className="text-sm text-white">
            You saved{' '}
            <span className={data.savingsRate >= 10 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
              {data.savingsRate.toFixed(1)}%
            </span>{' '}
            of income
          </p>
          {data.prevSavingsRate !== null && (
            <p className="text-xs text-slate-400">
              Last year you saved{' '}
              <span className="text-slate-200">{data.prevSavingsRate.toFixed(1)}%</span>
              {'  '}
              <span className={data.savingsRate >= data.prevSavingsRate ? 'text-emerald-400' : 'text-red-400'}>
                {data.savingsRate >= data.prevSavingsRate ? '↑ Improving' : '↓ Declining'}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
