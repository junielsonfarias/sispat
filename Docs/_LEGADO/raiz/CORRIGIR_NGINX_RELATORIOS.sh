#!/bin/bash

# Script para corrigir configuração do Nginx e resolver loop de redirecionamento
# Execute no servidor: bash CORRIGIR_NGINX_RELATORIOS.sh

echo "🔧 Corrigindo configuração do Nginx"
echo "===================================="
echo ""

# 1. Fazer backup da configuração atual
echo "1️⃣ Fazendo backup da configuração atual..."
sudo cp /etc/nginx/sites-available/sispat /etc/nginx/sites-available/sispat.backup.$(date +%Y%m%d_%H%M%S)
echo "   ✅ Backup criado"
echo ""

# 2. Obter domínio da configuração atual
DOMAIN=$(grep "server_name" /etc/nginx/sites-available/sispat | head -1 | awk '{print $2}' | tr -d ';')
if [ -z "$DOMAIN" ]; then
    echo "   ⚠️  Domínio não encontrado, usando padrão"
    DOMAIN="sispat.vps-kinghost.net"
fi
echo "   Domínio detectado: $DOMAIN"
echo ""

# 3. Verificar se é HTTPS ou HTTP
SSL_ENABLED=false
if grep -q "ssl_certificate" /etc/nginx/sites-available/sispat; then
    SSL_ENABLED=true
    echo "   SSL detectado: SIM"
else
    echo "   SSL detectado: NÃO"
fi
echo ""

# 4. Criar nova configuração corrigida
echo "2️⃣ Criando nova configuração corrigida..."
if [ "$SSL_ENABLED" = true ]; then
    # Configuração com SSL
    sudo tee /etc/nginx/sites-available/sispat > /dev/null <<EOF
# HTTP redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Frontend
    root /var/www/sispat/dist;
    index index.html;

    # ✅ CORREÇÃO: Localizações aninhadas removidas para evitar loop
    # Cache para arquivos estáticos (ANTES do location /)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/sispat/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Frontend SPA routing (SEM localizações aninhadas)
    location / {
        root /var/www/sispat/dist;
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Uploads
    location /uploads {
        alias /var/www/sispat/backend/uploads;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3000/api/health;
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    client_max_body_size 10M;
}
EOF
else
    # Configuração sem SSL
    sudo tee /etc/nginx/sites-available/sispat > /dev/null <<EOF
# HTTP server (sem SSL)
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    root /var/www/sispat/dist;
    index index.html;

    # ✅ CORREÇÃO: Localizações aninhadas removidas para evitar loop
    # Cache para arquivos estáticos (ANTES do location /)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/sispat/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Frontend SPA routing (SEM localizações aninhadas)
    location / {
        root /var/www/sispat/dist;
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Uploads
    location /uploads {
        alias /var/www/sispat/backend/uploads;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3000/api/health;
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    client_max_body_size 10M;
}
EOF
fi
echo "   ✅ Nova configuração criada"
echo ""

# 5. Testar configuração do Nginx
echo "3️⃣ Testando configuração do Nginx..."
sudo nginx -t
if [ $? -ne 0 ]; then
    echo "   ❌ Erro na configuração do Nginx!"
    echo "   Restaurando backup..."
    sudo cp /etc/nginx/sites-available/sispat.backup.* /etc/nginx/sites-available/sispat 2>/dev/null || true
    exit 1
fi
echo "   ✅ Configuração válida"
echo ""

# 6. Recarregar Nginx
echo "4️⃣ Recarregando Nginx..."
sudo systemctl reload nginx
if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao recarregar Nginx!"
    echo "   Tentando restart..."
    sudo systemctl restart nginx
    if [ $? -ne 0 ]; then
        echo "   ❌ Erro crítico! Restaurando backup..."
        sudo cp /etc/nginx/sites-available/sispat.backup.* /etc/nginx/sites-available/sispat 2>/dev/null || true
        sudo systemctl restart nginx
        exit 1
    fi
fi
echo "   ✅ Nginx recarregado com sucesso"
echo ""

# 7. Verificar status
echo "5️⃣ Verificando status do Nginx..."
sudo systemctl status nginx --no-pager | head -10
echo ""

echo "✅ Correção aplicada com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Limpe o cache do navegador (Ctrl+Shift+R)"
echo "   2. Acesse https://sispat.vps-kinghost.net/relatorios"
echo "   3. Se ainda houver erro, verifique os logs: sudo tail -50 /var/log/nginx/error.log"
echo ""

