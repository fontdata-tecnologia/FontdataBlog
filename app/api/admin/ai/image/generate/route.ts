import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { verifyToken } from '@/lib/auth'
import { aiChat, callOpenRouterImage, getPromptFromDB } from '@/lib/ai'
import { getAgentsExtra } from '@/lib/firecrawl'
import { getPexelsApiKey, searchPexelsPhoto } from '@/lib/pexels'
import { uploadObject, normalizeImageMime } from '@/lib/storage'
import { getSettings } from '@/lib/settings'
import { generateGradientCover, generateGeometricCover } from '@/lib/cover-svg'

const requestBodySchema = z.object({
  title: z.string().min(1, 'Título do artigo é obrigatório'),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  image_source: z.enum(['ai', 'pexels', 'code']).optional(),
  code_style: z.enum(['gradient', 'geometric']).optional(),
})

export const dynamic = 'force-dynamic'

async function uploadBufferToStorage(
  imageBuffer: Buffer,
  rawContentType: string,
  prefix: string
): Promise<string> {
  const contentType = normalizeImageMime(rawContentType)
  const ext =
    contentType.includes('svg')
      ? '.svg'
      : contentType.includes('jpeg')
        ? '.jpg'
        : contentType.includes('webp')
          ? '.webp'
          : contentType.includes('gif')
            ? '.gif'
            : '.png'
  const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

  try {
    return await uploadObject(filename, imageBuffer, contentType)
  } catch (uploadError) {
    console.error('Storage upload error:', uploadError)
    throw new Error('Erro ao salvar imagem')
  }
}

async function handleCode(
  title: string,
  codeStyleOverride?: 'gradient' | 'geometric'
): Promise<NextResponse> {
  // Geração de capa via código SVG (sem IA, sem custo externo) — espelha o
  // comportamento do Designer agent em lib/agents/designer.ts para a opção 'code'.
  const extra = await getAgentsExtra()
  const codeStyle = codeStyleOverride ?? extra['designer']?.code_style ?? 'gradient'
  const settings = await getSettings()
  const { primary, secondary } = settings.colors

  const svgString =
    codeStyle === 'geometric'
      ? generateGeometricCover({ seed: title, primary, secondary })
      : generateGradientCover({ title, category: undefined, primary, secondary })

  const imageBuffer = Buffer.from(svgString, 'utf-8')
  const publicUrl = await uploadBufferToStorage(imageBuffer, 'image/svg+xml', 'code')

  return NextResponse.json({ url: publicUrl })
}

async function handlePexels(title: string): Promise<NextResponse> {
  const pexelsKey = await getPexelsApiKey()
  if (!pexelsKey) {
    return NextResponse.json(
      { error: 'Pexels não configurado. Configure a chave em Configurações.' },
      { status: 400 }
    )
  }

  const photo = await searchPexelsPhoto(title, pexelsKey, 'landscape')
  if (!photo) {
    return NextResponse.json(
      { error: 'Nenhuma imagem encontrada no Pexels para este título.' },
      { status: 404 }
    )
  }

  const imgUrl = photo.src.large2x || photo.src.large
  const imgRes = await fetch(imgUrl)
  if (!imgRes.ok) {
    return NextResponse.json({ error: 'Falha ao baixar imagem do Pexels.' }, { status: 500 })
  }

  const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
  const imageBuffer = Buffer.from(await imgRes.arrayBuffer())
  const publicUrl = await uploadBufferToStorage(imageBuffer, contentType, 'pexels')

  return NextResponse.json({ url: publicUrl })
}

async function handleAI(
  title: string,
  excerpt?: string,
  content?: string
): Promise<NextResponse> {
  const imagePromptTemplate = await getPromptFromDB('image')

  const contextParts = [`Título do artigo: ${title}`]
  if (excerpt) contextParts.push(`Resumo: ${excerpt}`)
  if (content) {
    const textContent = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000)
    contextParts.push(`Conteúdo do artigo: ${textContent}`)
  }

  let finalPrompt: string

  if (imagePromptTemplate) {
    finalPrompt = await aiChat(
      'image_description',
      [
        {
          role: 'system' as const,
          content:
            'Você é um especialista em criar prompts para geração de imagens por IA. Receba o prompt template e o contexto do artigo, e gere um prompt em inglês otimizado para gerar uma imagem de capa profissional e atraente para o artigo. Responda APENAS com o prompt, sem explicações.',
        },
        {
          role: 'user' as const,
          content: `${imagePromptTemplate}\n\nContexto do artigo:\n${contextParts.join('\n')}`,
        },
      ],
      { temperature: 0.8, max_tokens: 500 }
    )
  } else {
    finalPrompt = await aiChat(
      'image_description',
      [
        {
          role: 'system' as const,
          content:
            'Você é um especialista em criar prompts para geração de imagens por IA. Gere um prompt em inglês para criar uma imagem de capa profissional e atraente para o artigo descrito. A imagem deve ser adequada para um blog, em estilo fotorealista ou ilustração editorial. A imagem não deve conter nenhum texto, letra, número ou palavra. Responda APENAS com o prompt, sem explicações.',
        },
        {
          role: 'user' as const,
          content: contextParts.join('\n'),
        },
      ],
      { temperature: 0.8, max_tokens: 500 }
    )
  }

  if (!finalPrompt) {
    return NextResponse.json({ error: 'Falha ao gerar prompt de imagem' }, { status: 500 })
  }

  const imageUrl = await callOpenRouterImage(
    `${finalPrompt}. No text, no letters, no words, no numbers anywhere in the image.`
  )

  let imageBuffer: Buffer
  let contentType = 'image/png'

  if (imageUrl.startsWith('data:')) {
    const matches = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json({ error: 'Formato de imagem inválido' }, { status: 500 })
    }
    contentType = matches[1]
    imageBuffer = Buffer.from(matches[2], 'base64')
  } else {
    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Falha ao baixar imagem gerada' }, { status: 500 })
    }
    contentType = imageRes.headers.get('content-type') ?? 'image/png'
    imageBuffer = Buffer.from(await imageRes.arrayBuffer())
  }

  const publicUrl = await uploadBufferToStorage(imageBuffer, contentType, 'ai')
  return NextResponse.json({ url: publicUrl })
}

export async function POST(request: NextRequest) {
  const token = cookies().get('auth_token')?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = requestBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    const message =
      firstIssue.path.includes('title')
        ? 'Título do artigo é obrigatório'
        : firstIssue.path.includes('image_source')
          ? 'Fonte de imagem inválida'
          : firstIssue.message
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { title, excerpt, content, image_source, code_style } = parsed.data

  try {
    const extra = await getAgentsExtra()
    const imageSource: string =
      image_source ?? extra['designer']?.image_source ?? 'pexels'

    if (imageSource === 'code') {
      return await handleCode(title, code_style)
    } else if (imageSource === 'pexels') {
      return await handlePexels(title)
    } else {
      return await handleAI(title, excerpt, content)
    }
  } catch (err) {
    console.error('Cover image generation error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao gerar imagem de capa'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
