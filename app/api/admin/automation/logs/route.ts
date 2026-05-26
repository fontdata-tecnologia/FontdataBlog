import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { automationLogs } from '@/drizzle/schema'
import { desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))

    const logs = await db
      .select()
      .from(automationLogs)
      .orderBy(desc(automationLogs.started_at))
      .limit(limit)

    return NextResponse.json({ logs })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
