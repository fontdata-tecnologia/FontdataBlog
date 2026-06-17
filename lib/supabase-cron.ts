/**
 * lib/supabase-cron.ts — SHIM DE COMPATIBILIDADE (DEPRECADO)
 *
 * O agendamento de crons NÃO é mais feito no banco (pg_cron + pg_net do
 * Supabase). Após a migração para Coolify + PostgreSQL próprio, os 4 jobs são
 * disparados pelas **Scheduled Tasks do Coolify**, que fazem POST nos endpoints
 * /api/cron/* com `Authorization: Bearer $CRON_SECRET`.
 *
 * Este módulo permanece apenas para manter as importações existentes válidas
 * (rotas admin de RSS/automação/crawlers, setup e db-migrations). Todas as
 * funções viraram no-ops: ativar/desativar um recurso no admin não agenda nada
 * no banco — o agendamento é fixo no Coolify e independe do estado do recurso
 * (os próprios handlers já checam o guard `enabled`/`next_run_at`).
 *
 * Cronogramas de referência para configurar no Coolify:
 *   - /api/cron/data-retention   →  "0 3 * * *"     (diário 03:00)
 *   - /api/cron/rss              →  a cada 30 min
 *   - /api/cron/automation       →  a cada 15 min
 *   - /api/cron/source-crawlers  →  a cada 15 min
 */

export type CronReport = {
  extensionsOk: boolean
  missingExtensions: string[]
  scheduled: string[]
  unscheduled: string[]
  errors: { job: string; message: string }[]
}

const normalizeUrl = (u: string) => u.trim().replace(/\/$/, '')

/** Contexto aceito (e ignorado) pelo shim, por compatibilidade com call sites. */
type CronContext = { appUrl?: string; serviceKey?: string; client?: unknown }

/** No-op: reconciliação de crons agora vive no Coolify. Reporta tudo OK. */
export async function ensureCrons(_ctx?: CronContext): Promise<CronReport> {
  return { extensionsOk: true, missingExtensions: [], scheduled: [], unscheduled: [], errors: [] }
}

/** No-op: nunca há crons faltando no banco (agendamento é externo). */
export async function getMissingCrons(): Promise<{ missing: string[]; cronAvailable: boolean }> {
  return { missing: [], cronAvailable: true }
}

export async function scheduleRssCron(): Promise<void> {}
export async function unscheduleRssCron(): Promise<void> {}
export async function scheduleAutomationCron(): Promise<void> {}
export async function unscheduleAutomationCron(): Promise<void> {}
export async function scheduleSourceCrawlersCron(): Promise<void> {}
export async function unscheduleSourceCrawlersCron(): Promise<void> {}
export async function scheduleLgpdRetentionCron(): Promise<void> {}

export { normalizeUrl }
