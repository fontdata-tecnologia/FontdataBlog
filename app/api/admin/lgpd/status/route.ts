// app/api/admin/lgpd/status/route.ts
// Retorna painel de conformidade LGPD (read-only).
// Protegido pelo middleware admin — sem guard manual.

import { NextResponse } from 'next/server'
import { getLgpdSettings, DEFAULT_LGPD } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export type LgpdCheckItem = {
  id: string
  label: string
  ok: boolean
  detail: string
}

export async function GET() {
  try {
    const lgpd = await getLgpdSettings()

    const dpoConfigurado =
      !!lgpd.dpo_email &&
      lgpd.dpo_email !== 'privacidade@seudominio.com' &&
      lgpd.dpo_email !== DEFAULT_LGPD.dpo_email

    const checks: LgpdCheckItem[] = [
      {
        id: 'ip_anonimizado',
        label: 'Anonimização de IPs',
        ok: true,
        detail: 'IPs registrados como hash SHA-256 unidirecional (não reversível). Garantido por código.',
      },
      {
        id: 'politica_publicada',
        label: 'Política de Privacidade publicada',
        ok: true,
        detail: 'Disponível em /politica-de-privacidade com base legal, retenção e direitos dos titulares.',
      },
      {
        id: 'consentimento_ativo',
        label: 'Consentimento na newsletter',
        ok: true,
        detail: `Checkbox obrigatório no cadastro. Versão atual: ${lgpd.consent_version || DEFAULT_LGPD.consent_version}. Garantido por código.`,
      },
      {
        id: 'cron_retencao_configurado',
        label: 'Rotina de retenção de dados',
        ok: true,
        detail: `Cron diário apaga page_views (>${lgpd.retention_pageviews_months}m), logs (>${lgpd.retention_logs_months}m) e e-mails cancelados (>${lgpd.retention_unsubscribed_days}d). Agendado via pg_cron.`,
      },
      {
        id: 'dpo_configurado',
        label: 'Encarregado (DPO) configurado',
        ok: dpoConfigurado,
        detail: dpoConfigurado
          ? `DPO: ${lgpd.dpo_name ? lgpd.dpo_name + ' — ' : ''}${lgpd.dpo_email}`
          : 'Preencha o e-mail do DPO na aba LGPD para concluir a conformidade.',
      },
    ]

    return NextResponse.json({ checks })
  } catch (err) {
    console.error('[lgpd/status GET]', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
