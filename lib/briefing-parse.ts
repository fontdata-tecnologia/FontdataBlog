import { z } from 'zod'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { aiChat } from '@/lib/ai'
import type { CompanyInfo } from '@/lib/settings'

const SYSTEM_PROMPT = `Você é um assistente que extrai dados estruturados de textos de briefing empresarial.

Analise o briefing fornecido e retorne EXCLUSIVAMENTE um objeto JSON válido com os campos abaixo.
Não inclua nenhum texto fora do JSON. Não use blocos de código (sem \`\`\`json).
Para campos que não for possível extrair do briefing, retorne string vazia "".

Campos obrigatórios no JSON:
{
  "blog_name": "nome do blog ou produto principal",
  "blog_description": "descrição do blog ou negócio em uma frase",
  "company_name": "razão social ou nome fantasia da empresa",
  "company_email": "e-mail de contato da empresa",
  "company_phone": "telefone de contato",
  "company_address": "endereço da empresa",
  "company_cnpj": "CNPJ da empresa",
  "social_facebook": "URL do Facebook",
  "social_instagram": "URL do Instagram",
  "social_twitter": "URL do Twitter/X",
  "social_youtube": "URL do YouTube",
  "logo_url": "URL do logotipo"
}`

// Coage qualquer valor (incluindo null, que LLMs gratuitos emitem com frequência
// no lugar de "") para string — assim um único campo null não invalida todo o JSON.
const str = z.preprocess(
  (v) => (v == null ? '' : typeof v === 'string' ? v : String(v)),
  z.string()
)

const companySchema = z.object({
  blog_name: str.default(''),
  blog_description: str.default(''),
  company_name: str.default(''),
  company_email: str.default(''),
  company_phone: str.default(''),
  company_address: str.default(''),
  company_cnpj: str.default(''),
  social_facebook: str.default(''),
  social_instagram: str.default(''),
  social_twitter: str.default(''),
  social_youtube: str.default(''),
  logo_url: str.default(''),
})

export async function parseBriefingContent(briefingContent?: string): Promise<Partial<CompanyInfo>> {
  let content = briefingContent?.trim() ?? ''

  if (!content) {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'briefing_content'))
      .limit(1)
    content = rows.length > 0 ? rows[0].value : ''
  }

  if (!content) return {}

  const raw = await aiChat(
    'briefing_extraction',
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Briefing:\n\n${content}` },
    ],
    { temperature: 0.1, max_tokens: 512 }
  )

  // Parse defensivo: remove cercas de código, faz trim e tenta JSON.parse
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    const validated = companySchema.safeParse(parsed)
    return validated.success ? validated.data : {}
  } catch {
    return {}
  }
}
