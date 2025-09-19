#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO FORÇADA - DIRETÓRIO SISPAT
# Para resolver problemas persistentes de diretório não vazio
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

log_header "Correção FORÇADA de diretório SISPAT..."

# Definir diretório da aplicação
APP_DIR="/var/www/sispat"

log_info "Removendo completamente o diretório $APP_DIR..."

# Parar qualquer processo que possa estar usando o diretório
log_info "Parando processos que possam estar usando o diretório..."
pkill -f "sispat" 2>/dev/null || true
pkill -f "node.*sispat" 2>/dev/null || true

# Aguardar um pouco
sleep 2

# Remover completamente o diretório
log_info "Removendo diretório completamente..."
cd /var/www
rm -rf sispat

# Criar diretório limpo
log_info "Criando diretório limpo..."
mkdir -p sispat
cd sispat

# Verificar se está vazio
if [ "$(ls -A . 2>/dev/null)" ]; then
    log_error "Diretório não está vazio após criação!"
    exit 1
fi

log_success "Diretório criado e vazio!"

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

log_header "Correção FORÇADA Concluída!"
echo -e "\n${GREEN}🎉 Diretório SISPAT recriado com sucesso!${NC}"
echo -e "\n${BLUE}📋 PRÓXIMOS PASSOS:${NC}"
echo -e "1. ${YELLOW}Execute o script de instalação principal novamente${NC}"
echo -e "2. ${YELLOW}Ou continue manualmente com: npm install --legacy-peer-deps${NC}"

echo -e "\n${GREEN}✅ Agora você pode continuar com a instalação!${NC}"
