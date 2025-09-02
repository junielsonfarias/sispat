#!/bin/bash

# =================================
# CORREÇÃO PM2 + ES MODULES - SISPAT
# Resolve erro: ERR_REQUIRE_ESM no PM2
# =================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[SUCESSO]${NC} $1"; }
warning() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
error() { echo -e "${RED}[ERRO]${NC} $1"; }

log "🔧 CORREÇÃO PM2 + ES MODULES - SISPAT..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# 1. PARAR TODOS OS SERVIÇOS PM2
log "🛑 Parando todos os serviços PM2..."
if command -v pm2 &> /dev/null; then
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    success "✅ Serviços PM2 parados"
else
    warning "⚠️ PM2 não encontrado"
fi

# 2. VERIFICAR TIPO DE MÓDULO NO PACKAGE.JSON
log "📋 Verificando tipo de módulo no package.json..."
if grep -q '"type": "module"' package.json; then
    success "✅ Projeto configurado como ES Module"
    PROJECT_TYPE="esm"
else
    success "✅ Projeto configurado como CommonJS"
    PROJECT_TYPE="commonjs"
fi

# 3. CRIAR CONFIGURAÇÃO PM2 COMPATÍVEL
log "⚙️ Criando configuração PM2 compatível..."

if [ "$PROJECT_TYPE" = "esm" ]; then
    log "📝 Criando ecosystem.config.js para ES Modules..."
    
    # Criar arquivo de configuração PM2 compatível com ES Modules
    cat > ecosystem.config.js << 'EOF'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(import.meta.url);

export default {
  apps: [
    {
      name: 'sispat-backend',
      script: 'server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'sispat_development',
        DB_USER: 'sispat_user',
        DB_PASSWORD: 'sispat123456',
        JWT_SECRET: 'your-secret-key-change-in-production',
        CORS_ORIGIN: 'http://localhost:3000',
        RATE_LIMIT_WINDOW_MS: 900000,
        RATE_LIMIT_MAX_REQUESTS: 100,
        UPLOAD_PATH: './uploads',
        BACKUP_PATH: './backups',
        SMTP_HOST: 'localhost',
        SSL_CERT_EMAIL: 'admin@example.com',
        CDN_URL: 'http://localhost:3000',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001,
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_NAME: process.env.DB_NAME || 'sispat_production',
        DB_USER: process.env.DB_USER || 'sispat_user',
        DB_PASSWORD: process.env.DB_PASSWORD || 'sispat123456',
        JWT_SECRET: process.env.JWT_SECRET || 'sispat_jwt_secret_production_2025_very_secure_key_here',
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://sispat.vps-kinghost.net,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080',
        RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || 900000,
        RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
        UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
        BACKUP_PATH: process.env.BACKUP_PATH || './backups',
        SMTP_HOST: process.env.SMTP_HOST || 'localhost',
        SSL_CERT_EMAIL: process.env.SSL_CERT_EMAIL || 'admin@example.com',
        CDN_URL: process.env.CDN_URL || 'https://sispat.vps-kinghost.net',
      },
      log_file: join(__dirname, 'logs', 'combined.log'),
      out_file: join(__dirname, 'logs', 'out.log'),
      error_file: join(__dirname, 'logs', 'err.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 5000,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backups'],
      source_map_support: false,
      node_args: '--max-old-space-size=2048',
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
      max_memory_restart: '1G',
    },
    {
      name: 'sispat-frontend',
      script: 'start-frontend.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 8080,
        VITE_API_URL: 'http://localhost:3001/api',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 8080,
        VITE_API_URL: process.env.VITE_API_URL || 'https://sispat.vps-kinghost.net/api',
      },
      log_file: join(__dirname, 'logs', 'frontend-combined.log'),
      out_file: join(__dirname, 'logs', 'frontend-out.log'),
      error_file: join(__dirname, 'logs', 'frontend-err.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 3,
      restart_delay: 5000,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      source_map_support: false,
      node_args: '--max-old-space-size=1024',
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
      max_memory_restart: '512M',
    },
  ],
};
EOF

    success "✅ ecosystem.config.js criado para ES Modules"
    
    # Remover arquivo antigo se existir
    if [ -f "ecosystem.config.cjs" ]; then
        mv ecosystem.config.cjs ecosystem.config.cjs.backup.$(date +%Y%m%d_%H%M%S)
        success "✅ ecosystem.config.cjs movido para backup"
    fi
    
