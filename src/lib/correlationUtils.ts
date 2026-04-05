/**
 * Pearson correlation utilities for Correlation Web (Feature 17).
 */

/** Compute Pearson r between two equal-length arrays. Returns NaN if insufficient data. */
export function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return NaN;

  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;

  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dxi = x[i] - meanX;
    const dyi = y[i] - meanY;
    num += dxi * dyi;
    dx2 += dxi * dxi;
    dy2 += dyi * dyi;
  }

  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? NaN : num / denom;
}

export interface CorrelationEdge {
  source: string;
  target: string;
  r: number; // Pearson r, |r| > 0.4 threshold already applied
}

export interface CorrelationNode {
  id: string;
  totalSpend: number;
}

export interface CorrelationResult {
  nodes: CorrelationNode[];
  edges: CorrelationEdge[];
}

/**
 * Given monthly sub-category spend data, compute top-N nodes and edges where |r| > threshold.
 * monthlyData: Map<subcategoryName, Map<monthKey "YYYY-MM", amount>>
 */
export function computeCorrelations(
  monthlyData: Map<string, Map<string, number>>,
  topN = 15,
  threshold = 0.4
): CorrelationResult {
  // Build sorted list of all months
  const allMonths = Array.from(
    new Set(Array.from(monthlyData.values()).flatMap((m) => Array.from(m.keys())))
  ).sort();

  // Compute totals and pick top N sub-categories
  const totals: { name: string; total: number }[] = [];
  for (const [name, monthMap] of monthlyData.entries()) {
    const total = Array.from(monthMap.values()).reduce((s, v) => s + v, 0);
    totals.push({ name, total });
  }
  totals.sort((a, b) => b.total - a.total);
  const topNames = totals.slice(0, topN).map((t) => t.name);

  // Build monthly spend vectors for top N
  const vectors = new Map<string, number[]>();
  for (const name of topNames) {
    const monthMap = monthlyData.get(name)!;
    vectors.set(name, allMonths.map((m) => monthMap.get(m) ?? 0));
  }

  // Compute pairwise correlations
  const edges: CorrelationEdge[] = [];
  for (let i = 0; i < topNames.length; i++) {
    for (let j = i + 1; j < topNames.length; j++) {
      const r = pearsonR(vectors.get(topNames[i])!, vectors.get(topNames[j])!);
      if (!isNaN(r) && Math.abs(r) > threshold) {
        edges.push({ source: topNames[i], target: topNames[j], r });
      }
    }
  }

  const nodes: CorrelationNode[] = topNames.map((name) => ({
    id: name,
    totalSpend: totals.find((t) => t.name === name)!.total,
  }));

  return { nodes, edges };
}
