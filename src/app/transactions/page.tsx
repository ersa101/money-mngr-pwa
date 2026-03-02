'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'
import type { Account, Category, Transaction } from '@/types/database'
import { AddTransactionModal, CSVUploadModal } from '@/components'
import { TransactionList } from '@/components/transactions/TransactionList'
import { Plus, Search, Filter, X, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react'
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
  const [showFilters, setShowFilters] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterAccount, setFilterAccount] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [filterAmountMin, setFilterAmountMin] = useState<string>('')
  const [filterAmountMax, setFilterAmountMax] = useState<string>('')

  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db])
  const categories = useLiveQuery(() => db?.categories.toArray() ?? [], [db])
  const transactions = useLiveQuery(() => db?.transactions.orderBy('date').reverse().toArray() ?? [], [db])

  // Get unique categories from transactions for filter dropdown
  const uniqueCategories = useMemo(() => {
    if (!transactions) return []
    const cats = new Set<string>()
    transactions.forEach(tx => {
      const category = categories?.find(c => c.id === tx.categoryId)
      if (category) cats.add(category.name)
    })
    return Array.from(cats).sort()
  }, [transactions, categories])

  useEffect(() => {
    ActionLogger.pageView('/transactions')
  }, [])

  const hasActiveFilters = searchText || filterAccount || filterCategory || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax || typeFilter !== 'all'

  const clearFilters = () => {
    setSearchText('')
    setFilterAccount('')
    setFilterCategory('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterAmountMin('')
    setFilterAmountMax('')
    setTypeFilter('all')
  }

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []

    return transactions.filter((tx: Transaction) => {
      // Skip null/undefined transactions
      if (!tx) return false
      if (typeFilter === 'expense' && tx.transactionType !== 'EXPENSE') return false
      if (typeFilter === 'income' && tx.transactionType !== 'INCOME') return false
      if (typeFilter === 'transfer' && tx.transactionType !== 'TRANSFER') return false

      const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date)
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
  }, [transactions, typeFilter, searchText, filterAccount, filterCategory, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax, categories])

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

  const handleDelete = async (transaction: Transaction) => {
    if (!db) {
      toast.error('Database not available');
      return;
    }
    if (confirm('Are you sure you want to delete this transaction?')) {
      // Basic deletion, doesn't account for balance updates or linked txns from v3
      await db.transactions.delete(transaction.id!);
      toast.success('Transaction deleted');
    }
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white pb-24">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Transactions</h1>
            <p className="mt-1 text-sm text-slate-400">Track and manage all your financial activities</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700"
            >
              <Plus size={20} /> Add Transaction
            </button>
            <CSVUploadModal onSuccess={() => {}} />
          </div>
        </div>

        <div className="rounded-lg bg-slate-800 p-4 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Filter size={18} />
              Filters
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-yellow-400" />}
              {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {showFilters && (
            <div className="space-y-4 pt-4 border-t border-slate-700">
              <div>
                <p className="text-xs text-slate-400 uppercase mb-2">Type</p>
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'expense', 'income', 'transfer'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTypeFilter(f)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        typeFilter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-2 block">Account</label>
                  <select
                    value={filterAccount}
                    onChange={(e) => setFilterAccount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Accounts</option>
                    {accounts?.map((acc) => (
                      <option key={`filter-acc-${acc.id}`} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-2 block">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {uniqueCategories.map((cat) => (
                      <option key={`filter-cat-${cat}`} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-2 block">From</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-2 block">To</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-2 block">Min Amount</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filterAmountMin}
                    onChange={(e) => setFilterAmountMin(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-2 block">Max Amount</label>
                  <input
                    type="number"
                    placeholder="No limit"
                    value={filterAmountMax}
                    onChange={(e) => setFilterAmountMax(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  <X size={16} />
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>

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
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {!filteredTransactions || filteredTransactions.length === 0 ? (
            <div className="rounded-lg bg-slate-800 p-8 text-center">
              <p className="text-slate-400">
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
            />
          ) : (
            groupedTransactions.map((group) => {
              const isExpanded = expandedGroups.has(group.key)

              return (
                <div key={group.key} className="bg-slate-800 rounded-lg overflow-hidden">
                  {/* Group Header (Clickable) */}
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                      <div className="text-left">
                        <div className="font-medium text-white">{group.label}</div>
                        <div className="text-sm text-slate-400">
                          {group.transactions.length} transaction{group.transactions.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-medium ${
                          group.net >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {group.net >= 0 ? '+' : ''}
                        {formatCurrency(group.net)}
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className="text-green-400/70">+{formatCurrency(group.totalIncome)}</span>
                        {' / '}
                        <span className="text-red-400/70">-{formatCurrency(group.totalExpense)}</span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Transactions */}
                  {isExpanded && (
                    <div className="border-t border-slate-700">
                      <TransactionList
                        transactions={group.transactions}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
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
      />
    </div>
  )
}

export default TransactionsPage