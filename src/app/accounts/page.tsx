'use client'

import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Account } from '@/lib/db'
import { useAccount } from '@/hooks/useAccount'
import { AccountCard } from '@/components/AccountCard'
import { AccountHeader } from '@/components/AccountHeader'
import { AccountModal } from '@/components/AccountModal'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Plus, Landmark, ChevronDown, ChevronRight } from 'lucide-react'

// Account type display names
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  BANK: 'Bank Accounts',
  SAVINGS: 'Savings Accounts',
  CASH: 'Cash',
  WALLET: 'Digital Wallets',
  CREDIT: 'Credit Cards',
  LOAN: 'Loans',
  INVESTMENT: 'Investments',
  OTHER: 'Other',
}

// Order for account types
const ACCOUNT_TYPE_ORDER = ['BANK', 'SAVINGS', 'CASH', 'WALLET', 'CREDIT', 'LOAN', 'INVESTMENT', 'OTHER']

export default function AccountsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // Track expanded state for both types and groups: "type-BANK", "group-BANK-MyGroup"
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['type-BANK']))

  // Live query to fetch all accounts
  const accounts = useLiveQuery(() => db.accounts.toArray(), [])

  // Group accounts by type first, then by custom group
  // Structure: Map<type, Map<group, Account[]>>
  const groupedByTypeAndGroup = useMemo(() => {
    if (!accounts) return new Map<string, Map<string, Account[]>>()

    const typeMap = new Map<string, Map<string, Account[]>>()

    accounts.forEach(account => {
      const accountType = account.type || 'OTHER'
      const groupName = account.group?.trim() || 'Ungrouped'

      if (!typeMap.has(accountType)) {
        typeMap.set(accountType, new Map<string, Account[]>())
      }
      const groupMap = typeMap.get(accountType)!

      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, [])
      }
      groupMap.get(groupName)!.push(account)
    })

    // Sort by predefined type order
    const sortedTypeMap = new Map<string, Map<string, Account[]>>()
    ACCOUNT_TYPE_ORDER.forEach(type => {
      if (typeMap.has(type)) {
        const groupMap = typeMap.get(type)!
        // Sort groups within each type: Ungrouped last, others alphabetically
        const sortedGroups = new Map(
          Array.from(groupMap.entries()).sort(([a], [b]) => {
            if (a === 'Ungrouped') return 1
            if (b === 'Ungrouped') return -1
            return a.localeCompare(b)
          })
        )
        sortedTypeMap.set(type, sortedGroups)
      }
    })

    return sortedTypeMap
  }, [accounts])

  // Account hooks
  const { createAccount, updateAccount, deleteAccount, loading, error } = useAccount()

  const handleAddClick = () => {
    setEditingAccount(null)
    setModalOpen(true)
  }

  const handleEditClick = (account: Account) => {
    setEditingAccount(account)
    setModalOpen(true)
  }

  const handleDeleteClick = (account: Account) => {
    setDeleteTarget(account)
    setDeleteError(null)
    setDeleteOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingAccount(null)
  }

  const handleModalSubmit = async (data: Omit<Account, 'id'>) => {
    if (editingAccount?.id) {
      // Edit existing account
      await updateAccount(editingAccount.id, data)
    } else {
      // Create new account
      await createAccount(data)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id) return
    try {
      await deleteAccount(deleteTarget.id)
      setDeleteOpen(false)
      setDeleteTarget(null)
      setDeleteError(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete account'
      setDeleteError(errorMsg)
    }
  }

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey)
      } else {
        newSet.add(sectionKey)
      }
      return newSet
    })
  }

  const handleEditGroup = async (accountType: string, oldGroupName: string, newGroupName: string) => {
    // Update all accounts in the old group to the new group name
    const typeGroups = groupedByTypeAndGroup.get(accountType)
    const accountsInGroup = typeGroups?.get(oldGroupName) || []
    for (const account of accountsInGroup) {
      if (account.id) {
        await updateAccount(account.id, { ...account, group: newGroupName })
      }
    }
  }

  // Stats calculations
  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0
  const totalThreshold = accounts?.reduce((sum, acc) => sum + acc.thresholdValue, 0) || 0
  const accountsAboveThreshold = accounts?.filter(
    (acc) => acc.balance - acc.thresholdValue >= 0
  ).length || 0

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Accounts</h1>
                <p className="text-sm text-muted-foreground">Manage your bank accounts and wallets</p>
              </div>
            </div>
            <Button onClick={handleAddClick} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-background border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Total Balance</p>
              <p className="text-lg font-bold">₹{totalBalance.toLocaleString()}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Total Threshold</p>
              <p className="text-lg font-bold">₹{totalThreshold.toLocaleString()}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Accounts Safe</p>
              <p className="text-lg font-bold text-green-600">
                {accountsAboveThreshold}/{accounts?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!accounts || accounts.length === 0 ? (
          <div className="text-center py-12">
            <Landmark className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No accounts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first account to start tracking your finances
            </p>
            <Button onClick={handleAddClick}>
              <Plus className="w-4 h-4 mr-2" />
              Create Account
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(groupedByTypeAndGroup.entries()).map(([accountType, groupMap]) => {
              const typeKey = `type-${accountType}`
              const isTypeExpanded = expandedSections.has(typeKey)

              // Calculate totals for this type
              const allAccountsInType: Account[] = []
              groupMap.forEach(accs => allAccountsInType.push(...accs))
              const typeTotalBalance = allAccountsInType.reduce((sum, acc) => sum + acc.balance, 0)
              const typeAccountCount = allAccountsInType.length

              return (
                <div key={typeKey} className="border border-border rounded-lg overflow-hidden">
                  {/* Type Header */}
                  <button
                    onClick={() => toggleSection(typeKey)}
                    className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isTypeExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div className="text-left">
                        <h3 className="font-semibold text-lg">{ACCOUNT_TYPE_LABELS[accountType] || accountType}</h3>
                        <p className="text-sm text-muted-foreground">{typeAccountCount} account{typeAccountCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${typeTotalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{typeTotalBalance.toLocaleString()}
                      </p>
                    </div>
                  </button>

                  {/* Groups within this type */}
                  {isTypeExpanded && (
                    <div className="border-t border-border">
                      {Array.from(groupMap.entries()).map(([groupName, groupAccounts]) => {
                        const groupKey = `group-${accountType}-${groupName}`
                        const isGroupExpanded = expandedSections.has(groupKey)
                        const groupTotalBalance = groupAccounts.reduce((sum, acc) => sum + acc.balance, 0)

                        // If only one group (Ungrouped), show accounts directly without group header
                        if (groupMap.size === 1 && groupName === 'Ungrouped') {
                          return (
                            <div key={groupKey} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupAccounts.map((account) => (
                                  <AccountCard
                                    key={`account-${account.id}`}
                                    account={account}
                                    onEdit={handleEditClick}
                                    onDelete={handleDeleteClick}
                                  />
                                ))}
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div key={groupKey} className="border-b border-border last:border-b-0">
                            {/* Group Header */}
                            <button
                              onClick={() => toggleSection(groupKey)}
                              className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2 pl-6">
                                {isGroupExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                                <span className="font-medium">{groupName}</span>
                                <span className="text-sm text-muted-foreground">({groupAccounts.length})</span>
                              </div>
                              <div className="text-right">
                                <span className={`font-semibold ${groupTotalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ₹{groupTotalBalance.toLocaleString()}
                                </span>
                              </div>
                            </button>

                            {/* Accounts in group */}
                            {isGroupExpanded && (
                              <div className="p-4 pl-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {groupAccounts.map((account) => (
                                    <AccountCard
                                      key={`account-${account.id}`}
                                      account={account}
                                      onEdit={handleEditClick}
                                      onDelete={handleDeleteClick}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <AccountModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        initialData={editingAccount || undefined}
        loading={loading}
      />

      <DeleteConfirmDialog
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setDeleteTarget(null)
          setDeleteError(null)
        }}
        onConfirm={handleDeleteConfirm}
        account={deleteTarget}
        loading={loading}
        error={deleteError}
      />
    </div>
  )
}
