import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { resolveServerKeys } from '@/lib/resolveAIKey';

function buildPrompt(
  smsText: string,
  categories: { name: string; type: string; subCategories: string[] }[],
  accounts: { name: string; type: string }[],
  recentTransactions: { category: string; subCategory?: string; merchant?: string; description?: string }[]
): string {
  const categoriesInfo = categories
    .map(c => `- ${c.name} (${c.type})${c.subCategories.length > 0 ? `: ${c.subCategories.join(', ')}` : ''}`)
    .join('\n');
  const accountsInfo = accounts.map(a => `- ${a.name} (${a.type})`).join('\n');
  const recentInfo = recentTransactions
    .slice(0, 10)
    .map(t => `- ${t.merchant || t.description}: ${t.category}${t.subCategory ? '/' + t.subCategory : ''}`)
    .join('\n');

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
}`;
}

function parseJsonResponse(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category || null,
        subCategory: parsed.subCategory || null,
        accountName: parsed.accountName || null,
        transactionType: parsed.transactionType === 'INCOME' ? 'INCOME' : 'EXPENSE',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
        reasoning: parsed.reasoning || '',
      };
    }
  } catch {
    // Failed to parse
  }
  return null;
}

async function callGemini(apiKey: string, prompt: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callClaude(apiKey: string, prompt: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude error ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? null;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { smsText, categories = [], accounts = [], recentTransactions = [], geminiKey: userGeminiKey, claudeKey: userClaudeKey } = await request.json();
    // Phase 2: use shared resolveServerKeys — single source of truth for key resolution
    const { geminiKey, claudeKey, hasAnyKey } = resolveServerKeys(userGeminiKey, userClaudeKey);

    if (!hasAnyKey) {
      return NextResponse.json(
        { success: false, provider: null, suggestion: null, error: 'AI parsing not configured.' },
        { status: 503 }
      );
    }
    if (!smsText) {
      return NextResponse.json({ error: 'No SMS text provided' }, { status: 400 });
    }

    const prompt = buildPrompt(smsText, categories, accounts, recentTransactions);
    const errors: string[] = [];

    if (geminiKey) {
      try {
        const text = await callGemini(geminiKey, prompt);
        if (text) {
          const suggestion = parseJsonResponse(text);
          if (suggestion) return NextResponse.json({ success: true, provider: 'gemini', suggestion, error: null });
          errors.push('Gemini: Failed to parse response');
        }
      } catch (e: any) {
        errors.push(`Gemini: ${e.message}`);
      }
    }

    if (claudeKey) {
      try {
        const text = await callClaude(claudeKey, prompt);
        if (text) {
          const suggestion = parseJsonResponse(text);
          if (suggestion) return NextResponse.json({ success: true, provider: 'claude', suggestion, error: null });
          errors.push('Claude: Failed to parse response');
        }
      } catch (e: any) {
        errors.push(`Claude: ${e.message}`);
      }
    }

    return NextResponse.json({
      success: false,
      provider: null,
      suggestion: null,
      error: errors.join(' | ') || 'AI parsing failed',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
