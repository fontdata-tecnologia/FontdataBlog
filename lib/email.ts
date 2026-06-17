// lib/email.ts
// Módulo de envio de e-mail via Resend.
// Degrada graciosamente se resend_api_key não estiver configurado.

import { getAppUrl } from '@/lib/app-url'

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
}

export interface PostEmailData {
  id: number
  title: string
  slug: string
  excerpt: string
  cover_image: string | null
  published_at: Date | string | null
}

/** Lê a chave Resend de site_settings — nunca de env. */
export async function getResendApiKey(): Promise<string | null> {
  try {
    const { db } = await import('@/drizzle/db')
    const { siteSettings } = await import('@/drizzle/schema')
    const { eq } = await import('drizzle-orm')

    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'resend_api_key'))
      .limit(1)

    return rows.length > 0 && rows[0].value ? rows[0].value : null
  } catch {
    return null
  }
}

/** Lê o endereço de remetente de site_settings (default: noreply@blog.com). */
export async function getNewsletterFromEmail(): Promise<string> {
  try {
    const { db } = await import('@/drizzle/db')
    const { siteSettings } = await import('@/drizzle/schema')
    const { eq } = await import('drizzle-orm')

    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'newsletter_from_email'))
      .limit(1)

    return rows.length > 0 && rows[0].value ? rows[0].value : 'noreply@blog.com'
  } catch {
    return 'noreply@blog.com'
  }
}

/** Lê a flag newsletter_auto_send de site_settings. */
export async function getNewsletterAutoSend(): Promise<boolean> {
  try {
    const { db } = await import('@/drizzle/db')
    const { siteSettings } = await import('@/drizzle/schema')
    const { eq } = await import('drizzle-orm')

    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'newsletter_auto_send'))
      .limit(1)

    return rows.length > 0 ? rows[0].value === 'true' : false
  } catch {
    return false
  }
}

/**
 * Envia um e-mail via Resend.
 * Retorna { success: true } ou { success: false, error: string }.
 * Nunca lança exceção — degrada graciosamente.
 */
export async function sendEmail(
  payload: EmailPayload
): Promise<{ success: boolean; error?: string }> {
  const apiKey = await getResendApiKey()
  if (!apiKey) {
    console.warn('[email] resend_api_key não configurada — e-mail não enviado.')
    return { success: false, error: 'Chave Resend não configurada.' }
  }

  const from = await getNewsletterFromEmail()

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const result = await resend.emails.send({
      from,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
    })

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[email] Erro ao enviar:', msg)
    return { success: false, error: msg }
  }
}

/**
 * Renderiza o HTML do e-mail de newsletter para um post publicado.
 */
export function renderPostEmail(
  post: PostEmailData,
  unsubscribeUrl: string
): string {
  const appUrl = getAppUrl()
  const articleUrl = `${appUrl}/${post.slug}`

  const coverHtml = post.cover_image
    ? `<img src="${escapeHtmlAttr(post.cover_image)}" alt="${escapeHtmlAttr(post.title)}" style="width:100%;max-height:300px;object-fit:cover;display:block;border-radius:8px;margin-bottom:24px;" />`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(post.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1A4FA0;padding:24px 32px;">
              <p style="margin:0;color:#FFFFFF;font-size:14px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">
                Newsletter
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px;">

              ${coverHtml}

              <h1 style="margin:0 0 16px 0;font-size:26px;font-weight:700;line-height:1.3;color:#1A1A2E;">
                ${escapeHtml(post.title)}
              </h1>

              <p style="margin:0 0 28px 0;font-size:16px;line-height:1.75;color:#4B5563;">
                ${escapeHtml(post.excerpt)}
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background-color:#1A4FA0;border-radius:8px;">
                    <a href="${articleUrl}" style="display:inline-block;padding:14px 28px;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;">
                      Ler artigo completo
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F3F4F6;padding:20px 32px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:12px;color:#6B7280;line-height:1.6;">
                Você está recebendo este e-mail porque se inscreveu em nossa newsletter.<br />
                <a href="${unsubscribeUrl}" style="color:#1A4FA0;text-decoration:underline;">Cancelar inscrição</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeHtmlAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}
