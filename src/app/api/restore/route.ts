import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sheetsClient } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  // Identify the caller — only return this user's rows from the shared sheet
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const data = await sheetsClient.restoreFromSheets(userId);

    return NextResponse.json({
      success: true,
      data,
      counts: {
        accounts: data.accounts?.length || 0,
        categories: data.categories?.length || 0,
        transactions: data.transactions?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Restore failed:', error);
    return NextResponse.json(
      { error: error.message || 'Restore failed' },
      { status: 500 }
    );
  }
}
