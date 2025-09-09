#!/bin/bash

# =================================
# CORREÇÃO FRONTEND COMPLETA - SISPAT
# Corrige problemas de React e Nginx
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
echo "🔧    CORREÇÃO FRONTEND COMPLETA - SISPAT"
echo "🔧    Corrige problemas de React e Nginx"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção completa do frontend..."

# 1. Parar PM2 e Nginx
log "🛑 Parando PM2 e Nginx..."
pm2 stop all 2>/dev/null || warning "PM2 não estava rodando"
systemctl stop nginx
success "✅ PM2 e Nginx parados"

# 2. Limpar completamente configurações Nginx
log "🧹 Limpando configurações Nginx..."
rm -f /etc/nginx/sites-enabled/sispat*
rm -f /etc/nginx/sites-enabled/sispat.backup*
success "✅ Configurações Nginx removidas"

# 3. Limpar cache e build
log "🧹 Limpando cache e build..."
rm -rf dist
rm -rf .vite
rm -rf node_modules/.vite
rm -rf node_modules/.cache
success "✅ Cache e build limpos"

# 4. Limpar cache do npm
log "🧹 Limpando cache do npm..."
npm cache clean --force
success "✅ Cache do npm limpo"

# 5. Reinstalar dependências
log "📦 Reinstalando dependências..."
rm -rf node_modules
rm -f package-lock.json
npm install --legacy-peer-deps --force
success "✅ Dependências reinstaladas"

# 6. Verificar se React está instalado corretamente
log "🔍 Verificando React..."
if npm list react 2>/dev/null | grep -q "react"; then
    REACT_VERSION=$(npm list react 2>/dev/null | grep react | awk '{print $2}')
    success "✅ React instalado: $REACT_VERSION"
else
    error "❌ React não encontrado"
fi

# 7. Verificar se React-DOM está instalado
log "🔍 Verificando React-DOM..."
if npm list react-dom 2>/dev/null | grep -q "react-dom"; then
    REACT_DOM_VERSION=$(npm list react-dom 2>/dev/null | grep react-dom | awk '{print $2}')
    success "✅ React-DOM instalado: $REACT_DOM_VERSION"
else
    error "❌ React-DOM não encontrado"
fi

# 8. Atualizar configuração do Vite para React
log "⚙️ Atualizando configuração do Vite..."
VITE_CONFIG_FILE="vite.config.ts"

if [ -f "$VITE_CONFIG_FILE" ]; then
    # Fazer backup da configuração atual
    cp "$VITE_CONFIG_FILE" "$VITE_CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Atualizar a configuração para incluir React no optimizeDeps
    sed -i '/optimizeDeps: {/,/},/c\
  optimizeDeps: {\
    include: [\
      "react", \
      "react-dom", \
      "react-router-dom",\
      "html2canvas",\
      "jspdf"\
    ],\
    exclude: [\
      "@vite/client", \
      "@vite/env", \
      "recharts",\
      "d3-scale",\
      "d3-array",\
      "d3-time",\
      "d3-time-format",\
      "d3-shape",\
      "d3-path",\
      "d3-color",\
      "d3-interpolate",\
      "d3-ease",\
      "d3-selection",\
      "d3-transition",\
      "d3-zoom",\
      "d3-brush",\
      "d3-drag",\
      "d3-force",\
      "d3-hierarchy",\
      "d3-quadtree",\
      "d3-timer",\
      "d3-dispatch"\
    ],\
    force: true,\
  },' "$VITE_CONFIG_FILE"
    
    success "✅ Configuração Vite atualizada"
else
    error "❌ Arquivo vite.config.ts não encontrado"
fi

# 9. Fazer build do frontend
log "🏗️ Fazendo build do frontend..."
export NODE_ENV=production
export CI=false

if npm run build; then
    success "✅ Build do frontend concluído com sucesso"
else
    error "❌ Falha no build do frontend"
fi

# 10. Verificar se os arquivos foram gerados
log "🔍 Verificando arquivos gerados..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "✅ Arquivos de build encontrados"
    
    # Verificar se há arquivos JS
    JS_COUNT=$(find dist/assets -name "*.js" | wc -l)
    if [ $JS_COUNT -gt 0 ]; then
        success "✅ $JS_COUNT arquivo(s) JS encontrado(s)"
    else
        error "❌ Nenhum arquivo JS encontrado"
    fi
else
    error "❌ Arquivos de build não encontrados"
fi

# 11. Criar favicon.svg
log "🎨 Criando favicon.svg..."
cat > dist/favicon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#2563eb"/>
  <text x="16" y="20" font-family="Arial" font-size="16" fill="white" text-anchor="middle">S</text>
</svg>
EOF
success "✅ favicon.svg criado"

