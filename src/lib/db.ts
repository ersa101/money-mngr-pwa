import Dexie, { type Table } from 'dexie';
import type { Account, Category, Transaction, ThresholdWarning, FilterPreset, Budget, Goal, LifeEvent, FeedbackLog, AppSetting } from '@/types/database';

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
  }
}

export const db = new MySubClassedDB();

export type { Account, Category, Transaction, ThresholdWarning, FilterPreset, Budget, Goal, LifeEvent, FeedbackLog, AppSetting };
