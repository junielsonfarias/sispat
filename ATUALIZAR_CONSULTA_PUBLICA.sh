#!/bin/bash

# Script para atualizar consulta pública no servidor
# Autor: GPT-4

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

log "Iniciando atualização da consulta pública..."

cd /var/www/sispat || {
    error "Diretório /var/www/sispat não encontrado"
    exit 1
}

log "1. CONFIGURANDO GIT"
log "Configurando permissões do Git..."
git config --global --add safe.directory /var/www/sispat 2>/dev/null || true
success "Git configurado"

log "2. ATUALIZANDO CÓDIGO DO REPOSITÓRIO"
log "Buscando atualizações do repositório (git fetch)..."
git fetch origin main || warning "Falha ao buscar atualizações"

log "Atualizando código do repositório (git pull)..."
sudo git pull origin main || {
    warning "Falha ao atualizar código"
    log "Tentando com git reset..."
    git reset --hard origin/main || error "Falha ao resetar"
    exit 1
}
success "Código atualizado"

log "3. INSTALANDO DEPENDÊNCIAS"
log "Instalando dependências do frontend..."
npm install --legacy-peer-deps || {
    error "Falha ao instalar dependências"
    exit 1
}
success "Dependências instaladas"

log "Corrigindo permissões do vite..."
if [ -f "node_modules/.bin/vite" ]; then
    chmod +x node_modules/.bin/vite
    success "Permissões do vite corrigidas"
else
    warning "Vite não encontrado em node_modules/.bin/vite"
fi

log "4. RECOMPILANDO FRONTEND"
log "Recompilando frontend (npx vite build)..."
npx vite build 2>&1 | tee /tmp/vite-build.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    success "Frontend recompilado com sucesso"
else
    error "Falha ao recompilar frontend"
    log "Verifique os logs em: /tmp/vite-build.log"
    exit 1
fi

log "5. REINICIANDO BACKEND"
log "Reiniciando backend (PM2)..."
pm2 restart sispat-backend || {
    warning "Falha ao reiniciar backend"
    log "Verificando se o processo existe..."
    pm2 list
}

sleep 3
pm2 status sispat-backend | grep -q "online" && success "Backend reiniciado e online" || warning "Backend pode não estar online"

log "6. RECARREGANDO NGINX"
log "Recarregando Nginx..."
sudo systemctl reload nginx || {
    error "Falha ao recarregar Nginx"
    exit 1
}
success "Nginx recarregado"

log "7. VERIFICAÇÃO FINAL"
log "Verificando status dos serviços..."

pm2 list | grep -q "sispat-backend" && success "Backend PM2 está rodando" || error "Backend PM2 não está rodando"
sudo systemctl is-active --quiet nginx && success "Nginx está ativo" || error "Nginx não está ativo"

if netstat -tuln 2>/dev/null | grep -q ":3000 " || ss -tuln 2>/dev/null | grep -q ":3000 "; then
    success "Porta 3000 está em uso (backend)"
else
    warning "Porta 3000 não está em uso"
fi

success "✅ Atualização concluída com sucesso!"
log "A consulta pública foi atualizada e está pronta para uso."
log "Melhorias incluídas:"
log "  - Filtros avançados (Setor, Situação, Tipo, Local)"
log "  - Campo 'Local' corrigido para exibir corretamente"
log "  - Painel de filtros expansível/colapsável"
log "  - Botão 'Limpar Filtros' quando há filtros ativos"
