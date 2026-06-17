import { NextResponse } from 'next/server'
import { z } from 'zod'
import postgres from 'postgres'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  url: z.string().refine(
    (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
    { message: 'URL deve começar com postgresql:// ou postgres://' }
  ),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'URL inválida' },
      { status: 400 }
    )
  }

  const { url } = parsed.data
  const start = Date.now()
  let client: ReturnType<typeof postgres> | null = null

  try {
    client = postgres(url, {
      ssl: { rejectUnauthorized: false },
      max: 1,
      prepare: false,
      connect_timeout: 10,
    })

    await client`SELECT 1`
    const latency_ms = Date.now() - start

    return NextResponse.json({ ok: true, latency_ms })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error }, { status: 200 })
  } finally {
    if (client) {
      try { await client.end({ timeout: 3 }) } catch { /* ignora */ }
    }
  }
}
