#!/bin/bash

# =================================
# ATUALIZAÇÃO DE CONFIGURAÇÃO DE DOMÍNIO - SISPAT
# Script para atualizar configurações de domínio em instalações existentes
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
echo "🔄 ================================================"
echo "🔄    ATUALIZAÇÃO DE CONFIGURAÇÃO DE DOMÍNIO"
echo "🔄    SISPAT - Instalações Existentes"
echo "🔄 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# Verificar se a aplicação está rodando
if ! pm2 list | grep -q "sispat"; then
    error "Aplicação SISPAT não está rodando. Execute: pm2 start ecosystem.config.cjs"
fi

# 1. Detectar domínio atual
log "🔍 Detectando configuração atual..."

CURRENT_DOMAIN=""
CURRENT_PROTOCOL="http"

# Verificar arquivo env.production
if [ -f "env.production" ]; then
    CURRENT_DOMAIN=$(grep "VITE_BACKEND_URL" env.production | cut -d'=' -f2 | sed 's|https\?://||' | sed 's|/api||')
    if [[ "$CURRENT_DOMAIN" == *"localhost"* ]] || [[ "$CURRENT_DOMAIN" == *"127.0.0.1"* ]]; then
        CURRENT_DOMAIN=""
    fi
fi

# Se não encontrou domínio, tentar detectar automaticamente
if [ -z "$CURRENT_DOMAIN" ]; then
    log "🔍 Detectando domínio automaticamente..."
    
    # Método 1: Verificar configuração do Nginx
    if [ -f "/etc/nginx/sites-available/sispat" ]; then
        NGINX_DOMAIN=$(grep -o "server_name [^;]*" /etc/nginx/sites-available/sispat | awk '{print $2}' | head -1)
        if [ ! -z "$NGINX_DOMAIN" ] && [[ "$NGINX_DOMAIN" != "localhost" ]]; then
            CURRENT_DOMAIN="$NGINX_DOMAIN"
            log "📡 Domínio detectado via Nginx: $CURRENT_DOMAIN"
        fi
    fi
    
    # Método 2: Verificar certificado SSL
    if [ -z "$CURRENT_DOMAIN" ] && [ -d "/etc/letsencrypt/live" ]; then
        SSL_DOMAIN=$(ls /etc/letsencrypt/live/ | head -1)
        if [ ! -z "$SSL_DOMAIN" ]; then
            CURRENT_DOMAIN="$SSL_DOMAIN"
            log "📡 Domínio detectado via SSL: $CURRENT_DOMAIN"
        fi
    fi
fi

# Se ainda não encontrou, solicitar do usuário
if [ -z "$CURRENT_DOMAIN" ]; then
    echo ""
    warning "⚠️ Não foi possível detectar o domínio automaticamente"
    echo ""
    read -p "🌐 Digite o domínio da sua aplicação (ex: sispat.exemplo.com): " CURRENT_DOMAIN
    
    if [ -z "$CURRENT_DOMAIN" ]; then
        error "❌ Domínio é obrigatório"
    fi
fi

