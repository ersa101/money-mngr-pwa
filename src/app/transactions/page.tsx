'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Account, type Category, type Transaction } from '@/lib/db'
import { AddTransactionModal, CSVUploadModal, MagicBox } from '@/components'
import { TransactionList } from '@/components/transactions/TransactionList'
import { Plus, Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react'
import { ActionLogger } from '@/lib/actionLogger'
import toast from 'react-hot-toast'

type TypeFilter = 'all' | 'expense' | 'income' | 'transfer'

function TransactionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Advanced filter state
  const [showFilters, setShowFilters] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterAccount, setFilterAccount] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [filterAmountMin, setFilterAmountMin] = useState<string>('')
  const [filterAmountMax, setFilterAmountMax] = useState<string>('')

  const accounts = useLiveQuery(() => db.accounts.toArray())
  const categories = useLiveQuery(() => db.categories.toArray())
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray())

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

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = async (transaction: Transaction) => {
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
        <MagicBox onSuccess={handleCloseModal} />

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

        <div className="space-y-4">
          {!filteredTransactions || filteredTransactions.length === 0 ? (
            <div className="rounded-lg bg-slate-800 p-8 text-center">
              <p className="text-slate-400">
                {hasActiveFilters
                  ? 'No transactions match your filters.'
                  : 'No transactions yet. Add one to get started!'}
              </p>
            </div>
          ) : (
            <TransactionList 
              transactions={filteredTransactions}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
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