import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { driveClient } from '@/lib/google-drive';

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { snapshots, folderLink } = await driveClient.listSnapshots(session.accessToken);
    return NextResponse.json({ snapshots, folderLink });
  } catch (error: any) {
    if (error?.code === 401 || error?.message?.includes('invalid_grant')) {
      return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
