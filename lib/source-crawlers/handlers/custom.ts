import { getFirecrawlApiKey } from '@/lib/firecrawl'
import { aiChat, getAIModelFromDB, callOpenRouter, getAIApiKey } from '@/lib/ai'
import type { CrawlerHandlerOptions, CrawlerHandlerResult } from '../types'

async function scrapeMarkdown(url: string, firecrawlKey: string): Promise<{ markdown: string; title: string }> {
  const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${firecrawlKey}` },
    body: JSON.stringify({ url, formats: ['markdown'] }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!resp.ok) throw new Error(`Firecrawl scrape error: ${resp.status}`)
  const data = await resp.json() as { data?: { markdown?: string; metadata?: { title?: string } } }
  return {
    markdown: data.data?.markdown ?? '',
    title: data.data?.metadata?.title ?? '',
  }
}

function parseJsonUrls(raw: string): string[] {
  // Try code-fenced JSON first, then bare object
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenceMatch ? fenceMatch[1] : raw
  const objMatch = candidate.match(/\{[\s\S]*\}/)
  if (!objMatch) return []
  try {
    const parsed = JSON.parse(objMatch[0]) as { urls?: unknown }
    if (!Array.isArray(parsed.urls)) return []
    return parsed.urls.filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
  } catch {
    return []
  }
}

async function extractArticleUrls(indexMarkdown: string, baseUrl: string): Promise<string[]> {
  const origin = (() => { try { return new URL(baseUrl).origin } catch { return baseUrl } })()
  const model = await getAIModelFromDB('url_extraction')
  const apiKey = await getAIApiKey()
  if (!apiKey) throw new Error('AI API key não configurada')

  const resp = await callOpenRouter(
    {
      model,
      feature: 'url_extraction',
      messages: [
        {
          role: 'system',
          // Only extract links already present in the markdown — no fabrication
          content: `Você é um extrator de URLs. Extraia SOMENTE as URLs absolutas de artigos individuais de notícias que já aparecem literalmente no markdown abaixo. NÃO invente nem complete URLs. Use o domínio "${origin}" para prefixar URLs relativas que comecem com "/". Retorne APENAS um objeto JSON no formato {"urls": ["url1", "url2"]}. Não inclua links de navegação, categorias, tags ou redes sociais.`,
        },
        {
          role: 'user',
          // Limit input size to avoid token waste; no external content is executed — it's parsed as data only
          content: indexMarkdown.slice(0, 6000),
        },
      ],
      temperature: 0.1,
      max_tokens: 800,
    },
    apiKey
  )

  const raw = resp.choices[0]?.message?.content?.trim() ?? ''
  return parseJsonUrls(raw)
}

export async function runCustomHandler(opts: CrawlerHandlerOptions): Promise<CrawlerHandlerResult> {
  const firecrawlKey = await getFirecrawlApiKey()
  if (!firecrawlKey) throw new Error('Firecrawl API key não configurada')

  const { markdown: indexMarkdown } = await scrapeMarkdown(opts.url, firecrawlKey)
  if (!indexMarkdown) throw new Error(`Sem conteúdo ao raspar ${opts.url}`)

  const articleUrls = await extractArticleUrls(indexMarkdown, opts.url)
  if (articleUrls.length === 0) throw new Error('LLM não extraiu URLs da página de índice')

  const freshUrls = articleUrls.filter((u) => !opts.alreadyProcessedKeys.includes(u))
  if (freshUrls.length === 0) throw new Error('Todos os artigos encontrados já foram processados')

  // Try each fresh URL until one yields content
  for (const candidateUrl of freshUrls) {
    const { markdown: content, title } = await scrapeMarkdown(candidateUrl, firecrawlKey)
    if (!content) continue

    return {
      chosen: {
        key: candidateUrl,
        title: title || candidateUrl,
        content,
        url: candidateUrl,
      },
    }
  }

  throw new Error('Nenhum artigo novo pôde ser raspado (todos retornaram conteúdo vazio)')
}
