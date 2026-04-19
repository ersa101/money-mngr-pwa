'use client'

import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext'
import type { Account, Category, Transaction } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Settings, Tag, Landmark, Pencil, Trash2, Plus, X, Check, FolderOpen, ChevronDown, ChevronRight, TrendingUp, TrendingDown, KeyRound, Eye, EyeOff, LogOut } from 'lucide-react'
import { ActionLogger } from '@/lib/actionLogger'
import { BackupSection } from '@/components/settings/BackupSection'
import { SnapshotSection } from '@/components/settings/SnapshotSection'
import { LocalBackupSection } from '@/components/settings/LocalBackupSection'
import { AccountsTable } from '@/components/settings/AccountsTable'
import toast from 'react-hot-toast'
import { pushToSheets } from '@/lib/syncService'
import { useSession, signOut } from 'next-auth/react'

type TabType = 'categories' | 'accounts' | 'data' | 'ai-keys'

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
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<TabType>('data')
  // Mobile accordion: all sections start open
  const [mobileExpanded, setMobileExpanded] = useState<Set<TabType>>(
    new Set(['data', 'categories', 'accounts', 'ai-keys'])
  )
  const toggleMobileSection = (tab: TabType) => {
    setMobileExpanded(prev => {
      const next = new Set(prev)
      if (next.has(tab)) next.delete(tab); else next.add(tab)
      return next
    })
  }
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

  // AI API keys — 3 slots (provider + key + show toggle)
  type AIProvider = 'gemini' | 'claude' | 'openai'
  type Slot = { provider: AIProvider; key: string; show: boolean }
  const [slots, setSlots] = useState<Slot[]>([
    { provider: 'gemini', key: '', show: false },
    { provider: 'claude', key: '', show: false },
    { provider: 'openai', key: '', show: false },
  ])
  const [aiKeysSaved, setAiKeysSaved] = useState(false)

  // Load slots from DB on mount; one-time migrate legacy gemini_api_key / claude_api_key
  useEffect(() => {
    if (!db) return
    ;(async () => {
      const [s1p, s1k, s2p, s2k, s3p, s3k, legacyGemini, legacyClaude] = await Promise.all([
        db.appSettings.get('ai_slot_1_provider'),
        db.appSettings.get('ai_slot_1_key'),
        db.appSettings.get('ai_slot_2_provider'),
        db.appSettings.get('ai_slot_2_key'),
        db.appSettings.get('ai_slot_3_provider'),
        db.appSettings.get('ai_slot_3_key'),
        db.appSettings.get('gemini_api_key'),
        db.appSettings.get('claude_api_key'),
      ])

      // If new slots are empty but legacy keys exist → migrate once
      const slot1HasKey = !!s1k?.value
      const slot2HasKey = !!s2k?.value
      if (!slot1HasKey && legacyGemini?.value) {
        await db.appSettings.put({ key: 'ai_slot_1_provider', value: 'gemini' })
        await db.appSettings.put({ key: 'ai_slot_1_key', value: legacyGemini.value })
        await db.appSettings.delete('gemini_api_key')
      }
      if (!slot2HasKey && legacyClaude?.value) {
        await db.appSettings.put({ key: 'ai_slot_2_provider', value: 'claude' })
        await db.appSettings.put({ key: 'ai_slot_2_key', value: legacyClaude.value })
        await db.appSettings.delete('claude_api_key')
      }

      // Re-read after possible migration
      const [r1p, r1k, r2p, r2k, r3p, r3k] = await Promise.all([
        db.appSettings.get('ai_slot_1_provider'),
        db.appSettings.get('ai_slot_1_key'),
        db.appSettings.get('ai_slot_2_provider'),
        db.appSettings.get('ai_slot_2_key'),
        db.appSettings.get('ai_slot_3_provider'),
        db.appSettings.get('ai_slot_3_key'),
      ])

      setSlots([
        { provider: (r1p?.value as AIProvider) || 'gemini', key: r1k?.value || '', show: false },
        { provider: (r2p?.value as AIProvider) || 'claude', key: r2k?.value || '', show: false },
        { provider: (r3p?.value as AIProvider) || 'openai', key: r3k?.value || '', show: false },
      ])
    })()
  }, [db])

  const updateSlot = (idx: number, field: 'provider' | 'key' | 'show', value: string | boolean) => {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const saveAiKeys = async () => {
    if (!db) return
    for (let i = 0; i < 3; i++) {
      const n = i + 1
      await db.appSettings.put({ key: `ai_slot_${n}_provider`, value: slots[i].provider })
      await db.appSettings.put({ key: `ai_slot_${n}_key`, value: slots[i].key.trim() })
    }
    setAiKeysSaved(true)
    setTimeout(() => setAiKeysSaved(false), 2000)
    toast.success('API keys saved!')
  }

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
      updatedAt: Date.now(),
    })

    pushToSheets()
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
      updatedAt: Date.now(),
    })

    pushToSheets()
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
    pushToSheets()
    toast.success('Category deleted!')
  }

  // Clear data (replace-tables only — never touches lifeEvents, feedbackLog, computedInsights)
  const clearAllData = async () => {
    if (!db) {
      toast.error('Database not available')
      return
    }
    if (window.confirm('This will permanently delete all accounts, categories, transactions, budgets, goals, filter presets, category buckets, and settings. Life events, feedback, and AI insights are preserved.\n\nThis cannot be undone.')) {
      await db.transaction('rw', [
        db.transactions, db.accounts, db.categories, db.filterPresets,
        db.budgets, db.goals, db.categoryBuckets, db.appSettings,
      ], async () => {
        await db.transactions.clear()
        await db.accounts.clear()
        await db.categories.clear()
        await db.filterPresets.clear()
        await db.budgets.clear()
        await db.goals.clear()
        await db.categoryBuckets.clear()
        await db.appSettings.clear()
      })
      ActionLogger.dataClear('all')
      toast.success('Data cleared.')
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Manage categories, accounts, and data
                </p>
              </div>
            </div>

            {/* User info + sign-out */}
            {session?.user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 leading-tight">{session.user.name}</p>
                  <p className="text-xs text-gray-500 leading-tight">{session.user.email}</p>
                </div>
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {(session.user.name || session.user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-300 hover:text-red-600 text-gray-500 text-sm transition"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile section list — full-width vertical, replaces horizontal tabs */}
          <div className="flex flex-col gap-1 md:hidden mb-2">
            {([
              { tab: 'data',       icon: FolderOpen, label: 'Data Management' },
              { tab: 'categories', icon: Tag,        label: 'Categories' },
              { tab: 'accounts',   icon: Landmark,   label: 'Accounts' },
              { tab: 'ai-keys',    icon: KeyRound,   label: 'AI Keys' },
            ] as const).map(({ tab, icon: Icon, label }) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium transition min-h-[44px] ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {label}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${activeTab === tab ? 'rotate-180' : ''}`} />
              </button>
            ))}
          </div>

          {/* Desktop tabs */}
          <div className="hidden md:flex gap-2">
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
            <button
              onClick={() => setActiveTab('ai-keys')}
              className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition ${
                activeTab === 'ai-keys'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              AI Keys
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* AI Keys Tab */}
        {activeTab === 'ai-keys' && (
          <div className="space-y-6 max-w-lg">
            <div className="bg-card rounded-lg border border-border p-6 space-y-5">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">AI API Keys</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Keys are stored locally in your browser (IndexedDB). They are never sent to our servers — only forwarded directly to the AI provider when you use FAIN.
                Slots are tried in order (1 → 2 → 3). Leave unused slots blank.
              </p>

              {(['Slot 1 (Primary)', 'Slot 2 (Fallback)', 'Slot 3 (Fallback)'] as const).map((label, idx) => (
                <div key={idx} className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{label}</label>
                  <div className="flex gap-2">
                    <select
                      value={slots[idx].provider}
                      onChange={(e) => updateSlot(idx, 'provider', e.target.value)}
                      className="bg-background border border-border rounded-md px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
                    >
                      <option value="gemini">Gemini</option>
                      <option value="claude">Claude</option>
                      <option value="openai">OpenAI</option>
                    </select>
                    <input
                      type={slots[idx].show ? 'text' : 'password'}
                      value={slots[idx].key}
                      onChange={(e) => updateSlot(idx, 'key', e.target.value)}
                      placeholder={
                        slots[idx].provider === 'gemini' ? 'AIza...' :
                        slots[idx].provider === 'claude' ? 'sk-ant-...' : 'sk-...'
                      }
                      className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => updateSlot(idx, 'show', !slots[idx].show)}
                      className="p-2 text-muted-foreground hover:text-foreground border border-border rounded-md transition"
                      title={slots[idx].show ? 'Hide' : 'Show'}
                    >
                      {slots[idx].show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}

              <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
                <p>• Gemini: free key from aistudio.google.com (AIza...)</p>
                <p>• Claude: anthropic.com/console (sk-ant-...)</p>
                <p>• OpenAI: platform.openai.com (sk-...)</p>
              </div>

              <Button onClick={saveAiKeys} className="w-full">
                {aiKeysSaved ? <><Check className="w-4 h-4 mr-2" /> Saved!</> : 'Save API Keys'}
              </Button>
            </div>
          </div>
        )}

        {/* Data Management Tab */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <BackupSection />
            <SnapshotSection />
            <LocalBackupSection />

            {/* Danger Zone */}
            <div className="bg-card rounded-lg border border-destructive/50 p-6">
              <h2 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h2>
              <p className="text-sm text-muted-foreground mb-4">
                These actions are irreversible. Please be careful.
              </p>
              <Button variant="destructive" onClick={clearAllData}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Data
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
          <AccountsTable />
        )}
      </div>
    </div>
  )
}
