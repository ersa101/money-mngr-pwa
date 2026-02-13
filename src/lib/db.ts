import Dexie, { type Table } from 'dexie';
import type { Account, Category, Transaction } from '@/types/database';

export class MySubClassedDB extends Dexie {
  accounts!: Table<Account>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;

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
  }
}

export const db = new MySubClassedDB();

// Also re-export types for convenience in other files if needed
export type { Account, Category, Transaction };
