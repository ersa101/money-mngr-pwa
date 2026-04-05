/**
 * financialAgeUtils — Rule-based Financial Age Score computation (Phase 2, Feature 19).
 *
 * Start at real age, then apply adjustments based on financial behaviour.
 */

export interface FinancialAgeInput {
  realAge: number;
  savingsRatePct: number;          // (income - expense) / income * 100
  expenseGrowthPct: number;        // annualised growth rate of expenses
  incomeGrowthPct: number;         // annualised growth rate of income
  investmentRatioPct: number;      // investment spend / income * 100
  debtAccountCount: number;        // number of CREDIT_CARD / PERSON accounts with positive balance
  safeToSpendMonths: number;       // safe-to-spend balance in months of avg expense
  savingsVariancePct: number;      // coefficient of variation of monthly savings (std/mean * 100)
}

export interface FinancialAgeAdjustment {
  factor: string;
  condition: string;
  delta: number; // negative = younger (good), positive = older (bad)
}

export interface FinancialAgeResult {
  realAge: number;
  financialAge: number;
  delta: number; // financialAge - realAge
  adjustments: FinancialAgeAdjustment[];
}

export function computeFinancialAge(input: FinancialAgeInput): FinancialAgeResult {
  const adjustments: FinancialAgeAdjustment[] = [];
  let age = input.realAge;

  // ── Savings rate ──────────────────────────────────────────────────────────
  if (input.savingsRatePct > 20) {
    adjustments.push({ factor: 'Savings Rate', condition: '> 20%', delta: -3 });
    age -= 3;
  } else if (input.savingsRatePct >= 10) {
    adjustments.push({ factor: 'Savings Rate', condition: '10–20%', delta: -1 });
    age -= 1;
  } else {
    adjustments.push({ factor: 'Savings Rate', condition: '< 10%', delta: +3 });
    age += 3;
  }

  // ── Lifestyle inflation ────────────────────────────────────────────────────
  if (input.expenseGrowthPct > input.incomeGrowthPct) {
    adjustments.push({ factor: 'Lifestyle Inflation', condition: 'Expenses growing faster than income', delta: +2 });
    age += 2;
  } else {
    adjustments.push({ factor: 'Lifestyle Inflation', condition: 'Income growing faster than expenses', delta: -2 });
    age -= 2;
  }

  // ── Investment ratio ───────────────────────────────────────────────────────
  if (input.investmentRatioPct > 15) {
    adjustments.push({ factor: 'Investment Ratio', condition: '> 15% of income', delta: -2 });
    age -= 2;
  } else if (input.investmentRatioPct < 5) {
    adjustments.push({ factor: 'Investment Ratio', condition: '< 5% of income', delta: +2 });
    age += 2;
  }

  // ── Debt / loan accounts ───────────────────────────────────────────────────
  if (input.debtAccountCount > 0) {
    const delta = input.debtAccountCount;
    adjustments.push({
      factor: 'Debt Accounts',
      condition: `${input.debtAccountCount} account${input.debtAccountCount > 1 ? 's' : ''} with balance`,
      delta,
    });
    age += delta;
  }

  // ── Emergency buffer ───────────────────────────────────────────────────────
  if (input.safeToSpendMonths >= 3) {
    adjustments.push({ factor: 'Emergency Buffer', condition: '≥ 3 months expenses in safe-to-spend', delta: -2 });
    age -= 2;
  }

  // ── Savings consistency ────────────────────────────────────────────────────
  if (input.savingsVariancePct < 20) {
    adjustments.push({ factor: 'Savings Consistency', condition: '< 20% variance in monthly savings', delta: -1 });
    age -= 1;
  }

  return {
    realAge: input.realAge,
    financialAge: Math.max(1, Math.round(age)),
    delta: Math.round(age) - input.realAge,
    adjustments,
  };
}
