import { NextRequest, NextResponse } from 'next/server'
import { runAutomationCycle } from '@/lib/automation'
import { isAuthorizedCron } from '@/lib/cron-auth'

export const maxDuration = 300

// Auth: Bearer CRON_SECRET (com fallback legado a SUPABASE_SERVICE_ROLE_KEY).
export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runAutomationCycle(false, 'schedule')
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[Cron] Automation cycle failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
