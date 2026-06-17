// app/api/admin/newsletter/send/route.ts
// Envio de newsletter para todos os inscritos ativos.
// Auth: JWT admin via middleware (cobre /api/admin/*) OU header x-internal:1 (chamada interna).
// Idempotência: verifica posts.newsletter_sent_at antes de enviar.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { posts, newsletterSubscribers, automationLogs } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { sendEmail, renderPostEmail, getNewsletterAutoSend } from '@/lib/email'
import { getAppUrl } from '@/lib/app-url'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  postId: z.number().int().positive('postId deve ser um inteiro positivo'),
})

export async function POST(request: NextRequest) {
  const started = Date.now()

  try {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos: ' + parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { postId } = parsed.data

    // Busca post publicado
    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.status, 'published')))
      .limit(1)

    if (!post) {
      return NextResponse.json({ error: 'Post não encontrado ou não publicado.' }, { status: 404 })
    }

    // Idempotência: já foi enviado para este post?
    if (post.newsletter_sent_at) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: 'Newsletter já enviada para este post.',
        sent_at: post.newsletter_sent_at,
      })
    }

    // Verifica flag auto_send (apenas quando chamado internamente — chamadas manuais do admin ignoram a flag)
    const isInternal = request.headers.get('x-internal') === '1'
    if (isInternal) {
      const autoSend = await getNewsletterAutoSend()
      if (!autoSend) {
        return NextResponse.json({
          ok: true,
          skipped: true,
          message: 'Envio automático desativado.',
        })
      }
    }

    // Busca inscritos ativos
    const subscribers = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, 'active'))

    if (subscribers.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: 'Nenhum inscrito ativo.' })
    }

    const appUrl = getAppUrl()
    let sent = 0
    let errors = 0

    // Envia para cada inscrito
    for (const sub of subscribers) {
      const token = sub.unsubscribe_token ?? sub.id.toString()
      const unsubscribeUrl = `${appUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
      const html = renderPostEmail(
        {
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          cover_image: post.cover_image,
          published_at: post.published_at,
        },
        unsubscribeUrl
      )

      const result = await sendEmail({
        to: sub.email,
        subject: post.title,
        html,
      })

      if (result.success) {
        sent++
      } else {
        errors++
      }
    }

    // Marca post como enviado
    const now = new Date()
    await db
      .update(posts)
      .set({ newsletter_sent_at: now })
      .where(eq(posts.id, postId))

    // Registra em automation_logs
    await db.insert(automationLogs).values({
      triggered_by: isInternal ? 'auto_publish' : 'manual',
      status: errors === 0 ? 'success' : 'error',
      message: `Newsletter enviada para ${sent} inscritos (${errors} erros). Post: "${post.title}"`,
      post_id: post.id,
      duration_ms: Date.now() - started,
      finished_at: now,
    })

    return NextResponse.json({
      ok: true,
      sent,
      errors,
      total: subscribers.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[newsletter/send]', msg)

    try {
      await db.insert(automationLogs).values({
        triggered_by: 'manual',
        status: 'error',
        message: 'Falha ao enviar newsletter.',
        error: msg,
        duration_ms: Date.now() - started,
        finished_at: new Date(),
      })
    } catch {}

    return NextResponse.json({ error: 'Erro ao enviar newsletter.' }, { status: 500 })
  }
}
