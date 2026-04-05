import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sheetsClient } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      timestamp,
      featureId,
      insightType,
      insightSummary,
      userResponse,
      userReason,
      categoryContext,
      subcategoryContext,
      monthYear,
    } = body;

    // Write to Google Sheet — fire and forget
    // Sheet: FAIN_Feedback_Log, columns match schema
    const row = [
      timestamp ?? new Date().toISOString(),
      featureId ?? '',
      insightType ?? '',
      (insightSummary ?? '').slice(0, 200),
      String(userResponse),
      userReason ?? '',
      categoryContext ?? '',
      subcategoryContext ?? '',
      monthYear ?? '',
    ];

    await sheetsClient.appendFeedbackRow(row);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Don't fail loudly — IndexedDB is the fallback
    console.error('Feedback write failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
