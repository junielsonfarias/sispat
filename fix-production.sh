#!/bin/bash

echo "🔧 CORREÇÃO SISPAT PRODUÇÃO"
echo "=========================="

cd /var/www/sispat/backend

# 1. Verificar setores no banco
echo "1. Verificando setores no banco..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.sector.findMany().then(sectors => {
  console.log('📊 Setores no banco:', sectors.length);
  sectors.forEach(s => console.log('- ' + s.name + ' (' + s.codigo + ')'));
  prisma.\$disconnect();
});
"

# 2. Criar tabela customizations
echo -e "\n2. Criando tabela customizations..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createCustomizationsTable() {
  try {
    await prisma.\$executeRaw\`
      CREATE TABLE IF NOT EXISTS customizations (
        id SERIAL PRIMARY KEY,
        municipality_id VARCHAR(255) NOT NULL,
        logo_url TEXT,
        primary_color VARCHAR(7),
        secondary_color VARCHAR(7),
        municipality_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`;
    console.log('✅ Tabela customizations criada!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

createCustomizationsTable();
"

# 3. Reiniciar backend
echo -e "\n3. Reiniciando backend..."
pm2 restart sispat-backend
sleep 3

# 4. Testar API
echo -e "\n4. Testando API..."
curl http://localhost:3000/api/health

echo -e "\n✅ Correção completa!"
