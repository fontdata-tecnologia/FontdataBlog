// lib/agents/designer.ts
import { aiChat, callOpenRouterImage } from '@/lib/ai'
import { getAgentConfig } from '@/lib/agent-configs'
import { getAgentsExtra } from '@/lib/firecrawl'
import { getPexelsApiKey, searchPexelsPhoto } from '@/lib/pexels'
import { supabaseAdmin, STORAGE_BUCKET, normalizeImageMime } from '@/lib/supabase-admin'
import { getSettings } from '@/lib/settings'
import { generateGradientCover, generateGeometricCover } from '@/lib/cover-svg'
import { AgentContext, AgentResult } from '@/lib/agents/types'

const NO_TEXT_SUFFIX = '. No text, no letters, no words, no numbers anywhere in the image.'

export async function runDesignerAgent(
  ctx: AgentContext,
  apiKey: string
): Promise<AgentResult> {
  if (!ctx.articleTitle) return { success: false, message: 'Título não disponível', error: 'NO_TITLE' }

  const config = await getAgentConfig('designer')
  const extra = await getAgentsExtra()
  const imageSource = extra['designer']?.image_source ?? 'code'

  let imageBuffer: Buffer
  let contentType = 'image/jpeg'

  if (imageSource === 'code') {
    // -------------------------------------------------------------------
    // Branch: geração de capa via código SVG (sem IA, sem custo externo)
    // -------------------------------------------------------------------
    const codeStyle = extra['designer']?.code_style ?? 'gradient'
    const settings = await getSettings()
    const { primary, secondary } = settings.colors

    let svgString: string
    if (codeStyle === 'geometric') {
      svgString = generateGeometricCover({ seed: ctx.articleTitle, primary, secondary })
    } else {
      // default: 'gradient'
      svgString = generateGradientCover({
        title: ctx.articleTitle,
        category: undefined, // ctx não carrega categoria diretamente — omit
        primary,
        secondary,
      })
    }

    imageBuffer = Buffer.from(svgString, 'utf-8')
    contentType = 'image/svg+xml'
  } else if (imageSource === 'pexels') {
    // -------------------------------------------------------------------
    // Branch: busca imagem no Pexels
    // -------------------------------------------------------------------
    const rawPrompt = await aiChat(
      'prompt_generation',
      [
        { role: 'system', content: config.prompt },
        {
          role: 'user',
          content: `Título: ${ctx.articleTitle}\nResumo: ${ctx.articleExcerpt ?? ''}`,
        },
      ],
      { temperature: 0.8, max_tokens: 300 }
    )
    const generatedText = rawPrompt.trim() || ctx.articleTitle

    const pexelsKey = await getPexelsApiKey()
    if (!pexelsKey) {
      return { success: false, message: 'Chave da API Pexels não configurada', error: 'NO_PEXELS_KEY' }
    }

    const photo = await searchPexelsPhoto(generatedText, pexelsKey, 'landscape')
    if (!photo) {
      return { success: false, message: 'Nenhuma imagem encontrada no Pexels para esse tema', error: 'PEXELS_NO_RESULTS' }
    }

    const imgRes = await fetch(photo.src.large2x || photo.src.large)
    if (!imgRes.ok) throw new Error('Falha ao baixar imagem do Pexels')
    contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    imageBuffer = Buffer.from(await imgRes.arrayBuffer())
  } else {
    // -------------------------------------------------------------------
    // Branch: geração via IA (OpenRouter image model)
    // -------------------------------------------------------------------
    const rawPrompt = await aiChat(
      'prompt_generation',
      [
        { role: 'system', content: config.prompt },
        {
          role: 'user',
          content: `Título: ${ctx.articleTitle}\nResumo: ${ctx.articleExcerpt ?? ''}`,
        },
      ],
      { temperature: 0.8, max_tokens: 300 }
    )
    const generatedText = rawPrompt.trim() || ctx.articleTitle

    const imageUrl = await callOpenRouterImage(generatedText + NO_TEXT_SUFFIX, config.model, apiKey)

    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!matches) throw new Error('Formato de imagem inválido')
      contentType = matches[1]
      imageBuffer = Buffer.from(matches[2], 'base64')
    } else {
      const imgRes = await fetch(imageUrl)
      contentType = imgRes.headers.get('content-type') ?? 'image/png'
      imageBuffer = Buffer.from(await imgRes.arrayBuffer())
    }
  }

  // SVG é gerado internamente (não vem de IA), então preserva direto;
  // demais MIMEs passam pela normalização (corrige `image/jpg` → `image/jpeg`).
  const uploadContentType = contentType.includes('svg') ? 'image/svg+xml' : normalizeImageMime(contentType)
  const ext = uploadContentType.includes('svg') ? '.svg'
    : uploadContentType.includes('jpeg') ? '.jpg'
    : uploadContentType.includes('webp') ? '.webp'
    : uploadContentType.includes('gif') ? '.gif'
    : '.png'
  const filename = `agent-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(filename, imageBuffer, { contentType: uploadContentType })

  if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

  const { data: { publicUrl } } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filename)

  return {
    success: true,
    message: 'Imagem de capa gerada e enviada',
    data: { coverImageUrl: publicUrl },
  }
}
