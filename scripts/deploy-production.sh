#!/bin/bash

# =================================
# SCRIPT DE DEPLOY PARA PRODUÇÃO
# SISPAT - Sistema de Patrimônio
# =================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Função para erro
error() {
    echo -e "${RED}[ERRO]${NC} $1"
    exit 1
}

# Função para sucesso
success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

# Função para aviso
warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz do projeto"
fi

# Configurações
PROJECT_NAME="sispat"
PRODUCTION_ENV=".env.production"
BACKUP_DIR="./backups/deploy"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

log "🚀 Iniciando deploy para produção..."

# 1. Verificar variáveis de ambiente
log "📋 Verificando variáveis de ambiente..."
if [ ! -f "$PRODUCTION_ENV" ]; then
    error "Arquivo $PRODUCTION_ENV não encontrado. Configure as variáveis de produção primeiro."
fi

# 2. Backup do sistema atual
log "💾 Criando backup do sistema atual..."
mkdir -p "$BACKUP_DIR"
if [ -d "dist" ]; then
    tar -czf "$BACKUP_DIR/frontend_backup_$TIMESTAMP.tar.gz" dist/
    success "Backup do frontend criado"
fi

if [ -d "logs" ]; then
    tar -czf "$BACKUP_DIR/logs_backup_$TIMESTAMP.tar.gz" logs/
    success "Backup dos logs criado"
fi

# 3. Parar serviços em execução
log "🛑 Parando serviços em execução..."
if command -v pm2 &> /dev/null; then
    pm2 stop "$PROJECT_NAME-backend" 2>/dev/null || warning "Backend não estava rodando"
    pm2 stop "$PROJECT_NAME-frontend" 2>/dev/null || warning "Frontend não estava rodando"
    success "Serviços parados"
else
    warning "PM2 não encontrado, pulando parada de serviços"
fi

# 4. Limpar builds anteriores
log "🧹 Limpando builds anteriores..."
rm -rf dist/ node_modules/.cache/
success "Cache limpo"

# 5. Instalar dependências de produção
log "📦 Instalando dependências de produção..."

# Configurar variáveis para produção
NODE_ENV=production
CI=false

# Instalar dependências incluindo Husky
log "🔧 Instalando Husky para hooks de qualidade..."

# Tentar instalar com pnpm primeiro
if pnpm install --frozen-lockfile; then
    success "Dependências instaladas com pnpm"
else
    log "⚠️ Falha com pnpm, tentando com --force..."
    if pnpm install --force; then
        success "Dependências instaladas com pnpm --force"
    else
        log "⚠️ Falha com pnpm, tentando com npm..."
        if npm install; then
            success "Dependências instaladas com npm"
        else
            error "Falha na instalação das dependências"
        fi
    fi
fi

# Configurar Husky para produção
log "🔧 Configurando Husky..."
npx husky install

# Verificar se o Husky foi instalado corretamente
if [ -f ".husky/pre-commit" ]; then
    success "Husky configurado com sucesso"
    log "📋 Hooks disponíveis:"
    ls -la .husky/
else
    error "Falha ao configurar Husky"
fi

success "Dependências instaladas"

# 6. Build da aplicação
log "🔨 Gerando build de produção..."
pnpm run build
if [ ! -d "dist" ]; then
    error "Build falhou - diretório dist não foi criado"
fi
success "Build gerado com sucesso"

# 7. Verificar build
log "✅ Verificando build..."
if [ -f "dist/index.html" ]; then
    success "Build verificado - index.html encontrado"
else
    error "Build inválido - index.html não encontrado"
fi

# 8. Configurar variáveis de ambiente
log "⚙️ Configurando variáveis de ambiente..."
if [ -f "$PRODUCTION_ENV" ]; then
    # Carregar variáveis de ambiente de forma segura
    set -a
    source "$PRODUCTION_ENV"
    set +a
    success "Variáveis de ambiente configuradas"
else
    error "Arquivo $PRODUCTION_ENV não encontrado"
fi

# 9. Iniciar serviços com PM2
log "🚀 Iniciando serviços com PM2..."
if command -v pm2 &> /dev/null; then
    # Iniciar backend
    pm2 start ecosystem.config.js --env production --name "$PROJECT_NAME-backend"
    success "Backend iniciado"
    
    # Aguardar backend estar pronto
    log "⏳ Aguardando backend estar pronto..."
    sleep 10
    
    # Verificar saúde do backend
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        success "Backend respondendo corretamente"
    else
        warning "Backend pode não estar totalmente funcional"
    fi
    
    # Salvar configuração PM2
    pm2 save
    success "Configuração PM2 salva"
else
    warning "PM2 não encontrado. Inicie manualmente com: node server/index.js"
fi

# 10. Verificar status final
log "🔍 Verificando status final..."
if command -v pm2 &> /dev/null; then
    pm2 status
fi

# 11. Limpeza
log "🧹 Limpando arquivos temporários..."
rm -rf node_modules/.cache/

# 12. Log de sucesso
log "🎉 Deploy concluído com sucesso!"
log "📊 Status dos serviços:"
if command -v pm2 &> /dev/null; then
    pm2 list
fi

log "🌐 URLs de acesso:"
log "   - Frontend: http://localhost:8080"
log "   - Backend: http://localhost:3001"
log "   - Health Check: http://localhost:3001/api/health"

log "📁 Backups salvos em: $BACKUP_DIR"
log "📝 Logs disponíveis em: ./logs/"

success "Deploy para produção concluído com sucesso!"
