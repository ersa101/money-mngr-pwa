'use client'

import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'
import type { Account } from '@/types/database'
import { useAccount } from '@/hooks/useAccount'
import { AccountModal } from '@/components/AccountModal'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Plus, ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { getAccountClassification, classificationToFlags, type AccountClassification } from '@/lib/accountClassification'

// V2.7.4 D040 — sort column type extends keyof Account with synthetic 'classification'
type SortCol = keyof Account | 'classification'

export function AccountsTable() {
  const db = useDb()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [tableSortCol, setTableSortCol] = useState<SortCol>('name')
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('asc')
  const [tableFilter, setTableFilter] = useState('')
  const [editCell, setEditCell] = useState<{ id: number; field: keyof Account } | null>(null)
  const [editVal, setEditVal] = useState('')

  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db])
  const { createAccount, updateAccount, deleteAccount, loading, error } = useAccount()

  const tableAccounts = useMemo(() => {
    if (!accounts) return []
    let list = [...accounts]
    if (tableFilter) {
      const q = tableFilter.toLowerCase()
      list = list.filter(a => a.name.toLowerCase().includes(q) || (a.group || '').toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      // V2.7.4 D040 — synthetic 'classification' column derives from dual fields
      const av: any = tableSortCol === 'classification'
        ? getAccountClassification(a)
        : (a[tableSortCol as keyof Account] ?? '')
      const bv: any = tableSortCol === 'classification'
        ? getAccountClassification(b)
        : (b[tableSortCol as keyof Account] ?? '')
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
      return tableSortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [accounts, tableSortCol, tableSortDir, tableFilter])

  const toggleTableSort = (col: SortCol) => {
    if (tableSortCol === col) setTableSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setTableSortCol(col); setTableSortDir('asc') }
  }

  const startCellEdit = (account: Account, field: keyof Account) => {
    if (!account.id) return
    setEditCell({ id: account.id, field })
    setEditVal(String(account[field] ?? ''))
  }

  const saveCellEdit = async (account: Account) => {
    if (!editCell || !account.id) return
    const { field } = editCell
    let newVal: any = editVal
    if (field === 'thresholdValue') newVal = parseFloat(editVal) || 0
    await updateAccount(account.id, { ...account, [field]: newVal })
    setEditCell(null)
  }

  // V2.7.4 D040 — set tri-state classification, atomically writing both fields
  // per the mutual-exclusion mapping (see lib/accountClassification.ts).
  const setClassification = async (account: Account, c: AccountClassification) => {
    if (!account.id) return
    const flags = classificationToFlags(c)
    await updateAccount(account.id, { ...account, ...flags })
  }

  const handleAddClick = () => { setEditingAccount(null); setModalOpen(true) }
  const handleEditClick = (account: Account) => { setEditingAccount(account); setModalOpen(true) }
  const handleDeleteClick = (account: Account) => { setDeleteTarget(account); setDeleteError(null); setDeleteOpen(true) }
  const handleModalClose = () => { setModalOpen(false); setEditingAccount(null) }

  const handleModalSubmit = async (data: Omit<Account, 'id'>) => {
    if (editingAccount?.id) await updateAccount(editingAccount.id, data)
    else await createAccount(data)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id) return
    try {
      await deleteAccount(deleteTarget.id)
      setDeleteOpen(false); setDeleteTarget(null); setDeleteError(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-card border-b border-border">
          <span className="font-medium text-sm text-muted-foreground">
            {tableAccounts.length} account{tableAccounts.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <input
                type="text"
                placeholder="Filter by name / group..."
                value={tableFilter}
                onChange={e => setTableFilter(e.target.value)}
                className="w-48 pl-8 pr-7 py-1.5 text-sm rounded-lg bg-background border border-border focus:outline-none focus:border-primary"
              />
              {tableFilter && (
                <button onClick={() => setTableFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            <Button onClick={handleAddClick} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {!accounts || accounts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No accounts yet. Click Add to create your first account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-xs">
                <tr>
                  {([
                    { key: 'name', label: 'Name' },
                    { key: 'type', label: 'Type' },
                    { key: 'balance', label: 'Balance' },
                    { key: 'thresholdValue', label: 'Threshold' },
                    { key: 'group', label: 'Group' },
                    { key: 'color', label: 'Color' },
                    { key: 'classification', label: 'Classification' },
                  ] as { key: SortCol; label: string }[]).map(col => (
                    <th
                      key={col.key}
                      onClick={() => col.key !== 'color' && toggleTableSort(col.key)}
                      className={`px-3 py-2 text-left whitespace-nowrap select-none ${col.key !== 'color' ? 'cursor-pointer hover:text-foreground' : ''}`}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {tableSortCol === col.key && (
                          tableSortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left whitespace-nowrap text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tableAccounts.map(account => (
                  <tr key={account.id} className="hover:bg-muted/20 transition-colors">
                    {/* Name */}
                    <td className="px-3 py-2 min-w-[120px]">
                      {editCell?.id === account.id && editCell.field === 'name' ? (
                        <input
                          autoFocus value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={() => saveCellEdit(account)}
                          onKeyDown={e => { if (e.key === 'Enter') saveCellEdit(account); if (e.key === 'Escape') setEditCell(null) }}
                          className="w-full px-1 py-0.5 rounded bg-background border border-primary text-sm focus:outline-none"
                        />
                      ) : (
                        <span className="cursor-pointer hover:underline" onClick={() => startCellEdit(account, 'name')}>
                          {account.name}
                        </span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-3 py-2 min-w-[130px]">
                      {editCell?.id === account.id && editCell.field === 'type' ? (
                        <select
                          autoFocus value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={() => saveCellEdit(account)}
                          onKeyDown={e => { if (e.key === 'Enter') saveCellEdit(account); if (e.key === 'Escape') setEditCell(null) }}
                          className="w-full px-1 py-0.5 rounded bg-background border border-primary text-sm focus:outline-none"
                        >
                          {['BANK','SAVINGS','CASH','WALLET','CREDIT_CARD','LOAN','INVESTMENT','PERSON','OTHER'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="cursor-pointer hover:underline text-xs" onClick={() => startCellEdit(account, 'type')}>
                          {account.type}
                        </span>
                      )}
                    </td>

                    {/* Balance */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <span className={account.balance >= 0 ? 'text-green-500' : 'text-red-500'}>
                        ₹{account.balance.toLocaleString()}
                      </span>
                    </td>

                    {/* Threshold */}
                    <td className="px-3 py-2 min-w-[100px]">
                      {editCell?.id === account.id && editCell.field === 'thresholdValue' ? (
                        <input
                          autoFocus type="number" value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={() => saveCellEdit(account)}
                          onKeyDown={e => { if (e.key === 'Enter') saveCellEdit(account); if (e.key === 'Escape') setEditCell(null) }}
                          className="w-full px-1 py-0.5 rounded bg-background border border-primary text-sm focus:outline-none"
                        />
                      ) : (
                        <span className="cursor-pointer hover:underline" onClick={() => startCellEdit(account, 'thresholdValue')}>
                          ₹{account.thresholdValue.toLocaleString()}
                        </span>
                      )}
                    </td>

                    {/* Group */}
                    <td className="px-3 py-2 min-w-[100px]">
                      {editCell?.id === account.id && editCell.field === 'group' ? (
                        <input
                          autoFocus value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={() => saveCellEdit(account)}
                          onKeyDown={e => { if (e.key === 'Enter') saveCellEdit(account); if (e.key === 'Escape') setEditCell(null) }}
                          className="w-full px-1 py-0.5 rounded bg-background border border-primary text-sm focus:outline-none"
                        />
                      ) : (
                        <span className="cursor-pointer hover:underline text-muted-foreground" onClick={() => startCellEdit(account, 'group')}>
                          {account.group || '—'}
                        </span>
                      )}
                    </td>

                    {/* Color */}
                    <td className="px-3 py-2">
                      <input
                        type="color"
                        value={account.color || '#6366f1'}
                        onChange={async e => {
                          if (account.id) await updateAccount(account.id, { ...account, color: e.target.value })
                        }}
                        className="w-7 h-7 rounded cursor-pointer border border-border bg-transparent p-0"
                        title="Pick color"
                      />
                    </td>

                    {/* V2.7.4 D040 — Tri-state classification (replaces NW + Liability toggles) */}
                    <td className="px-3 py-2">
                      {(() => {
                        const current = getAccountClassification(account)
                        return (
                          <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
                            <button
                              onClick={() => setClassification(account, 'liability')}
                              title="Liability (e.g. credit card debt, loans)"
                              className={`px-2 py-1 transition-colors ${current === 'liability' ? 'bg-red-500 text-white' : 'bg-muted/30 text-muted-foreground hover:bg-red-500/10'}`}
                            >
                              Liability
                            </button>
                            <button
                              onClick={() => setClassification(account, 'neither')}
                              title="Neither asset nor liability (excluded from Net Worth)"
                              className={`px-2 py-1 border-x border-border transition-colors ${current === 'neither' ? 'bg-gray-400 text-white' : 'bg-muted/30 text-muted-foreground hover:bg-gray-400/10'}`}
                            >
                              Neither
                            </button>
                            <button
                              onClick={() => setClassification(account, 'asset')}
                              title="Asset (counted in Net Worth)"
                              className={`px-2 py-1 transition-colors ${current === 'asset' ? 'bg-emerald-500 text-white' : 'bg-muted/30 text-muted-foreground hover:bg-emerald-500/10'}`}
                            >
                              Asset
                            </button>
                          </div>
                        )
                      })()}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditClick(account)}
                          className="px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80 text-foreground"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(account)}
                          className="px-2 py-1 text-xs rounded bg-muted hover:bg-red-500/20 text-red-500"
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AccountModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        initialData={editingAccount || undefined}
        loading={loading}
      />

      <DeleteConfirmDialog
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); setDeleteError(null) }}
        onConfirm={handleDeleteConfirm}
        account={deleteTarget}
        loading={loading}
        error={deleteError}
      />
    </div>
  )
}
