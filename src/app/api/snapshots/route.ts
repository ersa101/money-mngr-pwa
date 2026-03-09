import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { driveClient } from '@/lib/google-drive';

// GET: List snapshots for the authenticated user only
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const snapshots = await driveClient.listSnapshots(userId);
    return NextResponse.json({ snapshots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
