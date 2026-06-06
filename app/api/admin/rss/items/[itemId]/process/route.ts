import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { rssFeeds, rssProcessedItems } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { createPipelineStream } from '@/lib/agent-pipeline'
import type { PipelineEvent } from '@/lib/agents/types'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: { itemId: string } }) {
  const itemId = parseInt(params.itemId)
  if (isNaN(itemId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const [item] = await db.select().from(rssProcessedItems).where(eq(rssProcessedItems.id, itemId)).limit(1)
  if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
  if (item.status === 'done') return NextResponse.json({ error: 'Item já foi processado' }, { status: 400 })

  const [feed] = await db.select().from(rssFeeds).where(eq(rssFeeds.id, item.feed_id)).limit(1)
  if (!feed) return NextResponse.json({ error: 'Feed não encontrado' }, { status: 404 })

  await db.update(rssProcessedItems).set({ status: 'processing', error: null }).where(eq(rssProcessedItems.id, itemId))

  try {
    const initialContext: Record<string, unknown> = {
      themeTitle: item.item_title ?? 'Sem título',
      ...(item.item_url ? { researchLinks: [item.item_url] } : {}),
    }

    const stream = createPipelineStream({
      themeIds: [],
      triggers: { publishStatus: feed.publish_status as 'draft' | 'published' },
      initialContext,
    })

    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let lastEvent: PipelineEvent | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        const line = part.replace(/^data: /, '').trim()
        if (!line) continue
        try { lastEvent = JSON.parse(line) as PipelineEvent } catch {}
      }
    }

    if (!lastEvent || lastEvent.type === 'pipeline_error') {
      throw new Error(lastEvent?.message ?? 'Pipeline falhou sem retorno')
    }

    const postId = lastEvent.data?.post_id as number | undefined
    await db.update(rssProcessedItems).set({ status: 'done', post_id: postId ?? null, processed_at: new Date() }).where(eq(rssProcessedItems.id, itemId))

    return NextResponse.json({ ok: true, postId })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await db.update(rssProcessedItems).set({ status: 'error', error }).where(eq(rssProcessedItems.id, itemId))
    return NextResponse.json({ ok: false, error }, { status: 500 })
  }
}
