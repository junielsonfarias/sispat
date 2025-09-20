#!/bin/bash

# =============================================================================
# SCRIPT DEFINITIVO - FORÇA HTTP EM TODOS OS LUGARES
# Resolve definitivamente o problema de HTTPS forçado
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

log_header "Iniciando correção DEFINITIVA para forçar HTTP..."

APP_DIR="/var/www/sispat"
NGINX_CONF="/etc/nginx/sites-available/default"

# 1. Detectar domínio
DOMAIN=$(grep "server_name" $NGINX_CONF | awk '{print $2}' | sed 's/;//' | head -1)
if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "_" ]; then
    DOMAIN=$(hostname -I | awk '{print $1}')
    log_warning "Domínio não encontrado no Nginx, usando IP da VPS: $DOMAIN"
else
    log_info "Domínio detectado: $DOMAIN"
fi

FRONTEND_URL="http://$DOMAIN"
API_URL="http://$DOMAIN/api"

log_info "URLs de destino: Frontend=$FRONTEND_URL, API=$API_URL"

# 2. PARAR TODOS OS SERVIÇOS
log_info "Parando todos os serviços..."
systemctl stop nginx 2>/dev/null || true
pm2 stop all 2>/dev/null || true
sleep 5

# 3. CORRIGIR ARQUIVO .ENV FORÇANDO HTTP
log_info "Corrigindo arquivo .env FORÇANDO HTTP..."
if [ -f "$APP_DIR/.env" ]; then
    cd "$APP_DIR"
    
    # Backup do .env original
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Substituir TODAS as URLs HTTPS por HTTP
    sed -i 's|https://|http://|g' .env
    
    # Garantir que as URLs específicas estejam corretas
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://$DOMAIN|g" .env
    sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://$DOMAIN|g" .env
    sed -i "s|VITE_API_TARGET=.*|VITE_API_TARGET=http://$DOMAIN|g" .env
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=http://$DOMAIN/api|g" .env
    sed -i "s|VITE_BACKEND_URL=.*|VITE_BACKEND_URL=http://$DOMAIN|g" .env
    sed -i "s|VITE_DOMAIN=.*|VITE_DOMAIN=http://$DOMAIN|g" .env
    
    log_success "Arquivo .env corrigido!"
fi

# 4. CORRIGIR VITE.CONFIG.TS PARA FORÇAR HTTP
log_info "Corrigindo vite.config.ts para forçar HTTP..."
if [ -f "$APP_DIR/vite.config.ts" ]; then
    cd "$APP_DIR"
    
    # Backup do vite.config.ts original
    cp vite.config.ts vite.config.ts.backup.$(date +%Y%m%d_%H%M%S)
    
    # Adicionar configuração para forçar HTTP
    cat > vite.config.ts << 'EOF'
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
    // Forçar HTTP em todas as URLs
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost/api'),
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify(process.env.VITE_BACKEND_URL || 'http://localhost'),
    'import.meta.env.VITE_DOMAIN': JSON.stringify(process.env.VITE_DOMAIN || 'http://localhost'),
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: false, // Desabilitar minificação para evitar problemas
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
    
    log_success "vite.config.ts corrigido!"
fi

# 5. CORRIGIR ARQUIVOS DE CONFIGURAÇÃO DO AXIOS
log_info "Procurando e corrigindo arquivos de configuração do Axios..."
if [ -d "$APP_DIR/src" ]; then
    cd "$APP_DIR"
    
    # Procurar por arquivos que podem conter configurações de API
    find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | while read file; do
        if grep -q "baseURL\|axios.create\|API_URL\|BACKEND_URL" "$file" 2>/dev/null; then
            log_info "Corrigindo $file..."
            
            # Backup do arquivo
            cp "$file" "$file.backup.$(date +%Y%m%d_%H%M%S)"
            
            # Substituir URLs HTTPS por HTTP
            sed -i 's|https://|http://|g' "$file"
            sed -i 's|localhost:3001|'$DOMAIN'|g' "$file"
            sed -i 's|localhost:8080|'$DOMAIN'|g' "$file"
            sed -i 's|localhost|'$DOMAIN'|g' "$file"
        fi
    done
    
    log_success "Arquivos de configuração corrigidos!"
