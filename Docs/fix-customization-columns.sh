#!/bin/bash

echo "🔧 Corrigindo colunas da tabela customizations..."

cd /var/www/sispat/backend

# 1. Adicionar colunas que faltam (snake_case -> camelCase)
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMissingColumns() {
  try {
    console.log('1️⃣ Adicionando colunas faltantes...');
    
    // Adicionar activeLogoUrl (mapeamento de logo_url)
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"activeLogoUrl\" TEXT
    \`;
    console.log('✅ Coluna activeLogoUrl adicionada');
    
    // Adicionar secondaryLogoUrl
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"secondaryLogoUrl\" TEXT
    \`;
    console.log('✅ Coluna secondaryLogoUrl adicionada');
    
    // Adicionar municipalityId
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"municipalityId\" VARCHAR(255)
    \`;
    console.log('✅ Coluna municipalityId adicionada');
    
    // Adicionar primaryColor
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"primaryColor\" VARCHAR(7)
    \`;
    console.log('✅ Coluna primaryColor adicionada');
    
    // Adicionar backgroundColor
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"backgroundColor\" VARCHAR(7)
    \`;
    console.log('✅ Coluna backgroundColor adicionada');
    
    // Adicionar backgroundType
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"backgroundType\" VARCHAR(50)
    \`;
    console.log('✅ Coluna backgroundType adicionada');
    
    // Adicionar backgroundImageUrl
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"backgroundImageUrl\" TEXT
    \`;
    console.log('✅ Coluna backgroundImageUrl adicionada');
    
    // Adicionar backgroundVideoUrl
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"backgroundVideoUrl\" TEXT
    \`;
    console.log('✅ Coluna backgroundVideoUrl adicionada');
    
    // Adicionar outras colunas necessárias
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"videoLoop\" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS \"videoMuted\" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS \"layout\" VARCHAR(50) DEFAULT 'center',
      ADD COLUMN IF NOT EXISTS \"welcomeTitle\" TEXT,
      ADD COLUMN IF NOT EXISTS \"welcomeSubtitle\" TEXT,
      ADD COLUMN IF NOT EXISTS \"buttonTextColor\" VARCHAR(7),
      ADD COLUMN IF NOT EXISTS \"fontFamily\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"browserTitle\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"faviconUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"loginFooterText\" TEXT,
      ADD COLUMN IF NOT EXISTS \"systemFooterText\" TEXT,
      ADD COLUMN IF NOT EXISTS \"superUserFooterText\" TEXT,
      ADD COLUMN IF NOT EXISTS \"prefeituraName\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"secretariaResponsavel\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"departamentoResponsavel\" VARCHAR(255)
    \`;
    console.log('✅ Outras colunas adicionadas');
    
    console.log('');
    console.log('2️⃣ Copiando dados das colunas antigas para as novas...');
    
    // Copiar municipality_id para municipalityId
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"municipalityId\" = municipality_id 
      WHERE \"municipalityId\" IS NULL
    \`;
    console.log('✅ municipality_id copiado para municipalityId');
    
    // Copiar logo_url para activeLogoUrl
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"activeLogoUrl\" = logo_url 
      WHERE \"activeLogoUrl\" IS NULL AND logo_url IS NOT NULL
    \`;
    console.log('✅ logo_url copiado para activeLogoUrl');
    
    // Copiar primary_color para primaryColor
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"primaryColor\" = primary_color 
      WHERE \"primaryColor\" IS NULL AND primary_color IS NOT NULL
    \`;
    console.log('✅ primary_color copiado para primaryColor');
    
    console.log('');
    console.log('3️⃣ Verificando resultado...');
    
    const result = await prisma.\$queryRaw\`SELECT * FROM customizations LIMIT 1\`;
    if (result.length > 0) {
      const record = result[0];
      console.log('📋 Dados após correção:');
      console.log('- municipalityId:', record.municipalityId);
      console.log('- activeLogoUrl:', record.activeLogoUrl || 'null');
      console.log('- primaryColor:', record.primaryColor || 'null');
      console.log('- prefeituraName:', record.prefeituraName || 'null');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

addMissingColumns();
"

echo ""
echo "4️⃣ Reiniciando backend..."
cd /var/www/sispat/backend
pm2 restart sispat-backend

echo ""
echo "5️⃣ Aguardando 3 segundos..."
sleep 3

echo ""
echo "6️⃣ Testando API..."
curl -s http://localhost:3000/api/customization/public | head -20

echo ""
echo ""
echo "✅ Correção concluída!"
echo ""
echo "📋 PRÓXIMO PASSO:"
echo "Agora você pode salvar a logo normalmente no sistema."
echo "A logo será salva no banco de dados e ficará disponível em todos os navegadores."

