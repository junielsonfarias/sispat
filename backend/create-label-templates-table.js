/**
 * Script para criar a tabela label_templates no banco de dados
 * Executar: node create-label-templates-table.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createLabelTemplatesTable() {
  try {
    console.log('🔄 Criando tabela label_templates...');

    // Criar tabela usando SQL direto
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS label_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        "isDefault" BOOLEAN DEFAULT false,
        "isActive" BOOLEAN DEFAULT true,
        elements JSONB NOT NULL,
        "municipalityId" UUID NOT NULL,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_label_template_municipality 
          FOREIGN KEY ("municipalityId") 
          REFERENCES municipalities(id) 
          ON DELETE CASCADE,
        
        CONSTRAINT fk_label_template_creator 
          FOREIGN KEY ("createdBy") 
          REFERENCES users(id)
      );
    `);

    console.log('✅ Tabela label_templates criada');

    // Criar índices
    console.log('🔄 Criando índices...');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_label_templates_municipality 
        ON label_templates("municipalityId");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_label_templates_default 
        ON label_templates("isDefault");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_label_templates_active 
        ON label_templates("isActive");
    `);

    console.log('✅ Índices criados');

    // Inserir template padrão se não existir nenhum
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM label_templates;
    `;

    if (count[0].count === '0') {
      console.log('🔄 Inserindo template padrão...');

      // Buscar primeiro usuário admin/supervisor para ser o creator
      const adminUser = await prisma.user.findFirst({
        where: {
          role: { in: ['admin', 'supervisor'] },
        },
      });

      // Buscar primeiro município
      const municipality = await prisma.municipality.findFirst();

      if (adminUser && municipality) {
        const defaultTemplate = {
          id: 'default-60x40',
          name: 'Padrão 60x40mm',
          width: 60,
          height: 40,
          isDefault: true,
          isActive: true,
          elements: [
            {
              id: 'logo',
              type: 'LOGO',
              x: 5,
              y: 5,
              width: 25,
              height: 20,
              content: 'logo',
              fontSize: 12,
              fontWeight: 'normal',
              textAlign: 'left',
            },
            {
              id: 'patrimonio',
              type: 'PATRIMONIO_FIELD',
              content: 'numero_patrimonio',
              x: 5,
              y: 70,
              width: 55,
              height: 25,
              fontSize: 16,
              fontWeight: 'bold',
              textAlign: 'left',
            },
          ],
          municipalityId: municipality.id,
          createdBy: adminUser.id,
        };

        await prisma.$executeRawUnsafe(`
          INSERT INTO label_templates 
            (id, name, width, height, "isDefault", "isActive", elements, "municipalityId", "createdBy")
          VALUES 
            ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
        `, 
          defaultTemplate.id,
          defaultTemplate.name,
          defaultTemplate.width,
          defaultTemplate.height,
          defaultTemplate.isDefault,
          defaultTemplate.isActive,
          JSON.stringify(defaultTemplate.elements),
          defaultTemplate.municipalityId,
          defaultTemplate.createdBy
        );

        console.log('✅ Template padrão inserido');
      } else {
        console.log('⚠️  Não foi possível inserir template padrão (sem admin ou municipality)');
      }
    } else {
      console.log('ℹ️  Templates já existem no banco');
    }

    console.log('🎉 Processo concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createLabelTemplatesTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Falha fatal:', error);
    process.exit(1);
  });

