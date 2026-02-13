'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Transaction } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onSuccess: () => void;
}

export function BulkEditModal({
  isOpen,
  onClose,
  transactions,
  onSuccess,
}: BulkEditModalProps) {
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const [categoryId, setCategoryId] = useState<string>('__keep__');
  const [fromAccountId, setFromAccountId] = useState<string>('__keep__');
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter: Only expense transactions can have category changed
  const expenseTransactions = transactions.filter(t => t.transactionType === 'EXPENSE');
  const incomeTransactions = transactions.filter(t => t.transactionType === 'INCOME');

  const handleUpdate = async () => {
    const updates: Partial<Transaction> = {};
    
    if (categoryId !== '__keep__') {
      updates.categoryId = parseInt(categoryId);
    }
    
    if (fromAccountId !== '__keep__') {
      updates.fromAccountId = parseInt(fromAccountId);
    }

    if (Object.keys(updates).length === 0) {
      toast.error('No changes selected');
      return;
    }

    setIsUpdating(true);

    try {
      const ids = transactions.map(t => t.id!);
      
      await db.transactions
        .where('id')
        .anyOf(ids)
        .modify({
          ...updates,
          updatedAt: new Date().toISOString(),
        });

      toast.success(`Updated ${transactions.length} transactions`);
      onSuccess();
    } catch (error) {
      console.error('Bulk update failed:', error);
      toast.error('Failed to update transactions');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>
            Bulk Edit ({transactions.length} transactions)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="bg-slate-800 rounded-lg p-3 text-sm text-slate-400">
            <div>Expenses: {expenseTransactions.length}</div>
            <div>Income: {incomeTransactions.length}</div>
            <div>Transfers: {transactions.length - expenseTransactions.length - incomeTransactions.length}</div>
          </div>

          {/* Change Category */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Change Category to
            </label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Keep original" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="__keep__" className="text-slate-400">
                  Keep original (no change)
                </SelectItem>
                {categories
                  .filter(c => !c.parentId)
                  .map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id!.toString()}
                      className="text-white"
                    >
                      {category.icon} {category.name}
                      <span className="text-slate-500 ml-2">
                        ({category.type})
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Change Account */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Change Account to
            </label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Keep original" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="__keep__" className="text-slate-400">
                  Keep original (no change)
                </SelectItem>
                {accounts.map((account) => (
                  <SelectItem
                    key={account.id}
                    value={account.id!.toString()}
                    className="text-white"
                  >
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 text-amber-400 text-sm bg-amber-500/10 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Note: Changing accounts will NOT recalculate balances. 
              Use this for correcting categorization, not moving money.
            </span>
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
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update {transactions.length} Transactions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
