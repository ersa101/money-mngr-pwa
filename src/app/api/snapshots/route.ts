import { NextRequest, NextResponse } from 'next/server';
import { driveClient } from '@/lib/google-drive';

// GET: List all snapshots
export async function GET() {
  try {
    const snapshots = await driveClient.listSnapshots();
    return NextResponse.json({ snapshots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
