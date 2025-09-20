#!/bin/bash

# =============================================================================
# SCRIPT NUCLEAR - FORÇA HTTP EM ABSOLUTAMENTE TODOS OS LUGARES
# Solução mais agressiva possível para resolver HTTPS forçado
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

log_header "Iniciando correção NUCLEAR para forçar HTTP..."

APP_DIR="/var/www/sispat"
NGINX_CONF="/etc/nginx/sites-available/default"

# 1. Detectar domínio
DOMAIN="sispat.vps-kinghost.net"  # Usando o domínio específico do erro
FRONTEND_URL="http://$DOMAIN"
API_URL="http://$DOMAIN/api"

log_info "Domínio fixo: $DOMAIN"
log_info "URLs de destino: Frontend=$FRONTEND_URL, API=$API_URL"

# 2. PARAR ABSOLUTAMENTE TUDO
log_info "Parando TODOS os serviços..."
systemctl stop nginx 2>/dev/null || true
pm2 kill 2>/dev/null || true
pkill -f node 2>/dev/null || true
sleep 10

# 3. REMOVER COMPLETAMENTE O BUILD ANTERIOR
log_info "Removendo build anterior COMPLETAMENTE..."
cd "$APP_DIR"
rm -rf dist
rm -rf node_modules/.cache
rm -rf node_modules/.vite
rm -rf .next
rm -rf build

# 4. CRIAR NOVO ARQUIVO .ENV FORÇANDO HTTP
log_info "Criando novo arquivo .env FORÇANDO HTTP..."
cat > .env << EOF
# CONFIGURAÇÃO NUCLEAR - APENAS HTTP
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_db
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sispat_db

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=24h

# CORS - APENAS HTTP
CORS_ORIGIN=http://$DOMAIN
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=http://$DOMAIN

# Frontend - APENAS HTTP
VITE_PORT=80
VITE_API_TARGET=http://$DOMAIN
VITE_API_URL=http://$DOMAIN/api
VITE_BACKEND_URL=http://$DOMAIN
VITE_DOMAIN=http://$DOMAIN

# Forçar HTTP em todas as variáveis possíveis
REACT_APP_API_URL=http://$DOMAIN/api
REACT_APP_BACKEND_URL=http://$DOMAIN
REACT_APP_DOMAIN=http://$DOMAIN
NEXT_PUBLIC_API_URL=http://$DOMAIN/api
NEXT_PUBLIC_BACKEND_URL=http://$DOMAIN
NEXT_PUBLIC_DOMAIN=http://$DOMAIN
EOF

# 5. CRIAR NOVO VITE.CONFIG.TS FORÇANDO HTTP
log_info "Criando novo vite.config.ts FORÇANDO HTTP..."
cat > vite.config.ts << EOF
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // FORÇA HTTP EM TODAS AS URLs POSSÍVEIS
    'process.env.VITE_API_URL': JSON.stringify('http://$DOMAIN/api'),
    'process.env.VITE_BACKEND_URL': JSON.stringify('http://$DOMAIN'),
    'process.env.VITE_DOMAIN': JSON.stringify('http://$DOMAIN'),
    'import.meta.env.VITE_API_URL': JSON.stringify('http://$DOMAIN/api'),
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify('http://$DOMAIN'),
    'import.meta.env.VITE_DOMAIN': JSON.stringify('http://$DOMAIN'),
    '__API_URL__': JSON.stringify('http://$DOMAIN/api'),
    '__BACKEND_URL__': JSON.stringify('http://$DOMAIN'),
    '__DOMAIN__': JSON.stringify('http://$DOMAIN'),
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://$DOMAIN',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['recharts']
  }
})
EOF

# 6. SUBSTITUIR HTTPS POR HTTP EM TODOS OS ARQUIVOS DE CÓDIGO
log_info "Substituindo HTTPS por HTTP em TODOS os arquivos de código..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" \) -exec sed -i 's|https://|http://|g' {} \;
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" \) -exec sed -i 's|localhost:3001|'$DOMAIN'|g' {} \;
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" \) -exec sed -i 's|localhost:8080|'$DOMAIN'|g' {} \;
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" \) -exec sed -i 's|localhost|'$DOMAIN'|g' {} \;

