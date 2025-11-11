#!/bin/bash

# Script para atualizar a versão em produção da aplicação SISPAT.
# Uso: sudo bash scripts/update-production-version.sh [branch]

set -euo pipefail

BRANCH="${1:-main}"
PROJECT_DIR="/var/www/sispat"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
PM2_PROCESS_NAME="${PM2_PROCESS_NAME:-sispat-backend}"

log() {
  echo ""
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

ensure_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Comando obrigatório não encontrado: $1"
    exit 1
  fi
}

log "🔍 Validando pré-requisitos..."
ensure_command git
ensure_command pm2
ensure_command npm

if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ Diretório do projeto não encontrado em $PROJECT_DIR"
  exit 1
fi

log "📂 Acessando diretório do projeto..."
cd "$PROJECT_DIR"

log "🧹 Salvando alterações locais (se existirem)..."
git stash push -u -m "backup-$(date '+%Y%m%d-%H%M%S')" || true

log "📡 Atualizando repositório (branch: $BRANCH)..."
git fetch --all --prune
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

log "📦 Atualizando backend..."
cd "$BACKEND_DIR"

log "📥 Instalando dependências do backend..."
if ! npm ci; then
  log "⚠️ Falha ao executar 'npm ci'. Tentando 'npm install'..."
  npm install
fi

log "🔧 Corrigindo permissões de binários do backend..."
chmod +x node_modules/.bin/* 2>/dev/null || true
chmod +x node_modules/@prisma/engines/* 2>/dev/null || true

log "🗄️ Aplicando migrações do banco..."
npx prisma migrate deploy

log "🏗️ Gerando build do backend..."
npm run build

log "🚀 Reiniciando processo PM2 ($PM2_PROCESS_NAME)..."
pm2 restart "$PM2_PROCESS_NAME"
pm2 save

if [ -d "$FRONTEND_DIR" ]; then
  log "🎨 Atualizando frontend..."
  cd "$FRONTEND_DIR"

  PACKAGE_MANAGER="pnpm"
  if ! command -v pnpm >/dev/null 2>&1; then
    PACKAGE_MANAGER="npm"
  fi

  log "📥 Instalando dependências do frontend com $PACKAGE_MANAGER..."
  if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    if ! pnpm install --frozen-lockfile; then
      log "⚠️ Falha no 'pnpm install --frozen-lockfile'. Tentando 'pnpm install'..."
      pnpm install
    fi
    pnpm run build
  else
    if ! npm ci; then
      log "⚠️ Falha no 'npm ci'. Tentando 'npm install'..."
      npm install
    fi
    npm run build
  fi
else
  log "ℹ️ Diretório do frontend não encontrado. Pulando etapa do build do frontend."
fi

log "🧹 Limpando cache do Nginx..."
if command -v systemctl >/dev/null 2>&1; then
  sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
  sudo systemctl reload nginx || true
else
  log "ℹ️ systemctl não encontrado. Verifique manualmente o serviço do Nginx."
fi

log "🔁 Restaurando stash automática (se necessário)..."
STASH_LIST="$(git stash list)"
if echo "$STASH_LIST" | grep -q "backup-"; then
  log "ℹ️ Existem stashes criadas pelo script. Revise com 'git stash list'."
fi

log "✅ Atualização concluída com sucesso!"
log "📋 Próximos passos sugeridos:"
echo "  • pm2 status"
echo "  • pm2 logs $PM2_PROCESS_NAME --lines 100"
echo "  • curl -k https://seu-dominio/api/health"
echo ""

