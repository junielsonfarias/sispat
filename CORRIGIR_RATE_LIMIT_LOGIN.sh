#!/bin/bash

# Script para corrigir o erro 429 (Too Many Requests) no login
# Autor: GPT-4

# Cores para a saída do terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

error() {
    echo -e "${RED}[ERRO]${NC} $1"
    exit 1
}

log "Iniciando correção do rate limit de login..."

# 1. Navegar para o diretório do projeto
log "Navegando para /var/www/sispat..."
cd /var/www/sispat || error "Falha ao navegar para /var/www/sispat. Verifique se o diretório existe."
success "Diretório do projeto acessado."

# 2. Atualizar o código do repositório
log "Atualizando o código do repositório (git pull origin main)..."
sudo git pull origin main || error "Falha ao executar 'git pull origin main'."
success "Código atualizado com sucesso."

# 3. Limpar cache do rate limit no Redis (se disponível)
log "Verificando se Redis está disponível..."
if command -v redis-cli &> /dev/null; then
    log "Redis encontrado. Limpando cache do rate limit de autenticação..."
    
    # Limpar todas as chaves do rate limit de autenticação
    redis-cli --scan --pattern "rl:auth:*" | xargs -r redis-cli del 2>/dev/null || warning "Falha ao limpar cache do Redis. Pode não haver chaves para limpar."
    redis-cli --scan --pattern "rl:global:*" | xargs -r redis-cli del 2>/dev/null || warning "Falha ao limpar cache global do Redis."
    
    success "Cache do rate limit limpo no Redis."
else
    warning "Redis não encontrado. O rate limit está usando memória (será limpo ao reiniciar o backend)."
fi

# 4. Recompilar o backend
log "Recompilando o backend (npm run build --prefix backend)..."
cd backend
npm run build || error "Falha ao recompilar o backend. Verifique os logs acima para detalhes."
success "Backend recompilado com sucesso."
cd ..

# 5. Reiniciar o backend (PM2)
log "Reiniciando o backend (pm2 restart sispat-backend)..."
pm2 restart sispat-backend || error "Falha ao reiniciar o backend. Verifique se o PM2 está configurado corretamente."
success "Backend reiniciado com sucesso."

# 6. Verificar status do backend
log "Verificando status do backend..."
sleep 2
pm2 status sispat-backend

success "Correções aplicadas com sucesso!"
log ""
log "📋 Correções aplicadas:"
log "  ✅ Rate limit de login aumentado de 5 para 20 tentativas por 15 minutos"
log "  ✅ Global rate limiter agora ignora rotas de autenticação"
log "  ✅ Cache do rate limit limpo no Redis (se disponível)"
log "  ✅ Backend recompilado e reiniciado"
log ""
log "⚠️  Se o erro 429 persistir:"
log "  1. Aguarde 15 minutos para o rate limit expirar naturalmente"
log "  2. Ou limpe manualmente o Redis com: redis-cli --scan --pattern 'rl:*' | xargs redis-cli del"
log "  3. Ou reinicie o backend novamente: pm2 restart sispat-backend"
