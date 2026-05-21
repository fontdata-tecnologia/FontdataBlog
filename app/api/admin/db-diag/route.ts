import { NextResponse } from 'next/server'
import postgres from 'postgres'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.DATABASE_URL
  if (!url) return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })

  const urlObj = new URL(url)
  const safeUrl = `${urlObj.protocol}//${urlObj.username}:***@${urlObj.host}${urlObj.pathname}`

  let client: ReturnType<typeof postgres> | null = null
  try {
    client = postgres(url, {
      ssl: { rejectUnauthorized: false },
      max: 1,
      prepare: false,
      connect_timeout: 10,
    })
    const result = await client`SELECT current_database() as db, version() as ver`
    return NextResponse.json({ ok: true, url: safeUrl, db: result[0].db, ver: result[0].ver })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      url: safeUrl,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  } finally {
    if (client) await client.end()
  }
}
