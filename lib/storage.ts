import { Storage } from '@google-cloud/storage'

/**
 * Armazenamento de objetos (uploads de imagem) no Google Cloud Storage.
 *
 * Substitui o antigo Supabase Storage. A API pública aqui é mínima e estável:
 * - `uploadObject(filename, body, contentType)` → URL pública
 * - `getPublicUrl(filename)`                    → URL pública
 * - `normalizeImageMime(contentType)`           → MIME saneado
 *
 * Variáveis de ambiente:
 * - `GCS_BUCKET`            — nome do bucket (obrigatório)
 * - `GCS_PROJECT_ID`        — id do projeto GCP (opcional; inferido das credenciais)
 * - `GCS_CREDENTIALS_JSON`  — conteúdo JSON da service account (recomendado no Coolify)
 * - `GOOGLE_APPLICATION_CREDENTIALS` — alternativamente, caminho do arquivo JSON
 *
 * Os objetos são lidos publicamente pela leitura pública do bucket
 * (allUsers → Storage Object Viewer), configurada na infraestrutura.
 */

/** MIME types aceitos para imagens. */
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

/**
 * Normaliza o rótulo MIME de uma imagem para um valor aceito.
 * Modelos de IA frequentemente retornam `image/jpg` (rótulo inválido segundo o
 * IANA) — mapeamos para `image/jpeg`. Qualquer MIME fora do allowlist cai em
 * `image/png` como padrão seguro.
 */
export function normalizeImageMime(contentType: string | null | undefined): string {
  const mime = (contentType ?? '').toLowerCase().split(';')[0].trim()
  if (mime === 'image/jpg') return 'image/jpeg'
  if (ALLOWED_IMAGE_MIMES.includes(mime)) return mime
  return 'image/png'
}

/** Nome do bucket de uploads no GCS. */
export function getBucketName(): string {
  const bucket = process.env.GCS_BUCKET
  if (!bucket) throw new Error('GCS_BUCKET não configurado')
  return bucket
}

let _storage: Storage | null = null

function getStorage(): Storage {
  if (!_storage) {
    const projectId = process.env.GCS_PROJECT_ID
    const credentialsJson = process.env.GCS_CREDENTIALS_JSON

    if (credentialsJson) {
      // Credenciais inline (JSON da service account) — caminho preferido no Coolify.
      const credentials = JSON.parse(credentialsJson)
      _storage = new Storage({ projectId: projectId ?? credentials.project_id, credentials })
    } else {
      // Fallback: GOOGLE_APPLICATION_CREDENTIALS (caminho de arquivo) ou ADC.
      _storage = new Storage(projectId ? { projectId } : {})
    }
  }
  return _storage
}

/** URL pública de um objeto no bucket. */
export function getPublicUrl(filename: string): string {
  return `https://storage.googleapis.com/${getBucketName()}/${filename}`
}

/**
 * Faz upload de um objeto e retorna sua URL pública.
 * Lança em caso de falha — o chamador deve tratar o erro.
 */
export async function uploadObject(
  filename: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const file = getStorage().bucket(getBucketName()).file(filename)
  await file.save(body, {
    contentType,
    resumable: false,
    metadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
  })
  return getPublicUrl(filename)
}
