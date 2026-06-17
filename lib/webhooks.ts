// lib/webhooks.ts
// Dispatcher central de webhooks do sistema — somente server-side
import { createHmac } from 'crypto'
import { db } from '@/drizzle/db'
import { webhooks } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export type { WebhookEvent, WebhookPayload } from '@/lib/webhook-events'
export { WEBHOOK_EVENTS, WEBHOOK_EVENT_LABELS } from '@/lib/webhook-events'
import type { WebhookEvent, WebhookPayload } from '@/lib/webhook-events'

/** Busca webhooks habilitados que ouvem o evento informado */
export async function getEnabledWebhooksForEvent(event: WebhookEvent) {
  return db
    .select()
    .from(webhooks)
    .where(eq(webhooks.enabled, true))
    .then((rows) => rows.filter((w) => (w.events as string[]).includes(event)))
}

/**
 * Dispara o evento para todos os endpoints configurados que o escutam.
 * Fire-and-forget: nunca lança erro para o caller.
 */
export function dispatchWebhookEvent(event: WebhookEvent, data: unknown): void {
  void (async () => {
    try {
      const targets = await getEnabledWebhooksForEvent(event)
      if (targets.length === 0) return

      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      }
      const body = JSON.stringify(payload)

      await Promise.allSettled(
        targets.map(async (wh) => {
          try {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
            }

            if (wh.secret?.trim()) {
              const sig = createHmac('sha256', wh.secret)
                .update(body)
                .digest('hex')
              headers['X-Webhook-Signature'] = `sha256=${sig}`
            }

            await fetch(wh.url, { method: 'POST', headers, body })
          } catch (err) {
            console.error(
              `[webhooks] Falha ao disparar para ${wh.url}:`,
              err instanceof Error ? err.message : String(err)
            )
          }
        })
      )
    } catch (err) {
      console.error(
        '[webhooks] Erro ao buscar endpoints:',
        err instanceof Error ? err.message : String(err)
      )
    }
  })()
}
