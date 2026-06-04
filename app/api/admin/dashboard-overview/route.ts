import { NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import {
  automationConfig,
  newsletterSubscribers,
  rssFeeds,
  sourceCrawlers,
  apiTokens,
  automationLogs,
} from '@/drizzle/schema'
import { eq, desc, count } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/**
 * Visão geral do "sistema" para o dashboard admin — agrega automação,
 * newsletter, fontes (RSS + crawlers), tokens de API e atividade recente
 * numa única chamada, evitando vários fetches no client.
 */
export async function GET() {
  try {
    const [
      automationRows,
      newsletterActive,
      rssEnabled,
      rssTotal,
      crawlersEnabled,
      crawlersTotal,
      tokensActive,
      recentLogs,
    ] = await Promise.all([
      db.select().from(automationConfig).limit(1),
      db.select({ c: count() }).from(newsletterSubscribers).where(eq(newsletterSubscribers.status, 'active')),
      db.select({ c: count() }).from(rssFeeds).where(eq(rssFeeds.enabled, true)),
      db.select({ c: count() }).from(rssFeeds),
      db.select({ c: count() }).from(sourceCrawlers).where(eq(sourceCrawlers.enabled, true)),
      db.select({ c: count() }).from(sourceCrawlers),
      db.select({ c: count() }).from(apiTokens).where(eq(apiTokens.active, 'true')),
      db
        .select({
          id: automationLogs.id,
          triggered_by: automationLogs.triggered_by,
          status: automationLogs.status,
          message: automationLogs.message,
          post_id: automationLogs.post_id,
          started_at: automationLogs.started_at,
        })
        .from(automationLogs)
        .orderBy(desc(automationLogs.started_at))
        .limit(6),
    ])

    const automation = automationRows[0]

    return NextResponse.json({
      automation: {
        enabled: automation?.enabled ?? false,
        interval_hours: automation?.interval_hours ?? 24,
        last_run_at: automation?.last_run_at ?? null,
        next_run_at: automation?.next_run_at ?? null,
      },
      newsletter: { active: newsletterActive[0]?.c ?? 0 },
      sources: {
        rssEnabled: rssEnabled[0]?.c ?? 0,
        rssTotal: rssTotal[0]?.c ?? 0,
        crawlersEnabled: crawlersEnabled[0]?.c ?? 0,
        crawlersTotal: crawlersTotal[0]?.c ?? 0,
      },
      apiTokens: { active: tokensActive[0]?.c ?? 0 },
      recentActivity: recentLogs,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar visão geral' }, { status: 500 })
  }
}
