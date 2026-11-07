# syntax=docker/dockerfile:1

# Imagem da API (NestJS). Build a partir da raiz do monorepo:
#   docker build -f apps/api/Dockerfile -t ufc-flow-api .
# Na subida, aplica as migrations e sobe a API na porta 3333. Os seeds do
# primeiro deploy rodam dentro do container (docs/v2/deploy.md).

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache libc6-compat && corepack enable

# Estágio 1: dependências e bundle da API
FROM base AS builder
WORKDIR /app

# Baixa as dependências só a partir do lockfile (camada cacheável)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY . .
# Só a API e os pacotes do workspace de que ela depende (sem web e extensão)
RUN pnpm install --offline --frozen-lockfile --filter "@ufc-flow/api..."
RUN pnpm --filter @ufc-flow/api build
# node_modules só de produção, sem links para o workspace (os pacotes
# internos já estão no bundle)
RUN pnpm --filter @ufc-flow/api deploy --prod --legacy /out

# Estágio 2: execução
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3333
ENV UPLOADS_DIR=/data/uploads
ENV MIGRATIONS_DIR=/app/drizzle

RUN apk add --no-cache libc6-compat \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 api \
  && mkdir -p /data/uploads \
  && chown api:nodejs /data/uploads

COPY --from=builder --chown=api:nodejs /out/package.json ./package.json
COPY --from=builder --chown=api:nodejs /out/node_modules ./node_modules
COPY --from=builder --chown=api:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=api:nodejs /app/apps/api/drizzle ./drizzle

USER api
# Os uploads ficam num volume (docker/compose.prod.yml)
VOLUME ["/data/uploads"]
EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3333/v1/health || exit 1

CMD ["sh", "-c", "node dist/migrate.js && exec node dist/main.js"]
