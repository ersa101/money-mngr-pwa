import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { buildWaterfall, callWaterfallChat, type AIKeySlot } from '@/lib/resolveAIKeyServer';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { messages, systemPrompt, aiKeys } = await request.json();

    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const waterfall = buildWaterfall((aiKeys ?? []) as AIKeySlot[]);
    const text = await callWaterfallChat(messages, systemPrompt ?? '', waterfall, 500);
    return NextResponse.json({ text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
