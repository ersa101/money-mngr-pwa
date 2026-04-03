// LLM Service — thin client wrapper around /api/ai/parse-sms server route
// User's own keys (if provided) take priority; developer env-var keys are the fallback.

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

async function getLLMSuggestion(
  smsText: string,
  existingCategories: { name: string; type: 'EXPENSE' | 'INCOME'; subCategories: string[] }[],
  existingAccounts: { name: string; type: string }[],
  recentTransactions: { category: string; subCategory?: string; merchant?: string; description?: string }[],
  userKeys?: { gemini?: string; claude?: string }
): Promise<LLMResponse> {
  try {
    const res = await fetch('/api/ai/parse-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smsText,
        categories: existingCategories,
        accounts: existingAccounts,
        recentTransactions,
        geminiKey: userKeys?.gemini || '',
        claudeKey: userKeys?.claude || '',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, provider: null, suggestion: null, error: data.error ?? 'AI parsing failed' };
    }
    return data as LLMResponse;
  } catch (err) {
    return {
      success: false,
      provider: null,
      suggestion: null,
      error: err instanceof Error ? err.message : 'Request failed',
    };
  }
}

export const llmService = {
  getSuggestion: getLLMSuggestion,
  // Always true: server-side env-var keys are always available as fallback
  hasApiKeys: () => true,
};
