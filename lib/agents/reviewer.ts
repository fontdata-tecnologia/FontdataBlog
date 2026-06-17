// lib/agents/reviewer.ts
import { callOpenRouter } from '@/lib/ai'
import { getAgentConfig } from '@/lib/agent-configs'
import { AgentContext, AgentResult } from '@/lib/agents/types'
import { extractJson } from '@/lib/json-extract'

export const MAX_REVIEW_CYCLES = 3

export async function runReviewerAgent(
  ctx: AgentContext,
  apiKey: string
): Promise<AgentResult & { approved: boolean; issues?: string[] }> {
  if (!ctx.articleContent) {
    return { success: false, approved: false, message: 'Artigo não disponível', error: 'NO_CONTENT' }
  }

  const config = await getAgentConfig('reviewer')

  const plainText = ctx.articleContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 32000)

  const resp = await callOpenRouter(
    {
      model: config.model,
      feature: 'content_generation',
      messages: [
        { role: 'system', content: config.prompt },
        {
          role: 'user',
          content: `Título: ${ctx.articleTitle ?? ''}\n\nConteúdo:\n${plainText}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 600,
    },
    apiKey
  )

  const raw = resp.choices[0]?.message?.content ?? ''
  const result: { approved: boolean; issues?: string[] } =
    extractJson<{ approved: boolean; issues?: string[] }>(raw) ?? { approved: true }

  return {
    success: true,
    approved: result.approved,
    issues: result.issues,
    message: result.approved
      ? 'Artigo aprovado pelo revisor'
      : `Revisão necessária: ${(result.issues ?? []).join('; ')}`,
  }
}
