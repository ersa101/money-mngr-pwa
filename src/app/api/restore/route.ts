import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sheetsClient, _keyDiag } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userIdCandidates = [
    session.user.email,
    session.user.id,
  ].filter((v): v is string => !!v);

  try {
    const result = await sheetsClient.restoreFromSheets(userIdCandidates);
    const { _diag, ...data } = result;

    return NextResponse.json({
      success: true,
      data,
      counts: {
        accounts: data.accounts?.length || 0,
        categories: data.categories?.length || 0,
        transactions: data.transactions?.length || 0,
        filterPresets: data.filterPresets?.length || 0,
      },
      _diag,
    });
  } catch (error: any) {
    console.error('Restore failed:', error);
    return NextResponse.json(
      {
        error: error.message || 'Restore failed',
        stage: error.message?.match(/\[stage:([^\]]+)\]/)?.[1] ?? 'unknown',
        keyDiag: _keyDiag,
      },
      { status: 500 }
    );
  }
}
