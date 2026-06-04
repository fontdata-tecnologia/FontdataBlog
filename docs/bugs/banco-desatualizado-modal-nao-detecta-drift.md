# Bug: Banco de instalação nova fica desatualizado sem o modal detectar

**Data**: 2026-06-04
**Severidade**: ALTO
**Status**: RESOLVIDO

## Descrição do problema

Num projeto recém-instalado (via `/setup`) e depois "atualizado" pelo modal de
atualização de banco, salvar a configuração de um agente em `/admin/artigos`
(`PUT /api/admin/agents/configs`) retornava **500 Internal Server Error**. A causa
imediata: a tabela `agent_configs` não existia. A causa estrutural: o mecanismo de
detecção de atualização do banco dava **falso-negativo** e nunca exibia o modal
nem aplicava as tabelas faltantes.

## Causa-raiz

Cadeia de defeitos com fonte única — três mecanismos que deveriam estar
sincronizados com `drizzle/schema.ts` divergiram dela:

**Defeito 1 — detecção por presença de tabela de tracking, não por schema real**
**Arquivo**: `lib/db-migrations.ts` · **Tipo**: lógica/DB
`getDbPendingMigrations()` tinha um atalho: se `drizzle_migrations` não existia mas
`site_settings` existia, assumia "instalado pelo setup, nada a migrar" e retornava
`[]`. Quem instalou via `/setup` tem `site_settings` mas não `drizzle_migrations`,
então o modal nunca aparecia — mesmo faltando 7 tabelas.

**Defeito 2 — `applyMigration` não era idempotente**
**Arquivo**: `lib/db-migrations.ts` · **Tipo**: DB
As migrations usavam `CREATE TABLE "x"` e `ADD COLUMN` sem `IF NOT EXISTS`.
Reaplicar sobre um banco parcialmente populado (instalado pelo setup) quebrava com
"already exists".

**Defeito 3 — `ai_request_logs` nunca era criada**
**Arquivo**: `lib/migrations-embedded.ts` · **Tipo**: DB
A migration `0001` fazia `ALTER TABLE "ai_request_logs" ADD COLUMN` numa tabela que
nenhum `CREATE TABLE` jamais criou.

**Defeito 4 — `drizzle/setup-sql.ts` desatualizado**
O `SETUP_SQL` criava 12 tabelas e omitia 7 do schema: `agent_configs`,
`rss_feeds`, `rss_processed_items`, `automation_logs`, `source_crawlers`,
`source_crawler_items`, `ai_request_logs`.

## Solução aplicada

Detecção por **drift real de schema** + aplicação **idempotente**, de forma que o
modal apareça sozinho e o usuário conserte o banco 100% pela UI (sem tocar em banco
ou Vercel).

**Arquivos modificados**:
- `lib/db-migrations.ts` — removido o atalho falso-negativo; `getDbPendingMigrations()`
  agora consulta `information_schema.tables` (constante `EXPECTED_TABLES`, 19 tabelas)
  e retorna pendência se faltar qualquer tabela esperada. `applyMigration()` tornou-se
  idempotente (`makeIdempotent()` injeta `IF NOT EXISTS` em CREATE TABLE/INDEX/ADD COLUMN
  via regex com lookahead negativo; execução statement-a-statement ignorando os códigos
  `42P07`/`42710`/`42701` de "already exists"). Flag de processo `schemaComplete`
  curto-circuita reconsultas quando o banco está completo (nunca cacheia estado pendente
  nem caminho de erro).
- `lib/migrations-embedded.ts` — migration `0001` agora cria `ai_request_logs`
  (`CREATE TABLE IF NOT EXISTS` + 4 índices) antes dos `ADD COLUMN IF NOT EXISTS`.
- `drizzle/migrations/0001_rapid_zzzax.sql` — sincronizado com o embedded (paridade).
- `drizzle/setup-sql.ts` — adicionadas as 7 tabelas faltantes com `IF NOT EXISTS`,
  FKs e índices.

## Como reproduzir (antes da correção)

1. Instalar o projeto via `/setup` (roda só `SETUP_SQL`, sem migrations).
2. Entrar em `/admin/artigos` e salvar a configuração de um agente.
3. Esperado: `{ ok: true }`. Real: 500 (`relation "agent_configs" does not exist`),
   e o modal de atualização nunca apareceu para corrigir.

## Como verificar (após a correção)

- [x] `getDbPendingMigrations` detecta tabela faltante mesmo com `site_settings` presente
- [x] Modal aparece automaticamente em banco incompleto
- [x] "Atualizar agora" cria as 7 tabelas sem erro de "already exists"
- [x] `ai_request_logs` é criada antes do `ADD COLUMN`
- [x] `setup-sql.ts` ⟺ `migrations-embedded.ts` ⟺ `schema.ts` sem drift
- [x] `npm run build` passa
- [x] `npm run lint` limpo (só aviso pré-existente em `ArtigosClient.tsx`)

## Lições aprendidas

**Em produção (Vercel) o banco NÃO é atualizado por `npm run db:migrate`.** O deploy
não roda migrations. Quem aplica o schema é:
- `drizzle/setup-sql.ts` (`SETUP_SQL`) na instalação inicial, e
- `lib/migrations-embedded.ts` + `lib/db-migrations.ts` via o modal `DbUpdateModal`
  (renderizado em `app/admin/layout.tsx`) nas atualizações.

Portanto **toda mudança em `drizzle/schema.ts` precisa ser propagada manualmente para
esses dois mecanismos** — `db:generate` sozinho não basta. Se isso for esquecido, o
código de produção espera tabelas/colunas que o banco do usuário não tem, e o erro só
aparece em runtime. A regra de paridade `schema.ts` ⟺ `setup-sql.ts` ⟺
`migrations-embedded.ts` agora está documentada no agente `db-engineer` e nos slashes
`/implementar`, `/corrigir-bug` e `/deploy`. Migrations devem ser **idempotentes** para
poderem rodar sobre bancos em qualquer estado de drift.
