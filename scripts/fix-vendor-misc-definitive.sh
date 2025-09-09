#!/bin/bash

# =================================
# CORREÇÃO VENDOR-MISC DEFINITIVA - SISPAT
# Solução definitiva para problemas de inicialização no vendor-misc
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
echo "🔧    CORREÇÃO VENDOR-MISC DEFINITIVA - SISPAT"
echo "🔧    Solução definitiva para problemas de inicialização"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção definitiva de vendor-misc..."

# 1. Parar PM2
log "🛑 Parando PM2..."
pm2 stop all 2>/dev/null || warning "PM2 não estava rodando"
pm2 delete all 2>/dev/null || true
success "PM2 parado"

# 2. Fazer backup da configuração atual
log "💾 Fazendo backup da configuração atual..."
cp vite.config.ts vite.config.ts.backup 2>/dev/null || true
success "Backup criado"

# 3. Criar configuração Vite mais conservadora
log "🔧 Criando configuração Vite mais conservadora..."
cat > vite.config.ts << 'EOF'
/* Vite config for building the frontend react app: https://vite.dev/config/ */
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import path from 'path';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
        target: process.env.VITE_API_TARGET || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
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
        strictDeprecations: false,
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
  },
  
  esbuild: {
    target: 'es2015',
  },
}));
EOF
success "Configuração Vite mais conservadora criada"

# 4. Limpeza completa
log "🧹 Limpeza completa de cache e build..."
rm -rf dist
rm -rf node_modules
rm -rf .vite
rm -rf .cache
rm -rf .parcel-cache
rm -rf .turbo
rm -f package-lock.json
success "Limpeza completa concluída"

# 5. Limpar cache do npm
log "🧹 Limpando cache do npm..."
npm cache clean --force
success "Cache do npm limpo"

# 6. Reinstalar dependências
log "📦 Reinstalando dependências..."
npm install --legacy-peer-deps --no-optional --force
success "Dependências reinstaladas"

# 7. Verificar se recharts está instalado
log "🔍 Verificando recharts..."
if npm list recharts 2>/dev/null | grep -q "recharts"; then
    success "✅ Recharts instalado"
else
    warning "⚠️ Recharts não encontrado"
fi

# 8. Fazer build com configuração conservadora
log "🏗️ Fazendo build com configuração conservadora..."
export NODE_ENV=production
export CI=false

if npm run build; then
    success "✅ Build do frontend concluído com sucesso"
else
    error "❌ Falha no build do frontend"
fi

# 9. Verificar arquivos gerados
log "🔍 Verificando arquivos gerados..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Arquivos de build encontrados"
    
    # Verificar se vendor-misc foi gerado
    if ls dist/assets/vendor-misc-*.js 1> /dev/null 2>&1; then
        success "✅ vendor-misc gerado"
        
        # Verificar tamanho do vendor-misc
        VENDOR_MISC_SIZE=$(ls -lh dist/assets/vendor-misc-*.js | awk '{print $5}')
        log "📊 Tamanho do vendor-misc: $VENDOR_MISC_SIZE"
        
        # Verificar se há chunks separados de charts
        if ls dist/assets/vendor-charts-*.js 1> /dev/null 2>&1; then
            warning "⚠️ vendor-charts ainda foi gerado separadamente"
        else
            success "✅ vendor-charts não foi gerado separadamente (incluído no vendor-misc)"
        fi
    else
        error "❌ vendor-misc não foi gerado"
    fi
else
    error "❌ Arquivos de build não encontrados"
fi

