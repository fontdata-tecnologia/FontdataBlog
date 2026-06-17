import { NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const SETTING_KEY = 'vercel_max_duration'
const VALID_VALUES = [300, 800, 900]

export async function GET() {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, SETTING_KEY))
  const value = rows[0]?.value ?? '300'
  return NextResponse.json({ value: parseInt(value) })
}

export async function PUT(request: Request) {
  const body = await request.json() as { value: unknown }
  const value = Number(body.value)

  if (!VALID_VALUES.includes(value)) {
    return NextResponse.json(
      { error: `Valor inválido. Use um dos seguintes: ${VALID_VALUES.join(', ')}` },
      { status: 400 }
    )
  }

  await db
    .insert(siteSettings)
    .values({ key: SETTING_KEY, value: String(value) })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: String(value) } })

  return NextResponse.json({ value })
}
