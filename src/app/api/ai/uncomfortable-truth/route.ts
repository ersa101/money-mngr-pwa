import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { resolveAIKeyServer } from '@/lib/resolveAIKey';

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
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
    const {
      dataPoints,
      geminiKey: userGeminiKey,
      claudeKey: userClaudeKey,
    } = await request.json();

    if (!dataPoints?.length) {
      return NextResponse.json({ error: 'No data points provided' }, { status: 400 });
    }

    const resolved = resolveAIKeyServer(userGeminiKey, userClaudeKey);
    if (!resolved) {
      return NextResponse.json(
        { error: 'No AI key configured. Add an API key in Settings.' },
        { status: 503 }
      );
    }

    // Build prompt — numbers come from data, AI only writes narratives
    const prompt = `You are a brutally honest financial advisor looking at a user's real spending data.
Your job is to write short, emotionally resonant 1-sentence narratives around the data points below.
Each narrative should make the number feel real by contextualizing it — like "That's X months of groceries" or "Enough for a trip to Y".
Do NOT fabricate any numbers — use ONLY the numbers provided.
Keep each narrative under 25 words.
Respond with a JSON array of strings (no markdown, no extra text):

Data:
${JSON.stringify(dataPoints, null, 2)}

Format: ["narrative 1", "narrative 2", ...]`;

    let text = '';
    let lastError = '';

    try {
      if (resolved.provider === 'gemini') {
        text = await callGemini(prompt, resolved.key);
      } else {
        text = await callClaude(prompt, resolved.key);
      }
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : 'AI call failed';
    }

    if (!text) {
      return NextResponse.json(
        { error: lastError || 'AI generation failed. Please try again.' },
        { status: 500 }
      );
    }

    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    let narratives: string[] = [];
    if (match) {
      try {
        narratives = JSON.parse(match[0]);
      } catch {
        narratives = [text.trim()];
      }
    } else {
      narratives = [text.trim()];
    }

    return NextResponse.json({ narratives });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
