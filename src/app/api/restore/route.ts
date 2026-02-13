import { NextRequest, NextResponse } from 'next/server';
import { sheetsClient } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    const data = await sheetsClient.restoreFromSheets();
    
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
