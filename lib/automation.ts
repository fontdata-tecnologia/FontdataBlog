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

  const startedAt = Date.now()

  const [logRow] = await db
    .insert(automationLogs)
    .values({ triggered_by: triggeredBy, status: 'running', started_at: new Date(startedAt) })
    .returning()

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
      await finalizeLog(logRow.id, { status: 'error', message, error: message, durationMs })
      return { success: false, message }
    }

    if (lastEvent.type === 'pipeline_done') {
      const postId = lastEvent.data?.post_id as number | undefined
      await finalizeLog(logRow.id, { status: 'success', message: lastEvent.message, postId, durationMs })
      return {
        success: true,
        message: lastEvent.message,
        post_id: postId,
      }
    }

    await finalizeLog(logRow.id, { status: 'error', message: lastEvent.message, error: lastEvent.message, durationMs })
    return { success: false, message: lastEvent.message }
  } catch (err) {
    const durationMs = Date.now() - startedAt
    const errorMsg = err instanceof Error ? err.message : String(err)
    await finalizeLog(logRow.id, { status: 'error', message: 'Erro inesperado na automação', error: errorMsg, durationMs })
    throw err
  }
}

async function writeLog(params: {
  triggeredBy: 'schedule' | 'manual'
  status: 'skipped' | 'error'
  message: string
  durationMs: number
}) {
  const now = new Date()
  await db.insert(automationLogs).values({
    triggered_by: params.triggeredBy,
    status: params.status,
    message: params.message,
    duration_ms: params.durationMs,
    started_at: now,
    finished_at: now,
  })
}

async function finalizeLog(
  id: number,
  params: {
    status: 'success' | 'error'
    message: string
    postId?: number
    error?: string
    durationMs: number
  }
) {
  await db
    .update(automationLogs)
    .set({
      status: params.status,
      message: params.message,
      post_id: params.postId ?? null,
      error: params.error ?? null,
      duration_ms: params.durationMs,
      finished_at: new Date(),
    })
    .where(eq(automationLogs.id, id))
}
