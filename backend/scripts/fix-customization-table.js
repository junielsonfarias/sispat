#!/usr/bin/env node

/**
 * Script para corrigir a tabela customizations
 * Aplica todas as correções necessárias para o sistema de customização funcionar
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCustomizationTable() {
  console.log('🔧 Iniciando correção da tabela customizations...');
  
  try {
    // 1. Verificar se tabela existe
    console.log('1️⃣ Verificando se tabela customizations existe...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'customizations'
    `;
    
    if (tables.length === 0) {
      console.log('❌ Tabela customizations não existe. Criando...');
      
      // Criar tabela com estrutura correta
      await prisma.$executeRaw`
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
      `;
      
      console.log('✅ Tabela customizations criada com estrutura básica');
      
      // Inserir dados padrão
      await prisma.$executeRaw`
        INSERT INTO customizations (municipality_id, municipality_name, logo_url, primary_color, secondary_color)
        VALUES ('municipality-1', 'Prefeitura Municipal', null, '#1e40af', '#3b82f6')
        ON CONFLICT (municipality_id) DO NOTHING
      `;
      
      console.log('✅ Dados padrão inseridos');
    } else {
      console.log('✅ Tabela customizations existe');
    }
    
    // 2. Adicionar colunas em camelCase (compatibilidade com frontend)
    console.log('2️⃣ Adicionando colunas em camelCase...');
    
    const camelCaseColumns = [
      { name: 'activeLogoUrl', type: 'TEXT' },
      { name: 'secondaryLogoUrl', type: 'TEXT' },
      { name: 'municipalityId', type: 'VARCHAR(255)' },
      { name: 'primaryColor', type: 'VARCHAR(7)' },
      { name: 'backgroundColor', type: 'VARCHAR(7)' },
      { name: 'buttonTextColor', type: 'VARCHAR(7)' },
      { name: 'backgroundType', type: 'VARCHAR(50)' },
      { name: 'backgroundImageUrl', type: 'TEXT' },
      { name: 'backgroundVideoUrl', type: 'TEXT' },
      { name: 'videoLoop', type: 'BOOLEAN DEFAULT true' },
      { name: 'videoMuted', type: 'BOOLEAN DEFAULT true' },
      { name: 'layout', type: 'VARCHAR(50) DEFAULT \'center\'' },
      { name: 'welcomeTitle', type: 'TEXT' },
      { name: 'welcomeSubtitle', type: 'TEXT' },
      { name: 'fontFamily', type: 'VARCHAR(255)' },
      { name: 'browserTitle', type: 'VARCHAR(255)' },
      { name: 'faviconUrl', type: 'TEXT' },
      { name: 'loginFooterText', type: 'TEXT' },
      { name: 'systemFooterText', type: 'TEXT' },
      { name: 'superUserFooterText', type: 'TEXT' },
      { name: 'prefeituraName', type: 'VARCHAR(255)' },
      { name: 'secretariaResponsavel', type: 'VARCHAR(255)' },
      { name: 'departamentoResponsavel', type: 'VARCHAR(255)' },
      { name: 'updatedAt', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];
    
    for (const column of camelCaseColumns) {
      try {
        await prisma.$executeRaw`
          ALTER TABLE customizations 
          ADD COLUMN IF NOT EXISTS "${column.name}" ${column.type}
        `;
        console.log(`✅ Coluna ${column.name} adicionada`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.log(`⚠️ Aviso ao adicionar ${column.name}:`, error.message);
        }
      }
    }
    
    // 3. Copiar dados das colunas snake_case para camelCase
    console.log('3️⃣ Copiando dados das colunas antigas para as novas...');
    
    const copyMappings = [
      { from: 'municipality_id', to: 'municipalityId' },
      { from: 'logo_url', to: 'activeLogoUrl' },
      { from: 'primary_color', to: 'primaryColor' },
      { from: 'updated_at', to: 'updatedAt' }
    ];
    
    for (const mapping of copyMappings) {
      try {
        await prisma.$executeRaw`
          UPDATE customizations 
          SET "${mapping.to}" = ${mapping.from}
          WHERE "${mapping.to}" IS NULL AND ${mapping.from} IS NOT NULL
        `;
        console.log(`✅ Dados copiados de ${mapping.from} para ${mapping.to}`);
      } catch (error) {
        console.log(`⚠️ Aviso ao copiar ${mapping.from} -> ${mapping.to}:`, error.message);
      }
    }
    
    // 4. Verificar resultado
    console.log('4️⃣ Verificando resultado...');
    
    const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customizations'
      ORDER BY column_name
    `;
    
    console.log(`📊 Total de colunas: ${columns.length}`);
    
    const criticalColumns = ['activeLogoUrl', 'municipalityId', 'primaryColor', 'updatedAt', 'backgroundType'];
    console.log('🔍 Verificando colunas críticas:');
    
    for (const col of criticalColumns) {
      const exists = columns.some(c => c.column_name === col);
      console.log(`- ${col}: ${exists ? '✅' : '❌'}`);
    }
    
    // 5. Verificar dados
    const data = await prisma.$queryRaw`
      SELECT "municipalityId", "activeLogoUrl", "primaryColor", "updatedAt" 
      FROM customizations LIMIT 1
    `;
    
    if (data.length > 0) {
      console.log('📊 Dados na tabela:');
      console.log(`- municipalityId: ${data[0].municipalityId}`);
      console.log(`- activeLogoUrl: ${data[0].activeLogoUrl || 'null'}`);
      console.log(`- primaryColor: ${data[0].primaryColor || 'null'}`);
      console.log(`- updatedAt: ${data[0].updatedAt || 'null'}`);
    }
    
    console.log('');
    console.log('🎉 Correção da tabela customizations concluída com sucesso!');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Reinicie o backend: pm2 restart sispat-backend');
    console.log('2. Teste a API: curl http://localhost:3000/api/customization/public');
    console.log('3. Teste o upload de logo no sistema');
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixCustomizationTable()
    .then(() => {
      console.log('✅ Script executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na execução do script:', error);
      process.exit(1);
    });
}

module.exports = { fixCustomizationTable };
