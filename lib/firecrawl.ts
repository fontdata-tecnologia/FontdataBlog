export async function getFirecrawlApiKey(): Promise<string | null> {
  try {
    const { db } = await import('@/drizzle/db')
    const { siteSettings } = await import('@/drizzle/schema')
    const { eq } = await import('drizzle-orm')
    const row = await db.select().from(siteSettings).where(eq(siteSettings.key, 'firecrawl_api_key')).limit(1)
    return row.length > 0 && row[0].value ? row[0].value : null
  } catch {
    return null
  }
}

export interface AgentExtra {
  use_firecrawl?: boolean
  image_source?: 'ai' | 'pexels'
}

export async function getAgentsExtra(): Promise<Record<string, AgentExtra>> {
  try {
    const { db } = await import('@/drizzle/db')
    const { siteSettings } = await import('@/drizzle/schema')
    const { eq } = await import('drizzle-orm')
    const row = await db.select().from(siteSettings).where(eq(siteSettings.key, 'agents_extra')).limit(1)
    if (row.length > 0 && row[0].value) {
      return JSON.parse(row[0].value) as Record<string, AgentExtra>
    }
  } catch {}
  return {}
}

export async function firecrawlSearch(query: string, apiKey: string): Promise<string[]> {
  try {
    const resp = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, limit: 8 }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!resp.ok) return []
    const data = await resp.json() as { data?: Array<{ url?: string }> }
    return (data.data ?? [])
      .map((r) => r.url)
      .filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
  } catch {
    return []
  }
}

export async function firecrawlScrape(url: string, apiKey: string): Promise<string> {
  try {
    const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url, formats: ['markdown'] }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!resp.ok) return ''
    const data = await resp.json() as { success?: boolean; data?: { markdown?: string } }
    return (data.data?.markdown ?? '').slice(0, 6000)
  } catch {
    return ''
  }
}
