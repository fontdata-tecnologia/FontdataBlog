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
# As NEXT_PUBLIC_* são embutidas no bundle em build time — precisam existir AQUI,
# não em runtime. O workflow do GitHub Actions as passa via --build-arg.
# DATABASE_URL e demais segredos NÃO são necessários no build (são lidos em runtime).
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_BLOG_NAME
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_BLOG_NAME=$NEXT_PUBLIC_BLOG_NAME
RUN npm run build

# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# curl é necessário para os Scheduled Jobs do Coolify, que rodam DENTRO do
# container e chamam os endpoints de cron via `curl`. A imagem node:alpine só
# traz o wget do BusyBox por padrão — sem esta linha o job falha com
# "sh: curl: not found".
RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Saída standalone do Next.js: server.js + node_modules mínimos + assets.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Credenciais do Google Cloud Storage gravadas na imagem a partir de um secret
# do BuildKit (id=gcs_credentials). O secret NÃO fica no histórico/metadados da
# imagem — apenas o arquivo resultante é persistido na layer. O workflow passa o
# conteúdo via `secrets:` (a partir do secret GCS_CREDENTIALS_JSON do GitHub).
# Se o secret não for fornecido, o arquivo simplesmente não é criado (build não quebra).
RUN --mount=type=secret,id=gcs_credentials \
    mkdir -p /app/secrets && \
    if [ -s /run/secrets/gcs_credentials ]; then \
      cp /run/secrets/gcs_credentials /app/secrets/gcs.json && \
      chown nextjs:nodejs /app/secrets/gcs.json && \
      chmod 400 /app/secrets/gcs.json && \
      echo "Credenciais GCS gravadas em /app/secrets/gcs.json"; \
    else \
      echo "Secret gcs_credentials ausente — pulando gravação das credenciais GCS"; \
    fi
# lib/storage.ts usa GOOGLE_APPLICATION_CREDENTIALS quando GCS_CREDENTIALS_JSON não está setado.
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/gcs.json

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
