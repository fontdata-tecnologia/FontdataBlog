import { NextRequest, NextResponse } from 'next/server'
import { checkAllFeeds } from '@/lib/rss-automation'
import { isAuthorizedCron } from '@/lib/cron-auth'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

// Auth: Bearer CRON_SECRET (com fallback legado a SUPABASE_SERVICE_ROLE_KEY).
export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await checkAllFeeds()
    const processed = results.filter((r) => r.processedItem)
    const errors = results.filter((r) => r.error)

    return NextResponse.json({
      ok: true,
      feeds_checked: results.length,
      new_items_found: results.reduce((s, r) => s + r.newItems, 0),
      articles_generated: processed.length,
      errors: errors.map((r) => ({ feed: r.feedName, error: r.error })),
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Cron RSS] checkAllFeeds failed:', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
