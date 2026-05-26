import { getSettings } from '@/lib/settings'
import { getDefaultModels, getAIApiKey, getAIModelFromDB } from '@/lib/ai'
import { getTelegramConfig } from '@/lib/telegram'
import { getFirecrawlApiKey } from '@/lib/firecrawl'
import { getPexelsApiKey } from '@/lib/pexels'
import { ConfiguracoesClient } from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const settings = await getSettings()
  const aiApiKey = (await getAIApiKey()) ?? ''

  const defaults = getDefaultModels()
  const aiModels: Record<string, string> = {}
  for (const feature of Object.keys(defaults)) {
    aiModels[feature] = await getAIModelFromDB(feature)
  }

  const telegramConfig = await getTelegramConfig()
  const firecrawlApiKey = (await getFirecrawlApiKey()) ?? ''
  const pexelsApiKey = (await getPexelsApiKey()) ?? ''

  return (
    <ConfiguracoesClient
      initial={settings.company}
      initialAI={{ api_key: aiApiKey, models: aiModels }}
      initialTelegram={{
        bot_token: telegramConfig?.bot_token ?? '',
        allowed_chat_ids: telegramConfig?.allowed_chat_ids ?? '',
      }}
      initialFirecrawl={{ api_key: firecrawlApiKey }}
      initialPexels={{ api_key: pexelsApiKey }}
    />
  )
}
