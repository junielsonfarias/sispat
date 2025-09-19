#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO - DEPENDÊNCIAS NPM SISPAT
# Para resolver conflitos de dependências do React 19
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${BLUE}🚀 $1${NC}"
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
    log_error "Este script deve ser executado como root!"
    log_info "Execute: sudo su -"
    exit 1
fi

log_header "Corrigindo dependências NPM do SISPAT..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    log_error "Arquivo package.json não encontrado!"
    log_info "Execute este script no diretório do SISPAT"
    exit 1
fi

# Limpar cache do npm
log_info "Limpando cache do NPM..."
npm cache clean --force

# Remover node_modules e package-lock.json se existirem
log_info "Removendo node_modules e package-lock.json..."
rm -rf node_modules package-lock.json

# Instalar dependências com legacy-peer-deps
log_info "Instalando dependências com --legacy-peer-deps..."
npm install --legacy-peer-deps

# Verificar se a instalação foi bem-sucedida
if [ $? -eq 0 ]; then
    log_success "Dependências instaladas com sucesso!"
else
    log_error "Erro ao instalar dependências!"
    log_info "Tentando com --force..."
    npm install --force
fi

# Verificar se node_modules foi criado
if [ -d "node_modules" ]; then
    log_success "node_modules criado com sucesso!"
    
    # Verificar se as dependências principais estão instaladas
    if [ -d "node_modules/react" ] && [ -d "node_modules/express" ]; then
        log_success "Dependências principais verificadas!"
    else
        log_warning "Algumas dependências podem estar faltando"
    fi
else
    log_error "node_modules não foi criado!"
    exit 1
fi

log_header "Correção Concluída!"
echo -e "\n${GREEN}🎉 Dependências NPM corrigidas com sucesso!${NC}"
echo -e "\n${BLUE}📋 PRÓXIMOS PASSOS:${NC}"
echo -e "1. ${YELLOW}Continue com a instalação do SISPAT${NC}"
echo -e "2. ${YELLOW}Execute o build do projeto${NC}"
echo -e "3. ${YELLOW}Inicie o sistema${NC}"

echo -e "\n${GREEN}✅ Agora você pode continuar com a instalação!${NC}"