# Validar domínio
if [[ ! "$CURRENT_DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$ ]]; then
    error "❌ Domínio inválido: $CURRENT_DOMAIN"
fi

# Determinar protocolo
if [ -d "/etc/letsencrypt/live/$CURRENT_DOMAIN" ]; then
    CURRENT_PROTOCOL="https"
    success "✅ Certificado SSL encontrado - usando HTTPS"
else
    CURRENT_PROTOCOL="http"
    warning "⚠️ Certificado SSL não encontrado - usando HTTP"
fi

CURRENT_BASE_URL="$CURRENT_PROTOCOL://$CURRENT_DOMAIN"
CURRENT_API_URL="$CURRENT_PROTOCOL://$CURRENT_DOMAIN/api"
CURRENT_WS_URL="wss://$CURRENT_DOMAIN"

success "✅ Configuração atual detectada:"
echo "   🌐 Domínio: $CURRENT_DOMAIN"
echo "   🔒 Protocolo: $CURRENT_PROTOCOL"
echo "   🌐 Base URL: $CURRENT_BASE_URL"
echo "   🔌 API URL: $CURRENT_API_URL"

# 2. Fazer backup dos arquivos
log "💾 Fazendo backup dos arquivos de configuração..."
cp env.production env.production.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
cp vite.config.ts vite.config.ts.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
success "✅ Backups criados"

# 3. Atualizar env.production
log "📝 Atualizando env.production..."

cat > env.production << EOF
# Configurações de Produção - SISPAT
# Este arquivo define as variáveis de ambiente para produção
# Atualizado automaticamente em: $(date)

# URL do backend em produção
VITE_BACKEND_URL=$CURRENT_BASE_URL
VITE_API_URL=$CURRENT_API_URL

# Configurações de ambiente
NODE_ENV=production
VITE_NODE_ENV=production

# Configurações de build
VITE_APP_VERSION=1.0.0
VITE_BUILD_DATE=$(date +%Y-%m-%d)

# Configurações de debug (desabilitado em produção)
VITE_DEBUG=false
VITE_ENABLE_LOGS=false

# Configurações de Sentry (se necessário)
# VITE_SENTRY_DSN=

# Configurações de analytics (desabilitado)
VITE_ENABLE_ANALYTICS=false

# Configurações de WebSocket
VITE_WS_URL=$CURRENT_WS_URL

# Configurações de upload
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# Configurações de paginação
VITE_DEFAULT_PAGE_SIZE=20
VITE_MAX_PAGE_SIZE=100

# Configurações de relatórios
VITE_MAX_EXPORT_ROWS=10000
VITE_DEFAULT_REPORT_FORMAT=pdf

# Configurações de notificações
VITE_AUTO_HIDE_DURATION=5000
VITE_MAX_NOTIFICATIONS=10

# Configurações de autenticação
VITE_SESSION_TIMEOUT=1800000
VITE_MAX_LOGIN_ATTEMPTS=5
VITE_LOCKOUT_DURATION=1800000

# Configurações de desenvolvimento (desabilitado em produção)
VITE_DEV_MODE=false
VITE_MOCK_API=false

# Configurações específicas do domínio
DOMAIN=$CURRENT_DOMAIN
PROTOCOL=$CURRENT_PROTOCOL
BASE_URL=$CURRENT_BASE_URL
API_URL=$CURRENT_API_URL
WS_URL=$CURRENT_WS_URL
EOF

success "✅ env.production atualizado"

# 4. Atualizar vite.config.ts
log "📝 Atualizando vite.config.ts..."

cat > vite.config.ts << 'EOF'
/* Vite config for building the frontend react app: https://vite.dev/config/ */
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import path from 'path';
import tailwindcss from 'tailwindcss';
import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carregar variáveis de ambiente
  const env = loadEnv(mode, process.cwd(), '');
  
  // Determinar URLs baseado no ambiente
  const isProduction = mode === 'production';
  const baseUrl = isProduction ? env.VITE_BACKEND_URL || 'https://sispat.vps-kinghost.net' : 'http://localhost:3001';
  const apiUrl = isProduction ? env.VITE_API_URL || 'https://sispat.vps-kinghost.net/api' : 'http://localhost:3001/api';
  
  return {
    // Configuração base para resolver problemas de roteamento
    base: '/',
    
    plugins: [react({
      jsxRuntime: 'automatic',
      babel: {
        plugins: []
      }
    })],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    
    server: {
      host: '0.0.0.0', // Permite acesso externo
      port: parseInt(process.env.VITE_PORT || '8080'),
      proxy: {
        '/api': {
          target: isProduction ? baseUrl : 'http://localhost:3001',
          changeOrigin: true,
          secure: isProduction,
        },
      },
    },
    
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // React e React DOM - chunk separado
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              // React Router - chunk separado
              if (id.includes('react-router')) {
                return 'vendor-router';
              }
              // Radix UI Components - chunk separado
              if (id.includes('@radix-ui')) {
                return 'vendor-radix';
              }
              // TanStack Query - chunk separado
              if (id.includes('@tanstack')) {
                return 'vendor-tanstack';
              }
              // Form libraries - chunk separado
              if (id.includes('react-hook-form') || id.includes('@hookform')) {
                return 'vendor-forms';
              }
              // Date libraries - chunk separado
              if (id.includes('date-fns') || id.includes('dayjs')) {
                return 'vendor-dates';
              }
              // UI Libraries - chunk separado
              if (id.includes('lucide-react') || id.includes('clsx') || id.includes('class-variance-authority')) {
                return 'vendor-ui';
              }
              // Bibliotecas grandes separadas
              if (id.includes('lodash') || id.includes('moment') || id.includes('axios')) {
                return 'vendor-utils';
              }
              // Bibliotecas de validação
              if (id.includes('zod') || id.includes('yup') || id.includes('joi')) {
                return 'vendor-validation';
              }
              // Resto das dependências (incluindo charts) - SEM SEPARAÇÃO
              return 'vendor-misc';
            }
            
            // Chunks para páginas grandes
            if (id.includes('/src/pages/')) {
              if (id.includes('/bens/')) {
                return 'pages-bens';
              }
              if (id.includes('/admin/')) {
                return 'pages-admin';
              }
              if (id.includes('/dashboards/')) {
                return 'pages-dashboards';
              }
              if (id.includes('/imoveis/')) {
                return 'pages-imoveis';
              }
              return 'pages-misc';
            }
            
            return null;
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `assets/[name]-[hash].js`;
          },
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          format: 'es',
        },
      },
      minify: mode === 'production' ? 'esbuild' : false,
      chunkSizeWarningLimit: 3000, // Aumentar limite para evitar warnings
      target: 'es2015',
    },
    
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'react-router-dom'
      ],
      exclude: [
        '@vite/client', 
        '@vite/env', 
        'recharts',
        'd3-scale',
        'd3-array',
        'd3-time',
        'd3-time-format',
        'd3-shape',
        'd3-path',
        'd3-color',
        'd3-interpolate',
        'd3-ease',
        'd3-selection',
        'd3-transition',
        'd3-zoom',
        'd3-brush',
        'd3-drag',
        'd3-force',
        'd3-hierarchy',
        'd3-quadtree',
        'd3-timer',
        'd3-dispatch'
      ],
      force: true,
    },
    
    css: {
      devSourcemap: mode === 'development',
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer,
        ],
      },
    },
    
    preview: {
      port: 4173,
      host: true,
    },
    
    define: {
      global: 'globalThis',
      // Definir URLs para o build
      'process.env.VITE_BACKEND_URL': JSON.stringify(baseUrl),
      'process.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    
    esbuild: {
      target: 'es2015',
    },
  };
});
EOF

