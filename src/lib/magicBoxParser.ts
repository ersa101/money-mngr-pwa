export interface MatchCandidate {
  id: number
  name: string
}

export interface MatchResult {
  id: number
  name: string
  confidence: number
}

export interface MagicBoxParseResult {
  amount: number | null
  accountMatch: MatchResult | null
  categoryMatch: MatchResult | null
  description: string
  date: Date
  transactionType: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  rawInput: string
  unmatchedTokens: string[]
}

// Category alias map for common Indian expense terms
const CATEGORY_ALIASES: Record<string, string[]> = {
  'Food': ['chai', 'tea', 'coffee', 'lunch', 'dinner', 'breakfast', 'snack', 'biryani', 'thali', 'samosa', 'dosa', 'pav', 'bhaji', 'pizza', 'burger', 'noodles', 'momos'],
  'Transport': ['uber', 'ola', 'rapido', 'cab', 'auto', 'metro', 'bus', 'petrol', 'diesel', 'fuel', 'parking', 'toll'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'clothes', 'shoes'],
  'Entertainment': ['netflix', 'spotify', 'hotstar', 'prime', 'movie', 'film', 'game'],
  'Health': ['medicine', 'doctor', 'hospital', 'pharmacy', 'gym', 'yoga'],
  'Education': ['book', 'course', 'udemy', 'class', 'tuition', 'school', 'college'],
  'Utilities': ['electricity', 'water', 'gas', 'wifi', 'internet', 'mobile', 'recharge', 'bill'],
  'Rent': ['rent', 'emi'],
  'Grocery': ['grocery', 'vegetables', 'fruits', 'milk', 'eggs', 'blinkit', 'zepto', 'bigbasket', 'instamart'],
  'Salary': ['salary', 'payroll', 'stipend', 'wage'],
  'Freelance': ['freelance', 'project', 'consulting'],
  'Investment': ['invest', 'mutual', 'sip', 'stock', 'fd', 'rd'],
  'Cashback': ['cashback', 'refund', 'return'],
}

const INCOME_KEYWORDS = ['income', 'salary', 'received', 'credited', 'earning', 'freelance', 'stipend', 'cashback', 'refund', 'dividend']
const TRANSFER_KEYWORDS = ['transfer', 'send', 'sent']

// Levenshtein distance
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }

  return dp[m][n]
}

function fuzzyMatch(input: string, candidates: MatchCandidate[]): MatchResult | null {
  const normalized = input.toLowerCase().trim()
  if (!normalized) return null

  let best: MatchResult | null = null

  for (const candidate of candidates) {
    const candidateLower = candidate.name.toLowerCase()

    // Exact match
    if (candidateLower === normalized) {
      return { id: candidate.id, name: candidate.name, confidence: 1.0 }
    }

    // Abbreviation match: "DB" matches "Deutsche Bank" via initials
    const initials = candidateLower.split(/\s+/).map((w) => w[0]).join('')
    if (initials === normalized) {
      const score = 0.9
      if (!best || score > best.confidence) {
        best = { id: candidate.id, name: candidate.name, confidence: score }
      }
      continue
    }

    // Substring match: "hdfc" in "HDFC Bank"
    if (candidateLower.includes(normalized) || normalized.includes(candidateLower)) {
      const score = 0.8
      if (!best || score > best.confidence) {
        best = { id: candidate.id, name: candidate.name, confidence: score }
      }
      continue
    }

    // Levenshtein distance (only for longer tokens to avoid false matches)
    if (normalized.length >= 3) {
      const dist = levenshtein(normalized, candidateLower)
      const maxLen = Math.max(normalized.length, candidateLower.length)
      const score = 1 - dist / maxLen
      if (score > 0.6 && (!best || score > best.confidence)) {
        best = { id: candidate.id, name: candidate.name, confidence: Math.round(score * 100) / 100 }
      }
    }
  }

  return best
}

function matchCategoryByAlias(token: string, categories: MatchCandidate[]): MatchResult | null {
  const normalized = token.toLowerCase().trim()

  for (const [categoryName, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.includes(normalized)) {
      // Find the actual category with this name (or containing this name)
      const match = categories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase() ||
               c.name.toLowerCase().includes(categoryName.toLowerCase())
      )
      if (match) {
        return { id: match.id, name: match.name, confidence: 0.85 }
      }
      // Return as a hint even if category doesn't exist yet
      return { id: -1, name: categoryName, confidence: 0.7 }
    }
  }

  return null
}

export function parseMagicInput(
  input: string,
  accounts: MatchCandidate[],
  categories: MatchCandidate[]
): MagicBoxParseResult {
  const result: MagicBoxParseResult = {
    amount: null,
    accountMatch: null,
    categoryMatch: null,
    description: '',
    date: new Date(),
    transactionType: 'EXPENSE',
    rawInput: input,
    unmatchedTokens: [],
  }

  const tokens = input.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return result

  const remainingTokens: string[] = []

  // Step 1: Extract amount (first numeric token, handle Rs/INR prefix)
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    // Strip currency prefix
    const cleaned = t.replace(/^(rs\.?|inr|₹)/i, '')
    const num = parseFloat(cleaned)
    if (!isNaN(num) && num > 0) {
      result.amount = num
      // Remove this token, push remaining
      for (let j = 0; j < tokens.length; j++) {
        if (j !== i) remainingTokens.push(tokens[j])
      }
      break
    }
  }

  // If no amount found, all tokens remain
  if (result.amount === null) {
    remainingTokens.push(...tokens)
  }

  // Step 2: Detect transaction type from keywords
  const filteredTokens: string[] = []
  for (const t of remainingTokens) {
    const lower = t.toLowerCase()
    if (INCOME_KEYWORDS.includes(lower)) {
      result.transactionType = 'INCOME'
    } else if (TRANSFER_KEYWORDS.includes(lower)) {
      result.transactionType = 'TRANSFER'
    } else {
      filteredTokens.push(t)
    }
  }

  // Step 3: Match remaining tokens against accounts and categories
  const unmatched: string[] = []

  for (const token of filteredTokens) {
    // Try account match first
    if (!result.accountMatch) {
      const accountMatch = fuzzyMatch(token, accounts)
      if (accountMatch && accountMatch.confidence >= 0.7) {
        result.accountMatch = accountMatch
        continue
      }
    }

    // Try category match (alias first, then fuzzy)
    if (!result.categoryMatch) {
      const aliasMatch = matchCategoryByAlias(token, categories)
      if (aliasMatch) {
        result.categoryMatch = aliasMatch
        continue
      }

      const categoryMatch = fuzzyMatch(token, categories)
      if (categoryMatch && categoryMatch.confidence >= 0.6) {
        result.categoryMatch = categoryMatch
        continue
      }
    }

    // If we already have both matches, try to improve them
    if (result.accountMatch && !result.categoryMatch) {
      const aliasMatch = matchCategoryByAlias(token, categories)
      if (aliasMatch) {
        result.categoryMatch = aliasMatch
        continue
      }
    }

    unmatched.push(token)
  }

  result.unmatchedTokens = unmatched
  result.description = unmatched.join(' ')

  return result
}
