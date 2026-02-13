import { NextRequest, NextResponse } from 'next/server';
import { sheetsClient } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    await sheetsClient.backupToSheets(data);
    
    return NextResponse.json({
      success: true,
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
