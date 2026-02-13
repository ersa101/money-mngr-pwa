'use client';

import { useState } from 'react';
import { db } from '@/lib/db';
import { Transaction } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import toast from 'react-hot-toast';

interface BulkDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onSuccess: () => void;
}

export function BulkDeleteDialog({
  isOpen,
  onClose,
  transactions,
  onSuccess,
}: BulkDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate totals
  const totalExpense = transactions
    .filter(t => t.transactionType === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalIncome = transactions
    .filter(t => t.transactionType === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await db.transaction('rw', db.transactions, db.accounts, async () => {
        for (const txn of transactions) {
          // Reverse balance changes
          if (txn.transactionType === 'EXPENSE' && txn.fromAccountId) {
            await db.accounts
              .where('id')
              .equals(txn.fromAccountId)
              .modify(a => { a.balance += txn.amount; });
          } else if (txn.transactionType === 'INCOME' && txn.toAccountId) {
            await db.accounts
              .where('id')
              .equals(txn.toAccountId)
              .modify(a => { a.balance -= txn.amount; });
          } else if (txn.transactionType === 'TRANSFER') {
            if (txn.fromAccountId) {
              await db.accounts
                .where('id')
                .equals(txn.fromAccountId)
                .modify(a => { a.balance += txn.amount; });
            }
            if (txn.toAccountId) {
              await db.accounts
                .where('id')
                .equals(txn.toAccountId)
                .modify(a => { a.balance -= txn.amount; });
            }
          }

          // Check for linked transaction and delete it too
          if (txn.linkedTransactionId) {
            const linkedTxn = await db.transactions.get(txn.linkedTransactionId);
            if (linkedTxn) {
              // Reverse linked transaction balance
              if (linkedTxn.toAccountId) {
                await db.accounts
                  .where('id')
                  .equals(linkedTxn.toAccountId)
                  .modify(a => { a.balance -= linkedTxn.amount; });
              }
              await db.transactions.delete(linkedTxn.id!);
            }
          }
        }

        // Delete all selected transactions
        const ids = transactions.map(t => t.id!);
        await db.transactions.where('id').anyOf(ids).delete();
      });

      toast.success(`Deleted ${transactions.length} transactions`);
      onSuccess();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Failed to delete transactions');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <Trash2 className="w-5 h-5" />
            Delete {transactions.length} Transactions?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="flex items-start gap-3 text-amber-400 bg-amber-500/10 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">This action cannot be undone!</div>
              <div className="text-sm text-amber-400/70 mt-1">
                Account balances will be adjusted automatically.
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-800 rounded-lg p-4 space-y-2">
            <div className="text-sm text-slate-400">You are about to delete:</div>
            
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <div className="text-slate-500 text-xs">Expenses</div>
                <div className="text-red-400 font-medium">
                  {formatCurrency(totalExpense)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">Income</div>
                <div className="text-green-400 font-medium">
                  {formatCurrency(totalIncome)}
                </div>
              </div>
            </div>
          </div>

          {/* Preview list (first 5) */}
          <div className="max-h-40 overflow-y-auto space-y-1">
            {transactions.slice(0, 5).map((txn) => (
              <div 
                key={txn.id} 
                className="text-sm text-slate-400 flex justify-between"
              >
                <span className="truncate">{txn.description || 'No description'}</span>
                <span className={
                  txn.transactionType === 'EXPENSE' ? 'text-red-400' : 'text-green-400'
                }>
                  {formatCurrency(txn.amount)}
                </span>
              </div>
            ))}
            {transactions.length > 5 && (
              <div className="text-sm text-slate-500">
                ... and {transactions.length - 5} more
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete {transactions.length} Transactions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
