// app/api/cron/data-retention/route.ts
// Art. 15/16 LGPD — eliminação automática de dados após prazo de retenção
// Autenticado por SUPABASE_SERVICE_ROLE_KEY como Bearer token.
// Agendado via pg_cron — execução diária.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { pageViews, automationLogs, aiRequestLogs, newsletterSubscribers } from '@/drizzle/schema'
import { lt, and, eq, isNotNull } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { getLgpdSettings, DEFAULT_LGPD } from '@/lib/settings'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  // Verificação de autenticação — Bearer SUPABASE_SERVICE_ROLE_KEY
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  const expectedToken = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const started = Date.now()
  const now = new Date()

  // Limites de retenção — lidos de site_settings (fallback aos defaults LGPD)
  const lgpdCfg = await getLgpdSettings()
  const pageviewMonths = lgpdCfg.retention_pageviews_months || DEFAULT_LGPD.retention_pageviews_months
  const logsMonths = lgpdCfg.retention_logs_months || DEFAULT_LGPD.retention_logs_months
  const unsubDays = lgpdCfg.retention_unsubscribed_days || DEFAULT_LGPD.retention_unsubscribed_days

  const pageViewCutoff = new Date(now.getTime() - pageviewMonths * 30 * 24 * 60 * 60 * 1000)
  const logsCutoff = new Date(now.getTime() - logsMonths * 30 * 24 * 60 * 60 * 1000)
  const unsubscribedCutoff = new Date(now.getTime() - unsubDays * 24 * 60 * 60 * 1000)

  const results: Record<string, number> = {}
  const errors: string[] = []

  try {
    // 1. Apagar page_views com mais de 12 meses
    const pvResult = await db
      .delete(pageViews)
      .where(lt(pageViews.visited_at, pageViewCutoff))
      .returning({ id: pageViews.id })
    results.page_views_deleted = pvResult.length
  } catch (err) {
    errors.push(`page_views: ${err instanceof Error ? err.message : String(err)}`)
  }

  try {
    // 2. Apagar automation_logs com mais de 6 meses
    const alResult = await db
      .delete(automationLogs)
      .where(lt(automationLogs.started_at, logsCutoff))
      .returning({ id: automationLogs.id })
    results.automation_logs_deleted = alResult.length
  } catch (err) {
    errors.push(`automation_logs: ${err instanceof Error ? err.message : String(err)}`)
  }

  try {
    // 3. Apagar ai_request_logs com mais de 6 meses
    const arlResult = await db
      .delete(aiRequestLogs)
      .where(lt(aiRequestLogs.created_at, logsCutoff))
      .returning({ id: aiRequestLogs.id })
    results.ai_request_logs_deleted = arlResult.length
  } catch (err) {
    errors.push(`ai_request_logs: ${err instanceof Error ? err.message : String(err)}`)
  }

  try {
    // 4. Hard delete de e-mails com status 'unsubscribed' há mais de 30 dias
    const nsResult = await db
      .delete(newsletterSubscribers)
      .where(
        and(
          eq(newsletterSubscribers.status, 'unsubscribed'),
          isNotNull(newsletterSubscribers.unsubscribed_at),
          lt(newsletterSubscribers.unsubscribed_at, unsubscribedCutoff)
        )
      )
      .returning({ id: newsletterSubscribers.id })
    results.newsletter_deleted = nsResult.length
  } catch (err) {
    errors.push(`newsletter_subscribers: ${err instanceof Error ? err.message : String(err)}`)
  }

  const duration = Date.now() - started
  const status = errors.length > 0 ? 'error' : 'success'
  const message = JSON.stringify({ results, errors: errors.length > 0 ? errors : undefined })

  // Registra execução em automation_logs (imutável após escrita, Art. cron-automator)
  try {
    await db.insert(automationLogs).values({
      triggered_by: 'data-retention-cron',
      status,
      message,
      duration_ms: duration,
      finished_at: new Date(),
    })
  } catch {
    // Falha no log não deve impedir resposta
  }

  return NextResponse.json({
    ok: status === 'success',
    results,
    errors: errors.length > 0 ? errors : undefined,
    duration_ms: duration,
  }, { status: status === 'success' ? 200 : 207 })
}
