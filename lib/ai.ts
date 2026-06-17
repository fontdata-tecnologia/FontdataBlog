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

// Free Models Router do OpenRouter: escolhe automaticamente a melhor LLM
// gratuita disponível. É o padrão de texto do sistema para funcionar sem créditos.
const FREE_MODEL = 'openrouter/free'

// Modelos gratuitos alternativos usados como fallback quando o FREE_MODEL esgota
// todos os retries com 429. Tentados em ordem, um por um, sem retry completo.
const FREE_FALLBACK_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
]

// Status HTTP considerados transientes e passíveis de retry.
const TRANSIENT_STATUSES = new Set([408, 429, 502, 503])

// Máximo de tentativas para chamadas de texto (1 original + 2 retries).
const MAX_ATTEMPTS = 3

// Delays base em ms para backoff exponencial (índice = tentativa após a 1ª).
const BACKOFF_BASE_MS = [1_000, 2_000, 4_000]

// Teto de delay entre tentativas em ms.
const BACKOFF_CAP_MS = 8_000

// Orçamento total de tempo (ms) para todo o retry + fallback de modelo de uma
// única chamada. Evita que uma rajada de 429 do Free Router (sleeps de até 8s +
// tentativa em 4 modelos alternativos) acumule latência a ponto de estourar o
// maxDuration do cron de automação (300s) ao longo de ~10 chamadas sequenciais.
const RETRY_DEADLINE_MS = 25_000

// Status HTTP não-transientes que indicam que o modelo não suporta o parâmetro
// response_format (jsonMode). Usados para decidir o reenvio sem jsonMode.
const JSON_FORMAT_ERROR_STATUSES = new Set([400, 404, 422])

/**
 * Sleep abortável: rejeita com AbortError se o signal disparar antes do timeout.
 */
