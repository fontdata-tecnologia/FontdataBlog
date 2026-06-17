import { NextResponse } from 'next/server'
import { runAutomationCycle } from '@/lib/automation'

export const maxDuration = 300

export async function POST() {
  try {
    const result = await runAutomationCycle(true, 'manual')
    const status = result.success ? 200 : result.skipped ? 200 : 500
    return NextResponse.json(result, { status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
