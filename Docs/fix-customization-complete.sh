#!/bin/bash

echo "🔧 CORRIGINDO PERSONALIZAÇÃO - SALVAR NO BANCO DE DADOS"
echo ""

cd /var/www/sispat/backend

# 1. Parar PM2
echo "1. Parando PM2..."
pm2 stop sispat-backend
echo "✓ PM2 parado"

# 2. Verificar se tabela customizations existe
echo ""
echo "2. Verificando tabela customizations..."
TABLE_EXISTS=$(sudo -u postgres psql -d sispat_prod -tAc "SELECT to_regclass('public.customizations');" 2>/dev/null)

if [ "$TABLE_EXISTS" = "customizations" ]; then
    echo "✓ Tabela já existe"
    
    # Verificar se tem coluna municipalityId
    HAS_MUNICIPALITY=$(sudo -u postgres psql -d sispat_prod -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='customizations' AND column_name='municipalityId';" 2>/dev/null)
    
    if [ -z "$HAS_MUNICIPALITY" ]; then
        echo "⚠️  Falta coluna municipalityId. Adicionando..."
        sudo -u postgres psql -d sispat_prod << 'EOF'
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "municipalityId" TEXT;
EOF
        echo "✓ Coluna municipalityId adicionada"
    fi
    
else
    echo "✗ Tabela NÃO existe. Criando..."
    
    sudo -u postgres psql -d sispat_prod << 'EOF'
-- Criar tabela customizations completa
CREATE TABLE IF NOT EXISTS "customizations" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT,
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

-- Buscar municipalityId do primeiro município
DO $$
DECLARE
    municipality_id TEXT;
BEGIN
    SELECT id INTO municipality_id FROM municipalities LIMIT 1;
    
    -- Inserir registro padrão com municipalityId
    INSERT INTO customizations ("id", "municipalityId", "updatedAt") 
    VALUES ('default', municipality_id, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET "municipalityId" = municipality_id;
END $$;
EOF
    
    echo "✓ Tabela customizations criada com municipalityId"
fi

# 3. Verificar e corrigir registros sem municipalityId
echo ""
echo "3. Corrigindo registros sem municipalityId..."
sudo -u postgres psql -d sispat_prod << 'EOF'
DO $$
DECLARE
    municipality_id TEXT;
BEGIN
    SELECT id INTO municipality_id FROM municipalities LIMIT 1;
    
    -- Atualizar registros sem municipalityId
    UPDATE customizations 
    SET "municipalityId" = municipality_id 
    WHERE "municipalityId" IS NULL;
END $$;
EOF
echo "✓ Registros corrigidos"

# 4. Verificar estrutura final
echo ""
echo "4. Verificando estrutura da tabela..."
sudo -u postgres psql -d sispat_prod -c "\d customizations" | grep -E "id|municipalityId|primaryColor|updatedAt"

# 5. Ver dados atuais
echo ""
echo "5. Dados atuais na tabela..."
sudo -u postgres psql -d sispat_prod -c "SELECT id, \"municipalityId\", \"primaryColor\", \"updatedAt\" FROM customizations;"

# 6. Puxar código atualizado (com trust proxy e correções)
echo ""
echo "6. Atualizando código..."
cd /var/www/sispat
git pull origin main

# 7. Recompilar backend
echo ""
echo "7. Recompilando backend..."
cd backend
npm run build

if [ ! -f "dist/index.js" ]; then
    echo "❌ Erro ao compilar backend!"
    exit 1
fi

echo "✓ Backend compilado"

# 8. Reiniciar PM2
echo ""
echo "8. Reiniciando PM2..."
pm2 restart sispat-backend

# 9. Aguardar inicialização
echo ""
echo "9. Aguardando inicialização (15 segundos)..."
sleep 15

# 10. Testar API customization
echo ""
echo "10. Testando API customization..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://sispat.vps-kinghost.net/api/customization)

if [ "$API_STATUS" = "200" ]; then
    echo "✅ API respondendo: HTTP 200"
    curl -s http://sispat.vps-kinghost.net/api/customization | head -c 200
    echo ""
else
    echo "❌ API com erro: HTTP $API_STATUS"
    echo ""
    echo "Logs do PM2:"
    pm2 logs sispat-backend --lines 30 --nostream | tail -30
fi

# Resultado
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  ✅ CORREÇÃO DA PERSONALIZAÇÃO CONCLUÍDA!        ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "📝 NO NAVEGADOR:"
echo ""
echo "1. Limpe TODO o cache (Ctrl+Shift+Delete)"
echo "2. Marque: Cookies, Cache, Dados de sites"
echo "3. Período: TODO O PERÍODO"
echo "4. Limpar dados"
echo "5. FECHE o navegador completamente"
echo "6. Reabra e acesse: http://sispat.vps-kinghost.net"
echo "7. Faça login"
echo "8. Vá em Personalização"
echo "9. Altere algo (ex: cor primária)"
echo "10. Salve"
echo "11. Recarregue (F5)"
echo "12. Alteração deve permanecer! ✅"
echo ""
echo "Se der erro, execute:"
echo "  pm2 logs sispat-backend"
echo ""

