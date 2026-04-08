import Dexie, { type Table } from 'dexie';
import type { Account, Category, Transaction, ThresholdWarning, FilterPreset, Budget, Goal, LifeEvent, FeedbackLog, AppSetting, ComputedInsight, CategoryBucket } from '@/types/database';

export class MySubClassedDB extends Dexie {
  accounts!: Table<Account>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;
  filterPresets!: Table<FilterPreset>;
  budgets!: Table<Budget>;
  goals!: Table<Goal>;
  lifeEvents!: Table<LifeEvent>;
  feedbackLog!: Table<FeedbackLog>;
  appSettings!: Table<AppSetting>;
  // Phase 2 tables
  computedInsights!: Table<ComputedInsight>;
  categoryBuckets!: Table<CategoryBucket>;

  constructor() {
    super('moneyMngrDB');

    this.version(1).stores({
      accounts: '++id, &name, type, groupId',
      categories: '++id, &name, type, parentId',
      transactions: '++id, date, transactionType, fromAccountId, toAccountId, categoryId, status',
    });

    // Schema migration from V3 prompt
    this.version(2).stores({
      transactions: '++id, date, transactionType, fromAccountId, toAccountId, categoryId, status, linkedTransactionId',
    });

    // v3: Remove unique constraint on category name
    this.version(3).stores({
      accounts: '++id, &name, type, groupId',
      categories: '++id, name, type, parentId',
      transactions: '++id, date, transactionType, fromAccountId, toAccountId, categoryId, status, linkedTransactionId',
    });

    // v4: Add filterPresets table (from v1.1)
    this.version(4).stores({
      filterPresets: '++id, name',
    });

    // v5: Phase 1 — add budgets, goals, lifeEvents, feedbackLog, appSettings
    this.version(5).stores({
      accounts: '++id, &name, type, groupId',
      categories: '++id, name, type, parentId',
      transactions: '++id, date, transactionType, fromAccountId, toAccountId, categoryId, status, linkedTransactionId',
      filterPresets: '++id, name',
      budgets: '++id, categoryId',
      goals: '++id, status',
      lifeEvents: '++id, detectedMonth',
      feedbackLog: '++id, featureId, syncedToSheet',
      appSettings: '&key',
    });

    // v6: Phase 1.5 — index updatedAt on the three sync-critical tables for conflict resolution
    this.version(6).stores({
      accounts: '++id, &name, type, groupId, updatedAt',
      categories: '++id, name, type, parentId, updatedAt',
      transactions: '++id, date, transactionType, fromAccountId, toAccountId, categoryId, status, linkedTransactionId, updatedAt',
    });

    // v7: Phase 2 — computed insight cache + category bucket mapping
    this.version(7).stores({
      computedInsights: '++id, &key, computedAt',
      categoryBuckets: '++id, categoryId, bucketName',
    });
  }
}

export const db = new MySubClassedDB();

export type { Account, Category, Transaction, ThresholdWarning, FilterPreset, Budget, Goal, LifeEvent, FeedbackLog, AppSetting, ComputedInsight, CategoryBucket };
