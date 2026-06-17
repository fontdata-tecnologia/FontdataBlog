import { NextRequest, NextResponse } from 'next/server'
import { runDueCrawlers } from '@/lib/source-crawlers/runner'
import { isAuthorizedCron } from '@/lib/cron-auth'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

// Auth: Bearer CRON_SECRET (com fallback legado a SUPABASE_SERVICE_ROLE_KEY).
export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await runDueCrawlers()
    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    return NextResponse.json({
      ok: true,
      crawlers_run: results.length,
      articles_generated: successful.length,
      errors: failed.map((r) => ({ crawler: r.crawlerName, error: r.error })),
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Cron Source Crawlers] failed:', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
