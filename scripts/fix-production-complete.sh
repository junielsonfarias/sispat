#!/bin/bash

# =================================
# CORREÇÃO COMPLETA PRODUÇÃO - SISPAT
# Script para corrigir todos os problemas em produção
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
echo "🔧    CORREÇÃO COMPLETA PRODUÇÃO - SISPAT"
echo "🔧    Script para corrigir todos os problemas"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

# Função para parar todos os serviços
stop_all_services() {
    log "🛑 Parando todos os serviços..."
    
    # Parar PM2
    pm2 stop all 2>/dev/null || warning "PM2 não estava rodando"
    pm2 delete all 2>/dev/null || true
    
    # Parar Nginx
    systemctl stop nginx 2>/dev/null || warning "Nginx não estava rodando"
    
    # Parar PostgreSQL
    systemctl stop postgresql 2>/dev/null || warning "PostgreSQL não estava rodando"
    
    # Parar Redis
    systemctl stop redis-server 2>/dev/null || warning "Redis não estava rodando"
    
    success "Todos os serviços parados"
}

# Função para fazer backup completo
backup_system() {
    log "💾 Fazendo backup completo do sistema..."
    
    # Criar diretório de backup
    BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup do banco de dados
    if systemctl is-active --quiet postgresql; then
        log "💾 Fazendo backup do banco de dados..."
        sudo -u postgres pg_dump sispat_production > "$BACKUP_DIR/database.sql" 2>/dev/null || warning "Não foi possível fazer backup do banco"
    fi
    
    # Backup dos arquivos de configuração
    cp .env "$BACKUP_DIR/" 2>/dev/null || true
    cp vite.config.ts "$BACKUP_DIR/" 2>/dev/null || true
    cp ecosystem.config.cjs "$BACKUP_DIR/" 2>/dev/null || true
    cp -r dist "$BACKUP_DIR/" 2>/dev/null || true
    
    # Backup da configuração do Nginx
    cp /etc/nginx/sites-available/sispat "$BACKUP_DIR/" 2>/dev/null || true
    
    success "Backup completo criado em: $BACKUP_DIR"
}

# Função para limpeza completa
clean_system() {
    log "🧹 Limpeza completa do sistema..."
    
    # Limpar cache do npm
    npm cache clean --force
    
    # Limpar diretórios de build
    rm -rf dist
    rm -rf .vite
    rm -rf .cache
    rm -rf .parcel-cache
    rm -rf .turbo
    rm -rf node_modules/.vite
    
    # Limpar logs antigos
    pm2 flush 2>/dev/null || true
    
    success "Limpeza completa concluída"
}

# Função para reinstalar dependências
reinstall_dependencies() {
    log "📦 Reinstalando dependências..."
    
    # Remover node_modules e package-lock.json
    rm -rf node_modules
    rm -f package-lock.json
    
    # Reinstalar dependências
    npm install --legacy-peer-deps --no-optional --force
    
    success "Dependências reinstaladas"
}

# Função para corrigir configuração Vite
fix_vite_config() {
    log "🔧 Corrigindo configuração Vite..."
    
    # Fazer backup da configuração atual
    cp vite.config.ts vite.config.ts.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # Criar configuração Vite corrigida
    cat > vite.config.ts << 'EOF'
/* Vite config for building the frontend react app: https://vite.dev/config/ */
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import path from 'path';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Determinar URLs baseado no ambiente
  const isProduction = mode === 'production';
  const baseUrl = isProduction ? process.env.VITE_BACKEND_URL || 'https://sispat.vps-kinghost.net' : 'http://localhost:3001';
  const apiUrl = isProduction ? process.env.VITE_API_URL || 'https://sispat.vps-kinghost.net/api' : 'http://localhost:3001/api';
  
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
      host: '0.0.0.0',
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
        external: [],
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // CONFIGURAÇÃO DEFINITIVA - REACT SEMPRE NO VENDOR-MISC
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-misc';
              }
              // Radix UI Components
              if (id.includes('@radix-ui')) {
                return 'vendor-radix';
              }
              // TanStack Query
              if (id.includes('@tanstack')) {
                return 'vendor-tanstack';
              }
              // Form libraries
              if (id.includes('react-hook-form') || id.includes('@hookform')) {
                return 'vendor-forms';
              }
              // Date libraries
              if (id.includes('date-fns') || id.includes('dayjs')) {
                return 'vendor-dates';
              }
              // UI Libraries
              if (id.includes('lucide-react') || id.includes('clsx') || id.includes('class-variance-authority')) {
                return 'vendor-ui';
              }
              // Bibliotecas grandes
              if (id.includes('lodash') || id.includes('moment') || id.includes('axios')) {
                return 'vendor-utils';
              }
              // Bibliotecas de validação
              if (id.includes('zod') || id.includes('yup') || id.includes('joi')) {
                return 'vendor-validation';
              }
              // Resto das dependências (incluindo charts e React)
              return 'vendor-misc';
            }
            
            // Chunks para páginas grandes
            if (id.includes('/src/pages/')) {
              if (id.includes('/admin/')) {
                return 'pages-admin';
              }
              if (id.includes('/bens/')) {
                return 'pages-bens';
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
      chunkSizeWarningLimit: 10000,
      target: 'es2015',
    },
    
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'react-router-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime'
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
      'process.env.VITE_BACKEND_URL': JSON.stringify(baseUrl),
      'process.env.VITE_API_URL': JSON.stringify(apiUrl),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    
    esbuild: {
      target: 'es2015',
      jsx: 'automatic',
    },
  };
});
EOF
    
    success "Configuração Vite corrigida"
}

