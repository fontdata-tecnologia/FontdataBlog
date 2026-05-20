import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: ReturnType<typeof postgres> | undefined
}

const client =
  global._pgClient ??
  postgres(process.env.DATABASE_URL!, {
    ssl: { rejectUnauthorized: false },
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 30,
    max_lifetime: 60 * 10,
  })

if (process.env.NODE_ENV !== 'production') {
  global._pgClient = client
}

export { client }
export const db = drizzle(client, { schema })
