import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { newsletterSubscribers } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/** GET /api/admin/newsletter — lista inscritos com paginação (Art. 6º III LGPD — minimização) */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200)
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0)

    const rows = await db
      .select({
        id: newsletterSubscribers.id,
        email: newsletterSubscribers.email,
        status: newsletterSubscribers.status,
        subscribed_at: newsletterSubscribers.subscribed_at,
        unsubscribed_at: newsletterSubscribers.unsubscribed_at,
        consent_at: newsletterSubscribers.consent_at,
        consent_text_version: newsletterSubscribers.consent_text_version,
      })
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.subscribed_at))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({ subscribers: rows, limit, offset })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') ?? '', 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
    }
    await db
      .update(newsletterSubscribers)
      .set({ status: 'unsubscribed', unsubscribed_at: new Date() })
      .where(eq(newsletterSubscribers.id, id))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
