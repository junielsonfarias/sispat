#!/bin/bash

# Script para aplicar as correções do erro "removeChild" no ambiente de produção (Versão 2)
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

log "Iniciando aplicação das correções para o erro 'removeChild' (Versão 2)..."

# 1. Navegar para o diretório do projeto
log "Navegando para /var/www/sispat..."
cd /var/www/sispat || error "Falha ao navegar para /var/www/sispat. Verifique se o diretório existe."
success "Diretório do projeto acessado."

# 2. Atualizar o código do repositório
log "Atualizando o código do repositório (git pull origin main)..."
sudo git pull origin main || error "Falha ao executar 'git pull origin main'."
success "Código atualizado com sucesso."

# 3. Corrigir permissões do vite (se necessário)
log "Verificando e corrigindo permissões do Vite..."
if [ -f "node_modules/.bin/vite" ]; then
    sudo chmod +x node_modules/.bin/vite || warning "Falha ao corrigir permissões do Vite. Pode ser um problema se o Vite for executado diretamente."
    success "Permissões do Vite verificadas/corrigidas."
else
    warning "Arquivo node_modules/.bin/vite não encontrado. Pulando correção de permissões."
fi

# 4. Recompilar o frontend
log "Recompilando o frontend (npm run build)..."
npm run build || error "Falha ao recompilar o frontend. Verifique os logs acima para detalhes."
success "Frontend recompilado com sucesso."

# 5. Recarregar Nginx
log "Recarregando Nginx (sudo systemctl reload nginx)..."
sudo systemctl reload nginx || error "Falha ao recarregar Nginx. Verifique a configuração do Nginx."
success "Nginx recarregado com sucesso."

success "Correções aplicadas com sucesso!"
log "Por favor, limpe o cache do seu navegador completamente (Ctrl+Shift+Delete) e tente acessar a aplicação novamente."
log "As correções incluem:"
log "  - Controle de estado para renderização do Toaster"
log " - Desativação do Toaster antes da navegação"
log "  - Proteções adicionais contra atualizações de estado em componentes desmontados"
