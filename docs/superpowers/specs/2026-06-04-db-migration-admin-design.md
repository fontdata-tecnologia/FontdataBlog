# Design: Atualização de Schema do Banco via Painel Admin

**Data:** 2026-06-04  
**Status:** Aprovado

## Problema

Em novas instalações do ExpxBlog, o banco de dados não tem as tabelas criadas. O usuário precisa de acesso ao CLI para rodar `npm run db:migrate`. Como o app roda no Vercel, isso exige setup local — barreira alta para quem só tem acesso ao painel admin.

O sintoma concreto: ao tentar salvar a chave do OpenRouter em `/admin/configuracoes`, o sistema retorna 500 porque a tabela `site_settings` não existe.

## Solução

Sistema de detecção automática de versão + aplicação de migrations via UI, com log em tempo real.

---

## Arquitetura

### Peças novas

| Peça | Tipo | Responsabilidade |
|---|---|---|
| `GET /api/admin/db-status` | API route | Detectar migrations pendentes |
| `POST /api/admin/db-migrate` | API route (SSE) | Aplicar migrations com streaming de progresso |
| `components/blog/DbUpdateModal.tsx` | Client Component | Popup com lista de pendentes + log em tempo real |
| `app/admin/AdminLayoutClient.tsx` | Client Component | Wrapper do layout que renderiza o modal |

### Fluxo completo

```
Admin abre qualquer página
  → layout.tsx (Server Component) consulta db-status
  → se pending.length > 0 → passa prop para AdminLayoutClient
  → AdminLayoutClient renderiza DbUpdateModal automaticamente
  → usuário clica "Atualizar agora"
  → modal abre conexão SSE com /api/admin/db-migrate
  → eventos chegam linha a linha (migration por migration)
  → ao terminar: botão "Recarregar página"
```

---

## Endpoint: `GET /api/admin/db-status`

**Arquivo:** `app/api/admin/db-status/route.ts`

### Lógica

1. Lê `drizzle/migrations/meta/_journal.json` via `fs.readFileSync(path.join(process.cwd(), 'drizzle/migrations/meta/_journal.json'))`
2. Extrai lista de migration names do journal: `entries[].tag`
3. Consulta o banco:
   ```sql
   SELECT migration_name FROM drizzle_migrations ORDER BY created_at ASC
   ```
4. Se a tabela `drizzle_migrations` não existir, captura o erro e trata como `applied = []`
5. Calcula `pending = journal_entries.filter(e => !applied.includes(e))`

### Response

```typescript
{
  upToDate: boolean
  pending: string[]       // ex: ["0000_abandoned_frank_castle", "0001_rapid_zzzax"]
  applied: string[]
  latest: string          // última entrada do journal
  current: string | null  // última aplicada no banco (null se banco em branco)
}
```

### Comportamento de erro

- Se `_journal.json` não existir no bundle: retorna `{ upToDate: true }` (evita bloquear o admin)
- Se falhar a conexão com o banco: retorna 500 com `{ error: "Não foi possível verificar o banco" }`

---

## Endpoint: `POST /api/admin/db-migrate`

**Arquivo:** `app/api/admin/db-migrate/route.ts`

### Configuração

```typescript
export const dynamic = 'force-dynamic'
export const maxDuration = 300
```

### Lógica (SSE)

Responde com `Content-Type: text/event-stream`. Para cada migration pendente (mesma lista calculada pelo `db-status`):

1. Emite evento `applying`:
   ```
   data: {"type":"migration","name":"0001_rapid_zzzax.sql","status":"applying"}
   ```
