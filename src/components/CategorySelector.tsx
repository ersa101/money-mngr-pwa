'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Category } from '@/types/database'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'

interface CategorySelectorProps {
  categories: Category[]
  type: 'EXPENSE' | 'INCOME'
  selectedCategoryId?: number
  selectedSubCategoryId?: number
  onSelect: (categoryId: number, subCategoryId?: number) => void
  error?: string
  disabled?: boolean
}

export function CategorySelector({
  categories,
  type,
  selectedCategoryId,
  selectedSubCategoryId,
  onSelect,
  error,
  disabled = false,
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedParent, setExpandedParent] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter and organize categories
  const { parentCategories, childrenByParent } = useMemo(() => {
    const filtered = categories.filter((c) => c.type === type)
    const parents = filtered.filter((c) => !c.parentId)
    const children = new Map<number, Category[]>()

    for (const cat of filtered) {
      if (cat.parentId) {
        if (!children.has(cat.parentId)) {
          children.set(cat.parentId, [])
        }
        children.get(cat.parentId)!.push(cat)
      }
    }

    return { parentCategories: parents, childrenByParent: children }
  }, [categories, type])

  // Get display text
  const displayText = useMemo(() => {
    if (!selectedCategoryId) return 'Select category...'

    const parent = categories.find((c) => c.id === selectedCategoryId)
    if (!parent) return 'Select category...'

    if (selectedSubCategoryId) {
      const child = categories.find((c) => c.id === selectedSubCategoryId)
      return `${parent.name} > ${child?.name || ''}`
    }

    return parent.name
  }, [categories, selectedCategoryId, selectedSubCategoryId])

  // Check if selection is valid (sub-category required when parent has children)
  const isValid = useMemo(() => {
    if (!selectedCategoryId) return false

    const hasChildren = childrenByParent.has(selectedCategoryId)
    if (hasChildren && !selectedSubCategoryId) return false

    return true
  }, [selectedCategoryId, selectedSubCategoryId, childrenByParent])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setExpandedParent(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleParentClick = (parent: Category) => {
    const hasChildren = childrenByParent.has(parent.id!)

    if (hasChildren) {
      // Expand/collapse children
      setExpandedParent(expandedParent === parent.id ? null : parent.id!)
    } else {
      // No children, select directly
      onSelect(parent.id!)
      setIsOpen(false)
    }
  }

  const handleChildClick = (parent: Category, child: Category) => {
    onSelect(parent.id!, child.id)
    setIsOpen(false)
    setExpandedParent(null)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors ${
          error
            ? 'border-red-400 bg-red-50'
            : disabled
            ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        } text-gray-900`}
      >
        <span className={!selectedCategoryId ? 'text-gray-400' : ''}>
          {displayText}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Error Message */}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
          {parentCategories.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              No {type.toLowerCase()} categories available
            </div>
          ) : (
            parentCategories.map((parent) => {
              const children = childrenByParent.get(parent.id!) || []
              const hasChildren = children.length > 0
              const isExpanded = expandedParent === parent.id
              const isParentSelected = selectedCategoryId === parent.id

              return (
                <div key={parent.id}>
                  {/* Parent Category */}
                  <button
                    type="button"
                    onClick={() => handleParentClick(parent)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${
                      isParentSelected && !hasChildren ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {parent.icon && <span>{parent.icon}</span>}
                      <span className="font-medium text-gray-900">{parent.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasChildren && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {children.length}
                        </span>
                      )}
                      {hasChildren ? (
                        isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )
                      ) : isParentSelected ? (
                        <Check className="w-4 h-4 text-blue-500" />
                      ) : null}
                    </div>
                  </button>

                  {/* Child Categories (Sub-categories) */}
                  {hasChildren && isExpanded && (
                    <div className="bg-gray-50/50">
                      {children.map((child) => {
                        const isChildSelected = selectedSubCategoryId === child.id

                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => handleChildClick(parent, child)}
                            className={`w-full flex items-center justify-between px-4 py-2 pl-10 hover:bg-gray-50 transition-colors ${
                              isChildSelected ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 text-gray-700">
                              <span className="text-gray-400">├─</span>
                              <span>{child.name}</span>
                            </div>
                            {isChildSelected && (
                              <Check className="w-4 h-4 text-blue-500" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
