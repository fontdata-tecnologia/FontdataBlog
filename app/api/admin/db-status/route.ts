// app/api/admin/db-status/route.ts
import { NextResponse } from 'next/server'
import { getDbPendingMigrations, getDbCronStatus } from '@/lib/db-migrations'
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
    const cron = await getDbCronStatus()
    const latest = getLatestFromJournal()
    const current = pending.length === 0 ? latest : null

    const upToDate = pending.length === 0 && cron.missing.length === 0

    return NextResponse.json({
      upToDate,
      pending,
      latest,
      current,
      cronsMissing: cron.missing,
      cronAvailable: cron.cronAvailable,
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
