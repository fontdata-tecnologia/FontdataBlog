# Free-by-default LLMs + Pexels no onboarding — Design

**Data:** 2026-06-04

## Problema

Nem todo usuário inicia com créditos no OpenRouter. Hoje os modelos padrão
(`DEFAULT_MODELS` em `lib/ai.ts`) apontam para `openai/gpt-4o-mini`, que consome
créditos. Existe a opção gratuita do OpenRouter — **Free Models Router**
(`openrouter/free`) — que escolhe automaticamente a melhor LLM gratuita. O sistema
deve ser **100% gratuito por padrão**, incluindo a capa do artigo (via Pexels).

## Objetivo

1. Tornar `openrouter/free` o modelo de texto padrão do sistema.
2. Tornar a geração de capa gratuita por padrão (Pexels), com desabilitação
   graciosa quando o usuário não configura Pexels.
3. Adicionar etapa de configuração da API do Pexels no onboarding, logo após a
   configuração do OpenRouter.

## Escopo e decisões

- **Apenas defaults.** Só `DEFAULT_MODELS` e o fallback de `getDefaultModel()`
  mudam. Instalações que já salvaram modelos em `ai_models` permanecem intactas.
- **Pexels pulado → desabilitar o agente Designer** (não fazer fallback para IA).
  Assim o pipeline de um usuário sem créditos é 100% gratuito e nunca quebra por
  falta de capa.
- **Sem mudança de schema.** Tudo usa chaves existentes em `site_settings`:
  `ai_models`, `pexels_api_key`, `agents_extra`.

## Parte A — Free Models Router como padrão de texto

Arquivo: `lib/ai.ts`

- Adicionar `const FREE_MODEL = 'openrouter/free'` (exibido como "Free Models Router").
- Em `DEFAULT_MODELS`, apontar todas as features **de texto** para `FREE_MODEL`:
  `content_generation`, `image_description`, `briefing_generation`,
  `prompt_generation`, `theme_suggestion`, `category_matching`, `url_extraction`.
- Manter `image_generation: 'openai/gpt-5-image'` — o Free Router é só texto;
  esse continua sendo o default de imagem por IA para quem optar.
- Trocar o fallback de `getDefaultModel()` de `'openai/gpt-4o-mini'` para `FREE_MODEL`.

Consistência (encontrado em revisão):
- `lib/agents/types.ts` — `AGENT_DEFINITIONS.defaultModel` de todos os agentes de
  texto migrado para `openrouter/free` (Designer permanece `openai/gpt-5-image`).
  Esse é o fallback exibido no admin e usado pelo Designer.
- `lib/agent-pipeline.ts` — `generalizeIssues` não usa mais o literal
  `'openai/gpt-4o-mini'`; resolve via `getAIModelFromDB('content_generation')`
  (fallback `openrouter/free`), para que o aprendizado contínuo também seja gratuito.
- `.claude/rules/pipeline/ai-pipeline.md` — tabela de modelos padrão atualizada.

## Parte B — Pexels como capa gratuita padrão + desabilitação graciosa

Arquivo: `lib/agents/designer.ts`
- Trocar o default de `image_source` de `'ai'` → `'pexels'` (linha ~19).

Arquivo: `lib/firecrawl.ts`
- Adicionar `designer_enabled?: boolean` à interface `AgentExtra`.

Arquivo: `lib/agent-pipeline.ts`
- Antes de rodar o Designer (~linha 253), checar
  `agentsExtra['designer']?.designer_enabled ?? true`. Se `false`, pular o agente
  Designer por completo (sem capa), espelhando o padrão existente de
  `reviewer_enabled`. O artigo é publicado com `cover_image: null`.

## Parte C — Etapa de Pexels no onboarding

Arquivo: `components/admin/OnboardingWizard.tsx`

- Novo `WizardStep` `'pexels'` inserido em `STEP_ORDER` entre `api_key` e `briefing`.
- A etapa explica capas gratuitas via Pexels, com link para
  `https://www.pexels.com/api/`, input de chave e **duas** ações:
  - **"Salvar e continuar"** → salva `{ pexels: { api_key } }` via
    `PUT /api/admin/settings`; avança para `briefing`. Designer permanece ativo
    com default Pexels.
  - **"Pular esta etapa"** → faz merge e salva
    `{ agents_extra: { designer: { designer_enabled: false } } }` via
    `PUT /api/admin/agents/extra`; avança para `briefing`. Usuário sem créditos
    que pula Pexels obtém pipeline 100% gratuito **sem o gerador de capa rodando**.
- Atualizar o checklist da etapa `welcome` (labels/contagem) para refletir a etapa
  extra, e o sucesso de `handleSaveApiKey` para ir a `'pexels'` em vez de `'briefing'`.

## Fluxo de dados (resumo)

- **Pexels configurado:** texto gratuito (router) + capa gratuita (Pexels).
- **Pexels pulado:** texto gratuito (router) + sem capa (Designer desabilitado).
  100% gratuito, pipeline nunca falha.
- **Usuários existentes/pagantes:** inalterados.

## Domínios afetados

- `ai-pipeline`: `lib/ai.ts`, `lib/agents/designer.ts`, `lib/agent-pipeline.ts`, `lib/firecrawl.ts`
- `admin-ui`: `components/admin/OnboardingWizard.tsx`

## Verificação

- `npm run build` e `npm run lint` sem erros.
- Onboarding mostra a etapa Pexels após a chave do OpenRouter.
- Pular Pexels grava `agents_extra.designer.designer_enabled = false`.
