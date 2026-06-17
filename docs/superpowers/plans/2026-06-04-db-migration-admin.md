# DB Migration Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detectar automaticamente migrations pendentes ao abrir o admin e permitir aplicá-las via modal com log em tempo real, sem acesso ao CLI.

**Architecture:** Uma lib compartilhada (`lib/db-migrations.ts`) centraliza leitura do journal e aplicação de SQL. Dois endpoints admin expõem status (GET) e execução via SSE (POST). Um Client Component modal é injetado no layout Server Component existente e aparece automaticamente quando há pendências.

**Tech Stack:** Next.js 14 App Router · TypeScript · Drizzle ORM · `postgres` (raw SQL para `drizzle_migrations`) · ReadableStream SSE (mesmo padrão de `lib/agent-pipeline.ts`) · Tailwind CSS

---

## Estrutura de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `lib/db-migrations.ts` | Criar | Ler journal, consultar banco, aplicar SQL por migration |
| `app/api/admin/db-status/route.ts` | Criar | GET — retorna lista de pendentes |
| `app/api/admin/db-migrate/route.ts` | Criar | POST SSE — aplica migrations e faz streaming de progresso |
| `components/blog/DbUpdateModal.tsx` | Criar | Modal client com log em tempo real |
| `app/admin/layout.tsx` | Modificar | Chamar `getDbPendingMigrations()` e injetar `<DbUpdateModal>` |

---

## Task 1: `lib/db-migrations.ts` — lógica central

**Files:**
- Create: `lib/db-migrations.ts`

- [ ] **Step 1: Criar `lib/db-migrations.ts` com a função `getDbPendingMigrations`**

```typescript
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

function readJournal(): string[] {
  try {
    const journalPath = path.join(process.cwd(), 'drizzle', 'migrations', 'meta', '_journal.json')
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
    return (rows as { migration_name: string }[]).map((r) => r.migration_name)
  } catch {
    // tabela não existe — banco em branco
    return []
  }
}

export async function getDbPendingMigrations(): Promise<string[]> {
  const all = readJournal()
  if (all.length === 0) return []
  const applied = await getAppliedMigrations()
  return all.filter((tag) => !applied.includes(tag))
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
  const sqlPath = path.join(process.cwd(), 'drizzle', 'migrations', `${tag}.sql`)
  const raw = fs.readFileSync(sqlPath, 'utf-8')

  // Drizzle separa statements com --> statement-breakpoint
  const statements = raw
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean)

  for (const statement of statements) {
    await db.execute(sql.raw(statement))
  }

  await db.execute(
    sql`INSERT INTO drizzle_migrations (migration_name) VALUES (${tag})
        ON CONFLICT (migration_name) DO NOTHING`
  )
}
```

- [ ] **Step 2: Verificar que o TypeScript compila sem erros**

```bash
cd /Users/thuliobittencourt/Documents/Projetos/ExpxBlog && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros em `lib/db-migrations.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/db-migrations.ts
git commit -m "feat(db): adicionar lib/db-migrations.ts com detecção e aplicação de migrations"
```

---

## Task 2: `GET /api/admin/db-status`

**Files:**
- Create: `app/api/admin/db-status/route.ts`

- [ ] **Step 1: Criar o endpoint**

```typescript
// app/api/admin/db-status/route.ts
import { NextResponse } from 'next/server'
import { getDbPendingMigrations } from '@/lib/db-migrations'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

