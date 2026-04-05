/**
 * correlationUtils — Pearson correlation helpers for Phase 2 Correlation Web.
 */

/**
 * Compute Pearson correlation coefficient between two equal-length arrays.
 * Returns a value in [-1, 1], or 0 if insufficient data.
 */
export function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3 || n !== ys.length) return 0;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  if (denom === 0) return 0;
  return num / denom;
}

export interface CorrelationEdge {
  source: string;
  target: string;
  r: number; // Pearson coefficient
}

export interface CorrelationNode {
  name: string;
  totalSpend: number;
}

export interface CorrelationWebData {
  nodes: CorrelationNode[];
  edges: CorrelationEdge[];
}

/**
 * Given monthly spend per sub-category, compute pairwise Pearson correlations.
 * Only returns edges where |r| > threshold (default 0.4).
 */
export function computeCorrelationWeb(
  /** Map of subCategory → array of monthly spend (same month order) */
  monthlySpend: Map<string, number[]>,
  threshold = 0.4
): CorrelationWebData {
  const names = Array.from(monthlySpend.keys());

  const nodes: CorrelationNode[] = names.map((name) => ({
    name,
    totalSpend: monthlySpend.get(name)!.reduce((a, b) => a + b, 0),
  }));

  const edges: CorrelationEdge[] = [];

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const r = pearsonCorrelation(
        monthlySpend.get(names[i])!,
        monthlySpend.get(names[j])!
      );
      if (Math.abs(r) > threshold) {
        edges.push({ source: names[i], target: names[j], r });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Build the monthly spend map for the top N sub-categories
 * from an array of transactions.
 */
export function buildMonthlySubCategorySpend(
  transactions: { date: string; amount: number; transactionType: string; subCategoryId?: number }[],
  subCategoryNames: Map<number, string>,
  topN = 15
): Map<string, number[]> {
  // Collect all expense transactions with known subCategories
  const expense = transactions.filter(
    (t) => t.transactionType === 'EXPENSE' && t.subCategoryId != null
  );

  if (!expense.length) return new Map();

  // Find date range
  const dates = expense.map((t) => t.date.slice(0, 7)).sort();
  const minMonth = dates[0];
  const maxMonth = dates[dates.length - 1];

  // Build month list
  const months: string[] = [];
  let [yr, mo] = minMonth.split('-').map(Number);
  const [maxYr, maxMo] = maxMonth.split('-').map(Number);
  while (yr < maxYr || (yr === maxYr && mo <= maxMo)) {
    months.push(`${yr}-${String(mo).padStart(2, '0')}`);
    mo++;
    if (mo > 12) { mo = 1; yr++; }
  }

  // Aggregate spend per subCategory per month
  const raw = new Map<string, Map<string, number>>();
  for (const t of expense) {
    const subName = subCategoryNames.get(t.subCategoryId!);
    if (!subName) continue;
    const month = t.date.slice(0, 7);
    if (!raw.has(subName)) raw.set(subName, new Map());
    const mMap = raw.get(subName)!;
    mMap.set(month, (mMap.get(month) ?? 0) + t.amount);
  }

  // Find top N by total spend
  const totals = Array.from(raw.entries())
    .map(([name, mMap]) => ({ name, total: Array.from(mMap.values()).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);

  const result = new Map<string, number[]>();
  for (const { name } of totals) {
    const mMap = raw.get(name)!;
    result.set(name, months.map((m) => mMap.get(m) ?? 0));
  }

  return result;
}