success "✅ vite.config.ts atualizado"

# 5. Fazer rebuild
log "🏗️ Fazendo rebuild com novas configurações..."

# Parar PM2 temporariamente
pm2 stop sispat

# Limpar build anterior
rm -rf dist

# Fazer novo build
export NODE_ENV=production
export CI=false

if npm run build; then
    success "✅ Build do frontend concluído com sucesso"
else
    error "❌ Falha no build do frontend"
fi

# 6. Verificar build
log "🔍 Verificando build..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Arquivos de build encontrados"
    
    # Verificar se as URLs estão corretas no build
    if grep -q "$CURRENT_BASE_URL" dist/index.html; then
        success "✅ URLs do domínio encontradas no build"
    else
        warning "⚠️ URLs do domínio não encontradas no build"
    fi
else
    error "❌ Arquivos de build não encontrados"
fi

# 7. Reiniciar aplicação
log "🚀 Reiniciando aplicação..."
pm2 start sispat
pm2 save

# Aguardar inicialização
sleep 5

# Verificar status
if pm2 list | grep -q "online"; then
    success "✅ Aplicação reiniciada com sucesso"
else
    error "❌ Falha ao reiniciar aplicação"
fi

# 8. Testar configuração
log "🧪 Testando configuração..."

# Testar frontend
if curl -s -o /dev/null -w "%{http_code}" "$CURRENT_BASE_URL" | grep -q "200"; then
    success "✅ Frontend acessível em $CURRENT_BASE_URL"
else
    warning "⚠️ Frontend pode não estar acessível em $CURRENT_BASE_URL"
fi

# Testar API
if curl -s -o /dev/null -w "%{http_code}" "$CURRENT_API_URL/health" | grep -q "200"; then
    success "✅ API acessível em $CURRENT_API_URL"
else
    warning "⚠️ API pode não estar acessível em $CURRENT_API_URL"
fi

# Instruções finais
log "📝 ATUALIZAÇÃO DE CONFIGURAÇÃO DE DOMÍNIO CONCLUÍDA!"
echo ""
echo "🎉 CONFIGURAÇÃO DE DOMÍNIO ATUALIZADA!"
echo "======================================"
echo ""
echo "📋 Configurações aplicadas:"
echo "✅ Domínio: $CURRENT_DOMAIN"
echo "✅ Protocolo: $CURRENT_PROTOCOL"
echo "✅ Base URL: $CURRENT_BASE_URL"
echo "✅ API URL: $CURRENT_API_URL"
echo "✅ WebSocket: $CURRENT_WS_URL"
echo ""
echo "🔧 Arquivos atualizados:"
echo "✅ env.production - URLs do domínio"
echo "✅ vite.config.ts - Configuração dinâmica"
echo "✅ dist/ - Build com URLs corretas"
echo ""
echo "🌐 URLs da aplicação:"
echo "   - Frontend: $CURRENT_BASE_URL"
echo "   - API: $CURRENT_API_URL"
echo "   - Health: $CURRENT_API_URL/health"
echo ""
echo "📞 Próximos passos:"
echo "   1. Teste a aplicação no navegador: $CURRENT_BASE_URL"
echo "   2. Verifique se não há mais referências a localhost"
echo "   3. Se houver problemas, execute: pm2 restart sispat"
echo "   4. Verifique os logs: pm2 logs sispat"
echo "   5. Verifique o console do navegador para erros JavaScript"
echo ""

success "🎉 Atualização de configuração de domínio concluída!"
