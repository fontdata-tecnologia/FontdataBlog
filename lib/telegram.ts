import { createHash } from 'crypto'
import sanitizeHtml from 'sanitize-html'
import { db } from '@/drizzle/db'
import { siteSettings, posts } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { aiChat, callOpenRouterImage, getPromptFromDB } from '@/lib/ai'
import { generateSlug } from '@/lib/slug'
import { uploadObject } from '@/lib/storage'

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h2', 'h3', 'img']),
  allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt'] },
}

export interface TelegramConfig {
  bot_token: string
  allowed_chat_ids: string
}

export async function getTelegramConfig(): Promise<TelegramConfig | null> {
  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'telegram_config'))
      .limit(1)
    if (!rows.length || !rows[0].value) return null
    return JSON.parse(rows[0].value) as TelegramConfig
  } catch {
    return null
  }
}

export function computeWebhookSecret(botToken: string): string {
  return createHash('sha256').update(botToken).digest('hex')
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: number | string,
  text: string
): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch {
    // Non-fatal
  }
}

function isUrl(text: string): boolean {
  try {
    const u = new URL(text.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

async function fetchUrlContent(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogBot/1.0)' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Erro ao acessar URL (${response.status})`)
  const html = await response.text()
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
  const blocks: string[] = []
  const blockRegex =
    /<(?:p|h[1-6]|li|blockquote)[^>]*>([\s\S]*?)<\/(?:p|h[1-6]|li|blockquote)>/gi
  let match
  while ((match = blockRegex.exec(text)) !== null) {
    const t = match[1].replace(/<[^>]+>/g, '').trim()
    if (t.length > 20) blocks.push(t)
  }
  return blocks.join('\n\n').slice(0, 15000)
}

export async function generateAndPublishPost(
  input: string
): Promise<{ post_id: number; title: string; slug: string }> {
  const url = isUrl(input) ? input.trim() : null
  let prompt: string

  if (url) {
    const content = await fetchUrlContent(url)
    if (!content || content.length < 100)
      throw new Error('Conteúdo do link muito curto ou inacessível')

    prompt = `Você é um redator profissional. Com base no conteúdo abaixo, escreva um NOVO artigo original (reescreva com suas próprias palavras, adicione valor, não copie).

Conteúdo de referência:
---
${content}
---

Requisitos: mínimo 800 palavras, HTML (h2, h3, p, strong, em, ul, ol, li, blockquote), introdução envolvente, subtítulos estruturados, conclusão, português do Brasil, otimizado para SEO.

JSON válido (sem markdown):
{"title": "título original", "excerpt": "resumo até 160 chars", "content": "HTML completo"}`
  } else {
    let briefingContent = ''
    try {
      const rows = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'briefing_content'))
        .limit(1)
      briefingContent = rows.length > 0 ? rows[0].value : ''
    } catch {}

    const contextSection = briefingContent
      ? `\n\nCONTEXTO DA EMPRESA:\n---\n${briefingContent.slice(0, 8000)}\n---\n`
      : ''

    prompt = `Você é um redator profissional. Escreva um artigo completo sobre: "${input}"${contextSection}

Requisitos: mínimo 800 palavras, HTML (h2, h3, p, strong, em, ul, ol, li, blockquote), introdução envolvente, subtítulos estruturados, conclusão, português do Brasil, otimizado para SEO.

JSON válido (sem markdown):
{"title": "título", "excerpt": "resumo até 160 chars", "content": "HTML completo"}`
  }

  const result = await aiChat(
    'content_generation',
    [
      {
        role: 'system',
        content: 'Você é um redator profissional. Responda em JSON válido, sem markdown.',
      },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.7, max_tokens: 6000 }
  )

  const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  let articleData: { title: string; excerpt: string; content: string }
  try {
    articleData = JSON.parse(cleaned)
  } catch {
    throw new Error('A IA não retornou JSON válido')
  }

  const slug = generateSlug(articleData.title) + '-' + Date.now()
  const cleanContent = sanitizeHtml(articleData.content, sanitizeOptions)
  const now = new Date()

  const [post] = await db
    .insert(posts)
    .values({
      title: articleData.title,
      slug,
      content: cleanContent,
      excerpt: articleData.excerpt ?? '',
      status: 'published',
      published_at: now,
      updated_at: now,
    })
    .returning()

  // Generate cover image (non-fatal if it fails)
  let coverImageUrl: string | undefined
  try {
    const imagePromptTemplate = await getPromptFromDB('image')
    const contextParts = [`Título do artigo: ${articleData.title}`]
    if (articleData.excerpt) contextParts.push(`Resumo: ${articleData.excerpt}`)
    const textContent = cleanContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000)
    contextParts.push(`Conteúdo: ${textContent}`)

    let finalPrompt: string
    if (imagePromptTemplate) {
      finalPrompt = await aiChat('image_description', [
        { role: 'system', content: 'Gere um prompt em inglês para criar uma imagem de capa profissional para o artigo. Responda APENAS com o prompt.' },
        { role: 'user', content: `${imagePromptTemplate}\n\nContexto:\n${contextParts.join('\n')}` },
      ], { temperature: 0.8, max_tokens: 500 })
    } else {
      finalPrompt = await aiChat('image_description', [
        { role: 'system', content: 'Gere um prompt em inglês para criar uma imagem de capa para blog, estilo fotorealista ou editorial. Responda APENAS com o prompt.' },
        { role: 'user', content: contextParts.join('\n') },
      ], { temperature: 0.8, max_tokens: 500 })
    }

    const imageUrl = await callOpenRouterImage(finalPrompt)

    let imageBuffer: Buffer
    let contentType = 'image/png'

    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!matches) throw new Error('Formato de imagem inválido')
      contentType = matches[1]
      imageBuffer = Buffer.from(matches[2], 'base64')
    } else {
      const imageRes = await fetch(imageUrl)
      contentType = imageRes.headers.get('content-type') ?? 'image/png'
      imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    }

    const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg'
      : contentType.includes('webp') ? '.webp' : '.png'
    const filename = `telegram-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

    coverImageUrl = await uploadObject(filename, imageBuffer, contentType)
  } catch (imgErr) {
    console.error('[Telegram] Image generation failed (continuing without image):', imgErr)
  }

  if (coverImageUrl) {
    await db.update(posts).set({ cover_image: coverImageUrl, updated_at: new Date() }).where(eq(posts.id, post.id))
  }

  return { post_id: post.id, title: articleData.title, slug: post.slug }
}
