# Bug: Analytics de acessos nunca era gravado (page_views vazia)

**Data**: 2026-06-05
**Severidade**: ALTO
**Status**: RESOLVIDO

## Descrição do problema
O dashboard admin (`/admin/analytics`) e a tool `get_blog_stats` do chat possuem indicadores de uso — views totais, visitantes únicos, top artigos, "online agora", gráficos por dia/hora/dia-da-semana, referrers — mas todos exibiam **zero**. A página pública do blog não registrava nenhum acesso. Confirmado por `SELECT` no Supabase: a tabela `page_views` tinha **0 registros** em produção, sem nunca ter recebido um único insert.

## Causa-raiz
**Arquivo**: `components/blog/AnalyticsTracker.tsx`
**Tipo**: lógica / integração (componente órfão)

O componente `AnalyticsTracker` é o único código cliente que dispara `POST /api/track` (a gravação de pageview no banco). Ele existia e estava correto — `useEffect` com `usePathname()` faz o fetch a cada navegação — mas **nunca era importado nem renderizado** em nenhum layout ou página. Confirmado por `grep`: o nome só aparecia na própria definição. Sem nenhum componente montando-o, o `useEffect` jamais executava → `/api/track` nunca era chamado → `page_views` permanecia vazia → o dashboard ficava sem dados.

A página de artigo renderizava apenas o `PostViewTracker`, que serve só para o Facebook Pixel e não grava nada no banco.

### Bug latente ativado pela correção
A query em `app/api/track/route.ts` que associa o path a um post buscava por slug **sem filtrar `status = 'published'`**. Enquanto o tracker estava morto isso era inofensivo; ao ativá-lo, acessar `/algum-rascunho` gravaria o `id` e o **título do rascunho** em `page_views`, vazando a existência de posts não publicados para o painel de analytics. Violação da regra "API pública sempre filtra `status = 'published'`". Corrigido junto.

## Solução aplicada
1. Importado e renderizado `<AnalyticsTracker />` em `app/(public)/layout.tsx` — o layout do grupo `(public)` cobre home, artigo (`[slug]`), categoria, tag e busca, ativando o tracking em todo o blog público com uma única mudança.
2. Adicionado filtro `eq(posts.status, 'published')` à query de associação de post em `app/api/track/route.ts`, impedindo que rascunhos sejam associados a pageviews.

**Decisão de design**: o analytics próprio roda **sempre**, sem condicionar ao banner de consentimento de cookies. O dado gravado é anonimizado (IP truncado + hash SHA-256 com salt diário, dedup de 5 min) — base legal de interesse legítimo, LGPD Art. 5º/46 §2. Diferente do Facebook Pixel (terceiro, identificável), que respeita o consentimento.

**Arquivos modificados**:
- `app/(public)/layout.tsx` — import nomeado de `AnalyticsTracker` (alias `@/`) + `<AnalyticsTracker />` renderizado após `<CookieConsentBanner />`
- `app/api/track/route.ts` — query de post agora filtra `status = 'published'`

## Como reproduzir (antes da correção)
1. Acessar qualquer artigo do blog público em produção.
2. Consultar `SELECT count(*) FROM page_views` no Supabase.
3. **Esperado**: ao menos 1 registro por acesso. **Real**: 0 registros — a tabela nunca recebia inserts.

## Como verificar (após a correção)
- [x] `AnalyticsTracker` renderizado em `app/(public)/layout.tsx`
- [x] Query de `/api/track` filtra `status = 'published'`
- [x] `npm run build` passa
- [x] `npm run lint` limpo
- [ ] Após o deploy: acessar um artigo e confirmar `INSERT` em `page_views` via `SELECT count(*)`
- [ ] Dashboard `/admin/analytics` passa a exibir views/visitantes

## Lições aprendidas
**Componente órfão = funcionalidade morta sem erro.** Um Client Component que faz side-effect (tracking, logging, pixel) só funciona se for efetivamente montado na árvore. Definir o componente, o endpoint e o dashboard não basta — o elo de renderização é invisível e não gera erro de compilação. Ao construir um pipeline de dados (escrita → leitura), verifique que o gatilho da escrita está realmente conectado, idealmente confirmando com um `SELECT` no banco real.

**Corolário de segurança**: ativar um caminho de código dormente pode despertar bugs latentes. A query sem filtro de `status` era inerte enquanto o tracker estava morto; renderizá-lo a tornou explorável. Toda ativação de feature deve revisar o que ela passa a executar de fato.
