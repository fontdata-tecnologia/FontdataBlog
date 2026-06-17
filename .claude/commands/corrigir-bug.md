# /corrigir-bug — Correção orquestrada com base no relatório de análise

Recebe o relatório do `/analisar-bug` e despacha o `orquestrador` para executar a correção seguindo todas as boas práticas do projeto: TDD, regras de domínio, revisão automática e documentação do bug em `docs/bugs/`.

## Pré-condição obrigatória

**Este comando requer o relatório gerado pelo `/analisar-bug`.** Não execute sem ele — o relatório contém a causa-raiz confirmada, os arquivos a modificar e os agentes responsáveis. Sem isso, a correção é cega.

Se invocado sem relatório, pergunta:
> "Cole o relatório do `/analisar-bug` ou execute `/analisar-bug <descrição do erro>` primeiro."

## O que este comando faz

### Fase 1 — Leitura e validação do relatório
O orquestrador lê o relatório e valida:
- Causa-raiz está identificada com arquivo e linha
- Agentes responsáveis estão mapeados
- Não há ambiguidade que exija clarificação adicional

Se faltar informação crítica: faz **1 pergunta objetiva** antes de continuar.

### Fase 2 — Plano de correção
O orquestrador gera um plano estruturado derivado do relatório:

```
Sprint 1 — Correção de Bug: <título do bug>
  Fase 1.1 — <domínio da causa-raiz>
    [ ] Task: <correção principal> → Agente: <quem faz>
    [ ] Task: <correção colateral se houver> → Agente: <quem faz>
  Fase 1.2 — Verificação
    [ ] Task: verificar impacto em outros arquivos → Agente: <quem faz>
```

Tarefas independentes rodam em paralelo. Tarefas com dependência aguardam o resultado anterior.

### Fase 3 — Execução da correção com TDD
Para cada task o agente especializado:

1. **Lê o código atual** antes de modificar — nunca sobrescreve sem entender o estado
2. **Escreve ou atualiza o teste** que expõe o bug (quando aplicável ao domínio)
3. **Aplica a correção mínima** — não refatora além do necessário para corrigir o bug
4. **Verifica que o teste passa** após a correção
5. **Verifica impacto colateral** nos arquivos listados no relatório

Agentes disponíveis e seus domínios:
| Agente | Domínio |
|---|---|
| `db-engineer` | Schema Drizzle, migrations, `lib/db-queries.ts` |
| `api-builder` | Route handlers em `app/api/` |
| `admin-ui` | Páginas e componentes em `app/admin/` |
| `ai-pipeline` | `lib/agents/`, `lib/agent-pipeline.ts`, `lib/ai.ts` |
| `cron-automator` | `app/api/cron/`, `lib/automation.ts`, source crawlers |
| `public-frontend` | `app/(public)/`, feed RSS, SEO |

### Fase 4 — Regras invioláveis durante a correção

O orquestrador enforce que todos os agentes respeitem:

1. **IA via `lib/ai.ts`** — nenhum SDK de provider direto
2. **Admin pages nunca consultam o DB** — sempre via `fetch('/api/admin/*')`
3. **Crons via pg_cron no Supabase** — nunca `vercel.json`
4. **API pública filtra `status = 'published'`** — nunca expõe rascunhos
5. **Deploy via `git push`** — nunca `vercel deploy` diretamente
6. **Chave de AI em `site_settings`** — nunca em variáveis de ambiente
7. **HTML sanitizado com `sanitize-html`** antes de persistir
8. **Sem `as any`** — corrija o tipo, não suprima o erro
9. **Correção mínima** — não refatora código saudável ao redor do bug
10. **Sem comentários desnecessários** — apenas se o motivo for não-óbvio
11. **Paridade de schema** — se a correção mudar `drizzle/schema.ts`, propague para `lib/migrations-embedded.ts` (`EMBEDDED_MIGRATIONS` + `MIGRATION_ORDER`), `EXPECTED_TABLES` (`lib/db-migrations.ts`) e `drizzle/setup-sql.ts`, tudo idempotente (`IF NOT EXISTS`). Em produção o banco é atualizado pelo `DbUpdateModal`, não por `db:migrate` — sem a paridade o fix não chega ao banco do usuário. Ao reportar, sinalize que o admin verá o modal de atualização de banco após o deploy. Ref: `docs/bugs/banco-desatualizado-modal-nao-detecta-drift.md`

### Fase 5 — Revisão automática
Ao final de toda a correção, o orquestrador **sempre** chama o `code-reviewer`:
- **BLOQUEANTE**: o agente responsável é chamado novamente para corrigir — ciclo repete até aprovação
- **IMPORTANTE/SUGESTÃO**: reporta ao usuário para decisão consciente
- **LGTM**: confirma conclusão e avança para documentação

### Fase 6 — Documentação do bug em `docs/bugs/`
Cria ou atualiza o arquivo `docs/bugs/<slug-do-bug>.md` com o registro permanente:

```markdown
# Bug: <título>

**Data**: <YYYY-MM-DD>  
**Severidade**: CRÍTICO / ALTO / MÉDIO / BAIXO  
**Status**: RESOLVIDO  

## Descrição do problema
<o que o usuário reportou>

## Causa-raiz
**Arquivo**: `<caminho/arquivo.ts>`  
**Linha**: <número>  
**Tipo**: <tipo: lógica / tipagem / validação / auth / DB / UI>

<explicação técnica em 3–5 frases>

## Solução aplicada
<descrição da correção implementada>

**Arquivos modificados**:
- `<arquivo 1>` — <o que foi alterado>
- `<arquivo 2>` — <o que foi alterado>

## Como reproduzir (antes da correção)
1. <passo 1>
2. <passo 2>
3. <resultado esperado vs. resultado real>

## Como verificar (após a correção)
- [ ] <verificação 1>
- [ ] `npm run build` passa
- [ ] `npm run lint` limpo

## Lições aprendidas
<padrão ou antipadrão identificado que pode ser aplicado preventivamente>
```

O slug do arquivo é gerado a partir do título do bug em kebab-case via `lib/slug.ts`.

### Fase 7 — Confirmação final
Apresenta ao usuário:

```
## Correção concluída ✓

### Bug corrigido
<título do bug>

### Arquivos modificados
- `<arquivo 1>`
- `<arquivo 2>`

### Documentação gerada
`docs/bugs/<slug>.md`

### Passos manuais necessários
- [ ] <se houver migration: comando SQL a rodar no Supabase>
- [ ] <se houver pg_cron: job a configurar>

### Para fazer deploy
git add <arquivos>
git commit -m "fix: <descrição curta da correção>"
git push origin master
```

## Uso

```
/corrigir-bug
# (cola o relatório do /analisar-bug quando solicitado)

/corrigir-bug <relatório completo do /analisar-bug>
```

## Fluxo típico

```
/analisar-bug posts publicados aparecem na API pública com status draft
→ relatório gerado com causa-raiz em app/api/posts/route.ts:34
→ "Deseja executar /corrigir-bug? [S/N]"
→ S
→ /corrigir-bug executa automaticamente com o relatório
```

---

**Agente coordenador**: `orquestrador`  
**Agente de revisão final**: `code-reviewer` (automático)  
**Documentação gerada**: `docs/bugs/<slug>.md`  
**Referências**: `CLAUDE.md`, `.claude/rules/`, relatório do `/analisar-bug`
