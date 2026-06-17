import { NextResponse } from 'next/server'
import { uploadObject } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif']
const MAX_SIZE = 2 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawUrl = body?.url

    if (!rawUrl || typeof rawUrl !== 'string') {
      return NextResponse.json({ error: 'Campo "url" é obrigatório' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(rawUrl)
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Apenas URLs http/https são permitidas' }, { status: 400 })
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    let imgRes: Response
    try {
      imgRes = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogDesignExtractor/1.0)' },
      })
    } finally {
      clearTimeout(timer)
    }

    if (!imgRes.ok) {
      return NextResponse.json({ error: 'Não foi possível baixar a imagem' }, { status: 502 })
    }

    const contentType = imgRes.headers.get('content-type')?.split(';')[0].trim() ?? ''

    // SVGs served as text/html or text/plain still need to be accepted if URL ends in .svg
    const isSvgUrl = /\.svg(\?.*)?$/i.test(parsedUrl.pathname)
    const effectiveType = isSvgUrl && !ALLOWED_TYPES.includes(contentType) ? 'image/svg+xml' : contentType

    if (!ALLOWED_TYPES.includes(effectiveType)) {
      return NextResponse.json(
        { error: `Formato não suportado (${contentType}). Use PNG, JPG, SVG ou WebP.` },
        { status: 422 }
      )
    }

    const bytes = await imgRes.arrayBuffer()

    if (bytes.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'Imagem maior que 2MB' }, { status: 422 })
    }

    const ext = isSvgUrl ? '.svg' : (effectiveType === 'image/png' ? '.png' : effectiveType === 'image/jpeg' ? '.jpg' : effectiveType === 'image/webp' ? '.webp' : '.img')
    const filename = `logo-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

    let publicUrl: string
    try {
      publicUrl = await uploadObject(filename, Buffer.from(bytes), effectiveType)
    } catch (uploadError) {
      console.error('[fetch-logo] upload error:', uploadError)
      return NextResponse.json({ error: 'Erro ao salvar imagem no storage' }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('abort')) {
      return NextResponse.json({ error: 'Timeout ao baixar a imagem' }, { status: 504 })
    }
    console.error('[fetch-logo]', msg)
    return NextResponse.json({ error: 'Erro ao processar logo' }, { status: 500 })
  }
}
