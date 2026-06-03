# Bug: URL Customizada processada apenas uma vez

**Data**: 2026-06-03  
**Severidade**: ALTO  
**Status**: RESOLVIDO  

## Descrição do problema

Ao usar automação de fontes de conteúdo com tipo "URL Customizada", o sistema funcionava na primeira execução mas na segunda lançava `Erro: Esta URL já foi processada anteriormente`. O recurso foi projetado para portais de notícias — a cada execução deveria raspar a página de índice, extrair artigos recentes e gerar um novo post a partir de um artigo ainda não processado.

## Causa-raiz

**Arquivo**: `lib/source-crawlers/handlers/custom.ts`  
**Linha**: 6–8 (guard) e 31 (retorno de `key`)  
**Tipo**: Lógica de deduplicação incorreta

O handler usava `opts.url` (a URL base do portal, ex: `https://g1.globo.com`) tanto como guard de deduplicação quanto como `key` no resultado. Como `source_crawler_items` acumula chaves de itens já processados, a segunda execução encontrava a URL base na lista e bloqueava antes mesmo de raspar qualquer conteúdo novo.

Os outros handlers (`github`, `docs`) trabalham corretamente: primeiro listam candidatos (repos, páginas), filtram os já processados e usam o identificador do item individual como chave — nunca a URL base.

## Solução aplicada

O handler foi reescrito para seguir o padrão do `docs` handler:

1. Raspa a URL de índice do portal via Firecrawl `/scrape` (com timeout de 20s)
2. Usa LLM (`url_extraction` feature, model via `getAIModelFromDB`) para extrair a lista de URLs de artigos individuais presentes na página
3. Filtra os já processados contra `opts.alreadyProcessedKeys`
4. Itera pelos artigos frescos em ordem e raspa o primeiro que retorna conteúdo (fallback para o próximo se o scrape falhar)
5. Usa a URL do artigo individual como `key` — única por artigo, nunca a URL base do portal

Melhorias adicionais sobre a versão anterior:
- Modelo configurável via `getAIModelFromDB('url_extraction')` + feature `url_extraction` em `DEFAULT_MODELS`
- Feature registrada em `FEATURE_LABELS` na UI de configurações
- Timeout explícito de 20s em todas as chamadas Firecrawl (alinhado com `firecrawlScrape`)
- Parser JSON robusto que trata code fences antes de regex genérica
- Mensagens de erro diferenciadas: "LLM não extraiu URLs" vs "Todos os artigos já processados" vs "Nenhum artigo raspável"
- Prompt do LLM com instrução explícita de não inventar URLs (mitigação de prompt injection)
- `origin` extraído de `opts.url` para prefixar URLs relativas corretamente

**Arquivos modificados**:
- `lib/source-crawlers/handlers/custom.ts` — reescrita completa da lógica do handler
- `lib/ai.ts` — adição de `url_extraction` em `DEFAULT_MODELS`
- `app/admin/configuracoes/ConfiguracoesClient.tsx` — labels para `url_extraction` e `category_matching`

## Como reproduzir (antes da correção)

1. Criar uma fonte de conteúdo com tipo "URL Customizada" e URL de um portal de notícias
2. Disparar a automação manualmente — primeira execução gera o artigo com sucesso
3. Disparar novamente — `Erro: Esta URL já foi processada anteriormente`

## Como verificar (após a correção)

- [ ] Segunda execução manual do crawler no admin processa um artigo diferente do primeiro
- [ ] `source_crawler_items` acumula registros com URLs de artigos individuais (não a URL base do portal)
- [ ] Campo `last_error` fica vazio após execuções bem-sucedidas
- [ ] `npm run build` passa sem erros TypeScript
- [ ] `npm run lint` limpo

## Lições aprendidas

Handlers de crawler que apontam para uma URL de índice (portal, feed sem RSS, agregador) precisam de dois estágios: (1) raspar o índice para descobrir itens individuais, (2) raspar o item escolhido. A chave de deduplicação deve sempre ser o identificador do **item individual**, nunca a URL do índice. Usar a URL base como chave de deduplicação é um antipadrão silencioso — funciona uma vez e bloqueia todo o restante das execuções.
