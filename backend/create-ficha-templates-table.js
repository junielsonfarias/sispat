/**
 * Script para criar tabela ficha_templates no PostgreSQL
 * Compatível com Prisma Schema
 * Versão: 2.0.2
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createFichaTemplatesTable() {
  console.log('📦 Criando tabela ficha_templates...\n');

  try {
    // Criar tabela conforme Prisma Schema
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ficha_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        "isDefault" BOOLEAN DEFAULT false,
        "isActive" BOOLEAN DEFAULT true,
        config JSONB NOT NULL,
        "municipalityId" TEXT NOT NULL,
        "createdBy" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabela ficha_templates criada\n');

    // Criar índices
    console.log('📊 Criando índices...');
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ficha_templates_municipalityId_idx" 
        ON ficha_templates("municipalityId")
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ficha_templates_type_idx" 
        ON ficha_templates(type)
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ficha_templates_isDefault_idx" 
        ON ficha_templates("isDefault")
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ficha_templates_isActive_idx" 
        ON ficha_templates("isActive")
    `);

    console.log('✅ Índices criados\n');

    // Foreign keys
    console.log('🔗 Criando foreign keys...');
    
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE ficha_templates 
        DROP CONSTRAINT IF EXISTS ficha_templates_createdBy_fkey
      `);
      
      await prisma.$executeRawUnsafe(`
        ALTER TABLE ficha_templates 
        ADD CONSTRAINT ficha_templates_createdBy_fkey 
        FOREIGN KEY ("createdBy") REFERENCES users(id)
      `);
      
      console.log('✅ FK createdBy criada');
    } catch (e) {
      console.log('ℹ️  FK createdBy já existe ou erro:', e.message);
    }

    // Verificar
    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM ficha_templates`);
    console.log('\n📊 Registros na tabela:', count[0].total);

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   TABELA FICHA_TEMPLATES CRIADA!      ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\nPróximo passo: npx prisma generate\n');

  } catch (error) {
    console.error('\n❌ Erro ao criar tabela:', error.message);
    console.error('   Código:', error.code);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createFichaTemplatesTable();


