// lib/agents/publisher.ts
import sanitizeHtml from 'sanitize-html'
import { db } from '@/drizzle/db'
import { posts, articleThemes, automationConfig, siteSettings, newsletterSubscribers } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { generateSlug } from '@/lib/slug'
import { AgentContext, AgentResult, PublisherTriggers } from '@/lib/agents/types'

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h2', 'h3', 'img']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
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

  // Webhook trigger
  if (triggers.webhookUrl?.trim()) {
    try {
      await fetch(triggers.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id, title: post.title, slug: post.slug, status: post.status }),
      })
    } catch {}
  }

  // Newsletter trigger (fire-and-forget)
  if (triggers.sendNewsletter && triggers.publishStatus === 'published') {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
      const settingsRows = await db.select().from(siteSettings).where(eq(siteSettings.key, 'smtp_settings')).limit(1)
      const subscribers = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.status, 'active'))
      if (settingsRows.length > 0 && subscribers.length > 0) {
        fetch(`${appUrl}/api/admin/newsletter/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal': '1' },
          body: JSON.stringify({ post_id: post.id }),
        }).catch(() => {})
      }
    } catch {}
  }

  return {
    success: true,
    message: `Artigo "${post.title}" ${triggers.publishStatus === 'published' ? 'publicado' : 'salvo como rascunho'} (ID ${post.id})`,
    data: { postId: post.id },
  }
}
