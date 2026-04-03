import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callGemini(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const lastMsg = messages[messages.length - 1];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [...history, { role: 'user', parts: [{ text: lastMsg.content }] }],
        generationConfig: { maxOutputTokens: 500 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callClaude(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string
): Promise<string> {
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
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
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
    const { messages, systemPrompt, geminiKey: userGeminiKey, claudeKey: userClaudeKey } = await request.json();
    const geminiKey = userGeminiKey || process.env.GEMINI_API_KEY || '';
    const claudeKey = userClaudeKey || process.env.CLAUDE_API_KEY || '';

    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    let text = '';
    let lastError = '';

    if (geminiKey) {
      try {
        text = await callGemini(messages, systemPrompt ?? '', geminiKey);
      } catch (e: any) {
        lastError = e.message;
      }
    }

    if (!text && claudeKey) {
      try {
        text = await callClaude(messages, systemPrompt ?? '', claudeKey);
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
