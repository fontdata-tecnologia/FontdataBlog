# Template de Relatório LGPD

Use este template para formatar o relatório de conformidade gerado pelo skill.

---

```markdown
# 📋 Relatório de Conformidade LGPD
**Projeto:** [Nome do Projeto]
**Data da Análise:** [Data]
**Versão da Lei:** Lei nº 13.709/2018 (LGPD)

---

## 🎯 Resultado Geral

| Status | Score | Itens Críticos | Itens Altos | Itens Médios | Itens Baixos |
|--------|-------|----------------|-------------|--------------|--------------|
| [✅ CONFORME / ⚠️ PARCIALMENTE CONFORME / ❌ NÃO CONFORME] | X/100 | N | N | N | N |

> **Resumo executivo:** [2-3 frases descrevendo o estado geral do projeto e os principais riscos identificados.]

---

## 🚨 Itens Críticos (Ação Imediata Necessária)

> Itens críticos representam violações diretas da lei ou riscos imediatos de segurança que devem ser resolvidos antes de qualquer deploy em produção.

### 🔴 [ID-001] [Título do Problema]
- **Categoria:** CAT-X — [Nome da Categoria]
- **Artigo LGPD:** Art. XX
- **Arquivo(s):** `src/arquivo.js:45`, `models/User.js:12`
- **Descrição:** [Descrição clara do problema encontrado no código]
- **Risco:** [Explicação do risco para o titular de dados e para a empresa]
- **Recomendação:**
  ```
  [Exemplo de código corrigido ou passos concretos para resolver]
  ```

### 🔴 [ID-002] [Título do Problema]
[...]

---

## 🟠 Itens de Alta Prioridade

### 🟠 [ID-003] [Título do Problema]
- **Categoria:** CAT-X — [Nome da Categoria]
- **Artigo LGPD:** Art. XX
- **Arquivo(s):** [...]
- **Descrição:** [...]
- **Recomendação:** [...]

[...]

---

## 🟡 Itens de Média Prioridade

### 🟡 [ID-00X] [Título do Problema]
[...]

---

## 🟢 Itens de Baixa Prioridade / Melhorias

### 🟢 [ID-00X] [Título do Problema]
[...]

---

## ✅ Pontos Positivos (Conformidades Encontradas)

> O que o projeto já faz corretamente em relação à LGPD.

- ✅ **[CAT-X]** [Descrição do que está correto] — `arquivo.js:10`
- ✅ **[CAT-X]** [Descrição do que está correto]
[...]

---

## ⚠️ Categorias Não Avaliadas

| Categoria | Motivo |
|-----------|--------|
| CAT-X — [Nome] | Arquivos de [tipo] não encontrados no projeto |
[...]

---

## 🗺️ Plano de Ação Prioritizado

Ordem recomendada de resolução para atingir conformidade com a LGPD:

### Fase 1 — Imediato (antes do próximo deploy)
1. **[ID-00X]** [Título] — [Tempo estimado: Xh]
2. **[ID-00X]** [Título] — [Tempo estimado: Xh]

### Fase 2 — Curto prazo (próximas 2 semanas)
3. **[ID-00X]** [Título] — [Tempo estimado: Xh]
4. **[ID-00X]** [Título] — [Tempo estimado: Xh]

### Fase 3 — Médio prazo (próximo mês)
5. **[ID-00X]** [Título] — [Tempo estimado: Xh]
[...]

---

## 📚 Recursos Adicionais

- [Lei nº 13.709/2018 — Texto completo](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm)
- [ANPD — Autoridade Nacional de Proteção de Dados](https://www.gov.br/anpd)
- [Guia de Boas Práticas da ANPD](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-guia-de-boas-praticas-e-governanca-em-protecao-de-dados-pessoais)

---
*Relatório gerado pelo LGPD Checker Skill — para uso como orientação técnica, não substitui assessoria jurídica especializada.*
```
