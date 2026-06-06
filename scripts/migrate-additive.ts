import 'dotenv/config'
import postgres from 'postgres'

/**
 * Migração ADITIVA: cria apenas as tabelas/índices novos do projeto atual que
 * ainda não existem no banco herdado do projeto antigo. Usa IF NOT EXISTS em
 * tudo, portanto NÃO altera nem apaga dados existentes.
 */

const DDL = `
-- ── RSS FEEDS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "rss_feeds" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "type" text NOT NULL DEFAULT 'blog',
  "enabled" boolean NOT NULL DEFAULT true,
  "publish_status" text NOT NULL DEFAULT 'draft',
  "check_interval_minutes" integer NOT NULL DEFAULT 60,
  "last_checked_at" timestamp,
  "last_error" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "rss_processed_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "feed_id" integer NOT NULL REFERENCES "rss_feeds"("id") ON DELETE CASCADE,
  "item_guid" text NOT NULL,
  "item_url" text,
  "item_title" text,
  "post_id" integer REFERENCES "posts"("id") ON DELETE SET NULL,
  "status" text NOT NULL DEFAULT 'queued',
  "error" text,
  "processed_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "rss_processed_items_feed_guid_idx" ON "rss_processed_items" ("feed_id", "item_guid");

-- ── AUTOMATION LOGS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "automation_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "triggered_by" text NOT NULL DEFAULT 'schedule',
  "status" text NOT NULL DEFAULT 'running',
  "message" text,
  "post_id" integer REFERENCES "posts"("id") ON DELETE SET NULL,
  "error" text,
  "duration_ms" integer,
  "started_at" timestamp NOT NULL DEFAULT now(),
  "finished_at" timestamp
);
CREATE INDEX IF NOT EXISTS "automation_logs_started_at_idx" ON "automation_logs" ("started_at");
CREATE INDEX IF NOT EXISTS "automation_logs_status_idx" ON "automation_logs" ("status");

-- ── SOURCE CRAWLERS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "source_crawlers" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL DEFAULT 'custom',
  "url" text NOT NULL,
  "prompt" text NOT NULL DEFAULT '',
  "interval_hours" real NOT NULL DEFAULT 24,
  "enabled" boolean NOT NULL DEFAULT true,
  "publish_status" text NOT NULL DEFAULT 'published',
  "last_run_at" timestamp,
  "next_run_at" timestamp,
  "last_error" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "source_crawler_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "crawler_id" integer NOT NULL REFERENCES "source_crawlers"("id") ON DELETE CASCADE,
  "item_key" text NOT NULL,
  "item_title" text,
  "post_id" integer REFERENCES "posts"("id") ON DELETE SET NULL,
  "status" text NOT NULL DEFAULT 'done',
  "error" text,
  "processed_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "source_crawler_items_crawler_item_uniq" ON "source_crawler_items" ("crawler_id", "item_key");

-- ── AI REQUEST LOGS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ai_request_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "feature" text NOT NULL,
  "model" text NOT NULL,
  "prompt_tokens" integer NOT NULL DEFAULT 0,
  "completion_tokens" integer NOT NULL DEFAULT 0,
  "total_tokens" integer NOT NULL DEFAULT 0,
  "cost_usd" real NOT NULL DEFAULT 0,
  "cost_brl" real,
  "usd_brl_rate" real,
  "status" text NOT NULL DEFAULT 'success',
  "error" text,
  "duration_ms" integer,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ai_request_logs_created_at_idx" ON "ai_request_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "ai_request_logs_feature_idx" ON "ai_request_logs" ("feature");
CREATE INDEX IF NOT EXISTS "ai_request_logs_model_idx" ON "ai_request_logs" ("model");
CREATE INDEX IF NOT EXISTS "ai_request_logs_status_idx" ON "ai_request_logs" ("status");
`

async function listTables(sql: postgres.Sql) {
  const rows = await sql<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `
  return rows.map((r) => r.tablename)
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, {
    ssl: { rejectUnauthorized: false },
    max: 1,
    prepare: false,
    connect_timeout: 15,
  })
  try {
    const before = await listTables(sql)
    console.log('\n📋 Tabelas ANTES (' + before.length + '):')
    console.log('   ' + before.join(', '))

    console.log('\n⚙️  Aplicando DDL aditivo (CREATE ... IF NOT EXISTS)...')
    await sql.unsafe(DDL)

    const after = await listTables(sql)
    const created = after.filter((t) => !before.includes(t))
    console.log('\n✅ Tabelas DEPOIS (' + after.length + '):')
    console.log('   ' + after.join(', '))
    console.log('\n🆕 Criadas nesta execução (' + created.length + '): ' + (created.join(', ') || '(nenhuma — já existiam)'))
    console.log('\n✔  Migração aditiva concluída. Nenhum dado existente foi alterado.\n')
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((err) => {
  console.error('\n❌ Erro na migração:', err)
  process.exit(1)
})
