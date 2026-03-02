'use client'

import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext'
import type { Account, Category, Transaction } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Settings, Tag, Landmark, Pencil, Trash2, Plus, X, Check, FolderOpen, ChevronDown, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import { ActionLogger } from '@/lib/actionLogger'
import { BackupSection } from '@/components/settings/BackupSection'
import { SnapshotSection } from '@/components/settings/SnapshotSection'
import toast from 'react-hot-toast'

type TabType = 'categories' | 'accounts' | 'data'

// Account type display names
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  BANK: 'Bank Accounts',
  SAVINGS: 'Savings Accounts',
  CASH: 'Cash',
  WALLET: 'Digital Wallets',
  CREDIT_CARD: 'Credit Cards',
  LOAN: 'Loans',
  INVESTMENT: 'Investments',
  PERSON: 'People (Loans & Debts)',
  OTHER: 'Other',
}

export default function SettingsPage() {
  const db = useDb()
  const [activeTab, setActiveTab] = useState<TabType>('data')
  const [expandedCategoryTypes, setExpandedCategoryTypes] = useState<Set<string>>(new Set(['EXPENSE', 'INCOME']))
  const [expandedAccountTypes, setExpandedAccountTypes] = useState<Set<string>>(new Set())

  // Add category state
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryType, setNewCategoryType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [newParentId, setNewParentId] = useState<number | undefined>(undefined)

  // Editing state
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  // Fetch data
  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db])
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db])
  const transactions = useLiveQuery(() => db?.transactions.toArray() ?? [], [db])

  // Build category hierarchy
  const categoryHierarchy = useMemo(() => {
    if (!categories) return { EXPENSE: [], INCOME: [] }

    // Filter out null/undefined categories first
    const validCategories = categories.filter((c): c is Category => !!c && !!c.type && !!c.name)

    // Get root categories (no parentId)
    const rootCategories = validCategories.filter(c => !c.parentId)

    // For each root category, find its children
    const buildTree = (parentId: number): Category[] => {
      return validCategories.filter(c => c.parentId === parentId)
    }

    const expenseCategories = rootCategories
      .filter(c => c.type === 'EXPENSE')
      .map(cat => ({
        ...cat,
        children: buildTree(cat.id!)
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    const incomeCategories = rootCategories
      .filter(c => c.type === 'INCOME')
      .map(cat => ({
        ...cat,
        children: buildTree(cat.id!)
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      EXPENSE: expenseCategories,
      INCOME: incomeCategories
    }
  }, [categories])

  // Get transaction count for a category
  const getCategoryTransactionCount = (categoryId: number): number => {
    if (!transactions) return 0
    return transactions.filter(t => t && (t.categoryId === categoryId || t.subCategoryId === categoryId)).length
  }

  // Group accounts by type
  const accountsByType = useMemo(() => {
    if (!accounts) return new Map<string, Account[]>()

    const typeMap = new Map<string, Account[]>()

    accounts.forEach(account => {
      // Skip null/undefined accounts
      if (!account || !account.name) return
      const accountType = account.type || 'OTHER'
      if (!typeMap.has(accountType)) {
        typeMap.set(accountType, [])
      }
      typeMap.get(accountType)!.push(account)
    })

    // Sort accounts within each type by name
    typeMap.forEach((accs, type) => {
      accs.sort((a, b) => a.name.localeCompare(b.name))
    })

    return typeMap
  }, [accounts])

  const toggleCategoryType = (typeName: string) => {
    setExpandedCategoryTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(typeName)) {
        newSet.delete(typeName)
      } else {
        newSet.add(typeName)
      }
      return newSet
    })
  }

  const toggleAccountType = (typeName: string) => {
    setExpandedAccountTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(typeName)) {
        newSet.delete(typeName)
      } else {
        newSet.add(typeName)
      }
      return newSet
    })
  }

  // Add new category
  const addCategory = async () => {
    if (!db) {
      toast.error('Database not available')
      return
    }
    if (!newCategoryName.trim()) return

    const exists = categories?.some(
      cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase() &&
             cat.type === newCategoryType &&
             cat.parentId === newParentId
    )
    if (exists) {
      toast.error('Category already exists!')
      return
    }

    await db.categories.add({
      name: newCategoryName.trim(),
      type: newCategoryType,
      parentId: newParentId,
      icon: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    toast.success('Category added!')
    setNewCategoryName('')
    setNewParentId(undefined)
    setShowAddCategory(false)
  }

  // Update category name
  const updateCategoryName = async (categoryId: number) => {
    if (!db) {
      toast.error('Database not available')
      return
    }
    if (!editingCategoryName.trim()) return

    await db.categories.update(categoryId, {
      name: editingCategoryName.trim(),
      updatedAt: new Date().toISOString(),
    })

    toast.success('Category updated!')
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  // Delete category
  const deleteCategory = async (categoryId: number, categoryName: string) => {
    if (!db) {
      toast.error('Database not available')
      return
    }
    const count = getCategoryTransactionCount(categoryId)
    if (count > 0) {
      toast.error(`Cannot delete "${categoryName}" - it has ${count} transactions`)
      return
    }

    if (!window.confirm(`Delete category "${categoryName}"?`)) return

    // Also delete children
    const children = categories?.filter(c => c.parentId === categoryId) || []
    for (const child of children) {
      if (child.id) await db.categories.delete(child.id)
    }

    await db.categories.delete(categoryId)
    toast.success('Category deleted!')
  }

  // Clear all data
  const clearAllData = async () => {
    if (!db) {
      toast.error('Database not available')
      return
    }
    if (window.confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
      await db.transactions.clear()
      await db.accounts.clear()
      await db.categories.clear()
      ActionLogger.dataClear('all')
      toast.success('All data cleared.')
    }
  }

  // Log page view on mount
  useEffect(() => {
    ActionLogger.pageView('/settings')
  }, [])

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Manage categories, accounts, and data
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('data')}
              className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition ${
                activeTab === 'data'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Data Management
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition ${
                activeTab === 'categories'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Tag className="w-4 h-4" />
              Categories
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition ${
                activeTab === 'accounts'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Landmark className="w-4 h-4" />
              Accounts
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Data Management Tab */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <BackupSection />
            <SnapshotSection />

            {/* Danger Zone */}
            <div className="bg-card rounded-lg border border-destructive/50 p-6">
              <h2 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h2>
              <p className="text-sm text-muted-foreground mb-4">
                These actions are irreversible. Please be careful.
              </p>
              <Button variant="destructive" onClick={clearAllData}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </Button>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {/* Add Category Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Categories ({categories?.length || 0})
              </h2>
              <Button onClick={() => setShowAddCategory(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>

            {/* Add Category Form */}
            {showAddCategory && (
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                      autoFocus
                    />
                    <select
                      value={newCategoryType}
                      onChange={(e) => setNewCategoryType(e.target.value as 'EXPENSE' | 'INCOME')}
                      className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                    >
                      <option value="EXPENSE">Expense</option>
                      <option value="INCOME">Income</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <select
                      value={newParentId || ''}
                      onChange={(e) => setNewParentId(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                    >
                      <option value="">No parent (root category)</option>
                      {categories?.filter(c => c.type === newCategoryType && !c.parentId).map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <Button onClick={addCategory} size="sm">
                      <Check className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                    <Button variant="ghost" onClick={() => setShowAddCategory(false)} size="sm">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Expense Categories */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => toggleCategoryType('EXPENSE')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedCategoryTypes.has('EXPENSE') ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <div className="text-left">
                    <h3 className="font-semibold">Expense Categories</h3>
                    <p className="text-sm text-muted-foreground">
                      {categoryHierarchy.EXPENSE.length} categories
                    </p>
                  </div>
                </div>
              </button>

              {expandedCategoryTypes.has('EXPENSE') && (
                <div className="border-t border-border p-4 space-y-2">
                  {categoryHierarchy.EXPENSE.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No expense categories yet</p>
                  ) : (
                    categoryHierarchy.EXPENSE.map((cat: any) => (
                      <div key={cat.id} className="space-y-1">
                        {/* Parent Category */}
                        <div className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50">
                          {editingCategoryId === cat.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                className="flex-1 px-2 py-1 border border-border rounded bg-background text-sm"
                                autoFocus
                              />
                              <Button size="sm" variant="ghost" onClick={() => updateCategoryName(cat.id!)}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingCategoryId(null)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                {cat.icon && <span className="text-lg">{cat.icon}</span>}
                                <span className="font-medium">{cat.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({getCategoryTransactionCount(cat.id!)} txns)
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingCategoryId(cat.id!)
                                    setEditingCategoryName(cat.name)
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteCategory(cat.id!, cat.name)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Children */}
                        {cat.children && cat.children.length > 0 && (
                          <div className="ml-6 space-y-1">
                            {cat.children.map((child: Category) => (
                              <div key={child.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/30">
                                {editingCategoryId === child.id ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <input
                                      type="text"
                                      value={editingCategoryName}
                                      onChange={(e) => setEditingCategoryName(e.target.value)}
                                      className="flex-1 px-2 py-1 border border-border rounded bg-background text-sm"
                                      autoFocus
                                    />
                                    <Button size="sm" variant="ghost" onClick={() => updateCategoryName(child.id!)}>
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingCategoryId(null)}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">↳</span>
                                      {child.icon && <span className="text-lg">{child.icon}</span>}
                                      <span>{child.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        ({getCategoryTransactionCount(child.id!)} txns)
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingCategoryId(child.id!)
                                          setEditingCategoryName(child.name)
                                        }}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteCategory(child.id!, child.name)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Income Categories */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => toggleCategoryType('INCOME')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedCategoryTypes.has('INCOME') ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <div className="text-left">
                    <h3 className="font-semibold">Income Categories</h3>
                    <p className="text-sm text-muted-foreground">
                      {categoryHierarchy.INCOME.length} categories
                    </p>
                  </div>
                </div>
              </button>

              {expandedCategoryTypes.has('INCOME') && (
                <div className="border-t border-border p-4 space-y-2">
                  {categoryHierarchy.INCOME.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No income categories yet</p>
                  ) : (
                    categoryHierarchy.INCOME.map((cat: any) => (
                      <div key={cat.id} className="space-y-1">
                        {/* Parent Category */}
                        <div className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50">
                          {editingCategoryId === cat.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                className="flex-1 px-2 py-1 border border-border rounded bg-background text-sm"
                                autoFocus
                              />
                              <Button size="sm" variant="ghost" onClick={() => updateCategoryName(cat.id!)}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingCategoryId(null)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                {cat.icon && <span className="text-lg">{cat.icon}</span>}
                                <span className="font-medium">{cat.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({getCategoryTransactionCount(cat.id!)} txns)
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingCategoryId(cat.id!)
                                    setEditingCategoryName(cat.name)
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteCategory(cat.id!, cat.name)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Children */}
                        {cat.children && cat.children.length > 0 && (
                          <div className="ml-6 space-y-1">
                            {cat.children.map((child: Category) => (
                              <div key={child.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/30">
                                {editingCategoryId === child.id ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <input
                                      type="text"
                                      value={editingCategoryName}
                                      onChange={(e) => setEditingCategoryName(e.target.value)}
                                      className="flex-1 px-2 py-1 border border-border rounded bg-background text-sm"
                                      autoFocus
                                    />
                                    <Button size="sm" variant="ghost" onClick={() => updateCategoryName(child.id!)}>
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingCategoryId(null)}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">↳</span>
                                      {child.icon && <span className="text-lg">{child.icon}</span>}
                                      <span>{child.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        ({getCategoryTransactionCount(child.id!)} txns)
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingCategoryId(child.id!)
                                          setEditingCategoryName(child.name)
                                        }}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteCategory(child.id!, child.name)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Landmark className="w-5 h-5" />
                Accounts ({accounts?.length || 0})
              </h2>
            </div>

            {!accounts || accounts.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-8 text-center">
                <Landmark className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No accounts yet. Add accounts from the Accounts page.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from(accountsByType.entries()).map(([accountType, typeAccounts]) => {
                  const typeKey = `type-${accountType}`
                  const isExpanded = expandedAccountTypes.has(typeKey)
                  const totalBalance = typeAccounts.reduce((sum, acc) => sum + acc.balance, 0)

                  return (
                    <div key={typeKey} className="bg-card rounded-lg border border-border overflow-hidden">
                      <button
                        onClick={() => toggleAccountType(typeKey)}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div className="text-left">
                            <h3 className="font-semibold">{ACCOUNT_TYPE_LABELS[accountType] || accountType}</h3>
                            <p className="text-sm text-muted-foreground">
                              {typeAccounts.length} account{typeAccounts.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{totalBalance.toLocaleString()}
                          </p>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border p-4 space-y-2">
                          {typeAccounts.map(account => (
                            <div
                              key={account.id}
                              className="flex items-center justify-between p-3 rounded bg-muted/30 hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: account.color || '#6366f1' }}
                                />
                                <div>
                                  <p className="font-medium">{account.name}</p>
                                  {account.group && (
                                    <p className="text-xs text-muted-foreground">{account.group}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-semibold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ₹{account.balance.toLocaleString()}
                                </p>
                                {account.balance < account.thresholdValue && (
                                  <p className="text-xs text-orange-500">Below threshold</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
