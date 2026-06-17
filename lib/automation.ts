import { db } from '@/drizzle/db'
import { automationConfig, automationLogs } from '@/drizzle/schema'
import { createPipelineStream } from '@/lib/agent-pipeline'
import type { PipelineEvent } from '@/lib/agents/types'
import { eq } from 'drizzle-orm'

export type AutomationResult = {
  success: boolean
  message: string
  post_id?: number
  skipped?: boolean
  image_error?: string
}

export async function getOrCreateAutomationConfig() {
  const rows = await db.select().from(automationConfig).limit(1)
  if (rows.length > 0) return rows[0]
  const [row] = await db.insert(automationConfig).values({}).returning()
  return row
}

/**
 * Verifica se o horário atual está dentro da faixa de bloqueio [start, end].
 * Suporta cruzamento de meia-noite (ex: 22:00–06:00).
 *
 * Os valores de time no Postgres chegam como string "HH:MM:SS" ou "HH:MM".
 */
function isInBlockedHours(blockStart: string | null, blockEnd: string | null): boolean {
  if (!blockStart || !blockEnd) return false

  // Extrai apenas HH:MM
  const parseMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + (m ?? 0)
  }

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = parseMinutes(blockStart)
  const endMinutes = parseMinutes(blockEnd)

  if (startMinutes <= endMinutes) {
    // Faixa normal: ex 09:00–18:00
    return nowMinutes >= startMinutes && nowMinutes < endMinutes
  } else {
    // Cruzamento de meia-noite: ex 22:00–06:00
    return nowMinutes >= startMinutes || nowMinutes < endMinutes
  }
}

export async function runAutomationCycle(
  force = false,
  triggeredBy: 'schedule' | 'manual' = 'schedule'
): Promise<AutomationResult> {
  const config = await getOrCreateAutomationConfig()

  if (!config.enabled) {
    const result: AutomationResult = { success: false, skipped: true, message: 'Automação desabilitada' }
    await writeLog({ triggeredBy, status: 'skipped', message: result.message, durationMs: 0 })
    return result
  }

  if (!force && config.next_run_at && new Date() < new Date(config.next_run_at)) {
    const result: AutomationResult = { success: false, skipped: true, message: 'Ainda não está na hora de executar' }
    await writeLog({ triggeredBy, status: 'skipped', message: result.message, durationMs: 0 })
    return result
  }

  // Guard de horário de bloqueio (executa mesmo em força manual para que o usuário
  // possa testar, mas em execução agendada sempre respeita a faixa)
  if (!force && isInBlockedHours(config.block_start_time, config.block_end_time)) {
    const result: AutomationResult = {
      success: false,
      skipped: true,
      message: `Execução bloqueada: horário de bloqueio ativo (${config.block_start_time}–${config.block_end_time})`,
    }
    await writeLog({ triggeredBy, status: 'skipped', message: result.message, error: 'blocked_hours', durationMs: 0 })
    return result
  }

  const startedAt = Date.now()

  let themeIds: number[] = []
  try {
    themeIds = JSON.parse(config.theme_ids)
    if (!Array.isArray(themeIds)) themeIds = []
  } catch {}

  try {
    const stream = createPipelineStream({
      themeIds,
      triggers: { publishStatus: 'published' },
    })

    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let lastEvent: PipelineEvent | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        const line = part.replace(/^data: /, '').trim()
        if (!line) continue
        try {
          lastEvent = JSON.parse(line) as PipelineEvent
        } catch {}
      }
    }

    const durationMs = Date.now() - startedAt

    if (!lastEvent) {
      const message = 'Pipeline não retornou resultado'
      await writeLog({ triggeredBy, status: 'error', message, error: message, durationMs })
      await updateNextRun(config.id, config.interval_hours)
      return { success: false, message }
    }

    if (lastEvent.type === 'pipeline_done') {
      const postId = lastEvent.data?.post_id as number | undefined
      await writeLog({ triggeredBy, status: 'success', message: lastEvent.message, postId, durationMs })
      await updateNextRun(config.id, config.interval_hours)
      return { success: true, message: lastEvent.message, post_id: postId }
    }

    await writeLog({ triggeredBy, status: 'error', message: lastEvent.message, error: lastEvent.message, durationMs })
    await updateNextRun(config.id, config.interval_hours)
    return { success: false, message: lastEvent.message }
  } catch (err) {
    const durationMs = Date.now() - startedAt
    const errorMsg = err instanceof Error ? err.message : String(err)
    await writeLog({ triggeredBy, status: 'error', message: 'Erro inesperado na automação', error: errorMsg, durationMs })
    await updateNextRun(config.id, config.interval_hours)
    throw err
  }
}

async function writeLog(params: {
  triggeredBy: 'schedule' | 'manual'
  status: 'skipped' | 'success' | 'error'
  message: string
  durationMs: number
  postId?: number
  error?: string
}) {
  const startedAt = new Date(Date.now() - params.durationMs)
  const finishedAt = new Date()
  await db.insert(automationLogs).values({
    triggered_by: params.triggeredBy,
    status: params.status,
    message: params.message,
    post_id: params.postId ?? null,
    error: params.error ?? null,
    duration_ms: params.durationMs,
    started_at: startedAt,
    finished_at: finishedAt,
  })
}

async function updateNextRun(configId: number, intervalHours: number) {
  await db.update(automationConfig).set({
    last_run_at: new Date(),
    next_run_at: new Date(Date.now() + intervalHours * 60 * 60 * 1000),
  }).where(eq(automationConfig.id, configId))
}
