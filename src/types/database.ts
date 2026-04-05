// Based on V2 and V3 prompts — Phase 1 additions at bottom

export interface ThresholdWarning {
  accountId: number
  accountName: string
  currentBalance: number
  threshold: number
  spendableAmount: number
  status: 'SAFE' | 'WARNING' | 'CRITICAL'
  message: string
}

export type AccountType =
  | 'BANK'
  | 'CASH'
  | 'WALLET'
  | 'INVESTMENT'
  | 'CREDIT_CARD'
  | 'PERSON';

export interface Account {
  id?: number;
  name: string;
  type: AccountType;
  balance: number;
  thresholdValue: number;
  color?: string;
  icon?: string;
  group?: string; // Custom grouping name for display
  includeInNetWorth?: boolean; // Whether to include in net worth calculation (default: true)
  isLiability?: boolean; // Whether this account is a liability (e.g., credit card debt)
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id?: number;
  name: string;
  parentId?: number;
  type: 'EXPENSE' | 'INCOME';
  icon?: string;
  color?: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type TransactionStatus = 'CONFIRMED' | 'PENDING' | 'REJECTED';
export type TransactionSource = 'MANUAL' | 'CSV_IMPORT' | 'MAGIC_BOX';

export interface Transaction {
  id?: number;
  date: string;
  amount: number;
  transactionType: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  fromAccountId?: number;
  toAccountId?: number;
  categoryId?: number;
  subCategoryId?: number;
  description?: string;
  notes?: string;
  status: TransactionStatus;
  source: TransactionSource;
  currency: string;
  linkedTransactionId?: number;
  // CSV fallback fields for category resolution
  csvCategory?: string;
  csvSubcategory?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Phase 1 additions ────────────────────────────────────────────────────────

export interface Budget {
  id?: number;
  categoryId: number;
  categoryName: string;
  monthlyLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id?: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  suggestedByAI: boolean;
  createdAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DISMISSED';
}

export interface LifeEvent {
  id?: number;
  detectedMonth: string;   // "YYYY-MM"
  eventType: string;
  aiSummary: string;
  confirmedByUser: boolean;
  createdAt: string;
}

export interface FeedbackLog {
  id?: number;
  timestamp: string;
  featureId: string;
  insightType: string;
  insightSummary: string;
  userResponse: 'POSITIVE' | 'NEGATIVE' | number;
  userReason?: string;
  categoryContext?: string;
  subcategoryContext?: string;
  monthYear: string;
  syncedToSheet: boolean;
}

export interface AppSetting {
  key: string;
  value: string;
}

// ─── Phase 2 additions ────────────────────────────────────────────────────────

export interface ComputedInsight {
  id?: number;
  key: string;        // e.g. 'lifestyle_inflation', 'seasonal_heatmap', 'correlation_web'
  value: string;      // JSON stringified result
  computedAt: string; // ISO timestamp
  version: number;    // increment if computation logic changes, triggers recompute
}

export interface CategoryBucket {
  id?: number;
  categoryId: number;
  categoryName: string;
  bucketName: 'LIFE_ESSENTIALS' | 'PEOPLE_SOCIAL' | 'TRANSPORT' | 'YOURSELF' | 'SAVINGS_INVEST';
}
