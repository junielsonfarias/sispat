#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO - CONFLITO DE DIRETÓRIO SISPAT
# Para resolver problemas de diretório já existente durante instalação
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

log_header "Corrigindo conflito de diretório SISPAT..."

# Definir diretório da aplicação
APP_DIR="/var/www/sispat"

# Verificar se o diretório existe
if [ ! -d "$APP_DIR" ]; then
    log_info "Diretório $APP_DIR não existe, criando..."
    mkdir -p $APP_DIR
fi

# Navegar para o diretório
cd $APP_DIR

log_info "Verificando conteúdo do diretório $APP_DIR..."

# Verificar se há arquivos do SISPAT
if [ -f "package.json" ] || [ -d ".git" ]; then
    log_warning "Diretório já contém arquivos do SISPAT!"
    
    # Fazer backup se necessário
    if [ -f "package.json" ]; then
        log_info "Fazendo backup do package.json..."
        cp package.json package.json.backup 2>/dev/null || true
    fi
    
    # Limpar arquivos existentes
    log_info "Limpando arquivos existentes..."
    rm -rf .git package.json package-lock.json node_modules dist .env
    
    log_success "Diretório limpo com sucesso!"
else
    log_info "Diretório está vazio, pronto para clonar!"
fi

# Clonar repositório
log_info "Clonando repositório SISPAT..."
git clone https://github.com/junielsonfarias/sispat.git .

if [ $? -eq 0 ]; then
    log_success "Repositório clonado com sucesso!"
else
    log_error "Erro ao clonar repositório!"
    exit 1
fi

# Verificar se o clone foi bem-sucedido
if [ -f "package.json" ]; then
    log_success "Arquivos do SISPAT baixados com sucesso!"
    
    # Mostrar informações do projeto
    log_info "Informações do projeto:"
    echo -e "📁 Diretório: ${YELLOW}$APP_DIR${NC}"
    echo -e "📦 Projeto: ${YELLOW}$(grep '"name"' package.json | cut -d'"' -f4)${NC}"
    echo -e "📋 Versão: ${YELLOW}$(grep '"version"' package.json | cut -d'"' -f4)${NC}"
    
else
    log_error "Arquivos do SISPAT não foram baixados corretamente!"
    exit 1
fi

log_header "Correção Concluída!"
echo -e "\n${GREEN}🎉 Conflito de diretório resolvido com sucesso!${NC}"
echo -e "\n${BLUE}📋 PRÓXIMOS PASSOS:${NC}"
echo -e "1. ${YELLOW}Execute o script de instalação principal novamente${NC}"
echo -e "2. ${YELLOW}Ou continue manualmente com: npm install --legacy-peer-deps${NC}"

echo -e "\n${GREEN}✅ Agora você pode continuar com a instalação!${NC}"
