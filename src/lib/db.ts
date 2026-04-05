import Dexie, { type Table } from 'dexie';
import type { Account, Category, Transaction, ThresholdWarning, Budget, Goal, LifeEvent, FeedbackLog, AppSetting, ComputedInsight, CategoryBucket } from '@/types/database';

export class MySubClassedDB extends Dexie {
  accounts!: Table<Account>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;
  budgets!: Table<Budget>;
  goals!: Table<Goal>;
  lifeEvents!: Table<LifeEvent>;
  feedbackLog!: Table<FeedbackLog>;
  appSettings!: Table<AppSetting>;
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

    // v3: Remove unique constraint on category name - same name can exist for different types/parents
    this.version(3).stores({
      accounts: '++id, &name, type, groupId',
      categories: '++id, name, type, parentId',
      transactions: '++id, date, transactionType, fromAccountId, toAccountId, categoryId, status, linkedTransactionId',
    });

    // v4: Phase 1 — add budgets, goals, lifeEvents, feedbackLog, appSettings
    this.version(4).stores({
      accounts: '++id, &name, type, groupId',
      categories: '++id, name, type, parentId',
      transactions: '++id, date, transactionType, fromAccountId, toAccountId, categoryId, status, linkedTransactionId',
      budgets: '++id, categoryId',
      goals: '++id, status',
      lifeEvents: '++id, detectedMonth',
      feedbackLog: '++id, featureId, syncedToSheet',
      appSettings: '&key',
    });

    // v5: Phase 2 — add computedInsights, categoryBuckets
    this.version(5).stores({
      accounts: '++id, &name, type, groupId',
      categories: '++id, name, type, parentId',
      transactions: '++id, date, transactionType, fromAccountId, toAccountId, categoryId, status, linkedTransactionId',
      budgets: '++id, categoryId',
      goals: '++id, status',
      lifeEvents: '++id, detectedMonth',
      feedbackLog: '++id, featureId, syncedToSheet',
      appSettings: '&key',
      computedInsights: '++id, &key',
      categoryBuckets: '++id, categoryId, bucketName',
    });
  }
}

export const db = new MySubClassedDB();

export type { Account, Category, Transaction, ThresholdWarning, Budget, Goal, LifeEvent, FeedbackLog, AppSetting, ComputedInsight, CategoryBucket };
