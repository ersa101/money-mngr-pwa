'use client';

import { useMemo } from 'react';
import { Transaction, Account, Category } from '@/types/database';
import { formatCurrency } from '@/lib/currency-utils';
import { formatDateTime } from '@/lib/date-utils';
import { 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownLeft,
  MoreVertical,
  Pencil,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TransactionCardProps {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionCard({
  transaction,
  accounts,
  categories,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  const isTransfer = transaction.transactionType === 'TRANSFER';
  const isExpense = transaction.transactionType === 'EXPENSE';
  const isIncome = transaction.transactionType === 'INCOME';

  const fromAccount = useMemo(() => 
    accounts.find(a => a.id === transaction.fromAccountId),
    [accounts, transaction.fromAccountId]
  );

  const toAccount = useMemo(() => 
    accounts.find(a => a.id === transaction.toAccountId),
    [accounts, transaction.toAccountId]
  );

  const category = useMemo(() => 
    categories.find(c => c.id === transaction.categoryId),
    [categories, transaction.categoryId]
  );

  // ═══════════════════════════════════════════════════════════════
  // TRANSFER CARD
  // ═══════════════════════════════════════════════════════════════
  if (isTransfer) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border-l-4 border-blue-500 hover:bg-slate-750 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
              TRANSFER
            </span>
            <span className="text-slate-500 text-sm">
              {formatDateTime(transaction.date)}
            </span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-slate-700 rounded">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem onClick={() => onEdit(transaction)} className="text-slate-300">
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(transaction)} className="text-red-400">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Transfer Visual */}
        <div className="flex items-center justify-between gap-2 my-3">
          {/* From Account */}
          <div className="flex-1 text-center p-3 rounded-lg bg-slate-700/50">
            <div className="text-xs text-slate-400 mb-1">From</div>
            <div className="font-medium text-white truncate">
              {fromAccount?.name || 'Unknown'}
            </div>
            {fromAccount && (
              <div className="text-xs text-slate-500 mt-1">
                Bal: {formatCurrency(fromAccount.balance)}
              </div>
            )}
          </div>

          {/* Arrow with Amount */}
          <div className="flex flex-col items-center px-2">
            <div className="text-lg font-bold text-blue-400">
              {formatCurrency(transaction.amount)}
            </div>
            <ArrowRight className="w-6 h-6 text-blue-400" />
          </div>

          {/* To Account */}
          <div className="flex-1 text-center p-3 rounded-lg bg-slate-700/50">
            <div className="text-xs text-slate-400 mb-1">To</div>
            <div className="font-medium text-white truncate">
              {toAccount?.name || 'Unknown'}
            </div>
            {toAccount && (
              <div className="text-xs text-slate-500 mt-1">
                Bal: {formatCurrency(toAccount.balance)}
              </div>
            )}
          </div>
        </div>

        {/* Note */}
        {transaction.description && (
          <p className="text-sm text-slate-400 mt-2 truncate">
            {transaction.description}
          </p>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPENSE / INCOME CARD
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className={`bg-slate-800 rounded-lg p-4 border-l-4 hover:bg-slate-750 transition-colors ${
      isExpense ? 'border-red-500' : 'border-green-500'
    }`}>
      <div className="flex items-start justify-between">
        {/* Left: Icon, Category, Description */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${
            isExpense ? 'bg-red-500/20' : 'bg-green-500/20'
          }`}>
            {isExpense ? (
              <ArrowUpRight className="w-5 h-5 text-red-400" />
            ) : (
              <ArrowDownLeft className="w-5 h-5 text-green-400" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white truncate">
                {category?.icon} {category?.name || 'Uncategorized'}
              </span>
            </div>
            
            {transaction.description && (
              <p className="text-sm text-slate-400 truncate mt-0.5">
                {transaction.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span>{formatDateTime(transaction.date)}</span>
              <span>•</span>
              <span>{isExpense ? fromAccount?.name : toAccount?.name}</span>
            </div>
          </div>
        </div>

        {/* Right: Amount and Actions */}
        <div className="flex items-start gap-2 ml-2">
          <div className={`text-right ${isExpense ? 'text-red-400' : 'text-green-400'}`}>
            <div className="font-semibold">
              {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-slate-700 rounded">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem onClick={() => onEdit(transaction)} className="text-slate-300">
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(transaction)} className="text-red-400">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
