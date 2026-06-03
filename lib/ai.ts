import { getAppUrl } from '@/lib/app-url'

export type AIFeature =
  | 'content_generation'
  | 'image_description'
  | 'image_generation'
  | 'briefing_generation'
  | 'prompt_generation'
  | 'theme_suggestion'
  | 'category_matching'
  | string

const DEFAULT_MODELS: Record<string, string> = {
  content_generation: 'openai/gpt-4o-mini',
  image_description: 'openai/gpt-4o-mini',
  image_generation: 'openai/gpt-5-image',
  briefing_generation: 'openai/gpt-4o-mini',
  prompt_generation: 'openai/gpt-4o-mini',
  theme_suggestion: 'openai/gpt-4o-mini',
  category_matching: 'openai/gpt-4o-mini',
}

export function getDefaultModels(): Record<string, string> {
  return { ...DEFAULT_MODELS }
}

export function getDefaultModel(feature: AIFeature): string {
  return DEFAULT_MODELS[feature] ?? 'openai/gpt-4o-mini'
}

export async function getAIApiKey(): Promise<string | null> {
  try {
    const { db } = await import('@/drizzle/db')
    const { siteSettings } = await import('@/drizzle/schema')
    const { eq } = await import('drizzle-orm')

    const row = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'ai_api_key'))
      .limit(1)

    return (row.length > 0 && row[0].value) ? row[0].value : null
  } catch {
    return null
  }
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenRouterOptions {
  model: string
  messages: OpenRouterMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  signal?: AbortSignal
  /** Identificador da feature para fins de log (ex: 'content_generation') */
  feature?: string
}

export interface OpenRouterResponse {
  id: string
  choices: {
    index: number
    message: { role: string; content: string }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  // Perplexity/Sonar models return cited URLs here
  citations?: string[]
}

function injectDateContext(messages: OpenRouterMessage[]): OpenRouterMessage[] {
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })
  const prefix = `Data de hoje: ${dateStr}.\n\n`
  return messages.map((m) =>
    m.role === 'system' ? { ...m, content: prefix + m.content } : m
  )
}

async function persistAiLog(entry: {
  feature: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number
  status: 'success' | 'error'
  error?: string
  duration_ms: number
}): Promise<void> {
  try {
    const { db } = await import('@/drizzle/db')
    const { aiRequestLogs } = await import('@/drizzle/schema')
    await db.insert(aiRequestLogs).values(entry)
  } catch {
    // fire-and-forget — nunca bloqueia a chamada principal
  }
}

