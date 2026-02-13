import { NextRequest, NextResponse } from 'next/server';
import { driveClient } from '@/lib/google-drive';

// GET: Get snapshot content
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await driveClient.getSnapshot(params.id);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete snapshot
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await driveClient.deleteSnapshot(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
