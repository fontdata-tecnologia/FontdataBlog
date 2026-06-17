/**
 * lib/db-connection.ts
 *
 * Resolução dinâmica da DATABASE_URL.
 * A URL em site_settings (chave "database_url") tem prioridade sobre a variável de ambiente.
 * O bootstrap usa sempre a env var para conseguir ler site_settings.
 */

import postgres from 'postgres'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '@/drizzle/schema'

declare global {
  // eslint-disable-next-line no-var
  var __dbUrl: string | undefined
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined
  // eslint-disable-next-line no-var
  var __drizzleDb: PostgresJsDatabase<typeof schema> | undefined
}

/**
 * Modos de conexão ao Supabase Postgres.
 * - session: pooler porta 5432, 1 conexão por cliente (migrations, LISTEN/NOTIFY).
 *   Limite baixo de conexões — em serverless cada lambda mantém seu pool, então max:1.
 * - transaction: pooler porta 6543, muitas conexões curtas. Ideal serverless/Vercel,
 *   suporta mais conexões concorrentes — max maior. NÃO suporta prepared statements
 *   de sessão (por isso o driver já usa prepare:false em todo o projeto).
 * - direct: conexão direta porta 5432 (host db.*.supabase.co), sem pooler.
 */
export type DbMode = 'session' | 'transaction' | 'direct'

/** Porta de cada modo de pooler. */
const MODE_PORT: Record<DbMode, string> = {
  session: '5432',
  transaction: '6543',
  direct: '5432',
}

/**
 * Deduz o modo a partir da URL atual.
 * Porta 6543 → transaction. Host db.*.supabase.co (sem "pooler") → direct.
 * Caso contrário → session (default do session pooler na 5432).
 */
export function detectDbMode(url: string): DbMode {
  try {
    const parsed = new URL(url)
    if (parsed.port === '6543') return 'transaction'
    if (/^db\./.test(parsed.hostname) && !parsed.hostname.includes('pooler')) {
      return 'direct'
    }
    return 'session'
  } catch {
    return 'session'
  }
}

/**
 * Reescreve a porta da URL para o modo escolhido, preservando o resto
 * (usuário, senha, host, dbname, query string). Não altera o host — o
 * session e o transaction pooler do Supabase usam o mesmo host pooler,
 * mudando apenas a porta (5432 ↔ 6543).
 */
export function applyDbMode(url: string, mode: DbMode): string {
  const parsed = new URL(url)
  parsed.port = MODE_PORT[mode]
  return parsed.toString()
}

/**
 * Tamanho do pool por modo. O transaction pooler aguenta muitas conexões
 * concorrentes; o session pooler limita a ~15, então mantemos max:1 por lambda
 * para não estourar quando várias instâncias rodam em paralelo no Fluid Compute.
 */
export function poolMaxForMode(mode: DbMode): number {
  return mode === 'transaction' ? 10 : 1
}

/** Heurística simples para identificar URLs do Supabase (pooler ou direct). */
function isSupabaseUrl(url: string): boolean {
  return /supabase\.(co|com)/.test(url)
}

/**
 * Configuração de SSL via env `DB_SSL`:
 * - `disable`/`false`/`off` → sem SSL (rede privada típica de Postgres dedicado)
 * - `require`/`no-verify`   → SSL sem validar a CA (rejectUnauthorized:false)
 * - `verify`/`verify-full`  → SSL com validação completa da CA
 * Sem `DB_SSL`: URLs do Supabase mantêm o comportamento antigo (SSL sem verificar);
 * Postgres próprio em rede privada cai em "sem SSL" como padrão.
 */
export function getSslConfig(url: string): false | { rejectUnauthorized: boolean } {
  const mode = (process.env.DB_SSL ?? '').toLowerCase().trim()
  if (mode === 'disable' || mode === 'false' || mode === 'off') return false
  if (mode === 'require' || mode === 'no-verify') return { rejectUnauthorized: false }
  if (mode === 'verify' || mode === 'verify-full') return { rejectUnauthorized: true }
  // Padrão sem env: Supabase exige SSL; servidor próprio em rede privada não.
  return isSupabaseUrl(url) ? { rejectUnauthorized: false } : false
}

/**
 * Tamanho do pool. `DB_POOL_MAX` tem prioridade. No Coolify o app roda como um
 * processo Node único e longevo (não serverless), então um pool real (10) é
 * adequado. URLs do Supabase mantêm a heurística por modo de pooler.
 */
export function getPoolMax(url: string): number {
  const fromEnv = parseInt(process.env.DB_POOL_MAX ?? '', 10)
  if (!Number.isNaN(fromEnv) && fromEnv > 0) return fromEnv
  return isSupabaseUrl(url) ? poolMaxForMode(detectDbMode(url)) : 10
}

/** Opções do driver `postgres` compartilhadas por toda a aplicação. */
export function pgOptions(url: string) {
  return {
    ssl: getSslConfig(url),
    max: getPoolMax(url),
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 30,
    max_lifetime: 60 * 10,
  } as const
}

function makeClient(url: string): ReturnType<typeof postgres> {
  return postgres(url, pgOptions(url))
}

/**
 * Cria/retorna a instância de DB usando a URL fornecida.
 * Invalida o cache global se a URL mudar.
 */
export function buildDb(url: string): PostgresJsDatabase<typeof schema> {
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev && global.__drizzleDb && global.__dbUrl === url) {
    return global.__drizzleDb
  }

  // URL mudou ou ainda não existe — cria nova conexão
  const client = makeClient(url)
  const db = drizzle(client, { schema })

  if (isDev) {
    global.__dbUrl = url
    global.__pgClient = client
    global.__drizzleDb = db
  }

  return db
}

/**
 * Resolve a DATABASE_URL dinâmica:
 * 1. Usa a env var para bootstrapar uma conexão mínima
 * 2. Lê site_settings para verificar se há uma URL customizada
 * 3. Se houver, reconecta com essa URL
 *
 * Retorna { db, url } para uso no proxy global de drizzle/db.ts
 */
export async function resolveDatabaseUrl(): Promise<string> {
  const envUrl = process.env.DATABASE_URL
  if (!envUrl) throw new Error('DATABASE_URL não configurado')

  try {
    // Bootstrap com env var para ler site_settings
    const bootClient = makeClient(envUrl)
    const rows = await bootClient`
      SELECT value FROM site_settings WHERE key = 'database_url' LIMIT 1
    `
    await bootClient.end()

    if (rows.length > 0 && rows[0].value) {
      return rows[0].value as string
    }
  } catch {
    // Se falhar ao ler site_settings (banco vazio, tabela não existe), usa env var
  }

  return envUrl
}

/**
 * Mascarar URL do banco — exibe apenas host:porta/dbname, oculta senha.
 * Ex: postgresql://user:senha@host:5432/db → host:5432/db
 */
export function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    const port = parsed.port || '5432'
    const db = parsed.pathname.replace(/^\//, '')
    return `${host}:${port}/${db}`
  } catch {
    return '(URL inválida)'
  }
}
