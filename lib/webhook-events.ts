// lib/webhook-events.ts
// Constantes e tipos de eventos de webhook — sem dependência de servidor
// Pode ser importado em Client Components sem problemas

export type WebhookEvent =
  | 'post_published'
  | 'post_draft_created'
  | 'post_updated'
  | 'pipeline_completed'
  | 'newsletter_subscribed'

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  'post_published',
  'post_draft_created',
  'post_updated',
  'pipeline_completed',
  'newsletter_subscribed',
]

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  post_published: 'Post publicado',
  post_draft_created: 'Rascunho criado',
  post_updated: 'Post atualizado',
  pipeline_completed: 'Pipeline concluído',
  newsletter_subscribed: 'Novo lead na newsletter',
}

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: unknown
}
