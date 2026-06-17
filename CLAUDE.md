# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Regra de ouro — nunca peça ao usuário para rodar comandos

**Claude Code NUNCA deve pedir ao usuário que execute comandos manualmente.** Toda ação que pode ser executada por ferramenta deve ser executada por Claude:

- `git add`, `git commit`, `git push` — execute via Bash após qualquer alteração de código
- `npm run build`, `npm run lint` — execute via Bash para verificar antes de finalizar
- `npm run db:generate`, `npm run db:migrate` — execute via Bash quando houver mudança de schema
- SQL no Supabase — execute via MCP `mcp__plugin_supabase_supabase__execute_sql` ou `apply_migration` com `project_id: "poksrzponrqcfamcjbua"` (projeto ExpxNews/ExpxBlog)
- Qualquer outro comando listado abaixo — Claude executa, nunca delega ao usuário

Esta regra se aplica a todos os agentes especializados (`ai-pipeline`, `api-builder`, `admin-ui`, `db-engineer`, `cron-automator`, `public-frontend`). Nenhum agente deve encerrar uma tarefa listando "passos manuais" que o usuário precisa fazer — se há algo a executar, execute.

## Deployment

**Never deploy directly to Vercel.** Always commit and push to GitHub — Vercel picks up the changes automatically via its GitHub integration.

```bash
git add <files>
git commit -m "message"
git push origin master
```

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server on http://localhost:3000

# Build & lint
npm run build        # Production build
npm run lint         # ESLint

# Database
npm run db:generate  # Generate Drizzle migrations from schema changes
npm run db:migrate   # Apply pending migrations to the database
npm run db:studio    # Open Drizzle Studio (visual DB browser)
npm run db:seed      # Seed initial data (admin user, sample categories/tags/post)
```

No test suite is configured in this project.

## Architecture

**Stack**: Next.js 14 App Router · TypeScript · Tailwind CSS · Drizzle ORM · PostgreSQL (Supabase)

### Route Groups

- `app/(public)/` — Public blog (home, post by slug, category/tag filters, search). Uses server components with direct DB queries via Drizzle.
- `app/admin/` — Protected admin dashboard (post/category/tag CRUD, rich text editor). All pages are client components communicating with `/api/admin/*`.
- `app/api/` — REST API. Public routes under `/api/posts`, `/api/categories`, `/api/tags`. Admin routes under `/api/admin/*` (protected by middleware).

### Authentication

JWT stored in an httpOnly cookie (`auth-token`, 24h). `middleware.ts` verifies it on every `/admin` and `/api/admin` request, injects `x-user-id` and `x-user-email` headers, and redirects unauthenticated users to `/admin/login`. Login is rate-limited to 5 attempts per IP per 15 minutes.

### Database

Schema lives in `drizzle/schema.ts`. Tables: `users`, `posts`, `categories`, `tags`, `post_categories` (junction), `post_tags` (junction). Connection pool via `drizzle/db.ts` using the `DATABASE_URL` env var (Supabase PostgreSQL).

Posts have a `status` enum (`draft` | `published`) and a `published_at` timestamp. Public API only returns published posts.

### Content Pipeline

Post content is HTML produced by TipTap (rich text editor in `components/blog/TiptapEditor.tsx`). On save, the API sanitizes it with `sanitize-html` before persisting. Slugs are auto-generated from the title via `lib/slug.ts`.

### Image Uploads

Local uploads go to `public/uploads/` (excluded from git). Remote images are allowed from `imgur.com`, `cloudinary.com`, `unsplash.com`, and `supabase.co` (configured in `next.config.js`).

### Brand Tokens

Custom Tailwind colors: `brand-primary` `#1A4FA0` (blue), `brand-secondary` `#F58A2D` (orange), `neutral-900` `#1A1A2E`. Fonts: Inter (sans), Source Serif 4 (serif), JetBrains Mono (mono).

### AI / OpenRouter

**ALL AI features MUST use OpenRouter** (`https://openrouter.ai`). No direct OpenAI, Anthropic, or other provider SDKs.

- **Configuration module**: `lib/ai.ts` — exports `callOpenRouter()`, `aiChat()`, `getAIModelFromDB()`, `getAIApiKey()`, `getDefaultModel()`, `getDefaultModels()`, types `AIFeature`, `OpenRouterMessage`, `OpenRouterOptions`, `OpenRouterResponse`.
- **API key**: Stored in `site_settings` table under key `ai_api_key`. Configured via the admin UI at `/admin/configuracoes` (section "IA (OpenRouter)"). NOT in environment variables.
- **Per-feature model selection**: Each AI feature (e.g. `content_generation`, `title_suggestion`, `excerpt_generation`, `seo_optimization`) has its own model setting stored in `site_settings` table under key `ai_models` as a JSON map `{ feature: "model_id" }`. The admin UI at `/admin/configuracoes` allows changing the model per feature.
- **How to add a new AI feature**:
  1. Add the feature key as a string to `DEFAULT_MODELS` in `lib/ai.ts` with a sensible default model (e.g. `"openai/gpt-4o-mini"`).
  2. Add a label for the feature in `FEATURE_LABELS` in `app/admin/configuracoes/ConfiguracoesClient.tsx`.
  3. Use `aiChat(feature, messages, options?)` to call the LLM — it automatically resolves the API key from DB, resolves the model from DB or falls back to the default.
  4. For lower-level control, use `getAIApiKey()` to get the key, `getAIModelFromDB(feature)` to get the model, and `callOpenRouter({ model, messages }, apiKey)` to make the call.
  5. Never call any AI provider API directly — always go through `lib/ai.ts`.

## Environment Variables

```
DATABASE_URL          # Supabase PostgreSQL connection string (pooler port 6543)
JWT_SECRET            # Min 32 chars, used to sign/verify auth tokens
NEXT_PUBLIC_APP_URL   # Base URL (e.g. http://localhost:3000)
NEXT_PUBLIC_BLOG_NAME # Blog display name
```

Copy `.env.example` to `.env` to get started.

Responda sempre em portugues do Brasil