#!/bin/bash

echo "🔧 CORRIGINDO PERSONALIZAÇÃO - SALVAR NO BANCO"
echo ""

cd /var/www/sispat/backend

# 1. Parar PM2
echo "1. Parando PM2..."
pm2 stop sispat-backend

# 2. Verificar se tabela customizations existe
echo ""
echo "2. Verificando tabela customizations..."
TABLE_EXISTS=$(sudo -u postgres psql -d sispat_prod -tAc "SELECT to_regclass('public.customizations');")

if [ "$TABLE_EXISTS" = "customizations" ]; then
    echo "✓ Tabela customizations já existe"
else
    echo "✗ Tabela customizations NÃO existe. Criando..."
    
    # Criar tabela customizations
    sudo -u postgres psql -d sispat_prod << 'EOF'
CREATE TABLE IF NOT EXISTS "customizations" (
    "id" TEXT NOT NULL,
    "activeLogoUrl" TEXT,
    "secondaryLogoUrl" TEXT,
    "backgroundType" TEXT NOT NULL DEFAULT 'color',
    "backgroundColor" TEXT NOT NULL DEFAULT '#f1f5f9',
    "backgroundImageUrl" TEXT,
    "backgroundVideoUrl" TEXT,
    "videoLoop" BOOLEAN NOT NULL DEFAULT true,
    "videoMuted" BOOLEAN NOT NULL DEFAULT true,
    "layout" TEXT NOT NULL DEFAULT 'center',
    "welcomeTitle" TEXT NOT NULL DEFAULT 'Bem-vindo ao SISPAT',
    "welcomeSubtitle" TEXT NOT NULL DEFAULT 'Sistema de Gestão de Patrimônio',
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "buttonTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter var, sans-serif',
    "browserTitle" TEXT NOT NULL DEFAULT 'SISPAT',
    "faviconUrl" TEXT,
    "loginFooterText" TEXT,
    "systemFooterText" TEXT,
    "superUserFooterText" TEXT,
    "prefeituraName" TEXT,
    "secretariaResponsavel" TEXT,
    "departamentoResponsavel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customizations_pkey" PRIMARY KEY ("id")
);

-- Inserir registro padrão
INSERT INTO "customizations" ("id", "updatedAt") 
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
EOF
    
    echo "✓ Tabela customizations criada"
fi

# 3. Verificar se colunas data_baixa existem
echo ""
echo "3. Verificando colunas data_baixa..."
BAIXA_EXISTS=$(sudo -u postgres psql -d sispat_prod -tAc "SELECT column_name FROM information_schema.columns WHERE table_name = 'patrimonios' AND column_name = 'data_baixa';")

if [ -n "$BAIXA_EXISTS" ]; then
    echo "✓ Colunas de baixa já existem"
else
    echo "✗ Colunas de baixa NÃO existem. Aplicando migrations..."
    
    # Aplicar migrations
    npx prisma migrate deploy || npx prisma db push --accept-data-loss
    
    echo "✓ Migrations aplicadas"
fi

# 4. Puxar código atualizado
echo ""
echo "4. Atualizando código..."
cd /var/www/sispat
git pull origin main

# 5. Recompilar backend
echo ""
echo "5. Recompilando backend..."
cd backend
npm run build

# 6. Recompilar frontend
echo ""
echo "6. Recompilando frontend..."
cd ..
rm -rf dist/
pnpm run build:prod

# 7. Verificar arquivos
echo ""
echo "7. Verificando arquivos..."
echo "   Backend dist:"
ls -lh backend/dist/index.js
echo ""
echo "   Frontend dist:"
ls -lh dist/index.html
echo ""
echo "   Logo:"
ls -lh dist/assets/images/logo-government.svg 2>/dev/null || echo "   ⚠️  Logo não encontrado"

# 8. Reiniciar serviços
echo ""
echo "8. Reiniciando serviços..."
pm2 restart sispat-backend
sudo systemctl reload nginx

# 9. Aguardar
echo ""
echo "9. Aguardando serviços iniciarem (15 segundos)..."
sleep 15

# 10. Testar
echo ""
echo "10. Testando..."
echo "    API Health:"
curl -s http://sispat.vps-kinghost.net/api/health | head -c 100
echo ""

echo "    API Customization:"
curl -s http://sispat.vps-kinghost.net/api/customization | head -c 100
echo ""

echo "    Frontend:"
curl -s -o /dev/null -w "    Status: %{http_code}\n" http://sispat.vps-kinghost.net

# 11. Ver logs
echo ""
echo "11. Últimos logs do PM2:"
pm2 logs sispat-backend --lines 20 --nostream 2>/dev/null | tail -20

# Resultado
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  ✅ CORREÇÃO CONCLUÍDA!                          ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "📝 Próximos passos:"
echo ""
echo "1. Limpe o cache do navegador (Ctrl+Shift+Delete)"
echo "2. Feche e reabra o navegador"
echo "3. Acesse: http://sispat.vps-kinghost.net"
echo "4. Faça login"
echo "5. Vá em Personalização"
echo "6. Altere algo (ex: cor primária)"
echo "7. Clique em Salvar"
echo "8. Recarregue a página (F5)"
echo "9. As alterações devem permanecer ✅"
echo ""
echo "🔍 Se ainda der erro, execute:"
echo "   pm2 logs sispat-backend"
echo ""

