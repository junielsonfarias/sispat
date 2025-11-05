#!/bin/bash

# Script rápido para encontrar arquivo de configuração do Nginx

echo "🔍 Procurando arquivos de configuração do Nginx..."
echo ""

echo "📁 Arquivos em /etc/nginx/sites-available/:"
ls -la /etc/nginx/sites-available/ 2>/dev/null || echo "Diretório não encontrado"
echo ""

echo "📁 Arquivos em /etc/nginx/sites-enabled/:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "Diretório não encontrado"
echo ""

echo "📁 Arquivos em /etc/nginx/conf.d/:"
ls -la /etc/nginx/conf.d/ 2>/dev/null || echo "Diretório não encontrado"
echo ""

echo "🔎 Procurando arquivos que contêm 'location /api/':"
find /etc/nginx -type f -name "*.conf" 2>/dev/null | while read file; do
    if grep -q "location /api/" "$file" 2>/dev/null; then
        echo "✅ ENCONTRADO: $file"
        echo "   Conteúdo relevante:"
        grep -A 5 "location /api/" "$file" | head -10
        echo ""
    fi
done

echo "📋 Arquivo principal do Nginx:"
if [ -f /etc/nginx/nginx.conf ]; then
    echo "   /etc/nginx/nginx.conf existe"
    grep -i "include.*sites\|include.*conf.d" /etc/nginx/nginx.conf | head -5
fi

