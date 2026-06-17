// app/api/newsletter/me/route.ts
// Direitos do titular (Art. 18 LGPD)
// GET  /api/newsletter/me?token=...  → exporta dados do inscrito (Art. 18 II e V)
// DELETE /api/newsletter/me?token=... → hard delete do registro (Art. 18 VI)

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { newsletterSubscribers } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

async function findSubscriberByToken(token: string) {
  const rows = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.unsubscribe_token, token))
    .limit(1)
  return rows[0] ?? null
}

/** GET — exporta dados do inscrito em JSON (Art. 18 II e V LGPD) */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token obrigatório.' }, { status: 400 })
  }

  const subscriber = await findSubscriberByToken(token)
  if (!subscriber) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 404 })
  }

  // Retorna apenas os campos relevantes ao titular — não expõe token nem ids internos
  return NextResponse.json({
    data: {
      email: subscriber.email,
      status: subscriber.status,
      subscribed_at: subscriber.subscribed_at,
      unsubscribed_at: subscriber.unsubscribed_at ?? null,
      consent_at: subscriber.consent_at ?? null,
      consent_text_version: subscriber.consent_text_version ?? null,
    },
  })
}

/** DELETE — hard delete do registro do inscrito (Art. 18 VI LGPD) */
export async function DELETE(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token obrigatório.' }, { status: 400 })
  }

  const subscriber = await findSubscriberByToken(token)
  if (!subscriber) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 404 })
  }

  await db
    .delete(newsletterSubscribers)
    .where(eq(newsletterSubscribers.id, subscriber.id))

  return NextResponse.json({ ok: true })
}