fi

# 6. LIMPAR CACHE E NODE_MODULES
log_info "Limpando cache e node_modules..."
cd "$APP_DIR"
rm -rf node_modules/.cache
rm -rf node_modules/.vite
rm -rf dist
npm cache clean --force

# 7. REINSTALAR DEPENDÊNCIAS
log_info "Reinstalando dependências..."
npm install --legacy-peer-deps

# 8. FAZER REBUILD COMPLETO FORÇANDO HTTP
log_info "Fazendo rebuild completo FORÇANDO HTTP..."
export NODE_ENV=production
export VITE_API_URL="http://$DOMAIN/api"
export VITE_BACKEND_URL="http://$DOMAIN"
export VITE_DOMAIN="http://$DOMAIN"
export VITE_API_TARGET="http://$DOMAIN"

# Tentar build com diferentes métodos
if npm run build:prod 2>/dev/null; then
    log_success "Build prod bem-sucedido!"
elif npm run build 2>/dev/null; then
    log_success "Build padrão bem-sucedido!"
else
    log_warning "Build normal falhou, tentando build manual..."
    npx vite build --mode production
fi

# 9. CORREÇÃO AGRESSIVA DOS ARQUIVOS DE BUILD
log_info "Aplicando correção AGRESSIVA nos arquivos de build..."
if [ -d "dist" ]; then
    # Substituir TODAS as URLs HTTPS por HTTP em TODOS os arquivos
    find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" -o -name "*.map" \) -exec sed -i 's|https://|http://|g' {} \;
    
    # Substituir localhost por domínio
    find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" -o -name "*.map" \) -exec sed -i "s|localhost:3001|$DOMAIN|g" {} \;
    find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" -o -name "*.map" \) -exec sed -i "s|localhost:8080|$DOMAIN|g" {} \;
    find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" -o -name "*.map" \) -exec sed -i "s|localhost|$DOMAIN|g" {} \;
    
    # Garantir que as URLs da API estejam corretas
    find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" -o -name "*.map" \) -exec sed -i "s|http://$DOMAIN/api|$API_URL|g" {} \;
    find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" -o -name "*.map" \) -exec sed -i "s|http://$DOMAIN|$FRONTEND_URL|g" {} \;
    
    log_success "Correção agressiva aplicada nos arquivos de build!"
else
    log_error "Diretório dist não encontrado após build!"
    exit 1
fi

# 10. RECRIAR CONFIGURAÇÃO DO NGINX FORÇANDO HTTP
log_info "Recriando configuração do Nginx FORÇANDO HTTP..."
cp "$NGINX_CONF" "$NGINX_CONF.backup.$(date +%Y%m%d_%H%M%S)"

cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Headers anti-cache para forçar reload dos arquivos corrigidos
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;

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
    }

    # Proxy para API - FORÇANDO HTTP
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
        proxy_cache_bypass \$http_upgrade;
        
        # Headers CORS para API
        add_header Access-Control-Allow-Origin "http://$DOMAIN" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
        add_header Access-Control-Allow-Credentials true always;
    }

    # WebSocket support - FORÇANDO HTTP
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
    }

    # Logs
    access_log /var/log/nginx/sispat.access.log;
    error_log /var/log/nginx/sispat.error.log;
}
EOF

log_success "Configuração do Nginx recriada!"

# 11. TESTAR CONFIGURAÇÃO DO NGINX
log_info "Testando configuração do Nginx..."
if nginx -t; then
    log_success "Configuração do Nginx OK!"
else
    log_error "Erro na configuração do Nginx!"
    nginx -t
    exit 1
fi

# 12. INICIAR SERVIÇOS
log_info "Iniciando serviços..."
systemctl start nginx
sleep 3

# Verificar se o Nginx está rodando
if systemctl is-active --quiet nginx; then
    log_success "Nginx iniciado com sucesso!"
else
    log_error "Falha ao iniciar Nginx!"
    systemctl status nginx
    exit 1
fi

# 13. INICIAR PM2
log_info "Iniciando PM2..."
cd "$APP_DIR"
pm2 kill 2>/dev/null || true
sleep 3

