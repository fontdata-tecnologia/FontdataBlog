---
description: Padrões específicos para lib/agents/ e lib/agent-pipeline.ts — complementa o agent ai-pipeline
globs:
  - "lib/agents/**"
  - "lib/agent-pipeline.ts"
  - "lib/ai.ts"
  - "lib/firecrawl.ts"
---

# AI Pipeline — Regras de Domínio

## Ordem e responsabilidade dos agentes (imutável)
Headline → Researcher → Analyst → Copywriter → Reviewer → CTA → Designer → Publisher
- Nenhum agente escreve no banco — só o Publisher persiste o post
- O Copywriter recebe o output consolidado do Analyst — nunca acessa URLs diretamente

## Loop de revisão
- O Reviewer pode pedir reescrita ao Copywriter no máximo **3 vezes** — nunca aumente esse limite
- Após 3 rejeições, o Copywriter entrega o melhor rascunho atual sem nova iteração
- Ao aprovar, o Reviewer extrai **princípios genéricos** de escrita (não específicos do artigo) e os adiciona ao pool de aprendizado

## Aprendizado contínuo
- Pool de princípios tem limite de **10 itens** — ao atingir o limite, descarte o mais antigo (FIFO)
- Princípios são injetados no system prompt do Copywriter nas execuções seguintes — não no prompt do usuário
- Nunca persista princípios em arquivo — apenas na tabela `agent_configs` ou estrutura em memória durante o pipeline

## Modelos padrão por agente (fallback quando DB não tem configuração)
O sistema é **gratuito por padrão**: todos os agentes de texto usam o Free Models
Router do OpenRouter (`openrouter/free`), que escolhe automaticamente a melhor LLM
gratuita. Só o Designer (imagem) usa um modelo pago, pois o Free Router é só texto.

| Agente | Modelo padrão |
|---|---|
| Headline, Researcher, Analyst, Copywriter, Reviewer, CTA, Publisher | `openrouter/free` |
| Designer (imagem) | `openai/gpt-5-image` |

A capa do artigo, porém, é gerada por padrão via **Pexels** (gratuito), não por IA —
o default de `agents_extra.designer.image_source` é `'pexels'`. O modelo de imagem
acima só é usado quando o usuário escolhe explicitamente capa gerada por IA.

## SSE (Server-Sent Events)
- `lib/agent-pipeline.ts` usa SSE para streamar progresso — nunca substitua por WebSocket ou polling
- Cada evento SSE tem shape `{ stage, status, data? }` — não altere o schema sem atualizar o consumer no admin
