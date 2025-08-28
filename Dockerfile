# =================================
# DOCKERFILE MULTI-STAGE OTIMIZADO
# SISPAT - Sistema de Patrimônio
# =================================

# ===== STAGE 1: BASE =====
FROM node:20-alpine AS base

# Metadados da imagem
LABEL maintainer="SISPAT Team"
LABEL description="Sistema de Gestão de Patrimônio"
LABEL version="1.0.0"

# Args de build
ARG NODE_ENV=production
ARG BUILD_DATE
ARG VCS_REF

# Instalar dependências do sistema
RUN apk add --no-cache \
    dumb-init \
    curl \
    bash \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Configurar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Configurar diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração do package manager
COPY package.json pnpm-lock.yaml ./
COPY .npmrc ./

# ===== STAGE 2: DEPENDENCIES =====
FROM base AS deps

# Instalar pnpm
RUN npm install -g pnpm@8

# Instalar dependências de produção
RUN pnpm install --frozen-lockfile --prod

# ===== STAGE 3: BUILD =====
FROM base AS builder

# Instalar pnpm
RUN npm install -g pnpm@8

# Copiar dependências
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Configurar variáveis de build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build da aplicação
RUN pnpm build

# ===== STAGE 4: RUNTIME =====
FROM base AS runner

# Configurar ambiente de produção
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Metadados de build
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.revision=$VCS_REF
LABEL org.opencontainers.image.source="https://github.com/usuario/sispat"

# Copiar arquivos necessários
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar scripts de saúde e inicialização
COPY --chown=nextjs:nodejs docker/health-check.sh ./
COPY --chown=nextjs:nodejs docker/start.sh ./
RUN chmod +x health-check.sh start.sh

# Configurar health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ./health-check.sh

# Mudar para usuário não-root
USER nextjs

# Expor porta
EXPOSE 3000

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["./start.sh"]
