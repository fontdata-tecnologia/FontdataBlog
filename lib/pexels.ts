import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

interface PexelsPhoto {
  id: number
  url: string
  photographer: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    landscape: string
  }
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[]
  total_results: number
}

export async function getPexelsApiKey(): Promise<string | null> {
  try {
    const row = await db.select().from(siteSettings).where(eq(siteSettings.key, 'pexels_api_key')).limit(1)
    return row.length > 0 && row[0].value ? row[0].value : null
  } catch {
    return null
  }
}

export async function searchPexelsPhoto(
  query: string,
  apiKey: string,
  orientation: 'landscape' | 'portrait' | 'square' = 'landscape'
): Promise<PexelsPhoto | null> {
  try {
    const params = new URLSearchParams({
      query,
      per_page: '5',
      orientation,
    })
    const resp = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(15_000),
    })
    if (!resp.ok) return null
    const data = (await resp.json()) as PexelsSearchResponse
    return data.photos?.[0] ?? null
  } catch {
    return null
  }
}
