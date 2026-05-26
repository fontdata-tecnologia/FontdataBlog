// lib/agents/designer.ts
import { callOpenRouter, callOpenRouterImage } from '@/lib/ai'
import { getAgentConfig } from '@/lib/agent-configs'
import { getAgentsExtra } from '@/lib/firecrawl'
import { getPexelsApiKey, searchPexelsPhoto } from '@/lib/pexels'
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase-admin'
import { AgentContext, AgentResult } from '@/lib/agents/types'

export async function runDesignerAgent(
  ctx: AgentContext,
  apiKey: string
): Promise<AgentResult> {
  if (!ctx.articleTitle) return { success: false, message: 'Título não disponível', error: 'NO_TITLE' }

  const config = await getAgentConfig('designer')
  const extra = await getAgentsExtra()
  const imageSource = extra['designer']?.image_source ?? 'ai'

  // Generate a text prompt/query using a cheap text model
  const promptResp = await callOpenRouter(
    {
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: config.prompt },
        {
          role: 'user',
          content: `Título: ${ctx.articleTitle}\nResumo: ${ctx.articleExcerpt ?? ''}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 300,
    },
    apiKey
  )

  const generatedText = promptResp.choices[0]?.message?.content?.trim() ?? ctx.articleTitle

  let imageBuffer: Buffer
  let contentType = 'image/jpeg'

  if (imageSource === 'pexels') {
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
    // AI image generation via OpenRouter
    const imageUrl = await callOpenRouterImage(generatedText, config.model, apiKey)

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

  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg'
    : contentType.includes('webp') ? '.webp' : '.png'
  const filename = `agent-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(filename, imageBuffer, { contentType })

  if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

  const { data: { publicUrl } } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filename)

  return {
    success: true,
    message: 'Imagem de capa gerada e enviada',
    data: { coverImageUrl: publicUrl },
  }
}
