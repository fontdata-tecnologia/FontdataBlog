# Relatório de Atualização — Sincronização com o Upstream

**Data:** 2026-06-17
**Repositório de origem (upstream):** `bittencourtthulio/expxblog`
**Fork (origin):** `pamcba/FontdataBlog`
**Merge commit:** `682435d`
**Base comum:** `dd90fdd`

---

## Resumo executivo

O fork estava sem um remote `upstream` configurado, por isso não recebia atualizações
do repositório de origem. Foi adicionado o remote, feito o `fetch` e o `merge` de
`upstream/master`, resultando na incorporação de **52 commits** novos.

| Métrica | Valor |
|---|---|
| Commits incorporados | 52 |
| Arquivos alterados | 212 |
| Linhas adicionadas | +20.390 |
| Linhas removidas | −2.159 |
| Arquivos novos | 104 |
| Arquivos modificados | 89 |
| Arquivos removidos | 1 |
| Conflitos resolvidos | 1 (`.gitignore`) |

**Período dos commits do upstream:** 2026-06-04 a 2026-06-09.

---

## Ajustes de compatibilidade aplicados no merge

Para preservar a adaptação de infra do fork (plano **Vercel Hobby**, limite de 300s):

1. **`.gitignore`** — conflito resolvido mantendo a entrada nova do upstream
   (`supabase/.temp/`) sem perder as customizações locais.
2. **`app/api/cron/data-retention/route.ts`** — rota nova trazida pelo upstream com
   `maxDuration = 800`; reduzida para `300` para não quebrar o deploy no plano Hobby.
   Todos os demais `maxDuration = 300` do fork foram preservados.
3. **`npm install`** — novas dependências instaladas (`resend`, `husky`).
4. **`npm run build`** — validado com sucesso após o merge.

---

## Novas dependências

| Pacote | Versão | Uso |
|---|---|---|
| `resend` | ^6.12.4 | Envio de e-mail / newsletter |
| `husky` | ^9.1.7 | Git hooks (pre-commit lint, pre-push build) |

Novo script: `prepare: "husky"` no `package.json`.

---

## Mudanças por tema

### 1. Newsletter (Resend)
- Integração com Resend e envio automático ao publicar posts.
- Rotas: `/api/admin/newsletter/send`, `/api/admin/newsletter/test`,
  `/api/newsletter/me`, `/api/newsletter/unsubscribe`.
- Libs: `lib/email.ts`, `lib/newsletter-trigger.ts`.

### 2. Conformidade LGPD (9 itens)
- Página pública `politica-de-privacidade`.
- Banner de consentimento de cookies (`CookieConsentBanner.tsx`), `lib/consent.ts`.
- Anonimização de IP em analytics.
- Cron de retenção de dados: `/api/cron/data-retention` (eliminação automática após prazo).
- Status LGPD no admin: `/api/admin/lgpd/status`.
- Migrations: `lgpd_newsletter_consent`, `lgpd_data_retention_cron`, `fix_lgpd_cron_vault_pattern`.
- Skill `lgpd-checker` com referências (checklist, artigos, template de relatório).

### 3. Webhooks
- Subsistema de webhooks gerais com múltiplos endpoints e gatilhos configuráveis.
- Tabela nova `webhooks` no schema Drizzle.
- Rotas: `/api/admin/webhooks`, `/api/admin/webhooks/[id]`, `/api/admin/webhooks/[id]/test`.
- Libs: `lib/webhooks.ts`, `lib/webhook-events.ts`. UI: `components/admin/WebhooksSection.tsx`.

### 4. Assistente de chat no admin (com tools)
- Chat com persistência de conversas e mensagens.
- Tabelas novas `chat_conversations` e `chat_messages`.
- Rotas: `/api/admin/chat/*` (conversations, messages, message).
- Libs: `lib/chat-tools/*`. UI: `components/admin/ChatPanel.tsx`, `ChatPanelContext.tsx`.

### 5. SEO & descoberta
- `app/sitemap.ts`, `app/llms.txt/route.ts`, `app/ads.txt/route.ts`.
- JSON-LD (`ArticleJsonLd.tsx`), posts relacionados (`RelatedPosts.tsx`),
  botões de compartilhamento (`ShareButtons.tsx`), `lib/seo.ts`.

