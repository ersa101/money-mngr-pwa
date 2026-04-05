import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { resolveServerKeys } from '@/lib/resolveAIKey';

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 800 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude error ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { prompt, geminiKey: userGeminiKey, claudeKey: userClaudeKey } = await request.json();
    // Phase 2: use shared resolveServerKeys — single source of truth for key resolution
    const { geminiKey, claudeKey } = resolveServerKeys(userGeminiKey, userClaudeKey);

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    let text = '';
    let lastError = '';

    if (geminiKey) {
      try {
        text = await callGemini(prompt, geminiKey);
      } catch (e: any) {
        lastError = e.message;
      }
    }

    if (!text && claudeKey) {
      try {
        text = await callClaude(prompt, claudeKey);
      } catch (e: any) {
        lastError = e.message;
      }
    }

    if (!text) {
      return NextResponse.json(
        { error: lastError || 'Analysis failed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
