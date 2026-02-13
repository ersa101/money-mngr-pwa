'use client'

import { useState } from 'react'
import { Edit2 } from 'lucide-react'
import { Button } from './ui/button'

interface AccountHeaderProps {
  groupName: string
  totalBalance: number
  accountCount: number
  isExpanded: boolean
  onToggle: () => void
  onEditGroup?: (groupName: string) => void
}

export function AccountHeader({
  groupName,
  totalBalance,
  accountCount,
  isExpanded,
  onToggle,
  onEditGroup
}: AccountHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(groupName)

  const handleSaveEdit = () => {
    if (editedName.trim() && editedName !== groupName) {
      onEditGroup?.(editedName.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      setEditedName(groupName)
      setIsEditing(false)
    }
  }

  return (
    <div className="bg-muted/50 rounded-lg p-3 mb-2 border border-border">
      <div className="flex items-center justify-between">
        {/* Left side: Toggle button and group name */}
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={onToggle}
            className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground"
            aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
          >
            {isExpanded ? (
              <span className="text-sm">▼</span>
            ) : (
              <span className="text-sm">▶</span>
            )}
          </button>

          {isEditing ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              className="flex-1 px-2 py-1 text-sm font-semibold bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <h3 className="text-sm font-semibold text-foreground">{groupName}</h3>
          )}

          {!isEditing && onEditGroup && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-6 w-6 p-0"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          )}

          <span className="text-xs text-muted-foreground">
            ({accountCount} {accountCount === 1 ? 'account' : 'accounts'})
          </span>
        </div>

        {/* Right side: Total balance */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Total:</span>
          <span
            className={`text-sm font-bold ${
              totalBalance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            ₹{totalBalance.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}

export default AccountHeader
