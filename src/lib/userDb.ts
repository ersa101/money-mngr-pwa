import Dexie, { type Table } from 'dexie';
import type { Account, Category, Transaction } from '@/types/database';

// User-scoped database class
class UserScopedDB extends Dexie {
  accounts!: Table<Account>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;

  constructor(userId: string) {
    // Create a unique database name for each user
    // Sanitize userId to be a valid IndexedDB name
    const sanitizedId = userId.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    super(`moneyMngr_${sanitizedId}`);

    this.version(1).stores({
      accounts: '++id, &name, type, groupId',
      categories: '++id, &name, type, parentId',
      transactions: '++id, date, transactionType, fromAccountId, toAccountId, categoryId, status',
    });

    this.version(2).stores({
      transactions: '++id, date, transactionType, fromAccountId, toAccountId, categoryId, status, linkedTransactionId',
    });

    // v3: Remove unique constraint on category name - same name can exist for different types/parents
    this.version(3).stores({
      accounts: '++id, &name, type, groupId',
      categories: '++id, name, type, parentId',  // Changed from &name to name (non-unique)
      transactions: '++id, date, transactionType, fromAccountId, toAccountId, categoryId, status, linkedTransactionId',
    });
  }
}

// Cache of database instances per user
const dbCache = new Map<string, UserScopedDB>();

// Get or create a database for a specific user
export function getUserDb(userId: string): UserScopedDB {
  if (!userId) {
    throw new Error('User ID is required for database access');
  }

  if (!dbCache.has(userId)) {
    dbCache.set(userId, new UserScopedDB(userId));
  }

  return dbCache.get(userId)!;
}

// Clear a user's database from cache (for logout)
export function clearUserDbCache(userId?: string) {
  if (userId) {
    const db = dbCache.get(userId);
    if (db) {
      db.close();
      dbCache.delete(userId);
    }
  } else {
    // Clear all cached databases
    dbCache.forEach(db => db.close());
    dbCache.clear();
  }
}

// Delete a user's database entirely
export async function deleteUserDb(userId: string) {
  clearUserDbCache(userId);
  const sanitizedId = userId.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  await Dexie.delete(`moneyMngr_${sanitizedId}`);
}

export type { UserScopedDB };
export { Account, Category, Transaction };
