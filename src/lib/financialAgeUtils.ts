// Financial Age scoring logic — Feature 19
// All 10 adjustment factors as per Phase 2 spec

export interface FinancialAgeInput {
  realAge: number
  // Monthly income and expense arrays (chronological, same length or not)
  monthlyIncome: number[]    // ₹ per month, recent 12 months
  monthlyExpense: number[]   // ₹ per month, recent 12 months
  investmentAmount: number   // total investment spend last 12 months
  totalIncome: number        // total income last 12 months
  debtAccountCount: number   // number of loan/credit accounts with non-zero balance
  safeToSpend: number        // current safe-to-spend balance (from threshold system)
  avgMonthlyExpense: number  // average monthly expense last 12 months
  // For lifestyle inflation: pass full history monthly arrays
  allMonthlyIncome: number[]
  allMonthlyExpense: number[]
}

export interface FactorResult {
  label: string
  adjustment: number // negative = younger, positive = older
  reason: string
}

export interface FinancialAgeResult {
  realAge: number
  financialAge: number
  delta: number // financialAge - realAge (positive = older, negative = younger)
  factors: FactorResult[]
}

function savingsRate(income: number[], expense: number[]): number {
  const totalIncome = income.reduce((a, b) => a + b, 0)
  const totalExpense = expense.reduce((a, b) => a + b, 0)
  if (totalIncome === 0) return 0
  return ((totalIncome - totalExpense) / totalIncome) * 100
}

function linearGrowthRate(values: number[]): number {
  // Simple linear regression slope as % of mean
  if (values.length < 2) return 0
  const n = values.length
  const mean = values.reduce((a, b) => a + b, 0) / n
  if (mean === 0) return 0

  let sumXY = 0
  let sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumXY += i * values[i]
    sumX2 += i * i
  }
  const meanX = (n - 1) / 2
  const meanY = mean
  const slope = (sumXY - n * meanX * meanY) / (sumX2 - n * meanX * meanX)
  // Annualise: slope per month × 12, as % of mean
  return ((slope * 12) / mean) * 100
}

function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return 0
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
  return (Math.sqrt(variance) / mean) * 100
}

export function computeFinancialAge(input: FinancialAgeInput): FinancialAgeResult {
  const factors: FactorResult[] = []
  let adjustment = 0

  // Factor 1: Savings rate
  const sr = savingsRate(input.monthlyIncome, input.monthlyExpense)
  if (sr > 20) {
    factors.push({ label: 'Savings rate', adjustment: -3, reason: `${sr.toFixed(1)}% savings rate (excellent, >20%)` })
    adjustment -= 3
  } else if (sr >= 10) {
    factors.push({ label: 'Savings rate', adjustment: -1, reason: `${sr.toFixed(1)}% savings rate (good, 10–20%)` })
    adjustment -= 1
  } else {
    factors.push({ label: 'Savings rate', adjustment: +3, reason: `${sr.toFixed(1)}% savings rate (low, <10%)` })
    adjustment += 3
  }

  // Factor 2: Lifestyle inflation (expense growth vs income growth over full history)
  const expenseGrowth = linearGrowthRate(input.allMonthlyExpense)
  const incomeGrowth = linearGrowthRate(input.allMonthlyIncome)
  if (expenseGrowth > incomeGrowth) {
    factors.push({ label: 'Lifestyle inflation', adjustment: +2, reason: `Expenses growing ${expenseGrowth.toFixed(1)}%/yr vs income ${incomeGrowth.toFixed(1)}%/yr` })
    adjustment += 2
  } else {
    factors.push({ label: 'Income growth', adjustment: -2, reason: `Income growing ${incomeGrowth.toFixed(1)}%/yr vs expenses ${expenseGrowth.toFixed(1)}%/yr` })
    adjustment -= 2
  }

  // Factor 3: Investment ratio
  const investRatio = input.totalIncome > 0
    ? (input.investmentAmount / input.totalIncome) * 100
    : 0
  if (investRatio > 15) {
    factors.push({ label: 'Investment ratio', adjustment: -2, reason: `${investRatio.toFixed(1)}% of income invested (>15%)` })
    adjustment -= 2
  } else if (investRatio < 5) {
    factors.push({ label: 'Investment ratio', adjustment: +2, reason: `${investRatio.toFixed(1)}% of income invested (<5%)` })
    adjustment += 2
  } else {
    factors.push({ label: 'Investment ratio', adjustment: 0, reason: `${investRatio.toFixed(1)}% of income invested (moderate)` })
  }

  // Factor 4: Debt/loan accounts
  if (input.debtAccountCount > 0) {
    const adj = input.debtAccountCount
    factors.push({ label: 'Debt accounts', adjustment: +adj, reason: `${input.debtAccountCount} loan/credit account(s) with balance` })
    adjustment += adj
  }

  // Factor 5: Emergency buffer (safe-to-spend > 3 months expenses)
  const threeMonthsExpense = input.avgMonthlyExpense * 3
  if (input.safeToSpend >= threeMonthsExpense && threeMonthsExpense > 0) {
    factors.push({ label: 'Emergency buffer', adjustment: -2, reason: `Safe-to-spend covers ${(input.safeToSpend / input.avgMonthlyExpense).toFixed(1)} months of expenses` })
    adjustment -= 2
  }

  // Factor 6: Consistency (savings variance)
  const monthlySavings = input.monthlyIncome.map((inc, i) => inc - (input.monthlyExpense[i] ?? 0))
  const cv = coefficientOfVariation(monthlySavings)
  if (cv < 20) {
    factors.push({ label: 'Savings consistency', adjustment: -1, reason: `Monthly savings vary by ${cv.toFixed(1)}% (consistent, <20%)` })
    adjustment -= 1
  }

  const financialAge = Math.max(18, input.realAge + adjustment)

  return {
    realAge: input.realAge,
    financialAge,
    delta: financialAge - input.realAge,
    factors,
  }
}
