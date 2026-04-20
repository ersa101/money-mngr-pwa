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
  onTap?: (transaction: Transaction) => void;
}

export function TransactionCard({
  transaction,
  accounts,
  categories,
  onEdit,
  onDelete,
  onTap,
}: TransactionCardProps) {
  const isTransfer = transaction.transactionType === 'TRANSFER';
  const isExpense = transaction.transactionType === 'EXPENSE';

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

  const subCategory = useMemo(() =>
    transaction.subCategoryId ? categories.find(c => c.id === transaction.subCategoryId) : undefined,
    [categories, transaction.subCategoryId]
  );

  // ═══════════════════════════════════════════════════════════════
  // TRANSFER CARD
  // ═══════════════════════════════════════════════════════════════
  if (isTransfer) {
    return (
      <div
        className="bg-white rounded-lg p-4 border-l-4 border-blue-400 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => onTap?.(transaction)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
              TRANSFER
            </span>
            <span className="text-gray-500 text-sm">
              {formatDateTime(transaction.date)}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-gray-100 rounded" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-gray-200 shadow-sm">
              <DropdownMenuItem onClick={() => onDelete(transaction)} className="text-red-500">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Transfer Visual */}
        <div className="flex items-center justify-between gap-2 my-3">
          {/* From Account */}
          <div className="flex-1 text-center p-3 rounded-lg bg-gray-50">
            <div className="text-xs text-gray-400 mb-1">From</div>
            <div className="font-medium text-gray-900 truncate">
              {fromAccount?.name || 'Unknown'}
            </div>
            {fromAccount && (
              <div className="text-xs text-gray-500 mt-1">
                Bal: {formatCurrency(fromAccount.balance)}
              </div>
            )}
          </div>

          {/* Arrow with Amount */}
          <div className="flex flex-col items-center px-2">
            <div className="text-lg font-bold text-blue-600">
              {formatCurrency(transaction.amount)}
            </div>
            <ArrowRight className="w-6 h-6 text-blue-500" />
          </div>

          {/* To Account */}
          <div className="flex-1 text-center p-3 rounded-lg bg-gray-50">
            <div className="text-xs text-gray-400 mb-1">To</div>
            <div className="font-medium text-gray-900 truncate">
              {toAccount?.name || 'Unknown'}
            </div>
            {toAccount && (
              <div className="text-xs text-gray-500 mt-1">
                Bal: {formatCurrency(toAccount.balance)}
              </div>
            )}
          </div>
        </div>

        {/* Note */}
        {transaction.description && (
          <p className="text-sm text-gray-500 mt-2 truncate">
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
    <div
      className={`bg-white rounded-lg p-4 border-l-4 hover:bg-gray-50 transition-colors cursor-pointer ${
        isExpense ? 'border-red-400' : 'border-green-400'
      }`}
      onClick={() => onTap?.(transaction)}
    >
      <div className="flex items-start justify-between">
        {/* Left: Icon, Category, Description */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${
            isExpense ? 'bg-red-50' : 'bg-green-50'
          }`}>
            {isExpense ? (
              <ArrowUpRight className="w-5 h-5 text-red-500" />
            ) : (
              <ArrowDownLeft className="w-5 h-5 text-green-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">
                {category?.icon} {category?.name || 'Uncategorized'}{subCategory ? ` > ${subCategory.name}` : ''}
              </span>
            </div>

            {transaction.description && (
              <p className="text-sm text-gray-500 truncate mt-0.5">
                {transaction.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <span>{formatDateTime(transaction.date)}</span>
              <span>•</span>
              <span>{isExpense ? fromAccount?.name : toAccount?.name}</span>
            </div>
          </div>
        </div>

        {/* Right: Amount and Actions */}
        <div className="flex items-start gap-2 ml-2">
          <div className={`text-right ${isExpense ? 'text-red-600' : 'text-emerald-600'}`}>
            <div className="font-semibold">
              {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-gray-100 rounded" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-gray-200 shadow-sm">
              <DropdownMenuItem onClick={() => onDelete(transaction)} className="text-red-500">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
