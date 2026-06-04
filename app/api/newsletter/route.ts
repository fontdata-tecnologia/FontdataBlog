import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { newsletterSubscribers } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { dispatchWebhookEvent } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  email: z.string().email('E-mail inválido').max(200),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
    }

    const { email } = parsed.data

    const existing = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
      .limit(1)

    if (existing.length > 0) {
      if (existing[0].status === 'active') {
        return NextResponse.json({ error: 'Este e-mail já está inscrito.' }, { status: 409 })
      }
      await db
        .update(newsletterSubscribers)
        .set({ status: 'active', subscribed_at: new Date(), unsubscribed_at: null })
        .where(eq(newsletterSubscribers.email, email))
      return NextResponse.json({ ok: true })
    }

    const [inserted] = await db
      .insert(newsletterSubscribers)
      .values({ email, unsubscribe_token: randomUUID() })
      .returning()

    dispatchWebhookEvent('newsletter_subscribed', {
      subscriber_id: inserted.id,
      email: inserted.email,
      status: inserted.status,
      subscribed_at: inserted.subscribed_at,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