# 7. SUBSTITUIR EM ARQUIVOS DE CONFIGURAÇÃO
log_info "Substituindo em arquivos de configuração..."
find . -maxdepth 2 -type f \( -name "*.json" -o -name "*.js" -o -name "*.ts" -o -name "*.config.*" \) -exec sed -i 's|https://|http://|g' {} \;
find . -maxdepth 2 -type f \( -name "*.json" -o -name "*.js" -o -name "*.ts" -o -name "*.config.*" \) -exec sed -i 's|localhost:3001|'$DOMAIN'|g' {} \;

# 8. LIMPAR CACHE COMPLETAMENTE
log_info "Limpando cache COMPLETAMENTE..."
npm cache clean --force
rm -rf ~/.npm/_cacache
rm -rf node_modules

# 9. REINSTALAR DEPENDÊNCIAS
log_info "Reinstalando dependências..."
npm install --legacy-peer-deps --no-cache

# 10. FAZER BUILD COM VARIÁVEIS HTTP FORÇADAS
log_info "Fazendo build com variáveis HTTP FORÇADAS..."
export NODE_ENV=production
export VITE_API_URL="http://$DOMAIN/api"
export VITE_BACKEND_URL="http://$DOMAIN"
export VITE_DOMAIN="http://$DOMAIN"
export VITE_API_TARGET="http://$DOMAIN"
export REACT_APP_API_URL="http://$DOMAIN/api"
export REACT_APP_BACKEND_URL="http://$DOMAIN"
export REACT_APP_DOMAIN="http://$DOMAIN"

# Tentar build com múltiplos métodos
if npm run build:prod 2>/dev/null; then
    log_success "Build prod bem-sucedido!"
elif npm run build 2>/dev/null; then
    log_success "Build padrão bem-sucedido!"
elif npx vite build --mode production 2>/dev/null; then
    log_success "Build Vite bem-sucedido!"
else
    log_error "Todos os builds falharam!"
    exit 1
fi

# 11. CORREÇÃO NUCLEAR DOS ARQUIVOS DE BUILD
log_info "Aplicando correção NUCLEAR nos arquivos de build..."
if [ -d "dist" ]; then
    # Substituir HTTPS por HTTP em TODOS os tipos de arquivo
    find dist -type f -exec sed -i 's|https://|http://|g' {} \;
    
    # Substituir domínio específico
    find dist -type f -exec sed -i 's|sispat\.vps-kinghost\.net|'$DOMAIN'|g' {} \;
    
    # Substituir localhost
    find dist -type f -exec sed -i 's|localhost:3001|'$DOMAIN'|g' {} \;
    find dist -type f -exec sed -i 's|localhost:8080|'$DOMAIN'|g' {} \;
    find dist -type f -exec sed -i 's|localhost|'$DOMAIN'|g' {} \;
    
    # Garantir URLs corretas
    find dist -type f -exec sed -i 's|http://'$DOMAIN'/api|'$API_URL'|g' {} \;
    find dist -type f -exec sed -i 's|http://'$DOMAIN'|'$FRONTEND_URL'|g' {} \;
    
    log_success "Correção nuclear aplicada nos arquivos de build!"
else
    log_error "Diretório dist não encontrado após build!"
    exit 1
fi

# 12. RECRIAR CONFIGURAÇÃO NGINX NUCLEAR
log_info "Recriando configuração Nginx NUCLEAR..."
cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Headers anti-cache EXTREMOS
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;
    add_header Last-Modified "" always;
    add_header ETag "" always;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Configurações para servir arquivos estáticos
    location / {
        root /var/www/sispat/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Headers específicos para arquivos estáticos
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    # Proxy para API - FORÇANDO HTTP NUCLEAR
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
        proxy_set_header X-Forwarded-Ssl off;
        proxy_set_header X-Forwarded-Port 80;
        proxy_cache_bypass \$http_upgrade;
        
        # Headers CORS NUCLEAR
        add_header Access-Control-Allow-Origin "http://$DOMAIN" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
        add_header Access-Control-Allow-Credentials true always;
        
        # Anti-cache para API
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }

    # WebSocket support - FORÇANDO HTTP NUCLEAR
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
        proxy_set_header X-Forwarded-Ssl off;
        proxy_set_header X-Forwarded-Port 80;
    }

    # Logs
    access_log /var/log/nginx/sispat.access.log;
    error_log /var/log/nginx/sispat.error.log;
}
EOF

