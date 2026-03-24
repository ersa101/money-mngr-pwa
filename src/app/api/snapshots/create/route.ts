import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { driveClient } from '@/lib/google-drive';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const result = await driveClient.createSnapshot(session.accessToken, data);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error?.code === 401 || error?.message?.includes('invalid_grant')) {
      return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
