# ===========================================
# SISPAT 2.0 - DOCKERFILE PARA PRODUÇÃO
# ===========================================

# Multi-stage build para otimização
FROM node:20-alpine AS base

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

# Compilar o pacote compartilhado (@sispat/shared) ANTES do build do frontend.
# shared/dist é gitignored; sem compilar aqui o vite build falha ao resolver
# @sispat/shared (dep file:./shared).
RUN cd shared && npm install && npm run build

# URL da API embutida no bundle do frontend. Passada como build ARG (via compose)
# e exposta como env para o vite no build. Vazio = usa o default do app
# (http://localhost:3000/api), suficiente para teste local; em domínio real,
# passe VITE_API_URL=https://seu-dominio/api.
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

# Build do frontend para produção
RUN pnpm run build:prod

# ===========================================
# STAGE 2: Build do Backend
# ===========================================
FROM base AS backend-builder

# Compilar o pacote compartilhado (@sispat/shared) ANTES de instalar/buildar o
# backend. O backend depende de shared via `file:../shared`; shared/dist é
# gitignored, então precisa ser compilado no contexto da imagem para que tanto
# o `npm ci` quanto o `build:prod` enxerguem shared/dist.
WORKDIR /app/shared
COPY shared/ ./
RUN npm install && npm run build

# Instalar TODAS as dependências (build precisa de devDeps: typescript + prisma CLI)
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci

# Copiar código fonte
COPY backend/ .

# Build do backend (tsc + prisma generate) e poda das devDeps para a imagem final
RUN npm run build:prod && npm prune --production

# ===========================================
# STAGE 3: Imagem de Produção
# ===========================================
FROM node:20-alpine AS production

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
    CMD curl -f http://localhost:3000/api/health || exit 1

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/dist/index.js"]
