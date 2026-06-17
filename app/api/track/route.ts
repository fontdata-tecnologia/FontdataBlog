import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { pageViews, posts } from '@/drizzle/schema'
import { eq, and, gte } from 'drizzle-orm'
import { createHash } from 'crypto'

/**
 * Trunca o IP antes de hashear, reduzindo a entropia recuperável.
 *
 * IPv4: zera o último octeto (ex: 192.168.1.55 → 192.168.1.0).
 * IPv6: mantém apenas os primeiros 4 grupos de 16 bits (/64), zerando o restante.
 * IP inválido ou 'unknown': retorna como está — analytics é não-crítico.
 *
 * Nota de privacidade: visitantes na mesma sub-rede /24 (IPv4) podem colidir na
 * janela de dedup de 5 min — isso é intencional e desejável para privacidade.
 * Art. 46 §2 LGPD — medida técnica de minimização de dados.
 */
function truncateIp(ip: string): string {
  if (!ip || ip === 'unknown') return ip

  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — formato comum em proxies/Node — trata como IPv4
  const mapped = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/i)
  if (mapped) return `${mapped[1]}.0`

  // IPv4: a.b.c.d → a.b.c.0
  const ipv4 = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/)
  if (ipv4) return `${ipv4[1]}.0`

  // IPv6: expande a notação comprimida ('::') antes de cortar — sem isso, grupos
  // da porção de HOST entrariam no hash em endereços como 2001:db8::abcd:1234
  if (ip.includes(':')) {
    const [head, tail = ''] = ip.split('::')
    const headGroups = head ? head.split(':') : []
    const tailGroups = tail ? tail.split(':') : []
    const groups = ip.includes('::')
      ? [...headGroups, ...Array(Math.max(0, 8 - headGroups.length - tailGroups.length)).fill('0'), ...tailGroups]
      : headGroups
    // Mantém só os 4 primeiros grupos (prefixo de rede /64), zera o restante
    if (groups.length === 8) return `${groups.slice(0, 4).join(':')}::`
  }

  // Não identificado como IPv4 nem IPv6 — retorna como está
  return ip
}

/**
 * Gera um fingerprint anonimizado para deduplicação de page views.
 *
 * Salt dedicado: usa ANALYTICS_SALT (variável de ambiente separada do JWT_SECRET),
 * com fallback para JWT_SECRET caso ANALYTICS_SALT não esteja configurado —
 * garantindo retrocompatibilidade em ambientes sem a nova variável.
 * Se ambos estiverem ausentes, usa string vazia (analytics não é crítico).
 *
 * O IP é truncado via truncateIp() antes de entrar no hash, eliminando o octeto
 * identificador do host. Isso reduz a precisão da dedup (colisão em /24 aceitável)
 * e impede reconstituição do IP original mesmo com a chave de salt.
 *
 * Salt diário: deriva da data (YYYY-MM-DD) + salt — garante que o hash seja
 * diferente a cada dia. Na virada do dia o salt muda e uma nova visita gera
 * hash diferente — comportamento esperado.
 *
 * O path NÃO entra no hash: o fingerprint identifica o visitante do dia, para
 * que count(distinct ip) no dashboard meça visitantes — não visitante×página.
 * A deduplicação por página já filtra a coluna path explicitamente na query.
 *
 * Art. 5º, 7º e 46 §2 LGPD — dado pessoal anonimizado não está sujeito ao tratamento.
 */
function hashFingerprint(ip: string): string {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  // ANALYTICS_SALT é o segredo dedicado para analytics; JWT_SECRET é o fallback
  // (|| e não ??: variável definida porém vazia também deve cair no fallback)
  const secret = process.env.ANALYTICS_SALT || process.env.JWT_SECRET || ''
  const salt = today + secret
  const truncatedIp = truncateIp(ip)
  return createHash('sha256').update(truncatedIp + salt).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, referrer } = body

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    if (path.startsWith('/admin') || path.startsWith('/api')) {
      return NextResponse.json({ ok: true })
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const fingerprint = hashFingerprint(ip)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const recent = await db
      .select({ id: pageViews.id })
      .from(pageViews)
      .where(
        and(
          eq(pageViews.ip, fingerprint),
          gte(pageViews.visited_at, fiveMinutesAgo),
          eq(pageViews.path, path)
        )
      )
      .limit(1)

    if (recent.length > 0) {
      return NextResponse.json({ ok: true, deduplicated: true })
    }

    let postId: number | null = null
    let postSlug: string | null = null
    let postTitle: string | null = null

    const segments = path.split('/').filter(Boolean)
    if (segments.length === 1 && !['busca', 'politica-de-privacidade'].includes(segments[0])) {
      const slug = segments[0]
      const postResult = await db
        .select({ id: posts.id, slug: posts.slug, title: posts.title })
        .from(posts)
        .where(and(eq(posts.slug, slug), eq(posts.status, 'published')))
        .limit(1)
      if (postResult.length > 0) {
        postId = postResult[0].id
        postSlug = postResult[0].slug
        postTitle = postResult[0].title
      }
    }

    await db.insert(pageViews).values({
      path,
      post_id: postId,
      post_slug: postSlug,
      post_title: postTitle,
      referrer: referrer || null,
      user_agent: request.headers.get('user-agent') || null,
      ip: fingerprint,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Track error:', error)
    // Art. 48 LGPD — nunca expor detalhes internos em resposta de erro
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
