import { NextRequest, NextResponse } from 'next/server';
import { gunzip } from 'zlib';
import { promisify } from 'util';
import { auth } from '@/lib/auth';
import { sheetsClient } from '@/lib/googleSheets';

const gunzipAsync = promisify(gunzip);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.email || session.user.id;

  try {
    // Decompress if client sent gzip (to stay under Vercel's 4.5 MB payload limit)
    let data: any;
    if (request.headers.get('content-encoding') === 'gzip') {
      const buf = Buffer.from(await request.arrayBuffer());
      const decompressed = await gunzipAsync(buf);
      data = JSON.parse(decompressed.toString('utf-8'));
    } else {
      data = await request.json();
    }

    // Only this user's rows are replaced in the shared sheet
    await sheetsClient.backupToSheets(data, userId);

    return NextResponse.json({
      success: true,
      userId,
      timestamp: new Date().toISOString(),
      counts: {
        accounts: data.accounts?.length || 0,
        categories: data.categories?.length || 0,
        transactions: data.transactions?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Backup failed:', error);
    return NextResponse.json(
      { error: error.message || 'Backup failed' },
      { status: 500 }
    );
  }
}
