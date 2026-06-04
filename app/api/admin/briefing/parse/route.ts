import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseBriefingContent } from '@/lib/briefing-parse'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  briefing_content: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos: o campo briefing_content deve ser uma string' },
        { status: 400 }
      )
    }

    const company = await parseBriefingContent(parsed.data.briefing_content)
    return NextResponse.json({ company })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno ao processar briefing'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
