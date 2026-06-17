import 'dotenv/config'
import { db } from '../drizzle/db'
import { posts, siteSettings } from '../drizzle/schema'
import { isNotNull, eq } from 'drizzle-orm'
import { uploadObject } from '../lib/storage'

/**
 * Migração de imagens: Supabase Storage → Google Cloud Storage.
 *
 * Estratégia (sem depender do SDK do Supabase): varre as URLs de imagem já
 * gravadas no banco (`posts.cover_image`, `<img src>` em `posts.content` e a
 * logo em `site_settings`), baixa cada objeto pela URL pública do Supabase,
 * reenvia ao GCS via `uploadObject()` e reescreve as URLs no banco.
 *
 * Idempotente: URLs que já apontam para o GCS são ignoradas.
 *
 * Pré-requisitos de ambiente: GCS_BUCKET (+ credenciais GCS) e DATABASE_URL
 * apontando para o banco que contém os registros a migrar.
 */

// Captura URLs de objetos do Supabase Storage (bucket público `uploads`).
const SUPABASE_STORAGE_RE =
  /https?:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/uploads\/([^\s"'<>)]+)/gi

function mimeFromExt(filename: string): string {
  const ext = (filename.split('.').pop() ?? '').toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'svg') return 'image/svg+xml'
  return 'image/gif'
}

const urlMap = new Map<string, string>()

/** Baixa do Supabase e reenvia ao GCS uma vez por URL; retorna a nova URL. */
async function migrateUrl(oldUrl: string, objectPath: string): Promise<string | null> {
  if (urlMap.has(oldUrl)) return urlMap.get(oldUrl)!

  const res = await fetch(oldUrl)
  if (!res.ok) {
    console.error(`✗ Falha ao baixar ${oldUrl}: HTTP ${res.status}`)
    return null
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type')?.split(';')[0].trim() || mimeFromExt(objectPath)
  const newUrl = await uploadObject(objectPath, buffer, contentType)
  urlMap.set(oldUrl, newUrl)
  console.log(`✔ ${objectPath}\n  ${oldUrl}\n  → ${newUrl}`)
  return newUrl
}

/** Substitui todas as URLs Supabase de um texto pelas novas URLs do GCS. */
async function rewriteText(text: string): Promise<string> {
  const matches = Array.from(text.matchAll(SUPABASE_STORAGE_RE))
  let result = text
  for (const m of matches) {
    const oldUrl = m[0]
    const objectPath = decodeURIComponent(m[1])
    const newUrl = await migrateUrl(oldUrl, objectPath)
    if (newUrl) result = result.split(oldUrl).join(newUrl)
  }
  return result
}

async function main() {
  if (!process.env.GCS_BUCKET) throw new Error('GCS_BUCKET não configurado')

  // 1. Posts: cover_image + content
  const allPosts = await db
    .select({ id: posts.id, cover_image: posts.cover_image, content: posts.content })
    .from(posts)

  let postsUpdated = 0
  for (const post of allPosts) {
    const newCover = post.cover_image ? await rewriteText(post.cover_image) : post.cover_image
    const newContent = post.content ? await rewriteText(post.content) : post.content

    if (newCover !== post.cover_image || newContent !== post.content) {
      await db
        .update(posts)
        .set({ cover_image: newCover, content: newContent ?? '' })
        .where(eq(posts.id, post.id))
      postsUpdated++
    }
  }
  console.log(`\n${postsUpdated} post(s) atualizado(s).`)

  // 2. site_settings: valores que contenham URLs do Supabase Storage (ex.: logo)
  const settings = await db
    .select({ key: siteSettings.key, value: siteSettings.value })
    .from(siteSettings)
    .where(isNotNull(siteSettings.value))

  let settingsUpdated = 0
  for (const s of settings) {
    if (!s.value || !s.value.includes('.supabase.co/storage/')) continue
    const newValue = await rewriteText(s.value)
    if (newValue !== s.value) {
      await db.update(siteSettings).set({ value: newValue }).where(eq(siteSettings.key, s.key))
      settingsUpdated++
    }
  }
  console.log(`${settingsUpdated} configuração(ões) atualizada(s).`)

  console.log(`\nMigração concluída! ${urlMap.size} imagem(ns) migrada(s) para o GCS.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
