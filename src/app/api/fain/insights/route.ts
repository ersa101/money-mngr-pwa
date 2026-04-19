import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { buildWaterfall, callWaterfallPrompt, type AIKeySlot } from '@/lib/resolveAIKeyServer';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { prompt, aiKeys } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    const waterfall = buildWaterfall((aiKeys ?? []) as AIKeySlot[]);
    const text = await callWaterfallPrompt(prompt, waterfall, 800);
    return NextResponse.json({ text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
