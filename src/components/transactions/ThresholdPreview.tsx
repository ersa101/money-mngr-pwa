'use client'

import React from 'react'
import { ThresholdWarning } from '../../lib/db'

interface ThresholdPreviewProps {
  warning: ThresholdWarning
}

export function ThresholdPreview({ warning }: ThresholdPreviewProps) {
  const { currentBalance, threshold, spendableAmount, status, message } = warning

  const getBorderColor = () => {
    switch (status) {
      case 'SAFE':
        return 'border-green-500'
      case 'WARNING':
        return 'border-yellow-500'
      case 'CRITICAL':
        return 'border-red-500'
      default:
        return 'border-slate-600'
    }
  }

  const getTextColor = () => {
    switch (status) {
      case 'SAFE':
        return 'text-green-400'
      case 'WARNING':
        return 'text-yellow-400'
      case 'CRITICAL':
        return 'text-red-400'
      default:
        return 'text-slate-300'
    }
  }

  const getBackgroundColor = () => {
    switch (status) {
      case 'SAFE':
        return 'bg-green-900/20'
      case 'WARNING':
        return 'bg-yellow-900/20'
      case 'CRITICAL':
        return 'bg-red-900/20'
      default:
        return 'bg-slate-800'
    }
  }

  return (
    <div className={`border-l-4 ${getBorderColor()} ${getBackgroundColor()} rounded-lg p-4 space-y-2`}>
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">Current: ₹{currentBalance.toLocaleString()}</span>
        <span className="text-slate-400">Threshold: ₹{threshold.toLocaleString()}</span>
      </div>

      <div className={`text-sm font-medium ${getTextColor()}`}>
        Spendable: ₹{spendableAmount.toLocaleString()}
      </div>

      <div className={`text-xs ${getTextColor()} flex items-center gap-2`}>
        {status === 'SAFE' && '✅'}
        {status === 'WARNING' && '⚠️'}
        {status === 'CRITICAL' && '🚨'}
        <span>{message}</span>
      </div>
    </div>
  )
}
