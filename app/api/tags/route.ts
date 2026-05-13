import { NextResponse } from 'next/server'
import { db } from '@/drizzle/db'

export const dynamic = 'force-dynamic'
import { tags } from '@/drizzle/schema'
import { asc } from 'drizzle-orm'

export async function GET() {
  try {
    const all = await db.select().from(tags).orderBy(asc(tags.name))
    return NextResponse.json({ tags: all })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
