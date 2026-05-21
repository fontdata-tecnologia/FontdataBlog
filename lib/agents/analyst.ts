// lib/agents/analyst.ts
import { callOpenRouter } from '@/lib/ai'
import { getAgentConfig } from '@/lib/agent-configs'
import { AgentContext, AgentResult } from '@/lib/agents/types'

// Uses Jina AI Reader (free, no API key) to extract clean text from any URL
async function extractTextFromUrl(url: string): Promise<string> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`
    const res = await fetch(jinaUrl, {
      headers: {
        Accept: 'text/plain',
        'X-Return-Format': 'text',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return ''
    const text = await res.text()
    return text.slice(0, 6000)
  } catch {
    return ''
  }
}

export async function runAnalystAgent(
  ctx: AgentContext,
  apiKey: string
): Promise<AgentResult> {
  if (!ctx.researchLinks || ctx.researchLinks.length === 0) {
    return {
      success: true,
      message: 'Nenhum link para analisar, continuando sem resumos',
      data: { sourceSummaries: [] },
    }
  }

  const config = await getAgentConfig('analyst')
  const summaries: { url: string; summary: string }[] = []

  for (const url of ctx.researchLinks.slice(0, 6)) {
    const text = await extractTextFromUrl(url)
    if (!text || text.length < 200) continue

    try {
      const resp = await callOpenRouter(
        {
          model: config.model,
          messages: [
            { role: 'system', content: config.prompt },
            {
              role: 'user',
              content: `Título do artigo: ${ctx.headline ?? ''}\n\nURL: ${url}\n\nConteúdo:\n${text}`,
            },
          ],
          temperature: 0.4,
          max_tokens: 600,
        },
        apiKey
      )
      const summary = resp.choices[0]?.message?.content?.trim() ?? ''
      if (summary.length > 50) summaries.push({ url, summary })
    } catch {}
  }

  if (summaries.length === 0) {
    return {
      success: true,
      message: 'Nenhuma fonte acessível via Jina, continuando sem resumos',
      data: { sourceSummaries: [] },
    }
  }

  return {
    success: true,
    message: `${summaries.length} fontes analisadas`,
    data: { sourceSummaries: summaries },
  }
}
