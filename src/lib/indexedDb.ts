// IndexedDB database using Dexie.js for offline-first storage
// This is the primary local database that syncs with Google Sheets

import Dexie, { type Table } from 'dexie'

// ============= Type Definitions =============

export interface BaseEntity {
  id?: string // UUID for cloud sync
  localId?: number // Auto-increment for local operations
  createdAt: string
  updatedAt: string
  deletedAt?: string | null // Soft delete
  syncStatus: 'synced' | 'pending' | 'conflict'
  lastSyncedAt?: string
}

export interface UserOwnedEntity extends BaseEntity {
  userId: string
}

export interface User extends BaseEntity {
  email: string
  name: string
  image?: string
  isAdmin: boolean
}

export interface Account extends UserOwnedEntity {
  name: string
  typeId?: string
  type: 'BANK' | 'CASH' | 'WALLET' | 'INVESTMENT' | 'CREDIT_CARD' | 'LOAN'
  balance: number
  thresholdValue: number
  color?: string
  icon?: string
  groupId?: string
  group?: string
  sortOrder: number
}

export interface Category extends UserOwnedEntity {
  name: string
  type: 'EXPENSE' | 'INCOME'
  parentId?: string
  icon: string
  color?: string
  sortOrder: number
}

export interface Transaction extends UserOwnedEntity {
  date: string
  amount: number
  transactionType: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  fromAccountId?: string
  toAccountId?: string
  categoryId?: string
  subCategoryId?: string
  description: string
  note?: string
  status: 'CONFIRMED' | 'PENDING' | 'REJECTED'
  source: 'MANUAL' | 'CSV_IMPORT' | 'MAGIC_BOX' | 'SMS_PARSER'
  currency: string
  tags?: string
  receiptUrl?: string
  smsRaw?: string
  // Legacy fields for backward compatibility
  toCategoryId?: number
  isTransfer?: boolean
  category?: string
  subCategory?: string
  csvAccount?: string
  csvCategory?: string
  csvSubcategory?: string
  csvIncomeExpense?: string
  csvDescription?: string
  csvCurrency?: string
  importedAt?: string
}

export interface AccountType extends UserOwnedEntity {
  name: string
  icon: string
  isLiability: boolean
  sortOrder: number
}

export interface AccountGroup extends UserOwnedEntity {
  name: string
  sortOrder: number
}

export interface UserSetting extends UserOwnedEntity {
  key: string
  value: string // JSON stringified
}

export interface SyncQueueItem {
  id?: number
  table: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  entityId: string
  data: any
  timestamp: string
  retryCount: number
  error?: string
}

// ============= Dexie Database Class =============

export class MoneyMngrDB extends Dexie {
  users!: Table<User>
  accounts!: Table<Account>
  categories!: Table<Category>
  transactions!: Table<Transaction>
  accountTypes!: Table<AccountType>
  accountGroups!: Table<AccountGroup>
  settings!: Table<UserSetting>
  syncQueue!: Table<SyncQueueItem>

  constructor() {
    super('MoneyMngrDB')

    this.version(1).stores({
      users: '++localId, id, email, syncStatus',
      accounts: '++localId, id, userId, name, type, groupId, syncStatus',
      categories: '++localId, id, userId, name, type, parentId, syncStatus',
      transactions: '++localId, id, userId, date, transactionType, fromAccountId, toAccountId, categoryId, status, source, syncStatus',
      accountTypes: '++localId, id, userId, name, syncStatus',
      accountGroups: '++localId, id, userId, name, syncStatus',
      settings: '++localId, id, userId, key, syncStatus',
      syncQueue: '++id, table, action, entityId, timestamp',
    })
  }
}

// ============= Database Instance =============

export const localDb = new MoneyMngrDB()

// ============= Helper Functions =============

export function generateId(): string {
  return crypto.randomUUID()
}

export function now(): string {
  return new Date().toISOString()
}

// ============= CRUD Operations with Sync Queue =============

