#!/bin/bash

echo "🔧 CORREÇÃO FINAL CUSTOMIZATION"
echo "==============================="

cd /var/www/sispat/backend

# 1. Recriar tabela customizations com constraint única
echo "1. Recriando tabela customizations..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recreateCustomizationsTable() {
  try {
    // Dropar tabela se existir
    await prisma.\$executeRaw\`DROP TABLE IF EXISTS customizations\`;
    console.log('✅ Tabela antiga removida');
    
    // Criar tabela com constraint única
    await prisma.\$executeRaw\`
      CREATE TABLE customizations (
        id SERIAL PRIMARY KEY,
        municipality_id VARCHAR(255) NOT NULL UNIQUE,
        logo_url TEXT,
        primary_color VARCHAR(7),
        secondary_color VARCHAR(7),
        municipality_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`;
    console.log('✅ Tabela customizations recriada com constraint única');
    
    // Inserir dados padrão
    await prisma.\$executeRaw\`
      INSERT INTO customizations (municipality_id, municipality_name, logo_url, primary_color, secondary_color)
      VALUES ('municipality-1', 'Prefeitura Municipal', null, '#1e40af', '#3b82f6')
    \`;
    console.log('✅ Dados padrão inseridos');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

recreateCustomizationsTable();
"

# 2. Verificar dados
echo -e "\n2. Verificando customizações..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCustomizations() {
  try {
    const customizations = await prisma.\$queryRaw\`SELECT * FROM customizations\`;
    console.log('📊 Customizations:', customizations.length);
    if (customizations.length > 0) {
      console.log('Dados:', JSON.stringify(customizations[0], null, 2));
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

checkCustomizations();
"

# 3. Corrigir logo
echo -e "\n3. Corrigindo logo..."
cd /var/www/sispat
if [ ! -f "public/logo-government.svg" ]; then
  cp src/assets/images/logo-government.svg public/ 2>/dev/null || echo "Logo não encontrado em src/"
  echo "✅ Logo copiado para public/"
else
  echo "✅ Logo já existe em public/"
fi

# 4. Rebuild frontend
echo -e "\n4. Rebuild frontend..."
npm run build

# 5. Reiniciar backend
echo -e "\n5. Reiniciando backend..."
cd backend
pm2 restart sispat-backend
sleep 3

# 6. Testar API
echo -e "\n6. Testando API customization..."
curl -s http://localhost:3000/api/customization/public | head -1

echo -e "\n✅ Correção completa!"
