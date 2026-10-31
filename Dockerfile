# syntax=docker/dockerfile:1

# Estágio base com Bun
FROM oven/bun:1-alpine AS base

# Estágio 1: Instalação de dependências
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Estágio 2: Compilação da aplicação
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Argumentos de build para variáveis NEXT_PUBLIC (injetadas pelo Coolify)
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CURRENT_YEAR
ARG NEXT_PUBLIC_CURRENT_SEMESTER

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CURRENT_YEAR=$NEXT_PUBLIC_CURRENT_YEAR
ENV NEXT_PUBLIC_CURRENT_SEMESTER=$NEXT_PUBLIC_CURRENT_SEMESTER
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN bun run build

# Estágio 3: Imagem final de execução mínima
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Cria usuário não-root por segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copia arquivos públicos e o bundle standalone otimizado
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
