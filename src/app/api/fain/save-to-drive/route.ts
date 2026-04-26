import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { driveClient } from '@/lib/google-drive';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { insightId, content } = await request.json();
    if (!insightId || !content) {
      return NextResponse.json({ error: 'Missing insightId or content' }, { status: 400 });
    }

    const result = await driveClient.uploadInsightFile(
      session.accessToken,
      insightId,
      content
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error?.code === 401 || error?.message?.includes('invalid_grant')) {
      return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
