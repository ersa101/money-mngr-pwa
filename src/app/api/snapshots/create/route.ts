import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { driveClient } from '@/lib/google-drive';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const data = await request.json();
    // Snapshot is stored inside the per-user subfolder in Drive
    const result = await driveClient.createSnapshot(data, userId);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
