// lib/agents/researcher.ts
import { callOpenRouter } from '@/lib/ai'
import { getAgentConfig } from '@/lib/agent-configs'
import { AgentContext, AgentResult } from '@/lib/agents/types'

export async function runResearcherAgent(
  ctx: AgentContext,
  apiKey: string
): Promise<AgentResult> {
  if (!ctx.headline) return { success: false, message: 'Headline não disponível', error: 'NO_HEADLINE' }

  const config = await getAgentConfig('researcher')

  // Ask the LLM to suggest concrete URLs of real sources (no search engine needed)
  const resp = await callOpenRouter(
    {
      model: config.model,
      messages: [
        { role: 'system', content: config.prompt },
        { role: 'user', content: `Título do artigo: ${ctx.headline}${ctx.themeTitle ? `\nTema: ${ctx.themeTitle}` : ''}` },
      ],
      temperature: 0.5,
      max_tokens: 600,
    },
    apiKey
  )

  let suggestedUrls: string[] = []
  try {
    const raw = resp.choices[0]?.message?.content ?? ''
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned) as { urls?: string[] }
    suggestedUrls = (parsed.urls ?? [])
      .filter((u) => typeof u === 'string' && u.startsWith('http'))
      .slice(0, 8)
  } catch {
    // fallback: extract any URLs from the raw text
    const matches = (resp.choices[0]?.message?.content ?? '').match(/https?:\/\/[^\s"',\]>]+/g) ?? []
    suggestedUrls = matches.slice(0, 6)
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
    message: `${researchLinks.length} referências identificadas`,
    data: { researchLinks },
  }
}
