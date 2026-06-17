// lib/agents/publisher.ts
import sanitizeHtml from 'sanitize-html'
import { db } from '@/drizzle/db'
import { posts, postCategories, categories, articleThemes, automationConfig } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { generateSlug } from '@/lib/slug'
import { revalidatePublicPosts } from '@/lib/revalidate'
import { AgentContext, AgentResult, PublisherTriggers } from '@/lib/agents/types'
import { dispatchWebhookEvent } from '@/lib/webhooks'
import { aiChat } from '@/lib/ai'

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h2', 'h3', 'img']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt'],
  },
}

export async function runPublisherAgent(
  ctx: AgentContext,
  triggers: PublisherTriggers
): Promise<AgentResult> {
  if (!ctx.articleTitle || !ctx.articleContent) {
    return { success: false, message: 'Artigo incompleto para publicação', error: 'INCOMPLETE' }
  }

  const slug = generateSlug(ctx.articleTitle) + '-' + Date.now()
  const cleanContent = sanitizeHtml(ctx.articleContent, sanitizeOptions)
  const now = new Date()

  const [post] = await db
    .insert(posts)
    .values({
      title: ctx.articleTitle,
      slug,
      content: cleanContent,
      excerpt: ctx.articleExcerpt ?? '',
      cover_image: ctx.coverImageUrl ?? null,
      status: triggers.publishStatus,
      published_at: triggers.publishStatus === 'published' ? now : null,
      updated_at: now,
    })
    .returning()

  // Auto-assign best matching category using semantic AI matching
  try {
    const allCategories = await db.select().from(categories)
    if (allCategories.length > 0) {
      const categoryList = allCategories.map((cat) => `${cat.id}: ${cat.name}`).join('\n')
      const messages = [
        {
          role: 'system' as const,
          content:
            'Você é um assistente de categorização. Dado um título de artigo e uma lista de categorias, retorne APENAS o ID numérico da categoria mais adequada. Se nenhuma categoria for relevante, retorne "none". Nunca retorne texto além do ID ou "none".',
        },
        {
          role: 'user' as const,
          content: `Título do artigo: ${ctx.articleTitle}\n\nCategorias disponíveis:\n${categoryList}`,
        },
      ]
      const response = await aiChat('category_matching', messages, { temperature: 0, max_tokens: 10 })
      const trimmed = response.trim()
      if (trimmed !== 'none') {
        const categoryId = parseInt(trimmed, 10)
        if (!isNaN(categoryId)) {
          const matched = allCategories.find((cat) => cat.id === categoryId)
          if (matched) {
            await db.insert(postCategories).values({ post_id: post.id, category_id: categoryId }).onConflictDoNothing()
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Publisher] Falha ao categorizar artigo:', err instanceof Error ? err.message : String(err))
  }

  // Revalida o cache ISR das páginas públicas para o post aparecer na hora.
  if (post.status === 'published') revalidatePublicPosts(post.slug)

  // Mark theme as used
  if (ctx.themeId) {
    await db.update(articleThemes).set({ status: 'used' }).where(eq(articleThemes.id, ctx.themeId))
  }

  // Update automation timestamps
  const cfgRows = await db.select().from(automationConfig).limit(1)
  if (cfgRows.length > 0) {
    const cfg = cfgRows[0]
    const nextRun = new Date(now.getTime() + cfg.interval_hours * 60 * 60 * 1000)
    await db.update(automationConfig).set({ last_run_at: now, next_run_at: nextRun, updated_at: now }).where(eq(automationConfig.id, cfg.id))
  }

  // Dispara evento de webhook via dispatcher central
  if (triggers.publishStatus === 'published') {
    dispatchWebhookEvent('post_published', { post_id: post.id, title: post.title, slug: post.slug, status: post.status })
  }

  // Newsletter trigger (fire-and-forget)
  if (triggers.publishStatus === 'published') {
    const { triggerNewsletterSend } = await import('@/lib/newsletter-trigger')
    triggerNewsletterSend(post.id)
  }

  return {
    success: true,
    message: `Artigo "${post.title}" ${triggers.publishStatus === 'published' ? 'publicado' : 'salvo como rascunho'} (ID ${post.id})`,
    data: { postId: post.id },
  }
}
