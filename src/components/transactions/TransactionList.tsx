'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Transaction } from '@/types/database';
import { TransactionCard } from '../TransactionCard';
import { BulkEditModal } from './BulkEditModal';
import { BulkDeleteDialog } from './BulkDeleteDialog';
import { Button } from '@/components/ui/button';
import { 
  CheckSquare, 
  Square, 
  Pencil, 
  Trash2, 
  X,
  Filter
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionList({ 
  transactions, 
  onEdit, 
  onDelete 
}: TransactionListProps) {
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  // Bulk selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Toggle single selection
  const toggleSelection = (id: number) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  // Select all visible
  const selectAll = () => {
    const allIds = new Set(transactions.map(t => t.id!));
    setSelectedIds(allIds);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Exit selection mode
  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Get selected transactions
  const selectedTransactions = useMemo(() => {
    return transactions.filter(t => selectedIds.has(t.id!));
  }, [transactions, selectedIds]);

  return (
    <div className="space-y-4">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BULK ACTIONS BAR */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {isSelectionMode ? (
        <div className="sticky top-0 z-10 bg-slate-800 rounded-lg p-3 flex items-center justify-between border border-slate-700">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={exitSelectionMode}
              className="text-slate-400"
            >
              <X className="w-4 h-4" />
            </Button>
            
            <span className="text-white font-medium">
              {selectedIds.size} selected
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={selectedIds.size === transactions.length ? deselectAll : selectAll}
              className="text-slate-300"
            >
              {selectedIds.size === transactions.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkEdit(true)}
              disabled={selectedIds.size === 0}
              className="border-slate-600 text-slate-300"
            >
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkDelete(true)}
              disabled={selectedIds.size === 0}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSelectionMode(true)}
            className="text-slate-400"
          >
            <CheckSquare className="w-4 h-4 mr-1" />
            Select
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TRANSACTION LIST */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-2">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex items-start gap-2">
            {/* Checkbox (only in selection mode) */}
            {isSelectionMode && (
              <button
                onClick={() => toggleSelection(transaction.id!)}
                className="mt-4 p-1 hover:bg-slate-700 rounded"
              >
                {selectedIds.has(transaction.id!) ? (
                  <CheckSquare className="w-5 h-5 text-purple-400" />
                ) : (
                  <Square className="w-5 h-5 text-slate-500" />
                )}
              </button>
            )}
            
            {/* Transaction Card */}
            <div className="flex-1">
              <TransactionCard
                transaction={transaction}
                accounts={accounts}
                categories={categories}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <BulkEditModal
        isOpen={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        transactions={selectedTransactions}
        onSuccess={() => {
          setShowBulkEdit(false);
          exitSelectionMode();
        }}
      />

      <BulkDeleteDialog
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        transactions={selectedTransactions}
        onSuccess={() => {
          setShowBulkDelete(false);
          exitSelectionMode();
        }}
      />
    </div>
  );
}
