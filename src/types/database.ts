// Based on V2 and V3 prompts

export type AccountType =
  | 'BANK'
  | 'CASH'
  | 'WALLET'
  | 'INVESTMENT'
  | 'CREDIT_CARD'
  | 'PERSON'; // From V3

export interface Account {
  id?: number;
  name: string;
  type: AccountType;
  balance: number;
  thresholdValue: number;
  color?: string;
  icon?: string;
  groupId?: number;
  isPerson?: boolean; // From V3
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id?: number;
  name: string;
  parentId?: number;
  type: 'EXPENSE' | 'INCOME';
  icon?: string;
  color?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
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
  subCategoryId?: number; // Mentioned in old db.ts but not in prompts, good to have.
  description?: string;
  status: TransactionStatus;
  source: TransactionSource;
  currency: string;
  linkedTransactionId?: number; // From V3
  createdAt: string;
  updatedAt: string;
}
