/**
 * Script para criar tabela documents no PostgreSQL
 * Versão: 2.0.7
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createDocumentsTable() {
  console.log('📦 Criando tabela documents...')

  try {
    // Criar tabela
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "patrimonioId" VARCHAR(36),
        "imovelId" VARCHAR(36),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        url VARCHAR(500) NOT NULL,
        "fileSize" INTEGER,
        description TEXT,
        "uploadedBy" VARCHAR(36) NOT NULL,
        "uploadedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log('✅ Tabela documents criada')

    // Criar índices
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_documents_patrimonio ON documents("patrimonioId")
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_documents_imovel ON documents("imovelId")
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents("uploadedBy")
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_documents_created ON documents("createdAt")
    `)

    console.log('✅ Índices criados')

    // Foreign keys
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE documents 
        DROP CONSTRAINT IF EXISTS fk_documents_patrimonio
      `)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE documents 
        ADD CONSTRAINT fk_documents_patrimonio 
        FOREIGN KEY ("patrimonioId") REFERENCES patrimonios(id) ON DELETE CASCADE
      `)
      console.log('✅ FK patrimonio criada')
    } catch (e) {
      console.log('ℹ️  FK patrimonio já existe ou erro:', e.message)
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE documents 
        DROP CONSTRAINT IF EXISTS fk_documents_imovel
      `)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE documents 
        ADD CONSTRAINT fk_documents_imovel 
        FOREIGN KEY ("imovelId") REFERENCES imoveis(id) ON DELETE CASCADE
      `)
      console.log('✅ FK imovel criada')
    } catch (e) {
      console.log('ℹ️  FK imovel já existe ou erro:', e.message)
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE documents 
        DROP CONSTRAINT IF EXISTS fk_documents_uploader
      `)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE documents 
        ADD CONSTRAINT fk_documents_uploader 
        FOREIGN KEY ("uploadedBy") REFERENCES users(id)
      `)
      console.log('✅ FK uploader criada')
    } catch (e) {
      console.log('ℹ️  FK uploader já existe ou erro:', e.message)
    }

    // Verificar
    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM documents`)
    console.log('✅ Tabela verificada:', count)

    console.log('')
    console.log('╔════════════════════════════════════════╗')
    console.log('║   TABELA DOCUMENTS CRIADA!             ║')
    console.log('╚════════════════════════════════════════╝')
    console.log('')
    console.log('Próximo passo: npx prisma generate')

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createDocumentsTable()

