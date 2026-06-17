// lib/agents/researcher.ts
import { callOpenRouter } from '@/lib/ai'
import { getAgentConfig } from '@/lib/agent-configs'
import { AgentContext, AgentResult } from '@/lib/agents/types'
import { getFirecrawlApiKey, getAgentsExtra, firecrawlSearch, isArticleUrl } from '@/lib/firecrawl'
import { extractJson } from '@/lib/json-extract'

function extractUrls(text: string): string[] {
  // Try extractJson first (handles prosa + cercas markdown + aspas problemáticas)
  const obj = extractJson<{ urls?: unknown }>(text)
  if (obj && Array.isArray(obj.urls)) {
    const urls = obj.urls.filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
    if (urls.length > 0) return urls.slice(0, 8)
  }

  // Try extracting JSON array from anywhere in the text
  const arrayMatch = text.match(/\[\s*"https?:\/\/[^\]]+\]/)
  if (arrayMatch) {
    try {
      const arr = JSON.parse(arrayMatch[0]) as unknown[]
      const urls = arr.filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
      if (urls.length > 0) return urls.slice(0, 8)
    } catch { /* fallthrough */ }
  }

  // Last resort: regex grab every URL in the text
  const matches = text.match(/https?:\/\/[^\s"',\]>)\n]+/g) ?? []
  return matches.slice(0, 8)
}

// Jina AI Search: returns real URLs from a web search query (no API key required)
async function searchWithJina(query: string): Promise<string[]> {
  try {
    const resp = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!resp.ok) return []
    const data = await resp.json() as { data?: Array<{ url?: string }> }
    return (data.data ?? [])
      .map((r) => r.url)
      .filter((u): u is string => typeof u === 'string' && u.startsWith('http') && isArticleUrl(u))
      .slice(0, 8)
  } catch {
    return []
  }
}

export async function runResearcherAgent(
  ctx: AgentContext,
  apiKey: string
): Promise<AgentResult> {
  if (!ctx.headline) return { success: false, message: 'Headline não disponível', error: 'NO_HEADLINE' }

  const [config, agentsExtra, firecrawlKey] = await Promise.all([
    getAgentConfig('researcher'),
    getAgentsExtra(),
    getFirecrawlApiKey(),
  ])

  const useFirecrawl = !!(agentsExtra['researcher']?.use_firecrawl && firecrawlKey)

  let suggestedUrls: string[] = []
  let searchSource = 'LLM'
  const isPerplexity = config.model.startsWith('perplexity/')

  if (useFirecrawl) {
    suggestedUrls = await firecrawlSearch(ctx.headline, firecrawlKey!)
    searchSource = 'Firecrawl'
  } else if (isPerplexity) {
    // Perplexity/Sonar: built-in web search — citations come back in resp.citations
    const resp = await callOpenRouter(
      {
        model: config.model,
        feature: 'content_generation',
        messages: [
          { role: 'system', content: config.prompt },
          {
            role: 'user',
            content: `Título do artigo: ${ctx.headline}${ctx.themeTitle ? `\nTema: ${ctx.themeTitle}` : ''}\n\nBusque as principais fontes sobre este tema e responda em JSON: { "urls": ["https://...", ...] }`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      },
      apiKey
    )

    const citations = resp.citations ?? []
    const fromContent = extractUrls(resp.choices[0]?.message?.content ?? '')
    const seen = new Set<string>()
    suggestedUrls = [...citations, ...fromContent]
      .filter((u) => isArticleUrl(u) && (seen.has(u) ? false : (seen.add(u), true)))
      .slice(0, 8)
    searchSource = 'Perplexity Search'
  } else {
    // Standard model: Jina web search + LLM URL suggestions in parallel
    const [llmResp, jinaUrls] = await Promise.all([
      callOpenRouter(
        {
          model: config.model,
          feature: 'content_generation',
          messages: [
            { role: 'system', content: config.prompt },
            {
              role: 'user',
              content: `Título do artigo: ${ctx.headline}${ctx.themeTitle ? `\nTema: ${ctx.themeTitle}` : ''}\n\nResponda APENAS em JSON válido: { "urls": ["https://...", "https://...", ...] }`,
            },
          ],
          temperature: 0.5,
          max_tokens: 800,
        },
        apiKey
      ),
      searchWithJina(ctx.headline),
    ])

    const llmUrls = extractUrls(llmResp.choices[0]?.message?.content ?? '').filter(isArticleUrl)
    // Jina results first (real URLs from the web), LLM suggestions fill remaining slots
    const merged = [...jinaUrls]
    for (const u of llmUrls) {
      if (!merged.includes(u)) merged.push(u)
    }
    suggestedUrls = merged.slice(0, 8)
    searchSource = jinaUrls.length > 0 ? `Jina Search (${jinaUrls.length} reais)` : 'LLM'
  }

  // Merge with any links already seeded (e.g. from URL-based generation)
  const seeded = ctx.researchLinks ?? []
  const allLinks = [...seeded]
  for (const u of suggestedUrls) {
    if (!allLinks.includes(u)) allLinks.push(u)
  }

  const researchLinks = allLinks.slice(0, 8)

  return {
    success: true,
    message: `${researchLinks.length} referências identificadas (${searchSource})`,
    data: { researchLinks },
    ...(researchLinks.length === 0 ? { error: 'Nenhuma referência encontrada' } : {}),
  }
}