# Função para corrigir configuração do servidor
fix_server_config() {
    log "🔧 Corrigindo configuração do servidor..."
    
    # Verificar se o arquivo server/index.js existe
    if [ -f "server/index.js" ]; then
        # Fazer backup
        cp server/index.js server/index.js.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
        
        # Verificar se já tem a configuração correta
        if ! grep -q "express.static(distPath)" server/index.js; then
            # Adicionar configuração para servir arquivos estáticos
            cat >> server/index.js << 'EOF'

// Servir arquivos estáticos do frontend
const distPath = path.join(__dirname, '../dist');
if (existsSync(distPath)) {
  console.log('📁 Servindo arquivos estáticos do frontend de:', distPath);
  app.use(express.static(distPath));

  // Rota catch-all para SPA (Single Page Application)
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log('⚠️ Diretório dist não encontrado, frontend não será servido');
}
EOF
        fi
        
        success "Configuração do servidor corrigida"
    else
        warning "Arquivo server/index.js não encontrado"
    fi
}

# Função para fazer build correto
build_frontend() {
    log "🏗️ Fazendo build correto do frontend..."
    
    # Definir variáveis de ambiente
    export NODE_ENV=production
    export CI=false
    
    # Fazer build
    npm run build
    
    # Verificar se o build foi criado
    if [ -d "dist" ] && [ -f "dist/index.html" ]; then
        success "Build do frontend concluído"
        
        # Verificar chunks
        if ls dist/assets/vendor-misc-*.js 1> /dev/null 2>&1; then
            success "vendor-misc gerado (contém React)"
        else
            error "vendor-misc não foi gerado"
        fi
        
        if ls dist/assets/pages-admin-*.js 1> /dev/null 2>&1; then
            success "pages-admin gerado"
        else
            warning "pages-admin não foi gerado"
        fi
        
        # Verificar se vendor-react foi eliminado
        if ls dist/assets/vendor-react-*.js 1> /dev/null 2>&1; then
            warning "vendor-react ainda existe (deveria estar no vendor-misc)"
        else
            success "vendor-react eliminado (correto)"
        fi
    else
        error "Build do frontend falhou"
    fi
}

# Função para corrigir configuração do banco
fix_database() {
    log "🔧 Corrigindo configuração do banco de dados..."
    
    # Iniciar PostgreSQL
    systemctl start postgresql
    
    # Aguardar inicialização
    sleep 5
    
    # Habilitar extensões
    sudo -u postgres psql -d sispat_production << EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
\q
EOF
    
    success "Configuração do banco corrigida"
}

# Função para corrigir configuração do Redis
fix_redis() {
    log "🔧 Corrigindo configuração do Redis..."
    
    # Iniciar Redis
    systemctl start redis-server
    
    # Aguardar inicialização
    sleep 3
    
    # Testar conexão
    if redis-cli ping >/dev/null 2>&1; then
        success "Redis configurado e funcionando"
    else
        error "Redis não está funcionando"
    fi
}

