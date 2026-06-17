import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const STORAGE_BUCKET = 'uploads'

/** MIME types aceitos pelo bucket `uploads`. */
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

/**
 * Normaliza o rótulo MIME de uma imagem para um valor aceito pelo bucket.
 * Modelos de IA frequentemente retornam `image/jpg` (rótulo inválido segundo o
 * IANA) — o Storage rejeita com 415, então mapeamos para `image/jpeg`.
 * Qualquer MIME fora do allowlist cai em `image/png` como padrão seguro.
 */
export function normalizeImageMime(contentType: string | null | undefined): string {
  const mime = (contentType ?? '').toLowerCase().split(';')[0].trim()
  if (mime === 'image/jpg') return 'image/jpeg'
  if (ALLOWED_IMAGE_MIMES.includes(mime)) return mime
  return 'image/png'
}

let _supabaseAdmin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _supabaseAdmin
}

/** @deprecated Use getSupabaseAdmin() instead to avoid build-time errors */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseAdmin()[prop as keyof SupabaseClient]
  },
})