function getLatestFromJournal(): string | null {
  try {
    const journalPath = path.join(process.cwd(), 'drizzle', 'migrations', 'meta', '_journal.json')
    const raw = fs.readFileSync(journalPath, 'utf-8')
    const journal = JSON.parse(raw)
    const entries: { tag: string }[] = journal.entries ?? []
    return entries.length > 0 ? entries[entries.length - 1].tag : null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const pending = await getDbPendingMigrations()
    const latest = getLatestFromJournal()
    const current = pending.length === 0 ? latest : null

    return NextResponse.json({
      upToDate: pending.length === 0,
      pending,
      latest,
      current,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[db-status GET]', msg)
    return NextResponse.json(
      { error: 'Não foi possível verificar o banco' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/thuliobittencourt/Documents/Projetos/ExpxBlog && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem novos erros.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/db-status/route.ts
git commit -m "feat(api): adicionar GET /api/admin/db-status"
```

---

## Task 3: `POST /api/admin/db-migrate` (SSE)

**Files:**
- Create: `app/api/admin/db-migrate/route.ts`

- [ ] **Step 1: Criar o endpoint SSE**

```typescript
// app/api/admin/db-migrate/route.ts
import { getDbPendingMigrations, ensureMigrationsTable, applyMigration } from '@/lib/db-migrations'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type MigrateEvent =
  | { type: 'migration'; name: string; status: 'applying' | 'done' | 'skipped' }
  | { type: 'complete'; message: string }
  | { type: 'error'; name: string; message: string }

function makeEvent(event: MigrateEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export async function POST() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: MigrateEvent) => {
        controller.enqueue(encoder.encode(makeEvent(event)))
      }

      try {
        const pending = await getDbPendingMigrations()

        if (pending.length === 0) {
          send({ type: 'complete', message: 'Banco já está atualizado.' })
          controller.close()
          return
        }

        await ensureMigrationsTable()

        for (const tag of pending) {
          send({ type: 'migration', name: tag, status: 'applying' })
          try {
            await applyMigration(tag)
            send({ type: 'migration', name: tag, status: 'done' })
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            send({ type: 'error', name: tag, message })
            controller.close()
            return
          }
        }

        send({ type: 'complete', message: 'Todas as migrations aplicadas com sucesso.' })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        send({ type: 'error', name: '', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/thuliobittencourt/Documents/Projetos/ExpxBlog && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem novos erros.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/db-migrate/route.ts
git commit -m "feat(api): adicionar POST /api/admin/db-migrate com SSE"
```

---

## Task 4: `DbUpdateModal` — componente client

**Files:**
- Create: `components/blog/DbUpdateModal.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
// components/blog/DbUpdateModal.tsx
'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  pending: string[]
}

type MigrateEvent =
  | { type: 'migration'; name: string; status: 'applying' | 'done' | 'skipped' }
  | { type: 'complete'; message: string }
  | { type: 'error'; name: string; message: string }

type LogLine = {
  text: string
  color: 'green' | 'white' | 'red'
}

type ModalState = 'idle' | 'running' | 'done' | 'error'

export function DbUpdateModal({ pending }: Props) {
  const [state, setState] = useState<ModalState>('idle')
  const [logs, setLogs] = useState<LogLine[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  if (pending.length === 0) return null

  async function runMigrate() {
    setState('running')
    setLogs([])

    try {
      const res = await fetch('/api/admin/db-migrate', { method: 'POST' })
      if (!res.body) {
        setState('error')
        setLogs([{ text: 'Erro: resposta sem corpo.', color: 'red' }])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim()
          if (!line) continue
          try {
            const event: MigrateEvent = JSON.parse(line)

            if (event.type === 'migration') {
              if (event.status === 'applying') {
                setLogs((prev) => [
                  ...prev,
                  { text: `▸ Aplicando ${event.name}.sql...`, color: 'green' },
                ])
              } else if (event.status === 'done') {
                setLogs((prev) => [
                  ...prev,
                  { text: `✓ ${event.name}.sql`, color: 'white' },
                ])
              } else if (event.status === 'skipped') {
                setLogs((prev) => [
                  ...prev,
                  { text: `— ${event.name}.sql (já aplicado)`, color: 'white' },
                ])
              }
            } else if (event.type === 'complete') {
              setLogs((prev) => [
                ...prev,
                { text: `✓ ${event.message}`, color: 'white' },
              ])
              setState('done')
            } else if (event.type === 'error') {
              setLogs((prev) => [
                ...prev,
                { text: `✗ ${event.message}`, color: 'red' },
              ])
              setState('error')
            }
          } catch {}
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setLogs((prev) => [...prev, { text: `✗ ${message}`, color: 'red' }])
      setState('error')
    }
  }

  const colorClass: Record<LogLine['color'], string> = {
    green: 'text-green-400',
    white: 'text-gray-100',
    red: 'text-red-400',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900">Atualização necessária</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {state === 'idle'
                ? 'O banco de dados está desatualizado.'
                : state === 'running'
                ? 'Aplicando migrations...'
                : state === 'done'
                ? 'Banco atualizado com sucesso.'
                : 'Ocorreu um erro durante a atualização.'}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {state === 'idle' && (
            <>
              <p className="text-[13px] text-gray-600 mb-3">
                As seguintes migrations serão aplicadas:
              </p>
              <ul className="space-y-1 mb-5">
                {pending.map((name) => (
                  <li key={name} className="flex items-center gap-2 text-[13px] font-mono text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-secondary shrink-0" />
                    {name}.sql
                  </li>
                ))}
              </ul>
            </>
          )}

          {(state === 'running' || state === 'done' || state === 'error') && (
            <div
              ref={logRef}
              className="font-mono text-sm bg-neutral-900 rounded-lg p-4 h-48 overflow-y-auto space-y-0.5"
            >
              {logs.map((line, i) => (
                <p key={i} className={colorClass[line.color]}>
                  {line.text}
                </p>
              ))}
              {state === 'running' && (
                <p className="text-green-400 animate-pulse">_</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end">
          {state === 'idle' && (
            <button
              onClick={runMigrate}
              className="px-4 py-2 rounded-lg bg-brand-primary text-white text-[13px] font-medium hover:bg-brand-primary/90 transition-colors"
            >
              Atualizar agora
            </button>
          )}
          {state === 'running' && (
            <button
              disabled
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-400 text-[13px] font-medium cursor-not-allowed"
            >
              Atualizando...
            </button>
          )}
          {state === 'done' && (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-[13px] font-medium hover:bg-green-700 transition-colors"
            >
              Recarregar página
            </button>
          )}
          {state === 'error' && (
            <button
              onClick={() => { setState('idle'); setLogs([]) }}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 transition-colors"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/thuliobittencourt/Documents/Projetos/ExpxBlog && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem novos erros.

- [ ] **Step 3: Commit**

```bash
git add components/blog/DbUpdateModal.tsx
git commit -m "feat(ui): adicionar DbUpdateModal com log SSE em tempo real"
```

---

## Task 5: Integrar no `app/admin/layout.tsx`

**Files:**
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Adicionar import e chamada ao topo do layout**

No topo do arquivo, adicionar os imports:

```typescript
import { getDbPendingMigrations } from '@/lib/db-migrations'
import { DbUpdateModal } from '@/components/blog/DbUpdateModal'
```

- [ ] **Step 2: Chamar `getDbPendingMigrations` dentro da função `AdminLayout`**

Adicionar antes do `return`, logo após a linha `const initials = ...`:

```typescript
  const pendingMigrations = await getDbPendingMigrations()
```

> Nota: se `user` for null o layout retorna `<>{children}</>` antes de chegar aqui — não há risco de chamar o DB sem conexão válida nesse caso. A chamada fica após o guard `if (!user)`.

- [ ] **Step 3: Injetar `<DbUpdateModal>` no JSX dentro do `AdminThemeProvider`**

O `return` atual começa com:
```typescript
    <AdminThemeProvider>
      <div className="min-h-screen flex admin-shell">
```

Alterar para:
```typescript
    <AdminThemeProvider>
      <DbUpdateModal pending={pendingMigrations} />
      <div className="min-h-screen flex admin-shell">
```

- [ ] **Step 4: Verificar TypeScript e lint**

```bash
cd /Users/thuliobittencourt/Documents/Projetos/ExpxBlog && npx tsc --noEmit 2>&1 | head -30 && npm run lint 2>&1 | tail -20
```

Esperado: sem erros.

- [ ] **Step 5: Build de produção**

```bash
cd /Users/thuliobittencourt/Documents/Projetos/ExpxBlog && npm run build 2>&1 | tail -30
```

Esperado: build passa sem erros.

- [ ] **Step 6: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(admin): detectar migrations pendentes e exibir DbUpdateModal no layout"
```

---

## Task 6: Push e verificação final

- [ ] **Step 1: Push para produção**

```bash
git push origin master
```

- [ ] **Step 2: Checklist de verificação**

- [ ] Banco em branco: modal aparece ao abrir qualquer página do admin
- [ ] Lista de migrations pendentes é exibida corretamente
- [ ] Clicar "Atualizar agora": log aparece linha a linha em tempo real
- [ ] Após conclusão: `✓ Todas as migrations aplicadas com sucesso.` + botão "Recarregar página"
- [ ] Após reload: modal não aparece mais
- [ ] Banco já atualizado: modal não aparece (componente retorna `null`)
- [ ] Migration com erro: linha vermelha, execução para, botão "Tentar novamente" aparece
- [ ] `npm run build` passa sem erros TypeScript
- [ ] `npm run lint` limpo
