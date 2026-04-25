'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'
import type { Account, Category, Transaction, FilterPreset } from '@/types/database'
import { AddTransactionModal, CSVUploadModal } from '@/components'
import { TransactionList } from '@/components/transactions/TransactionList'
import { SaveFilterModal, computeBillingDates } from '@/components/transactions/SaveFilterModal'
import { Plus, Search, Filter, Upload, X, ChevronDown, ChevronRight, Bookmark, Pencil, Trash2 } from 'lucide-react'
import { ActionLogger } from '@/lib/actionLogger'
import toast from 'react-hot-toast'

type TypeFilter = 'all' | 'expense' | 'income' | 'transfer'
type DateGrouping = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'none'

interface TransactionGroup {
  key: string
  label: string
  transactions: Transaction[]
  totalIncome: number
  totalExpense: number
  net: number
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Helper function to get group key and label
function getGroupKeyAndLabel(date: Date, filter: DateGrouping): { key: string; label: string } {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  switch (filter) {
    case 'daily': {
      const key = date.toISOString().split('T')[0] // YYYY-MM-DD
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let label: string
      if (key === today.toISOString().split('T')[0]) {
        label = 'Today'
      } else if (key === yesterday.toISOString().split('T')[0]) {
        label = 'Yesterday'
      } else {
        label = date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: year !== today.getFullYear() ? 'numeric' : undefined,
        })
      }
      return { key, label }
    }

    case 'weekly': {
      const weekStart = new Date(date)
      weekStart.setDate(day - date.getDay()) // Sunday
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const key = weekStart.toISOString().split('T')[0]
      const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      return { key, label }
    }

