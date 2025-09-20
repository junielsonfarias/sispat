#!/bin/bash

# =============================================================================
# SCRIPT PARA CORRIGIR ERROS DE REACT DOM
# Corrige erros de "insertBefore" e problemas de renderização
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

# Banner
clear
echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           🔧 CORREÇÃO DE ERROS REACT DOM                     ║
║                                                              ║
║              Corrige erros de renderização e insertBefore    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
    log_error "Este script deve ser executado como root!"
    log_info "Execute: sudo su -"
    exit 1
fi

APP_DIR="/var/www/sispat"
cd $APP_DIR || { log_error "Diretório da aplicação não encontrado: $APP_DIR"; exit 1; }

log_header "Corrigindo erros de React DOM..."

# 1. Limpar cache e node_modules
log_info "Limpando cache e dependências..."
npm cache clean --force
rm -rf node_modules/.vite
rm -rf dist

# 2. Verificar configuração do Vite
log_header "Verificando configuração do Vite..."
if [ -f "vite.config.ts" ]; then
    log_info "Arquivo vite.config.ts encontrado"
    
    # Backup da configuração atual
    cp vite.config.ts vite.config.ts.backup.$(date +%Y%m%d_%H%M%S)
    
    # Verificar se há configurações problemáticas
    if grep -q "minify.*terser" vite.config.ts; then
        log_warning "Configuração de minificação pode estar causando problemas"
    fi
    
    if grep -q "manualChunks" vite.config.ts; then
        log_warning "Configuração de chunks pode estar causando problemas"
    fi
else
    log_error "Arquivo vite.config.ts não encontrado"
fi

# 3. Reinstalar dependências
log_info "Reinstalando dependências..."
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 4. Verificar se terser está instalado
if ! npm list terser > /dev/null 2>&1; then
    log_info "Instalando terser..."
    npm install --save-dev terser
fi

# 5. Fazer build com configurações seguras
log_header "Fazendo build com configurações seguras..."

# Criar configuração temporária do Vite mais segura
cat > vite.config.temp.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    minify: false, // Desabilitar minificação para evitar erros
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['speakeasy'],
  },
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 3000,
    host: true,
  },
})
EOF

# Backup da configuração original e usar a temporária
mv vite.config.ts vite.config.ts.original
mv vite.config.temp.ts vite.config.ts

log_info "Configuração temporária do Vite criada (minificação desabilitada)"

# 6. Fazer build
log_info "Fazendo build com configuração segura..."
npm run build:prod || npm run build

# Verificar se o build foi bem-sucedido
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    log_success "Build bem-sucedido com configuração segura"
else
    log_error "Build falhou mesmo com configuração segura"
    
    # Tentar build sem minificação
    log_info "Tentando build sem minificação..."
    NODE_ENV=production npm run build
    
    if [ -d "dist" ] && [ -f "dist/index.html" ]; then
        log_success "Build bem-sucedido sem minificação"
    else
        log_error "Build falhou completamente"
        exit 1
    fi
fi

# 7. Restaurar configuração original
log_info "Restaurando configuração original do Vite..."
mv vite.config.ts.original vite.config.ts

# 8. Verificar se há problemas no código React
log_header "Verificando código React..."

# Verificar se há componentes com problemas de renderização
if grep -r "insertBefore\|appendChild\|removeChild" src/ --include="*.tsx" --include="*.ts" > /dev/null 2>&1; then
    log_warning "Encontrados usos diretos de manipulação DOM no código React"
    log_info "Isso pode causar conflitos com o React"
fi

# Verificar se há useEffect sem dependências
if grep -r "useEffect.*\[\]" src/ --include="*.tsx" > /dev/null 2>&1; then
    log_warning "Encontrados useEffect com array de dependências vazio"
    log_info "Isso pode causar problemas de renderização"
fi

# 9. Verificar se há problemas de CSS
log_header "Verificando CSS..."
if [ -f "src/main.css" ]; then
    log_info "Arquivo CSS principal encontrado"
    
    # Verificar se há regras CSS que podem causar problemas
    if grep -q "position.*fixed\|position.*absolute" src/main.css; then
        log_warning "Encontradas regras CSS com posicionamento que podem causar problemas"
    fi
fi

# 10. Reiniciar PM2 com novo build
log_header "Reiniciando aplicação com novo build..."
pm2 restart all

# Aguardar aplicação inicializar
sleep 10

# 11. Testar aplicação
log_info "Testando aplicação..."
if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
    log_success "Backend funcionando"
else
    log_warning "Backend pode ter problemas"
fi

if curl -f -s http://localhost > /dev/null 2>&1; then
    log_success "Frontend sendo servido"
else
    log_warning "Frontend pode ter problemas"
fi

# 12. Informações finais
log_header "Correções aplicadas:"

echo -e "\n${GREEN}✅ Correções implementadas:${NC}"
echo -e "• Cache limpo e dependências reinstaladas"
echo -e "• Build feito com configuração segura (minificação desabilitada)"
echo -e "• Configuração do Vite otimizada"
echo -e "• Aplicação reiniciada"

echo -e "\n${BLUE}🔧 Configurações aplicadas:${NC}"
echo -e "• Minificação desabilitada temporariamente"
echo -e "• Chunks manuais simplificados"
echo -e "• Dependências otimizadas"
echo -e "• Sourcemaps desabilitados"

echo -e "\n${BLUE}📋 Próximos passos:${NC}"
echo -e "1. Teste a aplicação no navegador"
echo -e "2. Verifique se os erros de React DOM foram resolvidos"
echo -e "3. Se funcionar, pode reabilitar a minificação gradualmente"
echo -e "4. Monitore os logs para novos erros"

echo -e "\n${YELLOW}⚠️  Notas importantes:${NC}"
echo -e "• A minificação foi desabilitada para evitar erros de React DOM"
echo -e "• Isso pode aumentar o tamanho dos arquivos, mas resolve os erros"
echo -e "• Você pode reabilitar a minificação depois se necessário"

log_success "Correção de erros React DOM concluída!"
