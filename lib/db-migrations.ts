// lib/db-migrations.ts
import fs from 'fs'
import path from 'path'
import { db } from '@/drizzle/db'
import { sql } from 'drizzle-orm'

interface JournalEntry {
  idx: number
  version: string
  when: number
  tag: string
  breakpoints: boolean
}

interface Journal {
  version: string
  dialect: string
  entries: JournalEntry[]
}

function getMigrationsDir(): string {
  // Tenta múltiplos caminhos para compatibilidade com dev local e Vercel (/var/task)
  const candidates = [
    path.join(process.cwd(), 'drizzle', 'migrations'),
    path.join(__dirname, '..', 'drizzle', 'migrations'),
    path.join(__dirname, '..', '..', 'drizzle', 'migrations'),
  ]
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'meta', '_journal.json'))) return dir
  }
  return path.join(process.cwd(), 'drizzle', 'migrations')
}

function readJournal(): string[] {
  try {
    const journalPath = path.join(getMigrationsDir(), 'meta', '_journal.json')
    const raw = fs.readFileSync(journalPath, 'utf-8')
    const journal: Journal = JSON.parse(raw)
    return journal.entries.map((e) => e.tag)
  } catch {
    return []
  }
}

async function getAppliedMigrations(): Promise<string[]> {
  try {
    const rows = await db.execute(
      sql`SELECT migration_name FROM drizzle_migrations ORDER BY created_at ASC`
    )
    return (rows as unknown as { migration_name: string }[]).map((r) => r.migration_name)
  } catch (err) {
    // 42P01 = undefined_table (banco em branco ou migrations ainda não rodaram)
    const pgCode = (err as { code?: string })?.code
    if (pgCode === '42P01') return []
    throw err
  }
}

async function isSiteSettingsAbsent(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1 FROM site_settings LIMIT 1`)
    return false
  } catch (err) {
    const pgCode = (err as { code?: string })?.code
    return pgCode === '42P01'
  }
}

export async function getDbPendingMigrations(): Promise<string[]> {
  const all = readJournal()

  // Se o journal não foi encontrado no bundle, ainda detecta banco vazio via site_settings
  if (all.length === 0) {
    const absent = await isSiteSettingsAbsent()
    // Banco em branco mas sem journal acessível — retorna marcador especial
    return absent ? ['__banco_sem_schema__'] : []
  }

  const applied = await getAppliedMigrations()
  const pending = all.filter((tag) => !applied.includes(tag))

  // Mesmo que drizzle_migrations não exista ainda, verifica se site_settings existe
  // (pode ter sido criado manualmente sem usar este migrator)
  if (pending.length === all.length) {
    const absent = await isSiteSettingsAbsent()
    if (!absent) return [] // banco tem tabelas, só não usou drizzle_migrations
  }

  return pending
}

export async function ensureMigrationsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drizzle_migrations (
      id serial PRIMARY KEY,
      migration_name text NOT NULL UNIQUE,
      created_at timestamp DEFAULT now() NOT NULL
    )
  `)
}

export async function applyMigration(tag: string): Promise<void> {
  // Tag especial quando journal não foi encontrado mas banco está vazio
  if (tag === '__banco_sem_schema__') {
    throw new Error('Arquivos de migration não encontrados no bundle. Rode npm run db:migrate localmente com a DATABASE_URL correta.')
  }

  const migrationsDir = getMigrationsDir()
  const sqlPath = path.join(migrationsDir, `${tag}.sql`)
  let raw: string
  try {
    raw = fs.readFileSync(sqlPath, 'utf-8')
  } catch {
    throw new Error(`Arquivo de migration não encontrado: ${tag}.sql`)
  }

  // Drizzle separa statements com --> statement-breakpoint
  const statements = raw
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean)

  await db.transaction(async (tx) => {
    for (const statement of statements) {
      await tx.execute(sql.raw(statement))
    }
    await tx.execute(
      sql`INSERT INTO drizzle_migrations (migration_name) VALUES (${tag})
          ON CONFLICT (migration_name) DO NOTHING`
    )
  })
}