2. Lê o arquivo `.sql` da migration: `drizzle/migrations/<name>.sql`
3. Divide por `-->` statement-breakpoint` e executa cada statement via `db.execute(sql`...`)`
4. Registra em `drizzle_migrations`:
   ```sql
   INSERT INTO drizzle_migrations (migration_name, created_at) VALUES ($1, now())
   ```
   (cria a tabela se não existir antes da primeira migration)
5. Emite evento `done`:
   ```
   data: {"type":"migration","name":"0001_rapid_zzzax.sql","status":"done"}
   ```

Ao finalizar todas:
```
data: {"type":"complete","message":"Todas as migrations aplicadas com sucesso."}
```

Em caso de erro em qualquer migration:
```
data: {"type":"error","name":"0001_rapid_zzzax.sql","message":"<erro>"}
```
Interrompe a execução (não aplica migrations subsequentes para evitar estado inconsistente).

### Idempotência

Antes de aplicar cada migration, verifica se já está em `drizzle_migrations`. Se estiver, emite `status: "skipped"` e avança.

---

## Componente: `DbUpdateModal`

**Arquivo:** `components/blog/DbUpdateModal.tsx`

### Props

```typescript
interface Props {
  pending: string[]   // lista de migration names
}
```

### Estados

- `idle` — lista de migrations pendentes + botão "Atualizar agora"
- `running` — área de log em tempo real, botão desabilitado
- `done` — log final + botão "Recarregar página" (`window.location.reload()`)
- `error` — última linha vermelha com mensagem + botão "Tentar novamente"

### Visual

- Overlay escuro cobrindo toda a tela (`fixed inset-0 bg-black/60 z-50`)
- Card centralizado, max-width `560px`
- Header: ícone de banco de dados (Feather style) + "Atualização necessária" em `brand-primary`
- Subtítulo: "O banco de dados está desatualizado. As seguintes migrations serão aplicadas:"
- Lista inicial: `pending.map(name => <li>{name}.sql</li>)`
- Área de log: `font-mono text-sm bg-neutral-900 text-green-400 p-4 rounded-lg h-48 overflow-y-auto`
  - Linha aplicando: `▸ Aplicando 0001_rapid_zzzax.sql...`
  - Linha concluída: `✓ 0001_rapid_zzzax.sql` (texto branco)
  - Linha erro: `✗ <mensagem>` (texto vermelho)
  - Linha final: `✓ Banco atualizado com sucesso!`
- Não tem botão de fechar — o modal só sai após reload ou se o banco já estiver atualizado

### Consumo SSE

```typescript
const es = new EventSource('/api/admin/db-migrate', { method: 'POST' })
// EventSource não suporta POST — usar fetch com ReadableStream
```

Usa `fetch` com `{ method: 'POST' }` e lê o body como `ReadableStream`, parseando eventos `data: {...}\n\n` manualmente.

---

## Integração no Layout Admin

**Arquivo atual:** `app/admin/layout.tsx` (Server Component)

### Mudança

`layout.tsx` permanece Server Component (tem Server Action inline no form de logout — não pode virar Client Component).

Adiciona chamada direta ao DB para checar status, **antes** do `return`:

```typescript
const pending = await getDbPendingMigrations()  // nova função em lib/db-migrations.ts
```

Injeta o `DbUpdateModal` diretamente no JSX existente, dentro do `AdminThemeProvider`, sem precisar de `AdminLayoutClient`:

```typescript
return (
  <AdminThemeProvider>
    <DbUpdateModal pending={pending} />  {/* novo — renderizado apenas se pending.length > 0 */}
    <div className="min-h-screen flex admin-shell">
      ...restante inalterado...
    </div>
  </AdminThemeProvider>
)
```

`DbUpdateModal` é um Client Component com `'use client'` — pode ser importado em Server Component normalmente. O `layout.tsx` não precisa de refatoração além dessa adição.

---

## Lib compartilhada: `lib/db-migrations.ts`

Centraliza a lógica usada tanto pelo layout quanto pelos endpoints:

```typescript
export async function getDbPendingMigrations(): Promise<string[]>
// Lê _journal.json, consulta drizzle_migrations, retorna pendentes

export async function applyMigration(name: string): Promise<void>
// Lê .sql, executa statements, registra em drizzle_migrations
```

---

## Segurança

- Ambos os endpoints estão sob `/api/admin/*` — protegidos pelo `middleware.ts` (JWT obrigatório)
- Nenhum usuário não-autenticado pode acionar migrations
- O endpoint não aceita parâmetros externos — a lista de migrations vem do filesystem do bundle, não do request

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `lib/db-migrations.ts` | Criar — lógica compartilhada de detecção e aplicação |
| `app/api/admin/db-status/route.ts` | Criar — endpoint GET |
| `app/api/admin/db-migrate/route.ts` | Criar — endpoint POST SSE |
| `components/blog/DbUpdateModal.tsx` | Criar — modal client |
| `app/admin/layout.tsx` | Modificar — adicionar detecção + injetar DbUpdateModal |

---

## Checklist de verificação pós-implementação

- [ ] Banco em branco: modal aparece ao abrir o admin
- [ ] Clicar "Atualizar agora": log aparece linha a linha
- [ ] Após conclusão: botão "Recarregar página" aparece
- [ ] Após reload: modal não aparece mais
- [ ] Banco já atualizado: modal não aparece
- [ ] Migration com erro: linha vermelha, execução para, botão "Tentar novamente"
- [ ] `npm run build` passa sem erros TypeScript
- [ ] `npm run lint` limpo
