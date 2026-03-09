import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sheetsClient } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  // Identify the caller — session.user.id is the stable Google sub ID
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const data = await request.json();

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
