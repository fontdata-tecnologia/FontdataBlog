import postgres from 'postgres'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import { pgOptions } from '@/lib/db-connection'

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: ReturnType<typeof postgres> | undefined
  // eslint-disable-next-line no-var
  var _drizzleDb: PostgresJsDatabase<typeof schema> | undefined
  // eslint-disable-next-line no-var
  var _resolvedDbUrl: string | undefined
}

function makeClient(url: string): ReturnType<typeof postgres> {
  // Opções (SSL, tamanho do pool) centralizadas em lib/db-connection.ts:
  // - DB_SSL controla o SSL (Postgres próprio em rede privada normalmente sem SSL).
  // - DB_POOL_MAX controla o pool; no Coolify o app é um processo Node único e
  //   longevo, então usa um pool real (10) em vez do max:1 do antigo serverless.
  // URLs do Supabase mantêm a heurística por modo de pooler para compatibilidade.
  return postgres(url, pgOptions(url))
}

/**
 * Reconecta o DB com uma nova URL. Chamado após salvar database_url em site_settings.
 * Invalida o cache global para que a próxima query use a nova conexão.
 */
export function reconnectDb(url: string): void {
  global._resolvedDbUrl = url
  global._pgClient = makeClient(url)
  global._drizzleDb = drizzle(global._pgClient, { schema })
}

function getDb(): PostgresJsDatabase<typeof schema> {
  if (global._drizzleDb) return global._drizzleDb

  const url = process.env.DATABASE_URL!

  const client = global._pgClient ?? makeClient(url)

  // Mantém o cliente/instância em global SEMPRE (inclusive produção).
  // No Fluid Compute as instâncias de lambda são reutilizadas entre requests,
  // então reaproveitar o pool evita abrir conexões novas a cada invocação e
  // estourar o limite de 15 conexões do session pooler do Supabase.
  global._pgClient = client
  global._resolvedDbUrl = url

  const instance = drizzle(client, { schema })
  global._drizzleDb = instance

  return instance
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return getDb()[prop as keyof PostgresJsDatabase<typeof schema>]
  },
})

// O target precisa ser uma função para o trap `apply` existir: o client do
// postgres-js é ele próprio uma função (tagged template `` client`...` ``),
// então o Proxy encaminha tanto acesso a propriedade (.unsafe, .end) quanto
// a invocação direta para o client real.
export const client = new Proxy((() => {}) as unknown as ReturnType<typeof postgres>, {
  get(_target, prop) {
    // ensure getDb() has been called so global._pgClient is set
    getDb()
    return global._pgClient![prop as keyof ReturnType<typeof postgres>]
  },
  apply(_target, _thisArg, args) {
    getDb()
    return (global._pgClient as unknown as (...a: unknown[]) => unknown)(...args)
  },
})