### 6. Ads / Tracking
- AdSense (`AdSenseClient.tsx`, `AdSenseScript.tsx`) e Facebook Pixel (`FacebookPixel.tsx`).
- Tracking de pageviews corrigido e ativado (`PostViewTracker.tsx`).

### 7. Migrations via painel admin
- Detecção e aplicação de migrations pela UI com log SSE em tempo real.
- `DbUpdateModal.tsx`, rotas `/api/admin/db-status` e `/api/admin/db-migrate`.
- Libs: `lib/db-migrations.ts`, `lib/migrations-embedded.ts`, `lib/db-connection.ts`.
- Configuração dinâmica de `DATABASE_URL` na seção Banco de Dados do admin.

### 8. Sistema de IA gratuito por padrão
- Free Models Router e geração de capa via Pexels.
- Geração de capa SVG via código (sem IA, sem custo externo): `lib/cover-svg.ts`.
- Failover "jsonMode-safe" com deadline e parse de JSON resiliente (`lib/json-extract.ts`).

### 9. Onboarding & Templates
- Wizard de onboarding com dados da empresa (`OnboardingWizard.tsx`).
- Rotas `/api/admin/onboarding` e `/api/admin/onboarding/status`.
- 7 novos templates de layout público (Brutalist, DarkAurora, Editorial, Lifestyle,
  Magazine, Minimal, Saas — headers e footers).
- Briefing parser: `lib/briefing-parse.ts`, `/api/admin/briefing/parse`.

### 10. Admin redesign & automação
- Dashboard redesenhado (hero, sparklines, visão do sistema): `/api/admin/dashboard-overview`.
- Ícones SVG personalizados (`components/admin/icons/ExpxIcons.tsx`).
- ID do artigo exibido antes do título na lista.
- Crons como estrutura versionada (auto-provisiona no setup e nos updates).
- Faixas de bloqueio de horário na automação; intervalo mínimo de 15 min.
- Correção do 504 no botão "Executar agora".
- Páginas admin separadas em Client Components (padrão shell + `*Client.tsx`):
  categorias, tags, login, novo/editar artigo, api.

### 11. Banco de dados (performance & robustez)
- Cache ISR, índices parciais e seletor de pooler configurável.
- Pool reduzido para `max:1` e cliente reutilizado em produção.
- Fallback automático de pooler e conversão de URL para conexão direta em migrations.
- Proxy `client` invocável como tagged template.
- Migration: `add_cost_brl_usd_brl_rate_to_ai_request_logs`.

### 12. DevOps
- Husky configurado: pre-commit (lint) e pre-push (build).
- `next.config.js` corrigido para chaves do Next.js 14 (`experimental.*`).
- `<img>` nativo substituído por `next/image` em todos os componentes.
- `maxDuration` configurável via painel admin (`lib/vercel-config.ts`).
- Skill `deploy` adicionada.

---

## Tabelas novas no schema (`drizzle/schema.ts`)

- `webhooks`
- `chat_conversations`
- `chat_messages`

## Migrations Supabase novas

- `20260603104000_add_cost_brl_usd_brl_rate_to_ai_request_logs.sql`
- `20260604154000_lgpd_newsletter_consent.sql`
- `20260604154500_lgpd_data_retention_cron.sql`
- `20260604160000_fix_lgpd_cron_vault_pattern.sql`

## Arquivo removido

- `app/admin/artigos/LogsSection.tsx`

---

## Pendências de configuração (atenção)

As funcionalidades novas podem exigir configuração adicional para operar:

- **Resend / Newsletter** — chave de API do Resend e domínio verificado.
- **LGPD data-retention** — pg_cron diário apontando para `/api/cron/data-retention`.
- **AdSense / Facebook Pixel** — IDs de conta configurados no admin.
- **SEO / Pexels** — chave da API Pexels para geração de capa.
- **Migrations** — aplicar as 4 migrations novas no Supabase de produção.

---

## Como puxar atualizações futuras

```bash
git fetch upstream
git merge upstream/master
# resolver conflitos se houver, validar com npm run build
git push origin master
```
