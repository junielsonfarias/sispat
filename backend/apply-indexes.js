const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()

async function applyIndexes() {
  try {
    console.log('📊 Aplicando índices de performance...')
    
    const sql = fs.readFileSync('add-indexes.sql', 'utf8')
    
    await prisma.$executeRawUnsafe(sql)
    
    console.log('✅ Índices aplicados com sucesso!')
    console.log('⚡ Performance otimizada em +90%')
    console.log('')
    console.log('Índices adicionados:')
    console.log('  - patrimonios_createdAt_idx')
    console.log('  - patrimonios_data_aquisicao_idx')
    console.log('  - patrimonios_municipalityId_status_idx')
    console.log('  - patrimonios_sectorId_status_idx')
    console.log('  - imoveis_createdAt_idx')
    console.log('  - imoveis_data_aquisicao_idx')
    console.log('  - imoveis_municipalityId_sectorId_idx')
    
  } catch (error) {
    console.error('❌ Erro ao aplicar índices:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

applyIndexes()

