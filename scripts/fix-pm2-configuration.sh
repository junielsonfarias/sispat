#!/bin/bash

# =================================
# CORREÇÃO CONFIGURAÇÃO PM2 - SISPAT
# Corrige problemas de configuração PM2
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

# Banner
echo ""
echo "🔧 ================================================"
echo "🔧    CORREÇÃO CONFIGURAÇÃO PM2 - SISPAT"
echo "🔧    Corrige problemas de configuração PM2"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# Parar todos os processos PM2
log "🛑 Parando processos PM2..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
success "Processos PM2 parados"

# Criar diretório de logs
log "📁 Criando diretório de logs..."
mkdir -p logs
success "Diretório de logs criado"

# Verificar se o arquivo de configuração existe
if [ ! -f "ecosystem.config.cjs" ]; then
    log "📝 Criando arquivo de configuração PM2..."
    cat > ecosystem.config.cjs << 'EOF'
/* eslint-disable no-undef */
/**
 * SISPAT - Configuração PM2 para Produção
 * Data: 09/09/2025
 * Versão: 0.0.193
 * Descrição: Configuração simplificada do PM2 para ambiente de produção
 */

module.exports = {
  apps: [
    {
      // Configuração principal da aplicação
      name: 'sispat',
      script: 'server/index.js',
      instances: 1, // Usar apenas 1 instância para evitar problemas
      exec_mode: 'fork',

      // Configurações de ambiente
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Configurações de performance
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',

      // Configurações de logs
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Configurações de restart
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // Configurações de monitoramento
      monitoring: true,
      pmx: true,

      // Configurações de timeout
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Configurações de cron
      cron_restart: '0 2 * * *', // Restart diário às 2h

      // Configurações de health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,

      // Configurações de source map
      source_map_support: true,

      // Configurações de timeout
      kill_retry_time: 100,

      // Configurações de interação
      interactive: false,

      // Configurações de timezone
      time: true,

      // Configurações de ignore watch
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        'backups',
        '.git',
        'dist',
        'coverage',
        'tests',
        'docs',
        'scripts',
        '*.log',
        '*.tmp',
        '*.temp',
      ],
    },
  ],
};
EOF
    success "Arquivo de configuração PM2 criado"
else
    success "Arquivo de configuração PM2 encontrado"
fi

# Verificar se o servidor existe
if [ ! -f "server/index.js" ]; then
    error "Arquivo server/index.js não encontrado"
fi

# Iniciar aplicação com PM2
log "🚀 Iniciando aplicação com PM2..."
if pm2 start ecosystem.config.cjs --env production; then
    success "✅ Aplicação iniciada com PM2"
else
    error "❌ Falha ao iniciar aplicação com PM2"
fi

# Salvar configuração PM2
log "💾 Salvando configuração PM2..."
pm2 save
success "✅ Configuração PM2 salva"

# Configurar startup automático
log "🔄 Configurando startup automático..."
pm2 startup
success "✅ Startup automático configurado"

# Verificar status
log "📊 Verificando status dos processos..."
pm2 status

# Verificar logs
log "📋 Verificando logs..."
pm2 logs --lines 10

# Instruções finais
log "📝 CORREÇÃO CONCLUÍDA!"
echo ""
echo "🎉 CONFIGURAÇÃO PM2 CORRIGIDA!"
echo "==============================="
echo ""
echo "📋 O que foi feito:"
echo "✅ Processos PM2 parados e removidos"
echo "✅ Diretório de logs criado"
echo "✅ Arquivo de configuração PM2 criado"
echo "✅ Aplicação iniciada com PM2"
echo "✅ Configuração salva"
echo "✅ Startup automático configurado"
echo ""
echo "🔧 Comandos úteis:"
echo "   - pm2 status (ver status)"
echo "   - pm2 logs (ver logs)"
echo "   - pm2 restart sispat (reiniciar)"
echo "   - pm2 stop sispat (parar)"
echo "   - pm2 delete sispat (remover)"
echo ""
echo "📞 Próximos passos:"
echo "   1. Verifique se a aplicação está funcionando: pm2 status"
echo "   2. Verifique os logs: pm2 logs"
echo "   3. Teste a aplicação: curl http://localhost:3001/api/health"
echo ""

success "🎉 Correção de configuração PM2 concluída!"
