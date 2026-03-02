import { Transaction, Category } from '@/types/database'

export interface ResolvedCategory {
  id: number | undefined
  name: string
  icon: string
  parentName?: string
}

/**
 * Resolves category information for a transaction with fallback to csvCategory
 * This handles cases where categoryId lookup fails (e.g., from older CSV imports)
 */
export async function resolveCategory(
  transaction: Transaction,
  categories: Category[]
): Promise<ResolvedCategory> {
  // Try lookup by categoryId first
  if (transaction.categoryId) {
    const category = categories.find(c => c.id === transaction.categoryId)
    if (category) {
      let parentName: string | undefined
      if (category.parentId) {
        const parent = categories.find(c => c.id === category.parentId)
        parentName = parent?.name
      }
      return {
        id: category.id,
        name: category.name,
        icon: category.icon || '',
        parentName,
      }
    }
  }

  // Fallback to csvCategory
  if (transaction.csvCategory) {
    // Try to find matching category by name
    const byName = categories.find(
      c => c.name.toLowerCase() === transaction.csvCategory?.toLowerCase()
    )
    if (byName) {
      return {
        id: byName.id,
        name: byName.name,
        icon: byName.icon || '',
      }
    }

    // Return csvCategory as-is
    return {
      id: undefined,
      name: transaction.csvCategory,
      icon: '',
    }
  }

  // Last resort
  return {
    id: undefined,
    name: 'Uncategorized',
    icon: '',
  }
}

/**
 * Synchronous version for batch processing - use prebuilt maps for performance
 */
export function resolveCategorySync(
  transaction: Transaction,
  categoriesMap: Map<number, Category>,
  categoriesByName: Map<string, Category>
): ResolvedCategory {
  // Try by ID
  if (transaction.categoryId) {
    const category = categoriesMap.get(transaction.categoryId)
    if (category) {
      const parent = category.parentId ? categoriesMap.get(category.parentId) : undefined
      return {
        id: category.id,
        name: category.name,
        icon: category.icon || '',
        parentName: parent?.name,
      }
    }
  }

  // Fallback to csvCategory
  if (transaction.csvCategory) {
    const byName = categoriesByName.get(transaction.csvCategory.toLowerCase())
    if (byName) {
      return {
        id: byName.id,
        name: byName.name,
        icon: byName.icon || '',
      }
    }
    return {
      id: undefined,
      name: transaction.csvCategory,
      icon: '',
    }
  }

  return { id: undefined, name: 'Uncategorized', icon: '' }
}

/**
 * Build lookup maps for efficient batch category resolution
 */
export function buildCategoryMaps(categories: Category[]): {
  categoriesMap: Map<number, Category>
  categoriesByName: Map<string, Category>
} {
  const categoriesMap = new Map<number, Category>()
  const categoriesByName = new Map<string, Category>()

  for (const cat of categories) {
    // Skip null/undefined categories
    if (!cat || !cat.name) continue

    if (cat.id) {
      categoriesMap.set(cat.id, cat)
    }
    categoriesByName.set(cat.name.toLowerCase(), cat)
  }

  return { categoriesMap, categoriesByName }
}
