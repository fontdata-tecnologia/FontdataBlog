# Bug: Copywriter falha ao parsear JSON com o Free Models Router

**Data**: 2026-06-04
**Severidade**: ALTO
**Status**: RESOLVIDO

## Descrição do problema
Com a configuração padrão do sistema (copywriter usando `openrouter/free` — o Free Models Router do OpenRouter), ao clicar em **"Executar agora"** na automação o pipeline falhava com:

- UI/SSE: `Erro ao parsear resposta do copywriter`
- Rede: `Failed to load resource: 500`

A falha ocorria no passo 4 do pipeline (Copywriter), interrompendo toda a geração do artigo. Por ser a configuração de fábrica, atingia qualquer usuário novo logo no primeiro uso.

## Causa-raiz
**Arquivo**: `lib/agents/copywriter.ts`
**Linha**: 54 (draft) e 119 (revisão)
**Tipo**: lógica / parsing frágil de saída de LLM

O copywriter pedia ao modelo um JSON cru (`{ "title", "excerpt", "content" }`) e fazia `JSON.parse` direto sobre a resposta, removendo apenas cercas de markdown. O `openrouter/free` é um roteador que escolhe automaticamente entre várias LLMs gratuitas distintas a cada chamada; esses modelos frequentemente embrulham o JSON em prosa, deixam aspas duplas não-escapadas dentro do HTML do campo `content`, ou truncam a saída em `max_tokens`. Qualquer um desses casos fazia o `JSON.parse` lançar, e o `catch` vazio convertia tudo em `PARSE_ERROR` → `pipeline_error` → HTTP 500. Agravante: `callOpenRouter` nunca enviava `response_format: { type: 'json_object' }`, então não havia nenhuma garantia de saída estruturada.

O mesmo padrão frágil existia em outros agentes que parseiam JSON: `researcher.ts`, `reviewer.ts` e `lib/briefing-parse.ts`.

## Solução aplicada
1. **`lib/json-extract.ts` (novo)** — `extractJson<T>(raw)` tolerante: tenta `JSON.parse` direto; senão varre a string por blocos `{...}` balanceados (respeitando strings e escapes `\"`, sem contar chaves dentro de strings) e retorna o maior bloco válido; tenta um reparo leve de aspas; nunca lança (retorna `null` em falha terminal).
2. **`lib/ai.ts`** — `OpenRouterOptions` ganhou `jsonMode?: boolean`. Quando `true`, `callOpenRouter` envia `response_format: { type: 'json_object' }`, com **fallback opt-in**: se o modelo responder erro mencionando `response_format`/`json`, reenvia uma única vez sem o campo (modelos do free router podem não suportar) — sem loop.
3. **`copywriter.ts`** — draft e revisão usam `jsonMode: true` + `extractJson`; validam `title/excerpt/content`; em falha fazem **1 retry corretivo** com mensagem "Sua resposta anterior não era JSON válido. Responda SOMENTE o objeto JSON." antes de desistir; mensagem de erro final acionável em português.
4. **`researcher.ts`, `reviewer.ts`, `briefing-parse.ts`** — `JSON.parse` substituído por `extractJson`, preservando os fallbacks existentes de cada um (reviewer mantém o `{ approved: true }` fail-open).

**Arquivos modificados**:
- `lib/json-extract.ts` — novo extrator tolerante de JSON
- `lib/ai.ts` — `jsonMode` + `response_format` opt-in com fallback de reenvio único
- `lib/agents/copywriter.ts` — `extractJson` + retry corretivo único + validação de campos
- `lib/agents/researcher.ts` — `extractJson` nos dois pontos de parse
- `lib/agents/reviewer.ts` — `extractJson`, fallback `{ approved: true }` preservado
- `lib/briefing-parse.ts` — `extractJson`, retorno `{}` em falha (comportamento anterior preservado)

## Como reproduzir (antes da correção)
1. Manter a configuração padrão (copywriter com `openrouter/free`).
2. Em `/admin`, na automação, clicar em "Executar agora".
3. **Esperado**: artigo gerado. **Real**: pipeline interrompe com `Erro ao parsear resposta do copywriter` e HTTP 500 sempre que o modelo gratuito retornava JSON com prosa, aspas não-escapadas ou truncamento.

## Como verificar (após a correção)
- [x] "Executar agora" com `openrouter/free` gera artigo sem `PARSE_ERROR`
- [x] `extractJson` cobre prosa antes/depois, cercas markdown, aspas não-escapadas e truncamento (falha graciosa + retry)
- [x] Retry corretivo dispara no máximo 1 vez (sem loop)
- [x] `response_format` é opt-in com fallback para modelos sem suporte
- [x] Researcher e Reviewer com modelo free também parseiam
- [x] `npm run build` passa sem erros TypeScript
- [x] `npm run lint` limpo (apenas warning pré-existente em `ArtigosClient.tsx`, não relacionado)

## Lições aprendidas
Saída de LLM nunca deve ser tratada como JSON garantido — especialmente com roteadores de modelos gratuitos, onde o modelo concreto muda a cada chamada e o nível de aderência a instruções de formato varia. **Antipadrão**: `JSON.parse` direto + `catch` vazio sobre resposta de LLM. **Padrão correto**: extrator tolerante centralizado (`extractJson`) + `response_format` quando o modelo suportar + um retry corretivo. Qualquer novo agente que peça JSON ao modelo deve usar `extractJson`, nunca `JSON.parse` inline.