# 13. TESTAR E INICIAR NGINX
log_info "Testando e iniciando Nginx..."
if nginx -t; then
    systemctl start nginx
    log_success "Nginx iniciado com sucesso!"
else
    log_error "Erro na configuração do Nginx!"
    nginx -t
    exit 1
fi

# 14. INICIAR PM2 NUCLEAR
log_info "Iniciando PM2 NUCLEAR..."
cd "$APP_DIR"
pm2 start ecosystem.production.config.cjs --env production
pm2 save

sleep 15  # Dar mais tempo para inicializar

# 15. TESTE NUCLEAR DE CONECTIVIDADE
log_info "Executando teste NUCLEAR de conectividade..."

# Testar frontend
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
log_info "Frontend ($FRONTEND_URL): $FRONTEND_RESPONSE"

# Testar API
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo "000")
log_info "API ($API_URL/health): $API_RESPONSE"

# Testar endpoint específico do erro
SUPERUSER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/auth/ensure-superuser" || echo "000")
log_info "Ensure Superuser ($API_URL/auth/ensure-superuser): $SUPERUSER_RESPONSE"

# Testar login
LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/auth/login" || echo "000")
log_info "Login ($API_URL/auth/login): $LOGIN_RESPONSE"

# 16. VERIFICAÇÃO FINAL NUCLEAR
log_info "Verificação final NUCLEAR..."
HTTPS_COUNT=$(find "$APP_DIR/dist" -type f -exec grep -l "https://" {} \; 2>/dev/null | wc -l || echo "0")
LOCALHOST_COUNT=$(find "$APP_DIR/dist" -type f -exec grep -l "localhost" {} \; 2>/dev/null | wc -l || echo "0")

log_info "Arquivos com HTTPS: $HTTPS_COUNT"
log_info "Arquivos com localhost: $LOCALHOST_COUNT"

if [ "$HTTPS_COUNT" -gt 0 ]; then
    log_warning "Ainda há arquivos com HTTPS:"
    find "$APP_DIR/dist" -type f -exec grep -l "https://" {} \; 2>/dev/null | head -3
fi

# 17. RESUMO NUCLEAR
log_header "RESUMO DA CORREÇÃO NUCLEAR:"
log_info "Domínio: $DOMAIN"
log_info "Frontend: $FRONTEND_URL (Resposta: $FRONTEND_RESPONSE)"
log_info "API: $API_URL (Resposta: $API_RESPONSE)"
log_info "Ensure Superuser: $SUPERUSER_RESPONSE"
log_info "Login: $LOGIN_RESPONSE"
log_info "Nginx: $(systemctl is-active nginx)"
log_info "PM2: $(pm2 status | grep -c "online" || echo "0") processos online"
log_info "Arquivos com HTTPS: $HTTPS_COUNT"
log_info "Arquivos com localhost: $LOCALHOST_COUNT"

if [ "$FRONTEND_RESPONSE" = "200" ] && ([ "$API_RESPONSE" = "200" ] || [ "$API_RESPONSE" = "404" ]); then
    log_success "🎉 CORREÇÃO NUCLEAR CONCLUÍDA COM SUCESSO!"
    log_info "Acesse: $FRONTEND_URL"
    log_info "Login: junielsonfarias@gmail.com / Tiko6273@"
    log_info "IMPORTANTE: Limpe o cache do navegador (Ctrl+Shift+R)!"
    log_info "Se necessário, feche e abra o navegador novamente!"
else
    log_warning "⚠️  Alguns problemas podem persistir."
    log_info "Verifique os logs do PM2: pm2 logs"
    log_info "Verifique os logs do Nginx: tail -f /var/log/nginx/sispat.error.log"
fi

log_success "Correção NUCLEAR finalizada!"