    case 'monthly': {
      const key = `${year}-${String(month + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      return { key, label }
    }

    case 'quarterly': {
      const quarter = Math.floor(month / 3) + 1
      const key = `${year}-Q${quarter}`
      const label = `Q${quarter} ${year}`
      return { key, label }
    }

    case 'semi-annual': {
      const half = month < 6 ? 1 : 2
      const key = `${year}-H${half}`
      const label = `H${half} ${year}`
      return { key, label }
    }

    case 'annual': {
      const key = String(year)
      const label = String(year)
      return { key, label }
    }

    default:
      return { key: 'all', label: 'All Transactions' }
  }
}

function TransactionsPage() {
  const db = useDb()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Date grouping state
  const [dateGrouping, setDateGrouping] = useState<DateGrouping>('daily')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Advanced filter state
  const [showPresetsPanel, setShowPresetsPanel] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [filterAccount, setFilterAccount] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [filterAmountMin, setFilterAmountMin] = useState<string>('')
  const [filterAmountMax, setFilterAmountMax] = useState<string>('')
  const [filterSubCategory, setFilterSubCategory] = useState<string>('')

  // Preset state
  const [activePresetId, setActivePresetId] = useState<number | null>(null)
  const [editingPreset, setEditingPreset] = useState<FilterPreset | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)

  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db])
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db])
  const transactions = useLiveQuery(() => db?.transactions.orderBy('date').reverse().toArray() ?? [], [db])
  const filterPresets = useLiveQuery(() => db?.filterPresets.toArray() ?? [], [db]) || []

  // Unique note/description pool for search autocomplete — sorted by most-recently-used first
  const allNoteValues = useMemo(() => {
    if (!transactions) return []
    // transactions arrive newest-first; only set on first encounter to preserve newest date per note
    const noteMap = new Map<string, string>() // note → most-recent date string
    transactions.forEach(t => {
      if (t.description?.trim() && !noteMap.has(t.description.trim())) noteMap.set(t.description.trim(), t.date)
      if (t.notes?.trim() && !noteMap.has(t.notes.trim())) noteMap.set(t.notes.trim(), t.date)
    })
    return Array.from(noteMap.entries())
      .sort((a, b) => b[1].localeCompare(a[1]))
      .map(([note]) => note)
  }, [transactions])

  const handleSearchChange = (value: string) => {
    setSearchText(value)
    setActivePresetId(null)
    if (value.trim().length > 0) {
      setDateGrouping('none') // auto-disable grouping when searching
      const filtered = allNoteValues.filter(n =>
        n.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10)
      setSearchSuggestions(filtered)
      setShowSearchSuggestions(filtered.length > 0)
    } else {
      setShowSearchSuggestions(false)
    }
  }


  // Get unique categories from transactions for filter dropdown.
  // Scoped to the currently selected typeFilter so that when the user picks
  // "Income" only income-category names appear, and vice-versa for Expense.
  const uniqueCategories = useMemo(() => {
    if (!transactions) return []
    const cats = new Set<string>()
    transactions.forEach(tx => {
      // Skip transactions that don't match the active type filter
      if (typeFilter === 'expense' && tx.transactionType !== 'EXPENSE') return
      if (typeFilter === 'income' && tx.transactionType !== 'INCOME') return
      if (typeFilter === 'transfer') return // transfers use accounts, not categories

      const category = categories?.find(c => c.id === tx.categoryId)
      if (category) cats.add(category.name)
      // Also include csvCategory as a fallback for CSV-imported transactions
      else if (tx.csvCategory) cats.add(tx.csvCategory)
    })
    return Array.from(cats).sort()
  }, [transactions, categories, typeFilter])

  // Subcategories for the currently selected filterCategory
  const availableSubCategories = useMemo(() => {
    if (!categories || !filterCategory) return []
    const parentCat = categories.find(c => c.name === filterCategory && !c.parentId)
    if (!parentCat) return []
    return categories.filter(c => c.parentId === parentCat.id)
  }, [categories, filterCategory])

  // Clear category + subcategory when type changes
  useEffect(() => {
    setFilterCategory('')
    setFilterSubCategory('')
  }, [typeFilter])

  // Clear subcategory when category changes
  useEffect(() => {
    setFilterSubCategory('')
  }, [filterCategory])

  useEffect(() => {
    ActionLogger.pageView('/transactions')
  }, [])

  const hasActiveFilters = !!(searchText || filterAccount || filterCategory || filterSubCategory || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax || typeFilter !== 'all')

  const clearFilters = () => {
    setSearchText('')
    setFilterAccount('')
    setFilterCategory('')
    setFilterSubCategory('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterAmountMin('')
    setFilterAmountMax('')
    setTypeFilter('all')
    setActivePresetId(null)
  }

  const applyPreset = (preset: FilterPreset) => {
    let dateFrom = ''
    let dateTo = ''

    if (preset.dateOffsetType?.startsWith('billing-')) {
      const match = preset.dateOffsetType.match(/^billing-(\d+)-(\d+)(?:-(\d+))?$/)
      if (match) {
        const offset = match[3] ? parseInt(match[3]) : 0
        const range = computeBillingDates(parseInt(match[1]), parseInt(match[2]), offset)
        dateFrom = range.from
        dateTo = range.to
      }
    } else if (preset.dateOffsetType === 'custom') {
      dateFrom = preset.dateOffsetStart || ''
      dateTo = preset.dateOffsetEnd || ''
    }

    const categoryName = categories?.find(c => c.id === preset.categoryId)?.name || ''
    const subCategoryName = categories?.find(c => c.id === preset.subCategoryId)?.name || ''

    setSearchText(preset.searchText || '')
    setFilterAccount(preset.accountId?.toString() || '')
    setTypeFilter((preset.transactionType as TypeFilter) || 'all')
    setFilterCategory(categoryName)
    setFilterSubCategory(subCategoryName)
    setFilterDateFrom(dateFrom)
    setFilterDateTo(dateTo)
    setFilterAmountMin(preset.amountMin?.toString() || '')
    setFilterAmountMax(preset.amountMax?.toString() || '')
    setActivePresetId(preset.id!)
  }

  const deletePreset = async (preset: FilterPreset) => {
    if (!confirm(`Delete filter preset "${preset.name}"?`)) return
    await db.filterPresets.delete(preset.id!)
    if (activePresetId === preset.id) setActivePresetId(null)
    toast.success('Filter preset deleted')
  }

  const getPresetSummary = (preset: FilterPreset): string => {
    const parts: string[] = []
    if (preset.searchText) parts.push(`"${preset.searchText}"`)
    if (preset.transactionType && preset.transactionType !== 'all') {
      parts.push(preset.transactionType.charAt(0) + preset.transactionType.slice(1).toLowerCase())
    }
    if (preset.accountId) {
      const acc = accounts?.find(a => a.id === preset.accountId)
      if (acc) parts.push(acc.name)
    }
    if (preset.categoryId) {
      const cat = categories?.find(c => c.id === preset.categoryId)
      if (cat) parts.push(cat.name)
    }
    if (preset.subCategoryId) {
      const sc = categories?.find(c => c.id === preset.subCategoryId)
      if (sc) parts.push(`> ${sc.name}`)
    }
    if (preset.dateOffsetType?.startsWith('billing-')) {
      const match = preset.dateOffsetType.match(/^billing-(\d+)-(\d+)(?:-(\d+))?$/)
      if (match) {
        const offset = match[3] ? parseInt(match[3]) : 0
        parts.push(`Billing ${match[1]}th–${match[2]}th${offset > 0 ? ' (Prev)' : ''}`)
      }
    } else if (preset.dateOffsetType === 'custom') {
      if (preset.dateOffsetStart || preset.dateOffsetEnd) {
        parts.push(`${preset.dateOffsetStart || '?'} → ${preset.dateOffsetEnd || '?'}`)
      }
    }
    if (preset.amountMin != null || preset.amountMax != null) {
      parts.push(`₹${preset.amountMin ?? 0}–${preset.amountMax ?? '∞'}`)
    }
    return parts.join(' · ') || 'No filters set'
  }

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []

    return transactions.filter((tx: Transaction) => {
      // Skip null/undefined transactions
      if (!tx) return false
      if (typeFilter === 'expense' && tx.transactionType !== 'EXPENSE') return false
      if (typeFilter === 'income' && tx.transactionType !== 'INCOME') return false
      if (typeFilter === 'transfer' && tx.transactionType !== 'TRANSFER') return false

      const txDate = new Date(tx.date)
      if (isNaN(txDate.getTime())) return false

      if (searchText) {
        const searchLower = searchText.toLowerCase()
        const category = categories?.find(c => c.id === tx.categoryId)
        const matchesSearch =
          (tx.description || '').toLowerCase().includes(searchLower) ||
          (category?.name || '').toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      if (filterAccount && tx.fromAccountId !== parseInt(filterAccount) && tx.toAccountId !== parseInt(filterAccount)) return false
      
      const category = categories?.find(c => c.id === tx.categoryId)
      if (filterCategory && category?.name !== filterCategory) return false

      if (filterSubCategory) {
        const subCat = categories?.find(c => c.id === tx.subCategoryId)
        if (!subCat || subCat.name !== filterSubCategory) return false
      }

      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (txDate < fromDate) return false
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo)
        toDate.setHours(23, 59, 59, 999)
        if (txDate > toDate) return false
      }

      if (filterAmountMin && tx.amount < parseFloat(filterAmountMin)) return false
      if (filterAmountMax && tx.amount > parseFloat(filterAmountMax)) return false

      return true
    })
  }, [transactions, typeFilter, searchText, filterAccount, filterCategory, filterSubCategory, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax, categories])

  // Totals across all currently filtered transactions — must be after filteredTransactions
  const filterTotals = useMemo(() => {
    if (!filteredTransactions || filteredTransactions.length === 0) return null
    const income = filteredTransactions
      .filter(t => t.transactionType === 'INCOME')
      .reduce((s, t) => s + t.amount, 0)
    const expense = filteredTransactions
      .filter(t => t.transactionType === 'EXPENSE')
      .reduce((s, t) => s + t.amount, 0)
    const transfer = filteredTransactions
      .filter(t => t.transactionType === 'TRANSFER')
      .reduce((s, t) => s + t.amount, 0)
    return { income, expense, transfer, count: filteredTransactions.length }
  }, [filteredTransactions])

  // Group transactions by selected period
  const groupedTransactions = useMemo(() => {
    if (dateGrouping === 'none' || !filteredTransactions.length) {
      return []
    }

    const groups = new Map<string, TransactionGroup>()

    for (const txn of filteredTransactions) {
      const date = new Date(txn.date)
      if (isNaN(date.getTime())) continue

      const { key, label } = getGroupKeyAndLabel(date, dateGrouping)

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label,
          transactions: [],
          totalIncome: 0,
          totalExpense: 0,
          net: 0,
        })
      }

      const group = groups.get(key)!
      group.transactions.push(txn)

      if (txn.transactionType === 'INCOME') {
        group.totalIncome += txn.amount
      } else if (txn.transactionType === 'EXPENSE') {
        group.totalExpense += txn.amount
      }
      group.net = group.totalIncome - group.totalExpense
    }

    // Sort groups by key (most recent first)
    return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key))
  }, [filteredTransactions, dateGrouping])

  // Auto-expand first group when grouping changes
  useEffect(() => {
    if (groupedTransactions.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set([groupedTransactions[0].key]))
    }
  }, [groupedTransactions.length])

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedGroups(newExpanded)
  }

  const dateGroupingOptions: { value: DateGrouping; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'semi-annual', label: 'Semi-Annual' },
    { value: 'annual', label: 'Annual' },
    { value: 'none', label: 'No Grouping' },
  ]

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleTap = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleCopy = async (transaction: Transaction) => {
    if (!db) { toast.error('Database not available'); return; }
    const { id, createdAt, updatedAt, ...rest } = transaction;
    const now = new Date();
    const copy = {
      ...rest,
      date: now.toISOString().slice(0, 16),
      source: 'MANUAL' as const,
      createdAt: now.toISOString(),
      updatedAt: Date.now(),
    };
    await db.transactions.add(copy);
    toast.success('Transaction duplicated');
  };

  const handleDelete = async (transaction: Transaction) => {
    if (!db) {
      toast.error('Database not available');
      return;
    }
    if (confirm('Are you sure you want to delete this transaction?')) {
      // Basic deletion, doesn't account for balance updates or linked txns from v3
      await db.transactions.delete(transaction.id!);
      toast.success('Transaction deleted');
      handleCloseModal();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Mobile FAB — floating Add button, bottom-right, above bottom nav */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center transition-colors"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        title="Add transaction"
      >
        <Plus size={26} className="text-white" />
      </button>

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">TALLY</h1>
            <p className="mt-1 text-sm text-gray-500">Transaction Activity Log & Ledger Yard</p>
          </div>
          {/* Desktop Add button — inline in header, hidden on mobile (FAB handles it) */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            <Plus size={18} />
            Add
          </button>
        </div>

        <div className="rounded-lg bg-white border border-gray-200 p-4 space-y-3">
          {/* ── Row 1: Search + Filter button + Add + Upload ── */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchText}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchText.trim() && searchSuggestions.length > 0 && setShowSearchSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setShowSearchSuggestions(false); (e.target as HTMLInputElement).blur() } }}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                autoComplete="off"
              />
              {searchText && (
                <button
                  onClick={() => { setSearchText(''); setShowSearchSuggestions(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              )}
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setSearchText(suggestion)
                        setShowSearchSuggestions(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter button — opens saved presets panel only */}
            <div className="relative">
              <button
                onClick={() => setShowPresetsPanel(!showPresetsPanel)}
                className={`relative flex items-center justify-center p-2 rounded-lg border transition-colors ${
                  showPresetsPanel
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
                title="Saved filters"
              >
                <Filter size={18} />
                {filterPresets.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-bold px-0.5">
                    {filterPresets.length}
                  </span>
                )}
              </button>

              {/* Presets dropdown */}
              {showPresetsPanel && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 sticky top-0 bg-white">
                    <span className="text-xs text-gray-500 uppercase font-medium tracking-wide">Saved Filters</span>
                    <button onClick={() => setShowPresetsPanel(false)} className="text-gray-400 hover:text-gray-700 p-0.5">
                      <X size={14} />
                    </button>
                  </div>
                  {filterPresets.length === 0 ? (
                    <div className="px-3 py-5 text-center text-sm text-gray-500">
                      No saved filters yet.<br />
                      <span className="text-xs">Fill in filters below and click Save.</span>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filterPresets.map(preset => (
                        <div
                          key={preset.id}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            activePresetId === preset.id
                              ? 'bg-purple-50 border-purple-400'
                              : 'bg-white border-gray-200 hover:border-gray-400'
                          }`}
                          onClick={() => { applyPreset(preset); setShowPresetsPanel(false) }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm">{preset.name}</div>
                            <div className="text-xs text-gray-500 truncate mt-0.5">{getPresetSummary(preset)}</div>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setEditingPreset(preset); setShowSaveModal(true); setShowPresetsPanel(false) }}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                            title="Edit preset"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); deletePreset(preset) }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                            title="Delete preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add button: hidden on mobile (FAB handles it), show on md only if no desktop header button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex md:hidden items-center justify-center p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus size={18} />
            </button>
            <CSVUploadModal
              onSuccess={() => {}}
              trigger={
                <button className="flex items-center justify-center p-2 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-100">
                  <Upload size={18} />
                </button>
              }
            />

            {/* ── Filter expand/collapse toggle ── */}
            <button
              onClick={() => setShowFilters(f => !f)}
              title={showFilters ? 'Collapse filters' : 'Expand filters'}
              className={`relative flex items-center justify-center p-2 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronDown
                size={18}
                className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
              />
              {hasActiveFilters && !showFilters && (
                <span className="absolute -top-1.5 -right-1.5 w-[10px] h-[10px] rounded-full bg-blue-500" />
              )}
            </button>
          </div>

          {/* ── Active preset indicator — always visible ── */}
          {activePresetId && (() => {
            const active = filterPresets.find(p => p.id === activePresetId)
            return active ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-300 rounded-lg text-sm">
                <Bookmark className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                <span className="text-purple-700 font-medium flex-1 truncate">{active.name}</span>
                <button onClick={clearFilters} className="text-purple-500 hover:text-purple-700 flex-shrink-0" title="Clear filter">
                  <X size={14} />
                </button>
              </div>
            ) : null
          })()}

          {/* ── Collapsible filter section ── */}
          {showFilters && (
            <>
              {/* Type Pills — horizontally scrollable on mobile, wrapping on desktop */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide md:flex-wrap">
                {(['all', 'expense', 'income', 'transfer'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setTypeFilter(f); setActivePresetId(null) }}
                    className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors min-h-[44px] ${
                      typeFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Account | Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Account</label>
                  <select
                    value={filterAccount}
                    onChange={(e) => { setFilterAccount(e.target.value); setActivePresetId(null) }}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="">All Accounts</option>
                    {accounts?.map((acc) => (
                      <option key={`filter-acc-${acc.id}`} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => { setFilterCategory(e.target.value); setActivePresetId(null) }}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="">All Categories</option>
                    {uniqueCategories.map((cat) => (
                      <option key={`filter-cat-${cat}`} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SubCategory — appears when category has children */}
              {availableSubCategories.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">SubCategory</label>
                  <select
                    value={filterSubCategory}
                    onChange={(e) => { setFilterSubCategory(e.target.value); setActivePresetId(null) }}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="">All SubCategories</option>
                    {availableSubCategories.map((sc) => (
                      <option key={`filter-sc-${sc.id}`} value={sc.name}>{sc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">From</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => { setFilterDateFrom(e.target.value); setActivePresetId(null) }}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">To</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => { setFilterDateTo(e.target.value); setActivePresetId(null) }}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Amount Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Min Amount</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filterAmountMin}
                    onChange={(e) => { setFilterAmountMin(e.target.value); setActivePresetId(null) }}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Max Amount</label>
                  <input
                    type="number"
                    placeholder="No limit"
                    value={filterAmountMax}
                    onChange={(e) => { setFilterAmountMax(e.target.value); setActivePresetId(null) }}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Save as Filter + Clear */}
              <div className="flex gap-2 pt-1 border-t border-gray-200">
                <button
                  onClick={() => { setEditingPreset(null); setShowSaveModal(true) }}
                  disabled={!hasActiveFilters}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    hasActiveFilters
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Bookmark size={15} />
                  Save as Filter
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors text-sm"
                  >
                    <X size={15} />
                    Clear
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Totals pills — outside filter card, always visible when active ── */}
        {hasActiveFilters && filterTotals && (
          <div className="flex flex-wrap gap-3">
            {/* Income */}
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
              <span className="text-green-600 font-bold text-base">▲</span>
              <span className="text-green-600 font-bold text-base">{formatCurrency(filterTotals.income)}</span>
            </div>
            {/* Expense */}
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <span className="text-red-600 font-bold text-base">▼</span>
              <span className="text-red-600 font-bold text-base">{formatCurrency(filterTotals.expense)}</span>
            </div>
            {/* Transfer */}
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
              <span className="text-blue-600 font-bold text-base">⇄</span>
              <span className="text-blue-600 font-bold text-base">{formatCurrency(filterTotals.transfer)}</span>
            </div>
            {/* Count */}
            <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5">
              <span className="text-gray-700 font-bold text-base">#</span>
              <span className="text-gray-700 font-bold text-base">{filterTotals.count}</span>
              <span className="text-gray-500 text-sm">txns</span>
            </div>
          </div>
        )}


        {/* Date Grouping Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {dateGroupingOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setDateGrouping(option.value)
                setExpandedGroups(new Set())
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                dateGrouping === option.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {!filteredTransactions || filteredTransactions.length === 0 ? (
            <div className="rounded-lg bg-white border border-gray-200 p-8 text-center">
              <p className="text-gray-500">
                {hasActiveFilters
                  ? 'No transactions match your filters.'
                  : 'No transactions yet. Add one to get started!'}
              </p>
            </div>
          ) : dateGrouping === 'none' ? (
            <TransactionList
              transactions={filteredTransactions}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTap={handleTap}
            />
          ) : (
            groupedTransactions.map((group) => {
              const isExpanded = expandedGroups.has(group.key)

              return (
                <div key={group.key} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Group Header (Clickable) */}
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                      <div className="text-left">
                        <div className="font-medium text-gray-900">{group.label}</div>
                        <div className="text-sm text-gray-500">
                          {group.transactions.length} transaction{group.transactions.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-medium ${
                          group.net >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {group.net >= 0 ? '+' : ''}
                        {formatCurrency(group.net)}
                      </div>
                      <div className="text-xs text-gray-400">
                        <span className="text-green-600">+{formatCurrency(group.totalIncome)}</span>
                        {' / '}
                        <span className="text-red-600">-{formatCurrency(group.totalExpense)}</span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Transactions */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      <TransactionList
                        transactions={group.transactions}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onTap={handleTap}
                      />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editTransaction={editingTransaction}
        onCopy={editingTransaction ? handleCopy : undefined}
        onDelete={editingTransaction ? handleDelete : undefined}

      />

      <SaveFilterModal
        isOpen={showSaveModal}
        onClose={() => { setShowSaveModal(false); setEditingPreset(null) }}
        initialValues={{
          searchText,
          accountId: filterAccount,
          transactionType: typeFilter === 'all' ? 'all' : typeFilter.toUpperCase(),
          categoryId: categories?.find(c => c.name === filterCategory)?.id?.toString() || '',
          subCategoryId: categories?.find(c => c.name === filterSubCategory)?.id?.toString() || '',
          dateFrom: filterDateFrom,
          dateTo: filterDateTo,
          amountMin: filterAmountMin,
          amountMax: filterAmountMax,
        }}
        editingPreset={editingPreset}
        onSaved={(preset) => {
          applyPreset(preset)
        }}
      />
    </div>
  )
}

export default TransactionsPage