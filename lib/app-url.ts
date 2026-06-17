export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

/**
 * Deriva a URL pública a partir do próprio request — é a URL pela qual o usuário
 * está acessando o sistema (domínio custom incluso), sem depender de nenhuma env
 * var configurada manualmente. Usado para provisionar crons numa instalação nova,
 * onde NEXT_PUBLIC_APP_URL pode não existir.
 *
 * Ordem: header da requisição (X-Forwarded-Host/Proto ou Host) → env vars → null.
 * Não retorna localhost: uma cron do Supabase nunca conseguiria chamar localhost.
 */
export function getAppUrlFromRequest(req: Request): string | null {
  const proto =
    req.headers.get('x-forwarded-proto')?.split(',')[0].trim() || 'https'
  const host =
    req.headers.get('x-forwarded-host')?.split(',')[0].trim() ||
    req.headers.get('host')?.split(',')[0].trim() ||
    ''

  if (host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
    return `${proto}://${host}`.replace(/\/$/, '')
  }

  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`

  return null
}
