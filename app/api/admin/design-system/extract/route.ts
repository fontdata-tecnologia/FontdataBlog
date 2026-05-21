import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TIMEOUT_MS = 10_000

interface ExtractedTokens {
  custom_properties: Record<string, string>
  font_families: string[]
  colors: string[]
  border_radii: string[]
  font_sizes: string[]
  logo_candidates: string[]
  source_url: string
}

type CSSTokens = Omit<ExtractedTokens, 'source_url' | 'logo_candidates'>

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function extractCSSTokens(cssText: string): CSSTokens {
  const custom_properties: Record<string, string> = {}
  const font_families = new Set<string>()
  const colors = new Set<string>()
  const border_radii = new Set<string>()
  const font_sizes = new Set<string>()

  const clean = stripComments(cssText)

  // Extract all declarations: prop: value
  const declRegex = /([\w-]+)\s*:\s*([^;}{]+)/g
  let m: RegExpExecArray | null

  while ((m = declRegex.exec(clean)) !== null) {
    const prop = m[1].trim()
    const value = m[2].trim()

    // CSS custom properties (--var-name: value)
    if (prop.startsWith('--')) {
      custom_properties[prop] = value
      continue
    }

    // font-family
    if (prop === 'font-family') {
      font_families.add(value)
    }

    // hex colors from color/background-color/background/border-color/fill
    if (['color', 'background-color', 'background', 'border-color', 'fill'].includes(prop)) {
      const hexMatches = value.match(/#[0-9A-Fa-f]{3,8}\b/g)
      hexMatches?.forEach((h) => {
        if (h.length === 4 || h.length === 7) colors.add(h.toUpperCase())
      })
    }

    // border-radius
    if (prop === 'border-radius') {
      const v = value.split(/\s+/)[0] // take first value only (e.g. "8px 4px" → "8px")
      if (/^\d+(\.\d+)?(px|rem|em|%)|^\d+$/.test(v)) border_radii.add(v)
    }

    // font-size
    if (prop === 'font-size') {
      if (/^\d+(\.\d+)?(px|rem|em)$/.test(value)) font_sizes.add(value)
    }
  }

  return {
    custom_properties,
    font_families: Array.from(font_families).slice(0, 20),
    colors: Array.from(colors).slice(0, 50),
    border_radii: Array.from(border_radii).slice(0, 20),
    font_sizes: Array.from(font_sizes).slice(0, 20),
  }
}

const LOGO_IMAGE_EXTS = /\.(png|jpg|jpeg|svg|webp)(\?.*)?$/i

function extractLogoCandidates(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl)
  const candidates = new Set<string>()

  const toAbsolute = (href: string) => {
    try {
      if (href.startsWith('http')) return href
      if (href.startsWith('//')) return `https:${href}`
      return new URL(href, base).toString()
    } catch {
      return null
    }
  }

  // <img> with logo-related alt/class/id/src
  const imgRegex = /<img([^>]+)>/gi
  let m: RegExpExecArray | null
  while ((m = imgRegex.exec(html)) !== null) {
    const attrs = m[1]
    const isLogo =
      /\blogo\b/i.test(attrs) ||
      /alt=["'][^"']*logo[^"']*["']/i.test(attrs) ||
      /class=["'][^"']*logo[^"']*["']/i.test(attrs) ||
      /id=["'][^"']*logo[^"']*["']/i.test(attrs)
    if (!isLogo) continue
    const srcMatch = /src=["']([^"']+)["']/.exec(attrs)
    if (srcMatch) {
      const abs = toAbsolute(srcMatch[1])
      if (abs && LOGO_IMAGE_EXTS.test(abs)) candidates.add(abs)
    }
  }

  // <link rel="icon" type="image/svg+xml"> — SVG favicon is often the logo
  const linkIconRegex = /<link([^>]+)>/gi
  while ((m = linkIconRegex.exec(html)) !== null) {
    const attrs = m[1]
    if (!/rel=["']([^"']*\s)?icon([^"']*\s)?["']/i.test(attrs)) continue
    if (!/type=["']image\/svg\+xml["']/i.test(attrs)) continue
    const hrefMatch = /href=["']([^"']+)["']/.exec(attrs)
    if (hrefMatch) {
      const abs = toAbsolute(hrefMatch[1])
      if (abs) candidates.add(abs)
    }
  }

  // og:image — often the brand image
  const ogRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  const ogMatch = ogRegex.exec(html)
  if (ogMatch) {
    const abs = toAbsolute(ogMatch[1])
    if (abs && LOGO_IMAGE_EXTS.test(abs)) candidates.add(abs)
  }

  return Array.from(candidates).slice(0, 6)
}

async function fetchPageData(url: string): Promise<{ html: string; css: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogDesignExtractor/1.0)' },
    })
    const html = await res.text()

    const inlineStyles: string[] = []
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
    let m: RegExpExecArray | null
    while ((m = styleRegex.exec(html)) !== null) {
      inlineStyles.push(m[1])
    }

    const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi
    const cssUrls: string[] = []
    while ((m = linkRegex.exec(html)) !== null) {
      const href = m[1]
      if (href.startsWith('http')) {
        cssUrls.push(href)
      } else if (href.startsWith('//')) {
        cssUrls.push(`https:${href}`)
      } else {
        cssUrls.push(new URL(href, new URL(url)).toString())
      }
    }

    const externalCSS = await Promise.allSettled(
      cssUrls.slice(0, 5).map(async (cssUrl) => {
        const r = await fetch(cssUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogDesignExtractor/1.0)' },
        })
        return r.text()
      })
    )

    const css = [
      ...inlineStyles,
      ...externalCSS
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value),
    ].join('\n')

    return { html, css }
  } finally {
    clearTimeout(timer)
  }
}

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

    const { html, css } = await fetchPageData(parsedUrl.toString())

    if (!css.trim()) {
      return NextResponse.json({ error: 'Nenhum CSS encontrado na URL fornecida' }, { status: 422 })
    }

    const tokens = extractCSSTokens(css)
    const logo_candidates = extractLogoCandidates(html, parsedUrl.toString())

    return NextResponse.json({ ...tokens, logo_candidates, source_url: parsedUrl.toString() } satisfies ExtractedTokens)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('abort') || msg.includes('timeout')) {
      return NextResponse.json({ error: 'Timeout ao acessar a URL (limite: 10s)' }, { status: 504 })
    }
    if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('failed to fetch') || msg.includes('fetch failed')) {
      return NextResponse.json({ error: 'Não foi possível conectar ao site. Verifique a URL e tente novamente.' }, { status: 502 })
    }
    console.error('[design-system extract]', msg)
    return NextResponse.json({ error: `Erro ao extrair design system: ${msg}` }, { status: 500 })
  }
}