export async function callOpenRouter(
  options: OpenRouterOptions,
  apiKey?: string
): Promise<OpenRouterResponse> {
  const key = apiKey ?? (await getAIApiKey())

  if (!key) {
    throw new Error('Chave de API do OpenRouter não configurada. Configure em Configurações → IA.')
  }

  const timeout = AbortSignal.timeout(300_000)
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout

  const startedAt = Date.now()

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': getAppUrl(),
      'X-Title': process.env.NEXT_PUBLIC_BLOG_NAME ?? 'Blog',
    },
    body: JSON.stringify({
      model: options.model,
      messages: injectDateContext(options.messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1024,
      ...(options.top_p !== undefined ? { top_p: options.top_p } : {}),
    }),
  })

  const duration_ms = Date.now() - startedAt

  if (!response.ok) {
    const errorBody = await response.text()
    void persistAiLog({
      feature: options.feature ?? 'unknown',
      model: options.model,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      status: 'error',
      error: `HTTP ${response.status}`,
      duration_ms,
    })
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`)
  }

  const data = (await response.json()) as OpenRouterResponse & {
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number }
  }

  const promptTokens = data.usage?.prompt_tokens ?? 0
  const completionTokens = data.usage?.completion_tokens ?? 0
  const totalTokens = data.usage?.total_tokens ?? (promptTokens + completionTokens)
  // OpenRouter returns cost in USD directly when available
  const costUsd = data.usage?.cost ?? 0

  void persistAiLog({
    feature: options.feature ?? 'unknown',
    model: options.model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    cost_usd: costUsd,
    status: 'success',
    duration_ms,
  })

  return data
}

export async function getAIModelFromDB(feature: AIFeature): Promise<string> {
  try {
    const { db } = await import('@/drizzle/db')
    const { siteSettings } = await import('@/drizzle/schema')
    const { eq } = await import('drizzle-orm')

    const row = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'ai_models'))
      .limit(1)

    if (row.length > 0 && row[0].value) {
      const models = JSON.parse(row[0].value) as Record<string, string>
      if (models[feature]) {
        return models[feature]
      }
    }
  } catch {}

  return getDefaultModel(feature)
}

export interface OpenRouterModel {
  id: string
  name: string
  context_length: number
  pricing: {
    prompt: string | null
    completion: string | null
  }
}

export async function fetchAvailableModels(): Promise<OpenRouterModel[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models from OpenRouter (${response.status})`)
  }

  const data = (await response.json()) as { data: OpenRouterModel[] }

  return data.data
    .filter((m) => m.id && m.name)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchAvailableImageModels(): Promise<OpenRouterModel[]> {
  const response = await fetch(
    'https://openrouter.ai/api/v1/models?output_modalities=image',
    { next: { revalidate: 3600 } }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch image models from OpenRouter (${response.status})`)
  }

  const data = (await response.json()) as { data: OpenRouterModel[] }

  return data.data
    .filter((m) => m.id && m.name)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function aiChat(
  feature: AIFeature,
  messages: OpenRouterMessage[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const model = await getAIModelFromDB(feature)

  const response = await callOpenRouter({
    model,
    messages,
    temperature: options?.temperature,
    max_tokens: options?.max_tokens,
    feature,
  })

  return response.choices[0]?.message?.content ?? ''
}

// Models whose output is image-only (no text output modality).
// These require modalities: ['image'] — sending 'text' causes a 404.
function isImageOnlyModel(modelId: string): boolean {
  const imageOnlyPrefixes = [
    'recraft/',
    'black-forest-labs/',
    'sourceful/',
    'bytedance-seed/',
    'x-ai/grok-imagine',
  ]
  return imageOnlyPrefixes.some((prefix) => modelId.startsWith(prefix))
}

export async function callOpenRouterImage(
  prompt: string,
  model?: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey ?? (await getAIApiKey())

  if (!key) {
    throw new Error('Chave de API do OpenRouter não configurada. Configure em Configurações → IA.')
  }

  const resolvedModel = model ?? (await getAIModelFromDB('image_generation'))
  const modalities = isImageOnlyModel(resolvedModel) ? ['image'] : ['text', 'image']

  const maxAttempts = 3
  const signal = AbortSignal.timeout(180_000)
  let response!: Response
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': getAppUrl(),
        'X-Title': process.env.NEXT_PUBLIC_BLOG_NAME ?? 'Blog',
      },
      body: JSON.stringify({
        model: resolvedModel,
        modalities,
        max_tokens: 4096,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (response.ok) break

    if ((response.status === 502 || response.status === 503) && attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 3000))
      continue
    }

    const errorBody = await response.text()
    throw new Error(`OpenRouter Image API error (${response.status}): ${errorBody}`)
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenRouter Image API error (${response.status}): ${errorBody}`)
  }

  const data = (await response.json()) as {
    choices: {
      message: {
        content?: string | Array<Record<string, unknown>>
        images?: Array<{ image_url?: { url: string }; url?: string }>
      }
    }[]
  }

  const msg = data.choices?.[0]?.message

  // top-level images array (some OpenRouter models)
  if (msg?.images && msg.images.length > 0) {
    const img = msg.images[0]
    const url = img.image_url?.url ?? img.url
    if (url) return url
  }

  if (msg?.content && typeof msg.content === 'string') {
    const base64Match = msg.content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/)
    if (base64Match) return base64Match[0]

    const urlMatch = msg.content.match(/https?:\/\/[^\s"')\]]+\.(png|jpg|jpeg|webp|gif)[^\s"')\]]*/i)
    if (urlMatch) return urlMatch[0]
  }

  if (msg?.content && Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (part.type === 'image_url' && part.image_url && typeof part.image_url === 'object') {
        const url = (part.image_url as { url?: string }).url
        if (url) return url
      }
      if (part.type === 'image') {
        // Anthropic-style: { source: { data, media_type } }
        if (part.source && typeof part.source === 'object') {
          const src = part.source as { data?: string; media_type?: string }
          if (src.data) return `data:${src.media_type ?? 'image/png'};base64,${src.data}`
        }
        // Flat style: { data, mime_type }
        if (typeof part.data === 'string') {
          const mime = typeof part.mime_type === 'string' ? part.mime_type : 'image/png'
          return `data:${mime};base64,${part.data}`
        }
        // URL directly on part
        if (typeof part.url === 'string') return part.url
      }
    }
  }

  throw new Error(
    'IA não retornou imagem. message=' +
      JSON.stringify(msg ?? null).substring(0, 600)
  )
}

export async function getPromptFromDB(key: string): Promise<string> {
  try {
    const { db } = await import('@/drizzle/db')
    const { siteSettings } = await import('@/drizzle/schema')
    const { eq } = await import('drizzle-orm')

    const row = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'prompts'))
      .limit(1)

    if (row.length > 0 && row[0].value) {
      const prompts = JSON.parse(row[0].value) as Record<string, string>
      return prompts[key] ?? ''
    }
  } catch {}

  return ''
}
