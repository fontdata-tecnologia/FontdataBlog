# syntax=docker/dockerfile:1

# ── Stage 1: dependências ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
# libc6-compat ajuda binários nativos (ex.: dependências do @google-cloud/storage).
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# As NEXT_PUBLIC_* são embutidas no bundle em build time; o Coolify deve passá-las
# como build args/env. DATABASE_URL não é necessária no build.
RUN npm run build

# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Saída standalone do Next.js: server.js + node_modules mínimos + assets.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
