/**
 * Financial Age Score computation logic (Feature 19).
 * Rule-based, no AI. Runs synchronously on provided metrics.
 */

export interface FinancialAgeInput {
  realAge: number;
  savingsRate: number;           // 0–100 (percentage of income saved)
  expenseGrowthRate: number;     // annualised % growth rate (from lifestyle inflation calc)
  incomeGrowthRate: number;      // annualised % growth rate
  investmentRatio: number;       // investments as % of income
  debtAccountCount: number;      // accounts with positive outstanding balance flagged as liability
  safeToSpendMonths: number;     // how many months of expenses covered by safe-to-spend buffer
  monthlySavingsVarianceCoeff: number; // CV = stddev/mean of monthly savings (0–1)
}

export interface FinancialAgeFactor {
  label: string;
  adjustment: number; // negative = younger, positive = older
  detail: string;
}

export interface FinancialAgeResult {
  realAge: number;
  financialAge: number;
  delta: number; // financialAge - realAge
  factors: FinancialAgeFactor[];
}

export function computeFinancialAge(input: FinancialAgeInput): FinancialAgeResult {
  const factors: FinancialAgeFactor[] = [];
  let adj = 0;

  // Savings rate
  if (input.savingsRate > 20) {
    factors.push({ label: 'High savings rate (>20%)', adjustment: -3, detail: `You save ${input.savingsRate.toFixed(1)}% of income` });
    adj -= 3;
  } else if (input.savingsRate >= 10) {
    factors.push({ label: 'Moderate savings rate (10–20%)', adjustment: -1, detail: `You save ${input.savingsRate.toFixed(1)}% of income` });
    adj -= 1;
  } else {
    factors.push({ label: 'Low savings rate (<10%)', adjustment: +3, detail: `You save only ${input.savingsRate.toFixed(1)}% of income` });
    adj += 3;
  }

  // Lifestyle inflation
  if (input.expenseGrowthRate > input.incomeGrowthRate) {
    factors.push({ label: 'Lifestyle inflation detected', adjustment: +2, detail: `Expenses growing ${input.expenseGrowthRate.toFixed(1)}%/yr vs income ${input.incomeGrowthRate.toFixed(1)}%/yr` });
    adj += 2;
  } else {
    factors.push({ label: 'Income outpacing expenses', adjustment: -2, detail: `Income growing ${input.incomeGrowthRate.toFixed(1)}%/yr vs expenses ${input.expenseGrowthRate.toFixed(1)}%/yr` });
    adj -= 2;
  }

  // Investment ratio
  if (input.investmentRatio > 15) {
    factors.push({ label: 'Strong investment ratio (>15%)', adjustment: -2, detail: `${input.investmentRatio.toFixed(1)}% of income invested` });
    adj -= 2;
  } else if (input.investmentRatio < 5) {
    factors.push({ label: 'Low investment ratio (<5%)', adjustment: +2, detail: `Only ${input.investmentRatio.toFixed(1)}% of income invested` });
    adj += 2;
  }

  // Debt accounts
  if (input.debtAccountCount > 0) {
    factors.push({ label: `${input.debtAccountCount} debt/loan account(s)`, adjustment: +input.debtAccountCount, detail: `+1 year per active debt account` });
    adj += input.debtAccountCount;
  }

  // Emergency buffer
  if (input.safeToSpendMonths >= 3) {
    factors.push({ label: 'Healthy emergency buffer (≥3 months)', adjustment: -2, detail: `${input.safeToSpendMonths.toFixed(1)} months of expenses buffered` });
    adj -= 2;
  }

  // Savings consistency
  if (input.monthlySavingsVarianceCoeff < 0.2) {
    factors.push({ label: 'Consistent savings habit (<20% variance)', adjustment: -1, detail: 'Low month-to-month savings variance' });
    adj -= 1;
  }

  const financialAge = Math.max(18, Math.round(input.realAge + adj));

  return {
    realAge: input.realAge,
    financialAge,
    delta: financialAge - input.realAge,
    factors,
  };
}
