'use client'

import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Account, type Category, type Transaction } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Settings, Tag, Landmark, Pencil, Trash2, Plus, X, Check, FolderOpen, ChevronDown, ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Key } from 'lucide-react'
import { ActionLogger } from '@/lib/actionLogger'
import { BackupSection } from '@/components/settings/BackupSection'
import { SnapshotSection } from '@/components/settings/SnapshotSection'

type TabType = 'categories' | 'accounts' | 'data' | 'api'
type CategoryTypeFilter = 'all' | 'expense' | 'income'

// Delete confirmation modal state
interface DeleteModalState {
  isOpen: boolean
  type: 'category' | 'subcategory' | null
  categoryName: string
  subCategoryName?: string
  transactionCount: number
  transferTo: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('data')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedAccountTypes, setExpandedAccountTypes] = useState<Set<string>>(new Set())

  // Add category/subcategory state
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryType, setNewCategoryType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [showAddSubCategory, setShowAddSubCategory] = useState<string | null>(null) // category name or null
  const [newSubCategoryName, setNewSubCategoryName] = useState('')
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<CategoryTypeFilter>('all')
  const [expandedCategoryTypes, setExpandedCategoryTypes] = useState<Set<string>>(new Set(['EXPENSE', 'INCOME']))

  // API Keys state
  const [apiKeys, setApiKeys] = useState({
    gemini: '',
    openai: '',
    claude: ''
  })
  const [showApiKeys, setShowApiKeys] = useState(false)

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    type: null,
    categoryName: '',
    subCategoryName: undefined,
    transactionCount: 0,
    transferTo: ''
  })

  // Fetch data
  const accounts = useLiveQuery(() => db.accounts.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])

  // Get unique categories with their subcategories from transactions
  // Also determine if category is primarily INCOME or EXPENSE based on transaction types
  const categoriesWithSubcategories = useMemo(() => {
    if (!transactions) return []

    const catMap = new Map<string, {
      count: number
      total: number
      incomeCount: number
      expenseCount: number
      subCategories: Map<string, { count: number; total: number }>
    }>()

    transactions.forEach((tx: Transaction) => {
      const category = categories?.find(c => c.id === tx.categoryId)
      if (category) {
        const catName = category.name
        const existing = catMap.get(catName) || {
          count: 0,
          total: 0,
          incomeCount: 0,
          expenseCount: 0,
          subCategories: new Map()
        }
        existing.count += 1
        existing.total += tx.amount

        // Track transaction type for determining category type
        if (tx.transactionType === 'INCOME') {
          existing.incomeCount += 1
        } else if (tx.transactionType === 'EXPENSE') {
          existing.expenseCount += 1
        }
        
        // This logic seems flawed for subcategories as they aren't directly on the transaction in the new model
        // if (tx.subCategory) {
        //   const subExisting = existing.subCategories.get(tx.subCategory) || { count: 0, total: 0 }
        //   existing.subCategories.set(tx.subCategory, {
        //     count: subExisting.count + 1,
        //     total: subExisting.total + tx.amount,
        //   })
        // }

        catMap.set(catName, existing)
      }
    })

    return Array.from(catMap.entries())
      .map(([name, data]) => {
        const cat = categories?.find(c => c.name === name);
        return {
          name,
          count: data.count,
          total: data.total,
          type: cat?.type || 'EXPENSE',
          subCategories: [] // Subcategory logic needs rework based on new data model
        }
      })
      .sort((a, b) => b.count - a.count)
  }, [transactions, categories])

  // Group categories by type (INCOME vs EXPENSE)
  const categoriesByType = useMemo(() => {
    const grouped = {
      EXPENSE: categoriesWithSubcategories.filter(c => c.type === 'EXPENSE'),
      INCOME: categoriesWithSubcategories.filter(c => c.type === 'INCOME')
    }
    return grouped
  }, [categoriesWithSubcategories])

  // Filtered categories based on type filter
  const filteredCategories = useMemo(() => {
    if (categoryTypeFilter === 'all') return categoriesWithSubcategories
    if (categoryTypeFilter === 'expense') return categoriesByType.EXPENSE
    return categoriesByType.INCOME
  }, [categoriesWithSubcategories, categoriesByType, categoryTypeFilter])

  // Group accounts by type, then by group within each type
  const accountsByTypeAndGroup = useMemo(() => {
    if (!accounts) return new Map<string, Map<string, Account[]>>()

    const typeMap = new Map<string, Map<string, Account[]>>()

    accounts.forEach(account => {
      const typeName = account.type || 'OTHER'
      const groupName = account.groupId?.toString() || 'Ungrouped' // Changed to groupId

      if (!typeMap.has(typeName)) {
        typeMap.set(typeName, new Map())
      }
      const groupMap = typeMap.get(typeName)!

      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, [])
      }
      groupMap.get(groupName)!.push(account)
    })

    // Sort types
    const sortedTypeMap = new Map(
      Array.from(typeMap.entries()).sort(([a], [b]) => a.localeCompare(b))
    )

    return sortedTypeMap
  }, [accounts])

  const toggleCategory = (catName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(catName)) {
        newSet.delete(catName)
      } else {
        newSet.add(catName)
      }
      return newSet
    })
  }

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
    if (!newCategoryName.trim()) return

    const exists = categories?.some(
      cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    )
    if (exists) {
      window.alert('Category already exists!')
      return
    }

    await db.categories.add({
      name: newCategoryName.trim(),
      type: newCategoryType,
      icon: 'tag',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    setNewCategoryName('')
    setNewCategoryType('EXPENSE')
    setShowAddCategory(false)
  }
  
  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedKeys = {
      gemini: localStorage.getItem('gemini_api_key') || '',
      openai: localStorage.getItem('openai_api_key') || '',
      claude: localStorage.getItem('claude_api_key') || '',
    };
    setApiKeys(savedKeys);
  }, []);

  // Save API keys
  const saveApiKeys = () => {
    localStorage.setItem('gemini_api_key', apiKeys.gemini);
    localStorage.setItem('openai_api_key', apiKeys.openai);
    localStorage.setItem('claude_api_key', apiKeys.claude);
    window.alert('API keys saved securely to browser storage.')
  }

  // Clear all data
  const clearAllData = async () => {
    if (window.confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
      await db.transactions.clear()
      await db.accounts.clear()
      await db.categories.clear()
      ActionLogger.dataClear('all')
      window.alert('All data cleared.')
    }
  }

  // Log page view on mount
  useEffect(() => {
    ActionLogger.pageView('/settings')
  }, [])
  
  return (
    <div className="min-h-screen bg-background pb-24 text-white">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
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
              onClick={() => setActiveTab('api')}
              className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition ${
                activeTab === 'api'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Key className="w-4 h-4" />
              API Keys
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
        
        {/* Categories Tab (simplified) */}
        {activeTab === 'categories' && (
          <div className="bg-card rounded-lg border border-border p-6">
             <h2 className="text-lg font-semibold flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Categories
              </h2>
              {/* Simplified category management UI */}
          </div>
        )}

        {/* Accounts Tab (simplified) */}
        {activeTab === 'accounts' && (
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              Accounts ({accounts?.length || 0})
            </h2>
            {/* Simplified account management UI */}
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api' && (
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Key className="w-5 h-5" />
              <div>
                <h2 className="text-lg font-semibold">LLM API Keys</h2>
                <p className="text-sm text-muted-foreground">
                  Configure API keys for AI-powered SMS parsing. Keys are stored securely in browser storage.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKeys ? 'text' : 'password'}
                    value={apiKeys.gemini}
                    onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                    placeholder="AIza..."
                    className="w-full px-3 py-2 border border-border rounded bg-background text-sm pr-20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  OpenAI API Key
                </label>
                <input
                  type={showApiKeys ? 'text' : 'password'}
                  value={apiKeys.openai}
                  onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-border rounded bg-background text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Anthropic Claude API Key
                </label>
                <input
                  type={showApiKeys ? 'text' : 'password'}
                  value={apiKeys.claude}
                  onChange={(e) => setApiKeys({ ...apiKeys, claude: e.target.value })}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 border border-border rounded bg-background text-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showApiKeys}
                    onChange={(e) => setShowApiKeys(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm">Show API keys</span>
                </label>
                <Button onClick={saveApiKeys}>
                  <Check className="w-4 h-4 mr-2" />
                  Save API Keys
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}