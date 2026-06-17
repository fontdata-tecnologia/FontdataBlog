// lib/newsletter-trigger.ts
// Dispara o envio de newsletter de forma fire-and-forget quando um post é publicado.
// Nunca bloqueia a resposta da API.

import { getAppUrl } from '@/lib/app-url'

/**
 * Dispara POST /api/admin/newsletter/send de forma assíncrona (fire-and-forget).
 * Silencia qualquer erro — o endpoint de envio loga internamente.
 *
 * @param postId - ID do post recém-publicado
 */
export function triggerNewsletterSend(postId: number): void {
  const appUrl = getAppUrl()
  fetch(`${appUrl}/api/admin/newsletter/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal': '1',
    },
    body: JSON.stringify({ postId }),
  }).catch(() => {
    // Fire-and-forget: erros são logados pelo endpoint
  })
}
