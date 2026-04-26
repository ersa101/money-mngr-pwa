// Pearson + Spearman + Cosine correlation utilities for Correlation Web
// V2.7.4 D042 — algo router by months count:
//   n < 3   -> 'none' (CorrelationWeb falls back to top-spend leaderboard)
//   3-5     -> 'cosine' (works at small n; no normality assumption)
//   6-11    -> 'spearman' (rank correlation, robust to spikes)
//   n >= 12 -> 'pearson' (standard linear correlation, large enough sample)

export interface MonthlySpend {
  month: string // 'YYYY-MM'
  amount: number
}

export interface SubCategoryMonthly {
  subCategoryName: string
  monthly: MonthlySpend[]
}

export interface CorrelationEdge {
  source: string
  target: string
  r: number // Pearson r value, -1 to 1
}

// Compute Pearson correlation coefficient between two equal-length arrays
export function pearson(x: number[], y: number[]): number {
  const n = x.length
  if (n < 3) return 0

  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n

  let num = 0
  let denomX = 0
  let denomY = 0

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    num += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }

  const denom = Math.sqrt(denomX * denomY)
  if (denom === 0) return 0
  return num / denom
}

// Align two monthly series to the same set of months (union), filling missing months with 0
export function alignSeries(a: MonthlySpend[], b: MonthlySpend[]): { x: number[]; y: number[] } {
  const allMonths = Array.from(
    new Set([...a.map((m) => m.month), ...b.map((m) => m.month)])
  ).sort()

  const aMap = new Map(a.map((m) => [m.month, m.amount]))
  const bMap = new Map(b.map((m) => [m.month, m.amount]))

  return {
    x: allMonths.map((mo) => aMap.get(mo) ?? 0),
    y: allMonths.map((mo) => bMap.get(mo) ?? 0),
  }
}

// Compute all pairwise correlations, returning only edges where |r| > threshold
export function computeCorrelations(
  series: SubCategoryMonthly[],
  threshold = 0.4
): CorrelationEdge[] {
  const edges: CorrelationEdge[] = []

  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      const { x, y } = alignSeries(series[i].monthly, series[j].monthly)
      const r = pearson(x, y)
      if (Math.abs(r) > threshold) {
        edges.push({ source: series[i].subCategoryName, target: series[j].subCategoryName, r })
      }
    }
  }

  return edges
}

// Compute full N×N Pearson r matrix (diagonal = 1)
export function computeFullMatrix(series: SubCategoryMonthly[]): number[][] {
  const n = series.length
  const matrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1
      const { x, y } = alignSeries(series[i].monthly, series[j].monthly)
      return pearson(x, y)
    })
  )
  return matrix
}

// ─── V2.7.4 D042: cosine + Spearman + algo router ────────────────────────────

export type CorrelationAlgo = 'none' | 'cosine' | 'spearman' | 'pearson'

/**
 * Cosine similarity between two equal-length vectors.
 * Returns 0 if either norm is 0 (constant vector).
 * Range: [-1, 1] for signed; for non-negative spend vectors, [0, 1].
 */
export function cosineSimilarity(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0
  let dot = 0
  let nx = 0
  let ny = 0
  for (let i = 0; i < x.length; i++) {
    dot += x[i] * y[i]
    nx += x[i] * x[i]
    ny += y[i] * y[i]
  }
  if (nx === 0 || ny === 0) return 0
  return dot / Math.sqrt(nx * ny)
}

/**
 * Average ranks for an array. Handles ties via average rank (standard Spearman handling).
 */
function rankArray(arr: number[]): number[] {
  const n = arr.length
  const indexed = arr.map((v, i) => ({ v, i }))
  indexed.sort((a, b) => a.v - b.v)
  const ranks = new Array<number>(n)
  let i = 0
  while (i < n) {
    let j = i
    while (j + 1 < n && indexed[j + 1].v === indexed[i].v) j++
    const avgRank = (i + j) / 2 + 1 // 1-based ranks; tied -> average
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank
    i = j + 1
  }
  return ranks
}

/**
 * Spearman rank correlation. Pearson on ranks. Robust to outliers / spikes.
 */
export function spearmanCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0
  return pearson(rankArray(x), rankArray(y))
}

/**
 * Select correlation algorithm by months-of-data count.
 * See D042 for thresholds.
 */
export function selectAlgo(monthsCount: number): CorrelationAlgo {
  if (monthsCount < 3) return 'none'
  if (monthsCount <= 5) return 'cosine'
  if (monthsCount <= 11) return 'spearman'
  return 'pearson'
}

/**
 * Dispatch correlation by algo. Returns N×N matrix (diagonal = 1) or empty for 'none'.
 */
export function computeMatrixWithAlgo(
  series: SubCategoryMonthly[],
  algo: CorrelationAlgo
): number[][] {
  if (algo === 'none') return []
  const n = series.length
  const fn = algo === 'cosine' ? cosineSimilarity : algo === 'spearman' ? spearmanCorrelation : pearson
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1
      const { x, y } = alignSeries(series[i].monthly, series[j].monthly)
      return fn(x, y)
    })
  )
}

/**
 * Edges with |r| > threshold using selected algo.
 */
export function computeCorrelationsWithAlgo(
  series: SubCategoryMonthly[],
  algo: CorrelationAlgo,
  threshold = 0.3
): CorrelationEdge[] {
  if (algo === 'none') return []
  const fn = algo === 'cosine' ? cosineSimilarity : algo === 'spearman' ? spearmanCorrelation : pearson
  const edges: CorrelationEdge[] = []
  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      const { x, y } = alignSeries(series[i].monthly, series[j].monthly)
      const r = fn(x, y)
      if (Math.abs(r) > threshold) {
        edges.push({ source: series[i].subCategoryName, target: series[j].subCategoryName, r })
      }
    }
  }
  return edges
}

// Group raw transactions into SubCategoryMonthly series for top N sub-categories
export interface RawTransaction {
  date: string
  amount: number
  transactionType: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  subCategoryName?: string
}

export function buildSubCategoryMonthlySeries(
  transactions: RawTransaction[],
  topN = 15
): SubCategoryMonthly[] {
  const expenseTransactions = transactions.filter(
    (t) => t.transactionType === 'EXPENSE' && t.subCategoryName
  )

  // Aggregate total by sub-category to find top N
  const totalBySubCat = new Map<string, number>()
  for (const t of expenseTransactions) {
    const key = t.subCategoryName!
    totalBySubCat.set(key, (totalBySubCat.get(key) ?? 0) + t.amount)
  }

  const topSubCats = Array.from(totalBySubCat.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name]) => name)

  // Build monthly spend per sub-category
  const monthlyMap = new Map<string, Map<string, number>>()
  for (const subCat of topSubCats) {
    monthlyMap.set(subCat, new Map())
  }

  for (const t of expenseTransactions) {
    if (!topSubCats.includes(t.subCategoryName!)) continue
    const month = t.date.slice(0, 7) // 'YYYY-MM'
    const subMap = monthlyMap.get(t.subCategoryName!)!
    subMap.set(month, (subMap.get(month) ?? 0) + t.amount)
  }

  return topSubCats.map((subCat) => ({
    subCategoryName: subCat,
    monthly: Array.from(monthlyMap.get(subCat)!.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  }))
}