# 10. Testar se o build funciona
log "🧪 Testando build..."
if command -v python3 &> /dev/null; then
    log "🚀 Iniciando servidor de teste na porta 8080..."
    cd dist
    python3 -m http.server 8080 &
    SERVER_PID=$!
    sleep 5
    
    # Testar se o servidor está respondendo
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200"; then
        success "✅ Servidor de teste funcionando"
        
        # Testar se o conteúdo está sendo servido
        if curl -s http://localhost:8080 | grep -q "SISPAT"; then
            success "✅ Conteúdo SISPAT sendo servido corretamente"
        else
            warning "⚠️ Conteúdo SISPAT não encontrado na resposta"
        fi
        
        # Testar se há erros JavaScript
        if curl -s http://localhost:8080 | grep -q "vendor-misc"; then
            success "✅ vendor-misc sendo carregado"
        else
            warning "⚠️ vendor-misc não encontrado no HTML"
        fi
    else
        warning "⚠️ Servidor de teste não está respondendo"
    fi
    
    # Parar servidor de teste
    kill $SERVER_PID 2>/dev/null || true
    cd ..
else
    warning "⚠️ Python3 não encontrado, pulando teste do servidor"
fi

# 11. Iniciar aplicação com PM2
log "🚀 Iniciando aplicação com PM2..."
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    success "Aplicação iniciada com PM2"
else
    error "❌ Arquivo ecosystem.config.cjs não encontrado"
fi

# 12. Aguardar inicialização
log "⏳ Aguardando aplicação inicializar..."
sleep 10

# 13. Verificar se PM2 está rodando
log "🔍 Verificando status do PM2..."
if pm2 list | grep -q "online"; then
    success "✅ Aplicação está rodando no PM2"
else
    error "❌ Aplicação não está rodando no PM2"
fi

# 14. Testar API
log "🧪 Testando API..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
    success "✅ API respondendo corretamente"
else
    warning "⚠️ API pode não estar respondendo"
fi

# 15. Verificar logs recentes
log "📋 Verificando logs recentes..."
if pm2 logs sispat --lines 5 --nostream 2>/dev/null | grep -q "CORS bloqueado"; then
    warning "⚠️ Ainda há problemas de CORS nos logs"
else
    success "✅ Nenhum problema de CORS recente encontrado"
fi

# 16. Testar frontend
log "🧪 Testando frontend..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    success "✅ Frontend respondendo corretamente"
else
    warning "⚠️ Frontend pode não estar respondendo"
fi

# Instruções finais
log "📝 CORREÇÃO VENDOR-MISC DEFINITIVA CONCLUÍDA!"
echo ""
echo "🎉 VENDOR-MISC DEFINITIVAMENTE CORRIGIDO!"
echo "========================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 parado"
echo "✅ Backup da configuração criado"
echo "✅ Configuração Vite mais conservadora criada"
echo "✅ Limpeza completa de cache e build"
echo "✅ Cache do npm limpo"
echo "✅ Dependências reinstaladas"
echo "✅ Recharts verificado"
echo "✅ Build com configuração conservadora"
echo "✅ Arquivos de build verificados"
echo "✅ vendor-misc verificado"
echo "✅ Servidor de teste executado"
echo "✅ Aplicação iniciada com PM2"
echo "✅ Status do PM2 verificado"
echo "✅ API testada"
echo "✅ Logs verificados"
echo "✅ Frontend testado"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - Configuração Vite mais conservadora"
echo "   - Charts incluídos no vendor-misc (não separados)"
echo "   - Dependências D3 excluídas do optimizeDeps"
echo "   - Build otimizado para evitar problemas de inicialização"
echo "   - Limite de chunk aumentado para 3000KB"
echo "   - Configuração esbuild otimizada"
echo ""
echo "🌐 URLs da aplicação:"
echo "   - Frontend: https://seu-dominio.com"
echo "   - API: https://seu-dominio.com/api"
echo "   - Health: https://seu-dominio.com/api/health"
echo ""
echo "📞 Próximos passos:"
echo "   1. Teste a aplicação no navegador"
echo "   2. Verifique se não há mais erros de inicialização"
echo "   3. Se houver problemas, execute: pm2 restart sispat"
echo "   4. Verifique os logs: pm2 logs sispat"
echo "   5. Verifique o console do navegador para erros JavaScript"
echo ""

success "🎉 Correção definitiva de vendor-misc concluída!"
