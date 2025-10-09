const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createCustomizationsTable() {
  try {
    console.log('🔧 Criando/verificando tabela customizations...');
    
    // Criar tabela se não existir (comando é idempotente)
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS customizations (
        id TEXT PRIMARY KEY,
        "municipalityId" TEXT,
        "activeLogoUrl" TEXT,
        "secondaryLogoUrl" TEXT,
        "backgroundType" TEXT DEFAULT 'color',
        "backgroundColor" TEXT DEFAULT '#f1f5f9',
        "backgroundImageUrl" TEXT,
        "backgroundVideoUrl" TEXT,
        "videoLoop" BOOLEAN DEFAULT true,
        "videoMuted" BOOLEAN DEFAULT true,
        layout TEXT DEFAULT 'center',
        "welcomeTitle" TEXT DEFAULT 'Bem-vindo ao SISPAT',
        "welcomeSubtitle" TEXT DEFAULT 'Sistema de Gestão de Patrimônio',
        "primaryColor" TEXT DEFAULT '#2563eb',
        "buttonTextColor" TEXT DEFAULT '#ffffff',
        "fontFamily" TEXT DEFAULT 'Inter var, sans-serif',
        "browserTitle" TEXT DEFAULT 'SISPAT',
        "faviconUrl" TEXT,
        "loginFooterText" TEXT,
        "systemFooterText" TEXT,
        "superUserFooterText" TEXT,
        "prefeituraName" TEXT,
        "secretariaResponsavel" TEXT,
        "departamentoResponsavel" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ Tabela customizations OK!');
    
    // Buscar município
    const municipality = await prisma.municipality.findFirst();
    
    if (!municipality) {
      console.log('❌ Nenhum município encontrado!');
      return;
    }
    
    // Verificar se já tem customização
    const existing = await prisma.$queryRaw`
      SELECT * FROM customizations WHERE "municipalityId" = ${municipality.id} LIMIT 1
    `;
    
    if (existing.length > 0) {
      console.log('✅ Customização já existe para o município!');
      console.log('📊 ID:', existing[0].id);
    } else {
      console.log('➕ Criando customização padrão...');
      await prisma.$executeRaw`
        INSERT INTO customizations (
          id, 
          "municipalityId", 
          "updatedAt",
          "createdAt"
        )
        VALUES (
          ${`custom-${municipality.id}`},
          ${municipality.id},
          NOW(),
          NOW()
        )
      `;
      console.log('✅ Customização padrão criada!');
    }
    
    console.log('');
    console.log('✅ Setup completo!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createCustomizationsTable();

