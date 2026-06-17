import type { NextRequest } from 'next/server'

/**
 * Autenticação dos endpoints de cron (/api/cron/*).
 *
 * Os jobs são disparados pelas Scheduled Tasks do Coolify via:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/<job>
 *
 * Durante a transição do Supabase, aceita também SUPABASE_SERVICE_ROLE_KEY como
 * fallback — remova essa variável após o cutover para usar apenas CRON_SECRET.
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return false

  const cronSecret = process.env.CRON_SECRET
  const legacyKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  return (!!cronSecret && token === cronSecret) || (!!legacyKey && token === legacyKey)
}
