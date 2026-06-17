import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { webhooks } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

function parseId(id: string): number | null {
  const n = parseInt(id, 10)
  return isNaN(n) || n <= 0 ? null : n
}

const updateSchema = z.object({
  url: z.string().url('URL inválida').optional(),
  secret: z.string().optional().nullable(),
  events: z
    .array(z.enum(['post_published', 'post_draft_created', 'post_updated', 'pipeline_completed']))
    .min(1, 'Selecione pelo menos um evento')
    .optional(),
  enabled: z.boolean().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const existing = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1)
    if (!existing.length) return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 })

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      const first = parsed.error.errors[0]
      return NextResponse.json({ error: first?.message ?? 'Dados inválidos' }, { status: 400 })
    }

    const { url, secret, events, enabled } = parsed.data
    const updateData: Partial<typeof webhooks.$inferInsert> = {
      updated_at: new Date(),
      ...(url !== undefined && { url }),
      ...(secret !== undefined && { secret: secret || null }),
      ...(events !== undefined && { events }),
      ...(enabled !== undefined && { enabled }),
    }

    const [updated] = await db
      .update(webhooks)
      .set(updateData)
      .where(eq(webhooks.id, id))
      .returning()

    return NextResponse.json({ webhook: updated })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const existing = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1)
    if (!existing.length) return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 })

    await db.delete(webhooks).where(eq(webhooks.id, id))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
