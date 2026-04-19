// /api/sheets/sync — Phase 1.5 Auto-Sync API
// GET  ?email=xxx  → pull user data from their named sheet tabs
// POST { email, transactions, accounts, categories } → push to sheet tabs

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pushSyncData, pullSyncData } from '@/lib/googleSheets'

// ─── GET — pull ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = req.nextUrl.searchParams.get('email')
    if (!email) {
      return NextResponse.json({ error: 'Missing email param' }, { status: 400 })
    }

    // Only allow users to read their own data
    if (email !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await pullSyncData(email)
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[sync GET]', err)
    return NextResponse.json({ error: err.message ?? 'Pull failed' }, { status: 500 })
  }
}

// ─── POST — push ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { email, transactions = [], accounts = [], categories = [] } = body

    if (!email) {
      return NextResponse.json({ error: 'Missing email in body' }, { status: 400 })
    }

    // Only allow users to write their own tab
    if (email !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await pushSyncData(email, { transactions, accounts, categories })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[sync POST]', err)
    return NextResponse.json({ error: err.message ?? 'Push failed' }, { status: 500 })
  }
}
