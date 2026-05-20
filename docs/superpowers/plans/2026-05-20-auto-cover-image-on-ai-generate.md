# Auto Cover Image on AI Article Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically generate and save a cover image immediately after AI article text generation, for both generation methods (theme-based and URL-reference), showing two-stage progress in the modal.

**Architecture:** The two generate API routes are changed to return `{ post_id, title, excerpt, content }` alongside the existing `post_id`. `NewArticleModal` gains a new `generating_image` step and, after text generation, calls `/api/admin/ai/image/generate` then PATCHes the post with the returned URL before redirecting. Image failure is non-fatal — the article is still saved and the user is redirected.

**Tech Stack:** Next.js 14 App Router, TypeScript, existing `/api/admin/ai/image/generate` route, existing `PUT /api/admin/posts/[id]` route.

---

## File Map

| File | Change |
|------|--------|
| `app/api/admin/ai/article/generate/route.ts` | Return `title`, `excerpt`, `content` alongside `post_id`; fix `max_tokens` |
| `app/api/admin/ai/article/generate-from-url/route.ts` | Return `title`, `excerpt`, `content` alongside `post_id` |
| `app/admin/artigos/NewArticleModal.tsx` | Add `generating_image` step; sequential image generation + PATCH after text |

---

### Task 1: generate/route.ts — return article data + fix max_tokens

**Files:**
- Modify: `app/api/admin/ai/article/generate/route.ts:77,114`

- [ ] **Step 1: Fix max_tokens and return article data**

In `app/api/admin/ai/article/generate/route.ts`, make two changes:

Change line 77 (the `aiChat` call options):
```typescript
      { temperature: 0.7, max_tokens: 8000 }
```

Change the final return (currently `return NextResponse.json({ post_id: post.id })`):
```typescript
    return NextResponse.json({
      post_id: post.id,
      title: articleData.title,
      excerpt: articleData.excerpt ?? '',
      content: cleanContent,
    })
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/ai/article/generate/route.ts
git commit -m "feat: return article data from generate route, increase max_tokens"
```

---

### Task 2: generate-from-url/route.ts — return article data

**Files:**
- Modify: `app/api/admin/ai/article/generate-from-url/route.ts:143`

- [ ] **Step 1: Return article data alongside post_id**

Change the final return (currently `return NextResponse.json({ post_id: post.id })`):
```typescript
    return NextResponse.json({
      post_id: post.id,
      title: articleData.title,
      excerpt: articleData.excerpt ?? '',
      content: cleanContent,
    })
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/ai/article/generate-from-url/route.ts
git commit -m "feat: return article data from generate-from-url route"
```

---

### Task 3: NewArticleModal — two-stage generation with auto cover image

**Files:**
- Modify: `app/admin/artigos/NewArticleModal.tsx`

This is the main task. The modal needs to:
1. Add `'generating_image'` to the `Step` union type
2. Add its title to the `titles` map
3. Add its loading UI (replaces the `generating` block for the image phase)
4. Extract a shared `generateCoverImage(post_id, title, excerpt, content)` helper that calls the image API, PATCHes the post, and never throws (errors are swallowed — article is already saved)
5. In `handleSelectSuggestion` and `handleGenerateFromUrl`: after getting text response, call the helper then redirect

- [ ] **Step 1: Add `generating_image` to the Step type and titles map**

Change the `Step` type (line 19–27):
```typescript
type Step =
  | 'method'
  | 'ai_type'
  | 'select_theme'
  | 'loading_suggestions'
  | 'select_suggestion'
  | 'enter_url'
  | 'generating'
  | 'generating_image'
```

Change the `titles` map (line 148–156):
```typescript
  const titles: Record<Step, string> = {
    method: 'Novo Artigo',
    ai_type: 'Criar com IA',
    select_theme: 'Escolha um Tema',
    loading_suggestions: 'Buscando Sugestões...',
    select_suggestion: 'Escolha um Artigo',
    enter_url: 'Link de Referência',
    generating: 'Gerando Artigo...',
    generating_image: 'Gerando Imagem de Capa...',
  }
```

