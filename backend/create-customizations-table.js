const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTable() {
  try {
    console.log('🔧 Criando tabela customizations...\n');
    
    // Criar tabela
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS customizations (
        id                        TEXT PRIMARY KEY,
        "municipalityId"          TEXT UNIQUE NOT NULL,
        "activeLogoUrl"           TEXT,
        "secondaryLogoUrl"        TEXT,
        "backgroundType"          TEXT DEFAULT 'color',
        "backgroundColor"         TEXT DEFAULT '#f1f5f9',
        "backgroundImageUrl"      TEXT,
        "backgroundVideoUrl"      TEXT,
        "videoLoop"               BOOLEAN DEFAULT true,
        "videoMuted"              BOOLEAN DEFAULT true,
        layout                    TEXT DEFAULT 'center',
        "welcomeTitle"            TEXT DEFAULT 'Bem-vindo ao SISPAT',
        "welcomeSubtitle"         TEXT DEFAULT 'Sistema de Gestão de Patrimônio',
        "primaryColor"            TEXT DEFAULT '#2563eb',
        "buttonTextColor"         TEXT DEFAULT '#ffffff',
        "fontFamily"              TEXT DEFAULT 'Inter var, sans-serif',
        "browserTitle"            TEXT DEFAULT 'SISPAT - Sistema de Gestão de Patrimônio',
        "faviconUrl"              TEXT,
        "loginFooterText"         TEXT DEFAULT '© 2025 Curling. Todos os direitos reservados.',
        "systemFooterText"        TEXT DEFAULT 'SISPAT - Desenvolvido por Curling',
        "superUserFooterText"     TEXT,
        "prefeituraName"          TEXT DEFAULT 'PREFEITURA MUNICIPAL',
        "secretariaResponsavel"   TEXT DEFAULT 'SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO',
        "departamentoResponsavel" TEXT DEFAULT 'DEPARTAMENTO DE PATRIMÔNIO',
        "createdAt"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ Tabela customizations criada com sucesso!\n');
    
    // Inserir registro padrão para municipality-1
    const municipalityId = 'municipality-1';
    const id = `custom-${municipalityId}-${Date.now()}`;
    
    console.log('➕ Criando registro padrão...');
    
    await prisma.$executeRaw`
      INSERT INTO customizations (id, "municipalityId")
      VALUES (${id}, ${municipalityId})
      ON CONFLICT ("municipalityId") DO NOTHING
    `;
    
    console.log('✅ Registro padrão criado!\n');
    
    // Verificar
    const result = await prisma.$queryRaw`
      SELECT * FROM customizations WHERE "municipalityId" = ${municipalityId}
    `;
    
    console.log('📊 Registro criado:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n🎉 Tabela e dados criados com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('   Código:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

createTable();
