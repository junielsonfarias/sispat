# ===========================================
# SISPAT 2.0 - DOCKERFILE PARA PRODUÇÃO
# ===========================================

# Multi-stage build para otimização
FROM node:18-alpine AS base

# Instalar dependências do sistema
RUN apk add --no-cache libc6-compat

# Configurar diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/

# Instalar pnpm
RUN npm install -g pnpm

# ===========================================
# STAGE 1: Build do Frontend
# ===========================================
FROM base AS frontend-builder

# Instalar dependências do frontend
COPY . .
RUN pnpm install --frozen-lockfile

# Build do frontend para produção
RUN pnpm run build:prod

# ===========================================
# STAGE 2: Build do Backend
# ===========================================
FROM base AS backend-builder

# Instalar dependências do backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Copiar código fonte
COPY backend/ .

# Build do backend
RUN npm run build:prod

# ===========================================
# STAGE 3: Imagem de Produção
# ===========================================
FROM node:18-alpine AS production

# Instalar dependências do sistema
RUN apk add --no-cache \
    dumb-init \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S sispat -u 1001

# Configurar diretório de trabalho
WORKDIR /app

# Copiar backend buildado
COPY --from=backend-builder --chown=sispat:nodejs /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=sispat:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=sispat:nodejs /app/backend/package.json ./backend/
COPY --from=backend-builder --chown=sispat:nodejs /app/backend/prisma ./backend/prisma

# Copiar frontend buildado
COPY --from=frontend-builder --chown=sispat:nodejs /app/dist ./dist

# Criar diretórios necessários
RUN mkdir -p /app/backend/uploads /app/backend/logs /app/backend/backups \
    && chown -R sispat:nodejs /app/backend/uploads /app/backend/logs /app/backend/backups

# Configurar usuário
USER sispat

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/dist/index.js"]
