# Bug: Bucket de Storage `uploads` não é criado em instalações novas

**Data**: 2026-06-04
**Severidade**: ALTO
**Status**: RESOLVIDO

## Descrição do problema
Em instalações novas, a geração da capa do artigo (e qualquer upload de imagem) falhava com:

```
[designer] Imagem falhou (continuando): Upload falhou: Bucket not found
```

O usuário corretamente suspeitou que o problema estava no setup do banco: o bucket de Storage deveria ser provisionado automaticamente quando o sistema aplica as "questões de banco de dados", mas isso nunca acontecia.

## Causa-raiz
**Arquivo**: `app/api/setup/install/route.ts:36` (instalação nova via `SETUP_SQL`) + `lib/db-migrations.ts` / `app/api/admin/db-migrate/route.ts` (DbUpdateModal via `EMBEDDED_MIGRATIONS`)
**Linha**: `install/route.ts:36`, `db-migrations.ts:242`
**Tipo**: DB / provisionamento incompleto

O fluxo de setup do banco executava **apenas DDL de tabelas** (`SETUP_SQL` na instalação; `EMBEDDED_MIGRATIONS` no DbUpdateModal). Nenhum dos dois criava o bucket de Supabase Storage `uploads` em `storage.buckets`, nem a política de leitura pública em `storage.objects`. O bucket existia apenas no projeto de desenvolvimento (`poksrzponrqcfamcjbua`) porque havia sido criado **manualmente** em 2026-05-21. Em qualquer Supabase novo o bucket simplesmente não existia, e tanto o Designer (`lib/agents/designer.ts:121`) quanto o upload manual do admin (`app/api/admin/upload/route.ts:37`) e o Telegram (`lib/telegram.ts:211`) batiam em "Bucket not found".

## Solução aplicada
Provisionamento idempotente e **tolerante a falha** do bucket `uploads` + política de leitura pública, adicionado nos dois mecanismos de setup do banco (paridade obrigatória do projeto):

- **Instalações novas**: bloco anexado ao `SETUP_SQL` em `drizzle/setup-sql.ts`.
- **Instalações existentes**: nova migration `0006_provision_storage_bucket` em `lib/migrations-embedded.ts` (`EMBEDDED_MIGRATIONS` + `MIGRATION_ORDER`), detectada e aplicada pelo DbUpdateModal.

O SQL é um único bloco `DO $$ ... EXCEPTION ... $$`:
- `INSERT INTO storage.buckets ... ON CONFLICT (id) DO UPDATE` — idempotente.
- `DROP POLICY IF EXISTS` (de ambas as policies, incluindo a antiga "Service role upload") + `CREATE POLICY "Public read uploads"` (SELECT, `bucket_id = 'uploads'`).
- `EXCEPTION WHEN insufficient_privilege / others THEN RAISE NOTICE` — se algum projeto atípico recusar o privilégio, o bloco emite NOTICE e **nunca** aborta a instalação nem trava o loop de migrations.

A política de INSERT ("Service role upload" `TO public`) foi **removida** por least-privilege: todos os uploads usam `SUPABASE_SERVICE_ROLE_KEY`, que faz bypass de RLS — a policy era inócua para o caminho real e ampliava a superfície indevidamente.

**Arquivos modificados**:
- `drizzle/setup-sql.ts` — bloco `DO` de provisionamento do bucket anexado ao `SETUP_SQL`.
- `lib/migrations-embedded.ts` — migration `0006_provision_storage_bucket` + tag no `MIGRATION_ORDER`.
- `app/api/admin/chat/message/route.ts` — correção colateral de build: `extractJson` pode retornar `null`, troca para optional chaining (`parsed?.`). Erro pré-existente que bloqueava o build.

## Verificação empírica (Supabase real, role `postgres`)
Testado de forma não-destrutiva (transação com rollback forçado) no projeto dev:
- `INSERT INTO storage.buckets ... ON CONFLICT` → **OK** como `postgres`.
- `CREATE POLICY ON storage.objects` → **OK** como `postgres` (role tem `bypassrls=true` e privilégio sobre o schema `storage`, mesmo não sendo membro de `supabase_storage_admin`).
- O bloco `DO` completo da migration rodou limpo, sem propagar exceção.

## Como reproduzir (antes da correção)
1. Instalar o sistema num Supabase novo (via `/setup`).
2. Gerar um artigo com capa (Designer) ou fazer upload manual de imagem no admin.
3. Esperado: imagem salva. Real: `Upload falhou: Bucket not found`.

## Como verificar (após a correção)
- [x] `npm run build` passa
- [x] `npm run lint` limpo
- [x] DO block validado empiricamente no Supabase como role `postgres`
- [ ] Após deploy: admin vê o **modal de atualização de banco** (DbUpdateModal) e ao aplicar, a migration `0006` cria o bucket
- [ ] Designer gera capa sem "Bucket not found"
- [ ] Upload manual no admin funciona
- [ ] Imagem aparece publicamente (policy de leitura pública ativa)

## Lições aprendidas
- **Storage não é schema do app**: buckets vivem em `storage.buckets` e não são detectados por `EXPECTED_TABLES`/`getMissingTables`. O provisionamento de Storage precisa ser uma migration explícita, com paridade `setup-sql.ts` ⟺ `migrations-embedded.ts`.
- **`CREATE POLICY` não suporta `IF NOT EXISTS`**: use `DROP POLICY IF EXISTS` + `CREATE POLICY`, ou bloco `DO/EXCEPTION`.
- **Tolerância a falha em recursos secundários**: provisionamento de infra (storage) num statement único de setup deve ser envolvido em `DO/EXCEPTION` para nunca abortar a criação das tabelas/admin.
- **Recurso criado à mão no dev mascara o gap**: o bucket funcionava no projeto dev por ter sido criado manualmente — o que escondia que o setup automatizado nunca o criava.
