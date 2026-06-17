import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { webhooks } from '@/drizzle/schema'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  url: z.string().url('URL inválida'),
  secret: z.string().optional(),
  events: z
    .array(z.enum(['post_published', 'post_draft_created', 'post_updated', 'pipeline_completed']))
    .min(1, 'Selecione pelo menos um evento'),
  enabled: z.boolean().default(true),
})

export async function GET() {
  try {
    const rows = await db.select().from(webhooks).orderBy(sql`${webhooks.created_at} DESC`)
    return NextResponse.json({ webhooks: rows })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      const first = parsed.error.errors[0]
      return NextResponse.json(
        { error: first?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }

    const { url, secret, events, enabled } = parsed.data
    const now = new Date()

    const [webhook] = await db
      .insert(webhooks)
      .values({ url, secret: secret || null, events, enabled, created_at: now, updated_at: now })
      .returning()

    return NextResponse.json({ webhook }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
