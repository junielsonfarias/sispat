#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO IMEDIATA - INSTALAÇÃO ATUAL SISPAT
# Para resolver o problema atual de package.json não encontrado
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

log_header "Correção IMEDIATA da instalação atual..."

# Definir diretório da aplicação
APP_DIR="/var/www/sispat"

# Verificar se estamos no diretório correto
if [ "$(pwd)" != "$APP_DIR" ]; then
    log_info "Navegando para $APP_DIR..."
    cd $APP_DIR
fi

log_info "Diretório atual: $(pwd)"

# Verificar o que há no diretório
log_info "Conteúdo do diretório:"
ls -la

# Verificar se package.json existe
if [ -f "package.json" ]; then
    log_success "package.json já existe!"
else
    log_warning "package.json não encontrado, clonando repositório..."
    
    # Limpar diretório completamente
    log_info "Limpando diretório..."
    rm -rf * .[^.]* 2>/dev/null || true
    
    # Clonar repositório
    log_info "Clonando repositório SISPAT..."
    if git clone https://github.com/junielsonfarias/sispat.git .; then
        log_success "Repositório clonado com sucesso!"
    else
        log_error "Erro ao clonar repositório!"
        log_info "Tentando com shallow clone..."
        if git clone --depth 1 https://github.com/junielsonfarias/sispat.git .; then
            log_success "Repositório clonado com sucesso (shallow)!"
        else
            log_error "Falha completa ao clonar!"
            exit 1
        fi
    fi
fi

# Verificar se package.json existe agora
if [ ! -f "package.json" ]; then
    log_error "package.json ainda não existe após clone!"
    exit 1
fi

log_success "package.json encontrado!"

# Mostrar informações do projeto
log_info "Informações do projeto:"
echo -e "📁 Diretório: ${YELLOW}$(pwd)${NC}"
echo -e "📦 Projeto: ${YELLOW}$(grep '"name"' package.json | cut -d'"' -f4)${NC}"
echo -e "📋 Versão: ${YELLOW}$(grep '"version"' package.json | cut -d'"' -f4)${NC}"

# Instalar dependências
log_info "Instalando dependências..."
if npm install --legacy-peer-deps; then
    log_success "Dependências instaladas com sucesso!"
else
    log_warning "Erro ao instalar dependências, tentando correção..."
    npm cache clean --force
    rm -rf node_modules package-lock.json
    if npm install --legacy-peer-deps --force; then
        log_success "Dependências instaladas após correção!"
    else
        log_error "Falha ao instalar dependências!"
        exit 1
    fi
fi

# Verificar se node_modules foi criado
if [ -d "node_modules" ]; then
    log_success "node_modules criado com sucesso!"
else
    log_error "node_modules não foi criado!"
    exit 1
fi

log_header "Correção IMEDIATA Concluída!"
echo -e "\n${GREEN}🎉 Instalação corrigida com sucesso!${NC}"
echo -e "\n${BLUE}📋 PRÓXIMOS PASSOS:${NC}"
echo -e "1. ${YELLOW}Execute: npm run build${NC}"
echo -e "2. ${YELLOW}Continue com a configuração do ambiente${NC}"
echo -e "3. ${YELLOW}Inicie o sistema com PM2${NC}"

echo -e "\n${GREEN}✅ Agora você pode continuar com a instalação!${NC}"
