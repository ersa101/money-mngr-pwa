'use client'

import { Account } from '@/lib/db'
import { Landmark, Wallet, TrendingUp, Zap, Trash2, Edit2, User } from 'lucide-react'
import { Button } from './ui/button'
import { useThreshold } from '../hooks/useThreshold'
import { formatCurrency } from '@/lib/currency-utils'

interface AccountCardProps {
  account: Account
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  // Special display for Person accounts
  if (account.type === 'PERSON') {
    const theyOweYou = account.balance > 0;
    const youOweThem = account.balance < 0;
    const settled = account.balance === 0;

    return (
      <div className={`bg-slate-800 rounded-lg p-4 border-l-4 ${
        theyOweYou ? 'border-green-500' : 
        youOweThem ? 'border-orange-500' : 
        'border-slate-500'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <User className="w-5 h-5 text-slate-400" />
          <span className="font-medium text-white">{account.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
            Person
          </span>
        </div>
        
        <div className={`text-2xl font-bold ${
          theyOweYou ? 'text-green-400' : 
          youOweThem ? 'text-orange-400' : 
          'text-slate-400'
        }`}>
          {formatCurrency(Math.abs(account.balance))}
        </div>
        
        <div className="text-sm text-slate-400 mt-1">
          {theyOweYou && '← They owe you'}
          {youOweThem && '→ You owe them'}
          {settled && '✓ Settled'}
        </div>
      </div>
    );
  }

  // Use the threshold hook for consistent 3-tier warning system
  const thresholdWarning = useThreshold(account)
  const { status, spendableAmount, currentBalance, threshold } = thresholdWarning

  // Icon selection based on account type
  const getIcon = () => {
    switch (account.type) {
      case 'BANK':
        return <Landmark className="w-5 h-5" />
      case 'CASH':
        return <Wallet className="w-5 h-5" />
      case 'WALLET':
        return <Wallet className="w-5 h-5" />
      case 'INVESTMENT':
        return <TrendingUp className="w-5 h-5" />
      default:
        return <Zap className="w-5 h-5" />
    }
  }

  // 3-tier color system based on threshold status
  const getBorderColor = () => {
    switch (status) {
      case 'SAFE':
        return 'border-l-4 border-l-green-500'
      case 'WARNING':
        return 'border-l-4 border-l-yellow-500'
      case 'CRITICAL':
        return 'border-l-4 border-l-red-500'
      default:
        return 'border-l-4 border-l-gray-500'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'SAFE':
        return 'bg-green-500'
      case 'WARNING':
        return 'bg-yellow-500'
      case 'CRITICAL':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getTextColor = () => {
    switch (status) {
      case 'SAFE':
        return 'text-green-600'
      case 'WARNING':
        return 'text-yellow-600'
      case 'CRITICAL':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getProgressPercentage = () => {
    if (threshold === 0) return 100
    const percentage = ((currentBalance - threshold) / threshold) * 100
    return Math.max(0, Math.min(100, percentage))
  }

  return (
    <div className={`bg-card rounded-lg p-4 shadow-sm border border-border ${getBorderColor()}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-muted rounded-lg text-muted-foreground">
            {getIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{account.name}</h3>
            <p className="text-xs text-muted-foreground">{account.type}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(account)}
            className="h-8 w-8 p-0"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(account)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Balance Section */}
      <div className="mb-3 space-y-1">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-muted-foreground">Current Balance</span>
          <span className="font-bold text-foreground">₹{currentBalance.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-muted-foreground">Threshold</span>
          <span className="text-xs text-foreground">₹{threshold.toLocaleString()}</span>
        </div>
      </div>

      {/* Spendable Amount with Status Badge */}
      <div className="mb-3 p-2 bg-muted rounded">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs font-medium">Spendable Amount</span>
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-sm ${getTextColor()}`}>
              ₹{spendableAmount.toLocaleString()}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor()} text-white font-medium`}>
              {status}
            </span>
          </div>
        </div>
        {/* Progress bar showing buffer above threshold */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all ${getStatusColor()}`}
            style={{
              width: `${getProgressPercentage()}%`,
            }}
          />
        </div>
      </div>

      {/* Status Indicator with Message */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className={`text-xs ${getTextColor()}`}>
          {status === 'SAFE' && '✅'}
          {status === 'WARNING' && '⚠️'}
          {status === 'CRITICAL' && '🚨'}
          {' '}
          {thresholdWarning.message}
        </span>
      </div>
    </div>
  )
}

export default AccountCard