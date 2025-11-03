#!/bin/bash
# Script para verificar e corrigir configurações HTTPS

set -e

echo "=== VERIFICAÇÃO E CORREÇÃO HTTPS ==="
echo ""

DOMAIN="${DOMAIN:-sispat.vps-kinghost.net}"
FRONTEND_URL="https://$DOMAIN"
BACKEND_API_URL="https://$DOMAIN/api"

cd /var/www/sispat

# 1. Verificar configuração do backend
echo "1. Verificando configuração do backend..."
cd backend

if [ -f .env ]; then
    # Verificar FRONTEND_URL
    if grep -q "^FRONTEND_URL=" .env; then
        CURRENT_FRONTEND_URL=$(grep "^FRONTEND_URL=" .env | cut -d'=' -f2)
        echo "   FRONTEND_URL atual: $CURRENT_FRONTEND_URL"
        
        if [[ "$CURRENT_FRONTEND_URL" != "https://"* ]]; then
            echo "   ⚠️  FRONTEND_URL não está usando HTTPS"
            echo "   Corrigindo..."
            sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=$FRONTEND_URL|" .env
            echo "   ✅ FRONTEND_URL atualizado para: $FRONTEND_URL"
        else
            echo "   ✅ FRONTEND_URL já está configurado para HTTPS"
        fi
    else
        echo "   ⚠️  FRONTEND_URL não encontrado no .env"
        echo "   Adicionando..."
        echo "FRONTEND_URL=$FRONTEND_URL" >> .env
        echo "   ✅ FRONTEND_URL adicionado: $FRONTEND_URL"
    fi
else
    echo "   ❌ Arquivo .env não encontrado!"
fi

echo ""

# 2. Verificar configuração do frontend
echo "2. Verificando configuração do frontend..."
cd /var/www/sispat/frontend

# Verificar múltiplos locais possíveis para .env
ENV_FILE=""
if [ -f .env.production ]; then
    ENV_FILE=".env.production"
elif [ -f .env ]; then
    ENV_FILE=".env"
elif [ -f ../.env ]; then
    ENV_FILE="../.env"
fi

if [ -n "$ENV_FILE" ]; then
    echo "   Arquivo encontrado: $ENV_FILE"
    
    # Verificar VITE_API_URL
    if grep -q "^VITE_API_URL=" "$ENV_FILE"; then
        CURRENT_API_URL=$(grep "^VITE_API_URL=" "$ENV_FILE" | cut -d'=' -f2)
        echo "   VITE_API_URL atual: $CURRENT_API_URL"
        
        if [[ "$CURRENT_API_URL" != "https://"* ]]; then
            echo "   ⚠️  VITE_API_URL não está usando HTTPS"
            echo "   Corrigindo..."
            sed -i "s|^VITE_API_URL=.*|VITE_API_URL=$BACKEND_API_URL|" "$ENV_FILE"
            echo "   ✅ VITE_API_URL atualizado para: $BACKEND_API_URL"
        else
            echo "   ✅ VITE_API_URL já está configurado para HTTPS"
        fi
    else
        echo "   ⚠️  VITE_API_URL não encontrado em $ENV_FILE"
        echo "   Adicionando..."
        echo "VITE_API_URL=$BACKEND_API_URL" >> "$ENV_FILE"
        echo "   ✅ VITE_API_URL adicionado: $BACKEND_API_URL"
    fi
    
    # Garantir que .env.production existe para build
    if [ "$ENV_FILE" != ".env.production" ]; then
        cp "$ENV_FILE" .env.production 2>/dev/null || true
    fi
else
    echo "   ⚠️  Nenhum arquivo .env encontrado"
    echo "   Criando .env.production..."
    cat > .env.production <<EOF
VITE_API_URL=$BACKEND_API_URL
VITE_USE_BACKEND=true
VITE_APP_NAME=SISPAT 2.0
VITE_APP_VERSION=2.0.4
VITE_APP_ENV=production
EOF
    echo "   ✅ Arquivo .env.production criado com VITE_API_URL=$BACKEND_API_URL"
fi

echo ""

# 3. Verificar se frontend precisa ser reconstruído
echo "3. Verificando se frontend precisa ser reconstruído..."
if [ -d dist ]; then
    # Verificar se dist contém arquivos com URLs HTTP hardcoded
    HTTP_COUNT=$(grep -r "http://localhost:3000" dist 2>/dev/null | wc -l || echo "0")
    if [ "$HTTP_COUNT" -gt 0 ]; then
        echo "   ⚠️  Encontrados $HTTP_COUNT arquivos com URLs HTTP hardcoded"
        echo "   Frontend precisa ser reconstruído"
        NEED_REBUILD=true
    else
        echo "   ✅ Nenhuma URL HTTP hardcoded encontrada"
        NEED_REBUILD=false
    fi
else
    echo "   ⚠️  Diretório dist não existe"
    NEED_REBUILD=true
fi

echo ""

# 4. Reconstruir frontend se necessário
if [ "$NEED_REBUILD" = true ]; then
    echo "4. Reconstruindo frontend com HTTPS..."
    cd /var/www/sispat/frontend
    
    # Verificar se pnpm está instalado
    if ! command -v pnpm &> /dev/null; then
        echo "   ⚠️  pnpm não encontrado, usando npm..."
        npm run build:prod
    else
        pnpm run build:prod
    fi
    
    echo "   ✅ Frontend reconstruído"
else
    echo "4. Frontend não precisa ser reconstruído"
fi

echo ""

# 5. Reiniciar backend para aplicar novas variáveis
echo "5. Reiniciando backend..."
cd /var/www/sispat/backend
pm2 restart sispat-backend
sleep 3

echo "   ✅ Backend reiniciado"
echo ""

# 6. Verificação final
echo "=== VERIFICAÇÃO FINAL ==="
echo ""

echo "Backend FRONTEND_URL:"
grep "^FRONTEND_URL=" backend/.env || echo "Não encontrado"
echo ""

echo "Frontend VITE_API_URL:"
grep "^VITE_API_URL=" frontend/.env.production || echo "Não encontrado"
echo ""

echo "Testando conectividade HTTPS..."
if curl -s https://$DOMAIN/api/health | grep -q "ok"; then
    echo "✅ Backend respondendo via HTTPS"
else
    echo "❌ Backend não responde via HTTPS"
fi

echo ""
echo "=== CONCLUSÃO ==="
echo "Se as configurações foram atualizadas, faça:"
echo "  1. Limpar cache do navegador (Ctrl+Shift+Delete)"
echo "  2. Acessar: https://$DOMAIN"
echo "  3. Tentar fazer login novamente"
echo ""
echo "Se ainda houver problemas, verifique:"
echo "  - pm2 logs sispat-backend"
echo "  - Console do navegador (F12)"

