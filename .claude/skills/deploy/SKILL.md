---
name: deploy
description: >
  Use when the user wants to ship code to production in the ExpxBlog project.
  Triggered by /deploy — runs code review, lint + build validation, commit, and
  push to GitHub (Vercel deploys automatically from master). Never calls
  `vercel deploy` directly. Use after any meaningful change is complete and
  ready to ship.
---

# Skill: /deploy

## Overview

Ship code safely to production: review → validate → commit → push.
Vercel picks up `master` automatically — **never run `vercel deploy`**.

---

## Step-by-step (execute every step, skip none)

### 1. Scope the change

```bash
git status
git diff
git diff --staged
```

Identify which files changed and why. If nothing is staged or modified, stop and tell the user there is nothing to deploy.

### 2. Code review

Invoke the `code-review` skill to review the current diff:

```
/code-review
```

- Fix every **BLOQUEANTE** finding before continuing.
- Use judgment on **IMPORTANTE** findings — fix unless it would require a large refactor out of scope.
- **SUGESTÃO** items are optional; note them but do not block deploy.

### 3. Lint + build

```bash
npm run lint
npm run build
```

- Both must exit **0** before continuing.
- If lint or build fails: fix the errors, re-run, then continue.
- Do NOT skip or `--no-verify` around these checks.

### 3.5. Paridade de schema (se `drizzle/schema.ts` mudou)

Se o diff incluir `drizzle/schema.ts`, verifique a paridade ANTES de commitar — em
produção o banco do usuário NÃO é atualizado por `db:migrate`; ele é atualizado pelo
`DbUpdateModal`, que só detecta o que estiver declarado nos mecanismos do código:

```bash
git diff --name-only | grep -q "drizzle/schema.ts" && echo "SCHEMA MUDOU — verifique paridade"
```

Se mudou, confirme que estão no diff (senão o banco de produção ficará incompatível):
- `lib/migrations-embedded.ts` — nova migration em `EMBEDDED_MIGRATIONS` + tag em `MIGRATION_ORDER`
- `lib/db-migrations.ts` — tabela nova em `EXPECTED_TABLES`
- `drizzle/setup-sql.ts` — `CREATE TABLE IF NOT EXISTS` / coluna / índice equivalente

Se faltar qualquer um, **pare e chame o `db-engineer`** para completar a paridade
(Protocolo de paridade do schema) antes de seguir. Ref:
`docs/bugs/banco-desatualizado-modal-nao-detecta-drift.md`.

### 4. Commit

Stage only the files relevant to this change (never `git add -A` blindly):

```bash
git add <specific files>
git commit -m "$(cat <<'EOF'
<type>(<scope>): <imperative summary under 72 chars>

<Optional body: why this change, key decisions, constraints>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Commit message types: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `perf`.

### 5. Push to GitHub

```bash
git push origin master
```

Vercel's GitHub integration triggers a production deployment automatically.
Confirm the push succeeded (exit 0). Do not use `--force`.

### 6. Confirm

Print a short summary to the user:
- Files committed
- Commit hash (`git log -1 --oneline`)
- Reminder that Vercel is deploying from the push
- **Se o schema mudou**: avise que, após o deploy, ao entrar no `/admin` o sistema
  exibirá o modal de atualização de banco — basta clicar "Atualizar agora" para manter
  a compatibilidade entre código e banco.

---

## What this skill does NOT do

| Forbidden | Reason |
|---|---|
| `vercel deploy` | CLAUDE.md forbids direct Vercel CLI deploys |
| `git push --force` | Destructive, requires explicit user request |
| `git add -A` or `git add .` without reviewing | Risk of committing .env or binaries |
| Skipping lint/build | Ships broken code |
| Skipping code review | Ships buggy or insecure code |

---

## When to stop and ask

- Merge conflicts on push → resolve conflicts, then re-run from step 3.
- Pre-commit hook failure → fix the underlying issue reported by the hook; never `--no-verify`.
- Build errors in dependencies outside the changed files → report to user, do not deploy.
- BLOQUEANTE review finding that requires non-trivial refactor → describe the finding and ask the user how to proceed.

---

## Checklist

- [ ] `git status` / `git diff` reviewed
- [ ] Code review run; all BLOQUEANTE findings fixed
- [ ] `npm run lint` exits 0
- [ ] `npm run build` exits 0
- [ ] Commit created with meaningful message
- [ ] `git push origin master` succeeded
- [ ] Summary reported to user
