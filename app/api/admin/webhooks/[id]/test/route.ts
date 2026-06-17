import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { db } from '@/drizzle/db'
import { webhooks } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import type { WebhookPayload } from '@/lib/webhook-events'

export const dynamic = 'force-dynamic'

function parseId(id: string): number | null {
  const n = parseInt(id, 10)
  return isNaN(n) || n <= 0 ? null : n
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const [wh] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1)
    if (!wh) return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 })

    const payload: WebhookPayload = {
      event: 'post_published',
      timestamp: new Date().toISOString(),
      data: {
        post_id: 0,
        title: 'Artigo de teste',
        slug: 'artigo-de-teste',
        status: 'published',
      },
    }
    const body = JSON.stringify(payload)

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (wh.secret?.trim()) {
      const sig = createHmac('sha256', wh.secret).update(body).digest('hex')
      headers['X-Webhook-Signature'] = `sha256=${sig}`
    }

    const res = await fetch(wh.url, { method: 'POST', headers, body })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Endpoint retornou status ${res.status}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao testar webhook' },
      { status: 500 }
    )
  }
}
