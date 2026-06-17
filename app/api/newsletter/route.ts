import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { newsletterSubscribers } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { dispatchWebhookEvent } from '@/lib/webhooks'
import { getLgpdSettings, DEFAULT_LGPD } from '@/lib/settings'

export const dynamic = 'force-dynamic'

// Art. 8º LGPD — consentimento deve ser livre, informado e inequívoco
const bodySchema = z.object({
  email: z.string().email('E-mail inválido').max(200),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'É necessário aceitar a Política de Privacidade para se inscrever.' }),
  }),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Dados inválidos.'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { email } = parsed.data
    const consentAt = new Date()
    const lgpdCfg = await getLgpdSettings()
    const consentTextVersion = lgpdCfg.consent_version || DEFAULT_LGPD.consent_version

    const existing = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
      .limit(1)

    if (existing.length > 0) {
      if (existing[0].status === 'active') {
        return NextResponse.json({ error: 'Este e-mail já está inscrito.' }, { status: 409 })
      }
      // Reativação: atualiza consent
      await db
        .update(newsletterSubscribers)
        .set({
          status: 'active',
          subscribed_at: consentAt,
          unsubscribed_at: null,
          consent_at: consentAt,
          consent_text_version: consentTextVersion,
        })
        .where(eq(newsletterSubscribers.email, email))
      return NextResponse.json({ ok: true })
    }

    const [inserted] = await db
      .insert(newsletterSubscribers)
      .values({
        email,
        unsubscribe_token: randomUUID(),
        consent_at: consentAt,
        consent_text_version: consentTextVersion,
      })
      .returning()

    dispatchWebhookEvent('newsletter_subscribed', {
      subscriber_id: inserted.id,
      email: inserted.email,
      status: inserted.status,
      subscribed_at: inserted.subscribed_at,
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
