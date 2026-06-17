// app/api/admin/db-migrate/route.ts
import { getDbPendingMigrations, ensureMigrationsTable, applyMigration, invalidateCronStatusCache } from '@/lib/db-migrations'
import { ensureCrons } from '@/lib/supabase-cron'
import { getAppUrlFromRequest } from '@/lib/app-url'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type MigrateEvent =
  | { type: 'migration'; name: string; status: 'applying' | 'done' | 'skipped' }
  | { type: 'cron'; status: 'applying' | 'done'; detail?: string }
  | { type: 'cron-warning'; message: string }
  | { type: 'complete'; message: string }
  | { type: 'error'; name: string; message: string }

function makeEvent(event: MigrateEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export async function POST(req: Request) {
  const encoder = new TextEncoder()
  // URL pública derivada do próprio request — é por ela que o admin está acessando.
  // Não depende de NEXT_PUBLIC_APP_URL configurada (instalação nova pode não ter).
  const appUrl = getAppUrlFromRequest(req)

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const close = () => {
        if (!closed) { closed = true; controller.close() }
      }
      const send = (event: MigrateEvent) => {
        if (!closed) controller.enqueue(encoder.encode(makeEvent(event)))
      }

      try {
        const pending = await getDbPendingMigrations()

        // 1. Aplicar migrations de schema (se houver).
        if (pending.length > 0) {
          await ensureMigrationsTable()

          for (const tag of pending) {
            send({ type: 'migration', name: tag, status: 'applying' })
            try {
              await applyMigration(tag)
              send({ type: 'migration', name: tag, status: 'done' })
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err)
              send({ type: 'error', name: tag, message })
              close()
              return
            }
          }
        }

        // 2. Reconciliar crons (estrutura versionada): cria as faltantes,
        //    remove as que não devem existir. Sempre roda — mesmo sem migrations.
        send({ type: 'cron', status: 'applying' })
        const report = await ensureCrons({ appUrl: appUrl ?? undefined })
        invalidateCronStatusCache()

        if (!report.extensionsOk) {
          send({
            type: 'cron-warning',
            message:
              'Não foi possível habilitar pg_cron/pg_net automaticamente. ' +
              'Habilite em Supabase Dashboard → Database → Extensions e atualize novamente.',
          })
        }
        for (const e of report.errors) {
          send({ type: 'cron-warning', message: `Cron ${e.job}: ${e.message}` })
        }
        const detailParts: string[] = []
        if (report.scheduled.length) detailParts.push(`${report.scheduled.length} agendada(s)`)
        if (report.unscheduled.length) detailParts.push(`${report.unscheduled.length} removida(s)`)
        send({ type: 'cron', status: 'done', detail: detailParts.join(', ') || 'nenhuma alteração' })

        const message =
          pending.length > 0
            ? 'Banco atualizado com sucesso.'
            : 'Crons reconciliadas com sucesso.'
        send({ type: 'complete', message })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[db-migrate]', err)
        send({ type: 'error', name: '', message })
      } finally {
        close()
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