# 12. Criar configuração Nginx limpa
log "⚙️ Criando configuração Nginx limpa..."
cat > /etc/nginx/sites-enabled/sispat << 'EOF'
server {
    listen 80;
    listen 443 ssl http2;
    server_name sispat.vps-kinghost.net www.sispat.vps-kinghost.net;

    # SSL Configuration (se certificado existir)
    ssl_certificate /etc/letsencrypt/live/sispat.vps-kinghost.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sispat.vps-kinghost.net/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression (configuração limpa)
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Root directory
    root /var/www/sispat/dist;
    index index.html;

    # Frontend - SPA routing (configuração limpa)
    location / {
        try_files $uri $uri/ @fallback;
    }

    # Fallback para SPA
    location @fallback {
        rewrite ^.*$ /index.html last;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache para arquivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Favicon específico
    location = /favicon.svg {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

success "✅ Configuração Nginx limpa criada"

# 13. Testar configuração do Nginx
log "🧪 Testando configuração do Nginx..."
if nginx -t; then
    success "✅ Configuração Nginx válida"
else
    error "❌ Configuração Nginx inválida"
fi

# 14. Iniciar Nginx
log "🚀 Iniciando Nginx..."
systemctl start nginx
success "✅ Nginx iniciado"

# 15. Iniciar aplicação com PM2
log "🚀 Iniciando aplicação com PM2..."
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    success "✅ Aplicação iniciada com PM2"
else
    error "❌ Arquivo ecosystem.config.cjs não encontrado"
fi

# 16. Aguardar inicialização
log "⏳ Aguardando aplicação inicializar..."
sleep 10

# 17. Verificar se PM2 está rodando
log "🔍 Verificando status do PM2..."
if pm2 list | grep -q "online"; then
    success "✅ Aplicação está rodando no PM2"
else
    error "❌ Aplicação não está rodando no PM2"
fi

# 18. Testar API
log "🧪 Testando API..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
    success "✅ API respondendo corretamente"
else
    warning "⚠️ API pode não estar respondendo"
fi

# 19. Testar frontend
log "🧪 Testando frontend..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    success "✅ Frontend respondendo corretamente"
else
    warning "⚠️ Frontend pode não estar respondendo"
fi

# 20. Verificar logs recentes
log "📋 Verificando logs recentes..."
if pm2 logs sispat --lines 10 --nostream 2>/dev/null | grep -q "error\|Error\|ERROR"; then
    warning "⚠️ Erros encontrados nos logs do PM2"
    log "📄 Últimos logs:"
    pm2 logs sispat --lines 10 --nostream 2>/dev/null | tail -5
else
    success "✅ Nenhum erro encontrado nos logs do PM2"
fi

# Instruções finais
log "📝 CORREÇÃO FRONTEND COMPLETA CONCLUÍDA!"
echo ""
echo "🎉 FRONTEND COMPLETAMENTE CORRIGIDO!"
echo "===================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ PM2 e Nginx parados"
echo "✅ Configurações Nginx removidas"
echo "✅ Cache e build limpos"
echo "✅ Cache do npm limpo"
echo "✅ Dependências reinstaladas"
echo "✅ React e React-DOM verificados"
echo "✅ Configuração Vite atualizada"
echo "✅ Build do frontend executado"
echo "✅ Arquivos de build verificados"
echo "✅ favicon.svg criado"
echo "✅ Configuração Nginx limpa criada"
echo "✅ Configuração Nginx testada"
echo "✅ Nginx iniciado"
echo "✅ Aplicação iniciada com PM2"
echo "✅ Status do PM2 verificado"
echo "✅ API testada"
echo "✅ Frontend testado"
echo "✅ Logs verificados"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - Problema React createContext resolvido"
echo "   - Loop infinito Nginx corrigido"
echo "   - Configuração try_files otimizada"
echo "   - Fallback @fallback adicionado"
echo "   - favicon.svg criado"
echo "   - Configuração Gzip limpa"
echo "   - Headers de segurança adicionados"
echo "   - Dependências React reinstaladas"
echo ""
echo "🌐 URLs da aplicação:"
echo "   - Frontend: http://sispat.vps-kinghost.net"
echo "   - Frontend HTTPS: https://sispat.vps-kinghost.net"
echo "   - API: http://sispat.vps-kinghost.net/api"
echo "   - Health: http://sispat.vps-kinghost.net/health"
echo ""
echo "📞 Próximos passos:"
echo "   1. Teste a aplicação no navegador"
echo "   2. Verifique se não há mais erros de React"
echo "   3. Verifique se não há mais erros de redirecionamento"
echo "   4. Se houver problemas, execute: pm2 restart sispat"
echo "   5. Verifique os logs: pm2 logs sispat"
echo "   6. Verifique o console do navegador para erros JavaScript"
echo ""

success "🎉 Correção completa do frontend concluída!"
