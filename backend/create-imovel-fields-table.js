const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createTable() {
  try {
    console.log('📊 Criando tabela imovel_custom_fields...')
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS imovel_custom_fields (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        label VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        required BOOLEAN DEFAULT false,
        "defaultValue" TEXT,
        options TEXT,
        placeholder TEXT,
        "helpText" TEXT,
        "validationRules" TEXT,
        "displayOrder" INTEGER DEFAULT 0,
        "isActive" BOOLEAN DEFAULT true,
        "isSystem" BOOLEAN DEFAULT false,
        "municipalityId" VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    
    console.log('✅ Tabela criada!')
    console.log('📊 Criando índices...')
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "imovel_custom_fields_municipalityId_idx" 
        ON imovel_custom_fields("municipalityId")
    `)
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "imovel_custom_fields_isActive_idx" 
        ON imovel_custom_fields("isActive")
    `)
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "imovel_custom_fields_displayOrder_idx" 
        ON imovel_custom_fields("displayOrder")
    `)
    
    console.log('✅ Índices criados!')
    console.log('')
    console.log('Verificando tabela...')
    
    const result = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM imovel_custom_fields
    `)
    
    console.log('📊 Registros na tabela:', result[0].count)
    console.log('✅ Tudo pronto! Tabela imovel_custom_fields criada com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createTable()