export async function createEntity<T extends UserOwnedEntity>(
  table: Table<T>,
  tableName: string,
  data: Omit<T, keyof BaseEntity>,
  userId: string
): Promise<T> {
  const timestamp = now()
  const entity = {
    ...data,
    id: generateId(),
    userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    syncStatus: 'pending' as const,
  } as T

  await table.add(entity)

  // Add to sync queue
  await localDb.syncQueue.add({
    table: tableName,
    action: 'CREATE',
    entityId: entity.id!,
    data: entity,
    timestamp,
    retryCount: 0,
  })

  return entity
}

export async function updateEntity<T extends UserOwnedEntity>(
  table: Table<T>,
  tableName: string,
  id: string,
  updates: Partial<T>
): Promise<T | null> {
  const timestamp = now()
  const existing = await table.where('id').equals(id).first()

  if (!existing) return null

  const updated = {
    ...existing,
    ...updates,
    updatedAt: timestamp,
    syncStatus: 'pending' as const,
  }

  await table.where('id').equals(id).modify(updated)

  // Add to sync queue
  await localDb.syncQueue.add({
    table: tableName,
    action: 'UPDATE',
    entityId: id,
    data: updated,
    timestamp,
    retryCount: 0,
  })

  return updated as T
}

export async function deleteEntity<T extends UserOwnedEntity>(
  table: Table<T>,
  tableName: string,
  id: string,
  hardDelete = false
): Promise<boolean> {
  const timestamp = now()
  const existing = await table.where('id').equals(id).first()

  if (!existing) return false

  if (hardDelete) {
    await table.where('id').equals(id).delete()
  } else {
    // Soft delete
    await table.where('id').equals(id).modify({
      deletedAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'pending',
    })
  }

  // Add to sync queue
  await localDb.syncQueue.add({
    table: tableName,
    action: 'DELETE',
    entityId: id,
    data: { id, deletedAt: timestamp },
    timestamp,
    retryCount: 0,
  })

  return true
}

export async function getByUserId<T extends UserOwnedEntity>(
  table: Table<T>,
  userId: string,
  includeDeleted = false
): Promise<T[]> {
  let query = table.where('userId').equals(userId)
  const results = await query.toArray()

  if (includeDeleted) return results
  return results.filter(item => !item.deletedAt)
}

export async function getById<T extends UserOwnedEntity>(
  table: Table<T>,
  id: string
): Promise<T | undefined> {
  return table.where('id').equals(id).first()
}

// ============= Sync Queue Operations =============

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return localDb.syncQueue.orderBy('timestamp').toArray()
}

export async function removeSyncItem(id: number): Promise<void> {
  await localDb.syncQueue.delete(id)
}

export async function incrementSyncRetry(id: number, error: string): Promise<void> {
  await localDb.syncQueue.update(id, {
    retryCount: (await localDb.syncQueue.get(id))?.retryCount ?? 0 + 1,
    error,
  })
}

export async function clearSyncQueue(): Promise<void> {
  await localDb.syncQueue.clear()
}

// ============= Bulk Operations for Initial Sync =============

export async function bulkInsert<T extends UserOwnedEntity>(
  table: Table<T>,
  items: T[]
): Promise<void> {
  await table.bulkAdd(items.map(item => ({
    ...item,
    syncStatus: 'synced' as const,
    lastSyncedAt: now(),
  })))
}

export async function clearUserData(userId: string): Promise<void> {
  await localDb.transaction('rw',
    [localDb.accounts, localDb.categories, localDb.transactions,
     localDb.accountTypes, localDb.accountGroups, localDb.settings],
    async () => {
      await localDb.accounts.where('userId').equals(userId).delete()
      await localDb.categories.where('userId').equals(userId).delete()
      await localDb.transactions.where('userId').equals(userId).delete()
      await localDb.accountTypes.where('userId').equals(userId).delete()
      await localDb.accountGroups.where('userId').equals(userId).delete()
      await localDb.settings.where('userId').equals(userId).delete()
    }
  )
}

// ============= Default Export =============

export default localDb