function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    const timer = setTimeout(resolve, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Lê o header Retry-After (segundos ou data HTTP) e retorna o delay em ms,
 * com teto de BACKOFF_CAP_MS.
 */
function parseRetryAfter(headers: Headers): number | null {
  const raw = headers.get('Retry-After')
  if (!raw) return null
  const secs = Number(raw)
  if (!Number.isNaN(secs) && secs > 0) {
    return Math.min(secs * 1_000, BACKOFF_CAP_MS)
  }
  const date = Date.parse(raw)
  if (!Number.isNaN(date)) {
    const diff = date - Date.now()
    return diff > 0 ? Math.min(diff, BACKOFF_CAP_MS) : null
  }
  return null
}

const DEFAULT_MODELS: Record<string, string> = {
  // content_generation e image_generation NÃO são mais editáveis na UI de
  // Configurações. O modelo usado é sempre o do agente equivalente na pipeline:
  //   texto  → agente Copywriter  (getTextModel)
  //   imagem → agente Designer    (getImageModel)
  // Estes defaults atuam apenas como fallback de último recurso caso o agente
  // não exista ou o banco esteja inacessível.
  content_generation: FREE_MODEL,
  image_generation: 'openai/gpt-5-image',
  image_description: FREE_MODEL,
  briefing_generation: FREE_MODEL,
  prompt_generation: FREE_MODEL,
  theme_suggestion: FREE_MODEL,
  category_matching: FREE_MODEL,
  url_extraction: FREE_MODEL,
  briefing_extraction: FREE_MODEL,
  // Assistente de Chat — gratuito por padrão (Free Router). O usuário pode
  // trocar para um modelo com tool-calling mais robusto na config se quiser.
  chat_assistant: FREE_MODEL,
}

export function getDefaultModels(): Record<string, string> {
  return { ...DEFAULT_MODELS }
}

export function getDefaultModel(feature: AIFeature): string {
  return DEFAULT_MODELS[feature] ?? FREE_MODEL
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

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
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
  /**
   * Solicita response_format: json_object ao modelo.
   * Modelos que não suportam esse parâmetro receberão um reenvio automático
   * sem o campo (um único fallback, sem loop).
   */
  jsonMode?: boolean
  /** Lista de tools disponíveis para function-calling */
  tools?: ToolDefinition[]
  /** Controla qual tool o modelo pode chamar ('auto' | 'none' | { type: 'function', function: { name } }) */
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
}

export interface OpenRouterResponse {
  id: string
  choices: {
    index: number
    message: {
      role: string
      content: string | null
      tool_calls?: ToolCall[]
    }
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

export interface AiChatWithToolsResult {
  content: string | null
  tool_calls: ToolCall[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

function injectDateContext(messages: OpenRouterMessage[]): OpenRouterMessage[] {
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })
  const prefix = `Data de hoje: ${dateStr}.\n\n`
  return messages.map((m) =>
    m.role === 'system' ? { ...m, content: prefix + (m.content ?? '') } : m
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
    const [{ db }, { aiRequestLogs }, { getUsdBrlRate }] = await Promise.all([
      import('@/drizzle/db'),
      import('@/drizzle/schema'),
      import('@/lib/exchange-rate'),
    ])
    const rate = entry.cost_usd > 0 ? await getUsdBrlRate() : null
    await db.insert(aiRequestLogs).values({
      ...entry,
      usd_brl_rate: rate ?? undefined,
      cost_brl: rate != null ? entry.cost_usd * rate : undefined,
    })
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

  const buildBody = (withJsonMode: boolean, modelOverride?: string) =>
    JSON.stringify({
      model: modelOverride ?? options.model,
      messages: injectDateContext(options.messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1024,
      ...(options.top_p !== undefined ? { top_p: options.top_p } : {}),
      ...(withJsonMode ? { response_format: { type: 'json_object' } } : {}),
      ...(options.tools && options.tools.length > 0 ? { tools: options.tools } : {}),
      ...(options.tool_choice !== undefined ? { tool_choice: options.tool_choice } : {}),
    })

  const requestHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    'HTTP-Referer': getAppUrl(),
    'X-Title': process.env.NEXT_PUBLIC_BLOG_NAME ?? 'Blog',
  }

  /**
   * Faz uma única tentativa de fetch para o modelo indicado.
   * Retorna o Response sem consumir o corpo.
   */
  const doFetch = (withJsonMode: boolean, modelOverride?: string) =>
    fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: requestHeaders,
      body: buildBody(withJsonMode, modelOverride),
    })

  /**
   * Tenta um modelo uma vez, aplicando o fallback de jsonMode quando necessário:
   * se a requisição com response_format falhar com erro de formato (o modelo não
   * suporta jsonMode), reenvia uma única vez sem o parâmetro. Isso vale tanto para
   * o modelo solicitado quanto para os modelos de fallback gratuitos, garantindo
   * que um modelo que apenas não suporta response_format não derrube a cadeia.
   * Retorna o Response sem consumir o corpo (exceto o response descartado do
   * primeiro envio quando o fallback de formato é acionado).
   */
  const attemptModel = async (modelOverride?: string): Promise<Response> => {
    const res = await doFetch(options.jsonMode === true, modelOverride)
    if (res.ok || !options.jsonMode) return res
    if (!JSON_FORMAT_ERROR_STATUSES.has(res.status)) return res
    // Lê o corpo para distinguir erro de formato de outro 4xx.
    const errText = await res.text().catch(() => '')
    const isFormatRelated =
      errText.toLowerCase().includes('response_format') ||
      errText.toLowerCase().includes('json')
    if (!isFormatRelated) {
      // Não é erro de formato: recria um Response equivalente para que o
      // chamador ainda possa ler o corpo já consumido no tratamento de erro.
      return new Response(errText, { status: res.status, headers: res.headers })
    }
    // Erro de formato: reenvia sem jsonMode.
    return doFetch(false, modelOverride)
  }

  // -------------------------------------------------------------------------
  // Loop de retry com backoff exponencial + jitter para status transientes.
  // Limitado por MAX_ATTEMPTS e por um deadline de tempo total (RETRY_DEADLINE_MS)
  // para não acumular latência a ponto de estourar o maxDuration do cron.
  // -------------------------------------------------------------------------
  const deadline = startedAt + RETRY_DEADLINE_MS
  let response!: Response
  // Modelo que efetivamente produziu o response atual (para log correto).
  let servedModel = options.model

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    response = await attemptModel()
    servedModel = options.model

    if (response.ok) break

    // Se o status não é transiente, lança imediatamente (sem retry).
    if (!TRANSIENT_STATUSES.has(response.status)) break

    // Última tentativa — não dorme, apenas sai do loop para tratar o erro.
    if (attempt >= MAX_ATTEMPTS - 1) break

    // Calcula delay: respeita Retry-After se presente, senão backoff + jitter.
    const retryAfterMs = parseRetryAfter(response.headers)
    const baseDelay = BACKOFF_BASE_MS[attempt] ?? BACKOFF_CAP_MS
    const jitteredDelay = Math.min(
      retryAfterMs ?? Math.round(baseDelay * (0.5 + Math.random() * 0.5)),
      BACKOFF_CAP_MS
    )

    // Respeita o deadline: se o sleep ultrapassaria o orçamento, para por aqui.
    if (Date.now() + jitteredDelay > deadline) break

    // Consome o corpo para liberar a conexão antes de dormir.
    await response.text().catch(() => undefined)

    await abortableSleep(jitteredDelay, signal)
  }

  // -------------------------------------------------------------------------
  // Fallback de modelo: se esgotamos os retries com 429 e o modelo era FREE_MODEL,
  // tenta cada modelo gratuito alternativo (1 tentativa cada, com fallback de
  // jsonMode via attemptModel), respeitando o mesmo deadline de tempo total.
  // -------------------------------------------------------------------------
  if (!response.ok && response.status === 429 && options.model === FREE_MODEL) {
    for (const fallbackModel of FREE_FALLBACK_MODELS) {
      if (Date.now() >= deadline) break

      // Consome o corpo do response anterior antes de tentar o próximo.
      await response.text().catch(() => undefined)

      response = await attemptModel(fallbackModel)
      servedModel = fallbackModel

      if (response.ok) break

      // Se o fallback retornar erro não-transiente (ex.: modelo retirado/404),
      // pula para o próximo modelo da lista em vez de abortar a cadeia inteira.
    }
  }

  // -------------------------------------------------------------------------
  // Tratamento final: response ainda não ok → loga e lança.
  // -------------------------------------------------------------------------
  if (!response.ok) {
    const errorBody = await response.text()
    const duration_ms = Date.now() - startedAt
    void persistAiLog({
      feature: options.feature ?? 'unknown',
      model: servedModel,
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

  const duration_ms = Date.now() - startedAt

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
    model: servedModel,
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

/**
 * Retorna o modelo de texto resolvendo o agente Copywriter da pipeline.
 * Use este helper em qualquer ponto que antes usava getAIModelFromDB('content_generation').
 * Usa import dinâmico para evitar ciclo: lib/ai.ts ← lib/agent-configs.ts ← lib/agents/types.ts.
 */
export async function getTextModel(): Promise<string> {
  try {
    const { getAgentConfig } = await import('@/lib/agent-configs')
    const config = await getAgentConfig('copywriter')
    if (config.model) return config.model
  } catch {}
  return getDefaultModel('content_generation')
}

/**
 * Retorna o modelo de imagem resolvendo o agente Designer da pipeline.
 * Use este helper em qualquer ponto que antes usava getAIModelFromDB('image_generation').
 * Usa import dinâmico para evitar ciclo: lib/ai.ts ← lib/agent-configs.ts ← lib/agents/types.ts.
 */
export async function getImageModel(): Promise<string> {
  try {
    const { getAgentConfig } = await import('@/lib/agent-configs')
    const config = await getAgentConfig('designer')
    if (config.model) return config.model
  } catch {}
  return getDefaultModel('image_generation')
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
  // content_generation e image_generation delegam para o modelo do agente equivalente.
  // Outros recursos continuam usando getAIModelFromDB() normalmente.
  let model: string
  if (feature === 'content_generation') {
    model = await getTextModel()
  } else if (feature === 'image_generation') {
    model = await getImageModel()
  } else {
    model = await getAIModelFromDB(feature)
  }

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

  const resolvedModel = model ?? (await getImageModel())
  const modalities = isImageOnlyModel(resolvedModel) ? ['image'] : ['text', 'image']

  const maxAttempts = 3
  const signal = AbortSignal.timeout(180_000)
  let response!: Response
  let attemptStartedAt = Date.now()
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    attemptStartedAt = Date.now()
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

    if (
      (response.status === 408 ||
        response.status === 429 ||
        response.status === 502 ||
        response.status === 503) &&
      attempt < maxAttempts - 1
    ) {
      await response.text().catch(() => undefined)
      await new Promise((r) => setTimeout(r, 3000))
      continue
    }

    const errorBody = await response.text()
    void persistAiLog({
      feature: 'image_generation',
      model: resolvedModel,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      status: 'error',
      error: `HTTP ${response.status}`,
      duration_ms: Date.now() - attemptStartedAt,
    })
    throw new Error(`OpenRouter Image API error (${response.status}): ${errorBody}`)
  }

  if (!response.ok) {
    const errorBody = await response.text()
    void persistAiLog({
      feature: 'image_generation',
      model: resolvedModel,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      status: 'error',
      error: `HTTP ${response.status}`,
      duration_ms: Date.now() - attemptStartedAt,
    })
    throw new Error(`OpenRouter Image API error (${response.status}): ${errorBody}`)
  }

  const data = (await response.json()) as {
    choices: {
      message: {
        content?: string | Array<Record<string, unknown>>
        images?: Array<{ image_url?: { url: string }; url?: string }>
      }
    }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number }
  }

  const promptTokens = data.usage?.prompt_tokens ?? 0
  const completionTokens = data.usage?.completion_tokens ?? 0
  void persistAiLog({
    feature: 'image_generation',
    model: resolvedModel,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: data.usage?.total_tokens ?? (promptTokens + completionTokens),
    cost_usd: data.usage?.cost ?? 0,
    status: 'success',
    duration_ms: Date.now() - attemptStartedAt,
  })

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

/**
 * Chama o modelo com suporte a function-calling (tool-calling).
 * Retorna o conteúdo textual, os tool_calls solicitados e o uso de tokens.
 * Usa a chave de API e o modelo configurados no banco para a feature fornecida.
 */
export async function aiChatWithTools(
  feature: AIFeature,
  messages: OpenRouterMessage[],
  tools: ToolDefinition[],
  options?: {
    temperature?: number
    max_tokens?: number
    tool_choice?: OpenRouterOptions['tool_choice']
    signal?: AbortSignal
  }
): Promise<AiChatWithToolsResult> {
  const model = await getAIModelFromDB(feature)

  // tool_choice só faz sentido (e é aceito por vários provedores) quando há tools.
  // Sem tools (ex.: assistente com ferramentas desativadas), enviar tool_choice
  // sem o campo `tools` faz alguns provedores retornarem HTTP 400.
  const hasTools = tools.length > 0

  const response = await callOpenRouter({
    model,
    messages,
    tools,
    ...(hasTools ? { tool_choice: options?.tool_choice ?? 'auto' } : {}),
    temperature: options?.temperature,
    max_tokens: options?.max_tokens ?? 2048,
    feature,
    signal: options?.signal,
  })

  const choice = response.choices[0]
  return {
    content: choice?.message?.content ?? null,
    tool_calls: choice?.message?.tool_calls ?? [],
    usage: {
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    },
  }
}
