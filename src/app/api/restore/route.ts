import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sheetsClient } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  // Identify the caller — only return this user's rows from the shared sheet
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Build a list of candidate IDs to try in order:
  // 1. Email — primary (human-readable, used by current backup)
  // 2. Google sub — fallback for backups created before email was adopted
  const userIdCandidates = [
    session.user.email,
    session.user.id,
  ].filter((v): v is string => !!v);

  try {
    const data = await sheetsClient.restoreFromSheets(userIdCandidates);

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
