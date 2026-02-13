// LLM Service with Gemini -> OpenAI -> Claude fallback chain
// For intelligent SMS parsing and transaction categorization

export interface LLMApiKeys {
  gemini: string
  openai: string
  claude: string
}

export interface TransactionSuggestion {
  category: string | null
  subCategory: string | null
  accountName: string | null
  transactionType: 'EXPENSE' | 'INCOME'
  confidence: number
  reasoning: string
}

export interface LLMResponse {
  success: boolean
  provider: 'gemini' | 'openai' | 'claude' | null
  suggestion: TransactionSuggestion | null
  error: string | null
}

// Get API keys from localStorage
function getApiKeys(): LLMApiKeys {
  try {
    const saved = localStorage.getItem('llm_api_keys')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Ignore parse errors
  }
  return { gemini: '', openai: '', claude: '' }
}

// Check if any API key is configured
function hasApiKeys(): boolean {
  const keys = getApiKeys()
  return !!(keys.gemini || keys.openai || keys.claude)
}

// Build the prompt for LLM
function buildPrompt(
  smsText: string,
  existingCategories: { name: string; type: 'EXPENSE' | 'INCOME'; subCategories: string[] }[],
  existingAccounts: { name: string; type: string }[],
  recentTransactions: { category: string; subCategory?: string; merchant?: string; description?: string }[]
): string {
  const categoriesInfo = existingCategories.map(c =>
    `- ${c.name} (${c.type})${c.subCategories.length > 0 ? `: ${c.subCategories.join(', ')}` : ''}`
  ).join('\n')

  const accountsInfo = existingAccounts.map(a => `- ${a.name} (${a.type})`).join('\n')

  const recentInfo = recentTransactions.slice(0, 10).map(t =>
    `- ${t.merchant || t.description}: ${t.category}${t.subCategory ? '/' + t.subCategory : ''}`
  ).join('\n')

  return `You are a financial transaction categorizer for an Indian user. Analyze this bank SMS and suggest the most appropriate category, subcategory, and account based on the user's existing data.

SMS MESSAGE:
"${smsText}"

EXISTING CATEGORIES:
${categoriesInfo || 'None yet'}

EXISTING ACCOUNTS:
${accountsInfo || 'None yet'}

RECENT SIMILAR TRANSACTIONS:
${recentInfo || 'None yet'}

INSTRUCTIONS:
1. Determine if this is an EXPENSE or INCOME transaction
2. Match to an existing category if possible, or suggest a new one
3. Match to an existing subcategory or suggest a new one based on the merchant/purpose
4. Try to identify which account this transaction belongs to (look for bank names, last 4 digits, card types)
5. Consider patterns from recent similar transactions

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "category": "string or null",
  "subCategory": "string or null",
  "accountName": "string or null",
  "transactionType": "EXPENSE" or "INCOME",
  "confidence": number between 0 and 100,
  "reasoning": "brief explanation"
}`
}

// Parse LLM response to extract JSON
function parseJsonResponse(text: string): TransactionSuggestion | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        category: parsed.category || null,
        subCategory: parsed.subCategory || null,
        accountName: parsed.accountName || null,
        transactionType: parsed.transactionType === 'INCOME' ? 'INCOME' : 'EXPENSE',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
        reasoning: parsed.reasoning || ''
      }
    }
  } catch {
    // Failed to parse
  }
  return null
}

// Call Gemini API
async function callGemini(
  apiKey: string,
  prompt: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
          }
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.error?.message || `Gemini API error: ${response.status}` }
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (text) {
      return { success: true, text }
    }
    return { success: false, error: 'No response from Gemini' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Gemini request failed' }
  }
}

// Call OpenAI API
async function callOpenAI(
  apiKey: string,
  prompt: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.error?.message || `OpenAI API error: ${response.status}` }
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (text) {
      return { success: true, text }
    }
    return { success: false, error: 'No response from OpenAI' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'OpenAI request failed' }
  }
}

// Call Claude API
async function callClaude(
  apiKey: string,
  prompt: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.error?.message || `Claude API error: ${response.status}` }
    }

    const data = await response.json()
    const text = data.content?.[0]?.text
    if (text) {
      return { success: true, text }
    }
    return { success: false, error: 'No response from Claude' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Claude request failed' }
  }
}

// Main function to get LLM suggestion with fallback chain
async function getLLMSuggestion(
  smsText: string,
  existingCategories: { name: string; type: 'EXPENSE' | 'INCOME'; subCategories: string[] }[],
  existingAccounts: { name: string; type: string }[],
  recentTransactions: { category: string; subCategory?: string; merchant?: string; description?: string }[]
): Promise<LLMResponse> {
  const keys = getApiKeys()
  const prompt = buildPrompt(smsText, existingCategories, existingAccounts, recentTransactions)

  const errors: string[] = []

  // Try Gemini first
  if (keys.gemini) {
    const result = await callGemini(keys.gemini, prompt)
    if (result.success && result.text) {
      const suggestion = parseJsonResponse(result.text)
      if (suggestion) {
        return { success: true, provider: 'gemini', suggestion, error: null }
      }
      errors.push('Gemini: Failed to parse response')
    } else if (result.error) {
      errors.push(`Gemini: ${result.error}`)
    }
  }

  // Try OpenAI second
  if (keys.openai) {
    const result = await callOpenAI(keys.openai, prompt)
    if (result.success && result.text) {
      const suggestion = parseJsonResponse(result.text)
      if (suggestion) {
        return { success: true, provider: 'openai', suggestion, error: null }
      }
      errors.push('OpenAI: Failed to parse response')
    } else if (result.error) {
      errors.push(`OpenAI: ${result.error}`)
    }
  }

  // Try Claude third
  if (keys.claude) {
    const result = await callClaude(keys.claude, prompt)
    if (result.success && result.text) {
      const suggestion = parseJsonResponse(result.text)
      if (suggestion) {
        return { success: true, provider: 'claude', suggestion, error: null }
      }
      errors.push('Claude: Failed to parse response')
    } else if (result.error) {
      errors.push(`Claude: ${result.error}`)
    }
  }

  // All APIs failed or no keys configured
  if (!keys.gemini && !keys.openai && !keys.claude) {
    return {
      success: false,
      provider: null,
      suggestion: null,
      error: 'No API keys configured. Please add your API keys in Settings > API Keys.'
    }
  }

  return {
    success: false,
    provider: null,
    suggestion: null,
    error: errors.length > 0 ? errors.join(' | ') : 'All LLM APIs failed'
  }
}

export const llmService = {
    getSuggestion: getLLMSuggestion,
    hasApiKeys,
    getApiKeys,
};
