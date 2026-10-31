# syntax=docker/dockerfile:1

# Estágio base: Node + pnpm (versão fixada em "packageManager" do package.json raiz)
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat && corepack enable

# Estágio 1: Compilação do app web
FROM base AS builder
WORKDIR /app

# Baixa as dependências só a partir do lockfile (camada cacheável)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY . .
RUN pnpm install --offline --frozen-lockfile

# Argumentos de build para variáveis NEXT_PUBLIC (injetadas pelo Coolify)
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CURRENT_YEAR
ARG NEXT_PUBLIC_CURRENT_SEMESTER

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CURRENT_YEAR=$NEXT_PUBLIC_CURRENT_YEAR
ENV NEXT_PUBLIC_CURRENT_SEMESTER=$NEXT_PUBLIC_CURRENT_SEMESTER
ENV NODE_ENV=production

RUN pnpm turbo run build --filter=@ufc-flow/web

# Estágio 2: Imagem final de execução mínima
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Cria usuário não-root por segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Bundle standalone: com outputFileTracingRoot na raiz do monorepo,
# o server.js fica em apps/web/ dentro do standalone
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