pm2 start ecosystem.production.config.cjs --env production
pm2 save

sleep 10  # Dar tempo para o backend inicializar

# Verificar PM2
PM2_STATUS=$(pm2 status | grep -c "online" || echo "0")
if [ "$PM2_STATUS" -gt 0 ]; then
    log_success "PM2 iniciado com $PM2_STATUS processos online!"
else
    log_warning "PM2 pode não estar funcionando. Verificando logs..."
    pm2 logs --lines 20
fi

# 14. TESTE FINAL DE CONECTIVIDADE
log_info "Executando teste final de conectividade..."
sleep 10

# Testar frontend
log_info "Testando frontend: $FRONTEND_URL"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    log_success "✅ Frontend acessível!"
else
    log_error "❌ Frontend não acessível. Código: $FRONTEND_RESPONSE"
fi

# Testar API
log_info "Testando API: $API_URL/health"
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo "000")
if [ "$API_RESPONSE" = "200" ] || [ "$API_RESPONSE" = "404" ]; then
    log_success "✅ API acessível!"
else
    log_error "❌ API não acessível. Código: $API_RESPONSE"
fi

# Testar endpoint de login
log_info "Testando endpoint de login: $API_URL/auth/login"
LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/auth/login" || echo "000")
if [ "$LOGIN_RESPONSE" = "200" ] || [ "$LOGIN_RESPONSE" = "405" ] || [ "$LOGIN_RESPONSE" = "400" ]; then
    log_success "✅ Endpoint de login acessível!"
else
    log_error "❌ Endpoint de login não acessível. Código: $LOGIN_RESPONSE"
fi

# 15. VERIFICAR SE AINDA HÁ URLs HTTPS NOS ARQUIVOS
log_info "Verificação final: URLs HTTPS nos arquivos..."
HTTPS_COUNT=$(find "$APP_DIR/dist" -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" \) -exec grep -l "https://" {} \; 2>/dev/null | wc -l || echo "0")
if [ "$HTTPS_COUNT" -eq 0 ]; then
    log_success "✅ Nenhuma URL HTTPS encontrada nos arquivos de build!"
else
    log_warning "⚠️  Ainda há $HTTPS_COUNT arquivos com URLs HTTPS:"
    find "$APP_DIR/dist" -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" \) -exec grep -l "https://" {} \; 2>/dev/null | head -5
fi

# 16. RESUMO FINAL
log_header "RESUMO DA CORREÇÃO DEFINITIVA:"
log_info "Domínio: $DOMAIN"
log_info "Frontend: $FRONTEND_URL"
log_info "API: $API_URL"
log_info "Nginx: $(systemctl is-active nginx)"
log_info "PM2: $PM2_STATUS processos online"
log_info "Frontend Response: $FRONTEND_RESPONSE"
log_info "API Response: $API_RESPONSE"
log_info "Login Response: $LOGIN_RESPONSE"
log_info "Arquivos com HTTPS: $HTTPS_COUNT"

if [ "$FRONTEND_RESPONSE" = "200" ] && ([ "$API_RESPONSE" = "200" ] || [ "$API_RESPONSE" = "404" ]) && ([ "$LOGIN_RESPONSE" = "200" ] || [ "$LOGIN_RESPONSE" = "405" ] || [ "$LOGIN_RESPONSE" = "400" ]); then
    log_success "🎉 CORREÇÃO DEFINITIVA CONCLUÍDA COM SUCESSO!"
    log_info "Agora você deve conseguir acessar o sistema sem erros de HTTPS!"
    log_info "Acesse: $FRONTEND_URL"
    log_info "Login: junielsonfarias@gmail.com / Tiko6273@"
    log_info "IMPORTANTE: Limpe o cache do navegador (Ctrl+Shift+R)!"
else
    log_warning "⚠️  Alguns problemas podem persistir. Verifique os logs acima."
    log_info "Tente limpar o cache do navegador e acessar novamente."
    log_info "Se o problema persistir, verifique os logs do PM2: pm2 logs"
fi

log_success "Correção definitiva finalizada!"