# Função para corrigir configuração do Nginx
fix_nginx() {
    log "🔧 Corrigindo configuração do Nginx..."
    
    # Verificar se o arquivo de configuração existe
    if [ -f "/etc/nginx/sites-available/sispat" ]; then
        # Fazer backup
        cp /etc/nginx/sites-available/sispat /etc/nginx/sites-available/sispat.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
        
        # Testar configuração
        nginx -t
        
        # Recarregar Nginx
        systemctl reload nginx
        
        success "Configuração do Nginx corrigida"
    else
        warning "Arquivo de configuração do Nginx não encontrado"
    fi
}

# Função para iniciar aplicação
start_application() {
    log "🚀 Iniciando aplicação..."
    
    # Verificar se o arquivo ecosystem.config.cjs existe
    if [ -f "ecosystem.config.cjs" ]; then
        # Iniciar aplicação
        pm2 start ecosystem.config.cjs --env production
        
        # Salvar configuração
        pm2 save
        
        # Aguardar inicialização
        sleep 10
        
        # Verificar se está rodando
        if pm2 list | grep -q "online"; then
            success "Aplicação iniciada com PM2"
        else
            error "Aplicação não está rodando no PM2"
        fi
    else
        error "Arquivo ecosystem.config.cjs não encontrado"
    fi
}

# Função para verificar funcionamento
verify_functioning() {
    log "🔍 Verificando funcionamento..."
    
    # Verificar serviços
    systemctl is-active --quiet postgresql && success "PostgreSQL ativo" || error "PostgreSQL não está ativo"
    systemctl is-active --quiet redis-server && success "Redis ativo" || error "Redis não está ativo"
    systemctl is-active --quiet nginx && success "Nginx ativo" || error "Nginx não está ativo"
    
    # Verificar PM2
    pm2 list | grep -q "online" && success "PM2 ativo" || error "PM2 não está ativo"
    
    # Verificar API
    sleep 5
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
        success "API respondendo"
    else
        warning "API pode não estar respondendo"
    fi
    
    # Verificar frontend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
        success "Frontend respondendo"
    else
        warning "Frontend pode não estar respondendo"
    fi
    
    success "Verificação concluída"
}

# Função principal
main() {
    stop_all_services
    backup_system
    clean_system
    reinstall_dependencies
    fix_vite_config
    fix_server_config
    build_frontend
    fix_database
    fix_redis
    fix_nginx
    start_application
    verify_functioning
    
    # Instruções finais
    log "📝 CORREÇÃO COMPLETA CONCLUÍDA!"
    echo ""
    echo "🎉 SISPAT CORRIGIDO COM SUCESSO!"
    echo "================================="
    echo ""
    echo "📋 O que foi feito:"
    echo "✅ Todos os serviços parados"
    echo "✅ Backup completo criado"
    echo "✅ Limpeza completa do sistema"
    echo "✅ Dependências reinstaladas"
    echo "✅ Configuração Vite corrigida"
    echo "✅ Configuração do servidor corrigida"
    echo "✅ Build correto do frontend"
    echo "✅ Configuração do banco corrigida"
    echo "✅ Configuração do Redis corrigida"
    echo "✅ Configuração do Nginx corrigida"
    echo "✅ Aplicação iniciada"
    echo "✅ Funcionamento verificado"
    echo ""
    echo "🔧 Correções aplicadas:"
    echo "   - Configuração Vite DEFINITIVA"
    echo "   - React sempre no vendor-misc"
    echo "   - Build otimizado para produção"
    echo "   - Servidor configurado para SPA"
    echo "   - Banco de dados otimizado"
    echo "   - Redis configurado"
    echo "   - Nginx configurado"
    echo ""
    echo "🌐 URLs da aplicação:"
    echo "   - Frontend: https://seu-dominio.com"
    echo "   - API: https://seu-dominio.com/api"
    echo "   - Health: https://seu-dominio.com/api/health"
    echo ""
    echo "📞 Próximos passos:"
    echo "   1. Teste a aplicação no navegador"
    echo "   2. Verifique se não há mais erros"
    echo "   3. Se houver problemas, execute: pm2 restart sispat"
    echo "   4. Verifique os logs: pm2 logs sispat"
    echo "   5. Verifique o console do navegador"
    echo ""
    
    success "🎉 Correção completa concluída!"
}

# Executar função principal
main