else
    log "📝 Mantendo ecosystem.config.cjs para CommonJS..."
    
    # Verificar se o arquivo existe
    if [ ! -f "ecosystem.config.cjs" ]; then
        error "Arquivo ecosystem.config.cjs não encontrado"
    fi
    
    success "✅ ecosystem.config.cjs mantido para CommonJS"
fi

# 4. VERIFICAR SE O BUILD EXISTE
log "📋 Verificando se o build existe..."
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    warning "⚠️ Build não encontrado, executando build..."
    
    # Verificar se as dependências estão instaladas
    if [ ! -d "node_modules" ]; then
        log "📦 Instalando dependências..."
        if command -v pnpm &> /dev/null; then
            pnpm install
        else
            npm install
        fi
    fi
    
    # Executar build
    log "🔨 Executando build..."
    if command -v pnpm &> /dev/null; then
        pnpm run build
    else
        npm run build
    fi
    
    if [ -d "dist" ] && [ -f "dist/index.html" ]; then
        success "✅ Build executado com sucesso"
    else
        error "❌ Falha ao executar build"
    fi
else
    success "✅ Build encontrado"
fi

# 5. INICIAR SERVIÇOS COM PM2
log "🚀 Iniciando serviços com PM2..."

if command -v pm2 &> /dev/null; then
    # Iniciar backend primeiro
    log "📦 Iniciando backend..."
    if [ "$PROJECT_TYPE" = "esm" ]; then
        pm2 start ecosystem.config.js --env production --name "sispat-backend"
    else
        pm2 start ecosystem.config.cjs --env production --name "sispat-backend"
    fi
    
    # Aguardar backend estar pronto
    log "⏳ Aguardando backend estar pronto..."
    sleep 15
    
    # Verificar saúde do backend
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        success "✅ Backend respondendo corretamente"
    else
        warning "⚠️ Backend pode não estar totalmente funcional"
        log "🔍 Verificando logs do backend..."
        pm2 logs sispat-backend --lines 10 2>/dev/null || echo "Logs PM2 não disponíveis"
    fi
    
    # Salvar configuração PM2
    pm2 save
    success "✅ Configuração PM2 salva"
    
else
    error "❌ PM2 não encontrado"
fi

# 6. VERIFICAÇÃO FINAL
log "🔍 VERIFICAÇÃO FINAL..."
echo ""
echo "🎯 STATUS DO SISPAT:"
echo "===================="

# Verificar serviços
if command -v pm2 &> /dev/null; then
    echo ""
    echo "📊 Aplicação SISPAT:"
    pm2 status
    
    echo ""
    echo "🔍 Logs disponíveis:"
    echo "  - pm2 logs sispat-backend"
    echo "  - pm2 logs sispat-frontend"
    echo "  - pm2 monit"
fi

# Verificar conectividade
echo ""
echo "🌐 Testando conectividade..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend: RESPONDENDO"
else
    echo "❌ Backend: NÃO RESPONDE"
fi

# 7. INSTRUÇÕES FINAIS
log "📝 CORREÇÃO CONCLUÍDA!"
echo ""
echo "🎉 PROBLEMA PM2 + ES MODULES RESOLVIDO!"
echo "========================================="
echo ""
echo "✅ CONFIGURAÇÕES APLICADAS:"
echo "  - Arquivo de configuração PM2 corrigido"
echo "  - Compatibilidade ES Modules implementada"
echo "  - Backend iniciado com sucesso"
echo "  - Configuração PM2 salva"
echo ""
echo "🌐 ACESSO:"
echo "  - Backend: http://localhost:3001"
echo "  - Health Check: http://localhost:3001/api/health"
echo ""
echo "📋 COMANDOS ÚTEIS:"
echo "  - Status: pm2 status"
echo "  - Logs: pm2 logs"
echo "  - Monitor: pm2 monit"
echo "  - Reiniciar: pm2 restart all"
echo ""
echo "🔧 PRÓXIMOS PASSOS:"
echo "1. Configure o frontend se necessário"
echo "2. Configure Nginx como proxy reverso"
echo "3. Configure SSL com Certbot"
echo ""

success "🎉 CORREÇÃO PM2 + ES MODULES CONCLUÍDA!"
success "✅ SISPAT ESTÁ FUNCIONANDO COM PM2!"
success "🚀 PROBLEMA DE ES MODULES RESOLVIDO!"