- [ ] **Step 2: Add the generateCoverImage helper function**

Add before `handleManual` (around line 61):
```typescript
  async function generateCoverImage(
    postId: number,
    title: string,
    excerpt: string,
    content: string
  ): Promise<void> {
    try {
      const imgRes = await fetch('/api/admin/ai/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, excerpt, content }),
      })
      if (!imgRes.ok) return
      const { url: coverImageUrl } = await imgRes.json()
      if (!coverImageUrl) return
      await fetch(`/api/admin/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_image: coverImageUrl }),
      })
    } catch {
      // image generation is non-fatal; article is already saved
    }
  }
```

- [ ] **Step 3: Update handleSelectSuggestion to use two-stage generation**

Replace the current `handleSelectSuggestion` function (lines 89–109):
```typescript
  async function handleSelectSuggestion(suggestion: Suggestion) {
    setStep('generating')
    setError('')
    try {
      const res = await fetch('/api/admin/ai/article/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: suggestion.title,
          description: suggestion.description,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar artigo')
      setStep('generating_image')
      await generateCoverImage(data.post_id, data.title, data.excerpt, data.content)
      onClose()
      router.push(`/admin/artigos/${data.post_id}/editar`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar artigo')
      setStep('select_suggestion')
    }
  }
```

- [ ] **Step 4: Update handleGenerateFromUrl to use two-stage generation**

Replace the current `handleGenerateFromUrl` function (lines 111–129):
```typescript
  async function handleGenerateFromUrl() {
    if (!url.trim()) return
    setStep('generating')
    setError('')
    try {
      const res = await fetch('/api/admin/ai/article/generate-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar artigo')
      setStep('generating_image')
      await generateCoverImage(data.post_id, data.title, data.excerpt, data.content)
      onClose()
      router.push(`/admin/artigos/${data.post_id}/editar`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar artigo')
      setStep('enter_url')
    }
  }
```

- [ ] **Step 5: Add generating_image loading UI**

In the JSX section, after the `{step === 'generating' && (...)}` block (around line 427), add:
```tsx
          {step === 'generating_image' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <svg
                className="animate-spin h-8 w-8 text-brand-secondary"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm text-gray-500">
                Artigo gerado! Criando imagem de capa com IA...
              </p>
              <p className="text-xs text-gray-400">Isso pode levar até 30 segundos.</p>
            </div>
          )}
```

- [ ] **Step 6: Ensure canGoBack excludes generating_image**

The current `canGoBack` (line 158–160):
```typescript
  const canGoBack =
    step !== 'method' && step !== 'generating' && step !== 'loading_suggestions'
```

Change to also exclude `generating_image`:
```typescript
  const canGoBack =
    step !== 'method' &&
    step !== 'generating' &&
    step !== 'generating_image' &&
    step !== 'loading_suggestions'
```

- [ ] **Step 7: Commit**

```bash
git add app/admin/artigos/NewArticleModal.tsx
git commit -m "feat: auto-generate cover image after AI article creation"
```

---

## Self-Review Checklist

- [x] Both generation methods covered (`generate` and `generate-from-url`)
- [x] Image failure is non-fatal — article saved and redirect still happens
- [x] `max_tokens` fixed in `generate/route.ts` (was 4096, now 8000, matching the fix already applied to `generate-from-url`)
- [x] `cover_image` PATCH uses existing `PUT /api/admin/posts/[id]` which accepts Supabase HTTPS URLs via `z.string().url()`
- [x] `canGoBack` blocks back-navigation during both loading states
- [x] Spinner color distinguishes text phase (brand-primary blue) from image phase (brand-secondary orange)
- [x] No new routes created — reuses existing image and post endpoints
