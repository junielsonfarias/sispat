import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Buscar customização do município
 * GET /api/customization
 */
export const getCustomization = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { municipalityId } = req.user;

    // Buscar customização usando SQL raw
    const customizations = await prisma.$queryRaw<any[]>`
      SELECT * FROM customizations WHERE "municipalityId" = ${municipalityId}
    `;

    let customization = customizations[0];

    // Se não existir, criar com valores padrão
    if (!customization) {
      await prisma.$executeRaw`
        INSERT INTO customizations ("id", "municipalityId")
        VALUES (gen_random_uuid()::text, ${municipalityId})
      `;
      
      const newCustomizations = await prisma.$queryRaw<any[]>`
        SELECT * FROM customizations WHERE "municipalityId" = ${municipalityId}
      `;
      customization = newCustomizations[0];
    }

    res.json({ customization });
  } catch (error) {
    console.error('Erro ao buscar customização:', error);
    res.status(500).json({ error: 'Erro ao buscar customização' });
  }
};

/**
 * Salvar customização do município
 * PUT /api/customization
 */
export const saveCustomization = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // Apenas admin e superuser podem alterar
    if (req.user.role !== 'admin' && req.user.role !== 'superuser') {
      res.status(403).json({ error: 'Sem permissão para alterar customização' });
      return;
    }

    const { municipalityId } = req.user;
    const updateData = req.body;

    console.log('💾 Salvando customização para município:', municipalityId);
    console.log('📋 Dados recebidos:', Object.keys(updateData));

    // Verificar se já existe
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM customizations WHERE "municipalityId" = ${municipalityId}
    `;

    if (existing.length > 0) {
      // Atualizar
      const setClause = Object.keys(updateData)
        .map(key => `"${key}" = '${String(updateData[key]).replace(/'/g, "''")}'`)
        .join(', ');
      
      await prisma.$executeRawUnsafe(`
        UPDATE customizations 
        SET ${setClause}, "updatedAt" = NOW()
        WHERE "municipalityId" = '${municipalityId}'
      `);
    } else {
      // Criar
      const fields = ['id', 'municipalityId', ...Object.keys(updateData)];
      const values = [`gen_random_uuid()::text`, `'${municipalityId}'`, ...Object.values(updateData).map(v => `'${String(v).replace(/'/g, "''")}'`)];
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO customizations (${fields.map(f => `"${f}"`).join(', ')})
        VALUES (${values.join(', ')})
      `);
    }

    // Buscar customização atualizada
    const customizations = await prisma.$queryRaw<any[]>`
      SELECT * FROM customizations WHERE "municipalityId" = ${municipalityId}
    `;

    console.log('✅ Customização salva com sucesso');

    res.json({ 
      message: 'Customização salva com sucesso', 
      customization: customizations[0]
    });
  } catch (error) {
    console.error('❌ Erro ao salvar customização:', error);
    res.status(500).json({ error: 'Erro ao salvar customização' });
  }
};

/**
 * Resetar customização para valores padrão
 * POST /api/customization/reset
 */
export const resetCustomization = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // Apenas admin e superuser podem resetar
    if (req.user.role !== 'admin' && req.user.role !== 'superuser') {
      res.status(403).json({ error: 'Sem permissão para resetar customização' });
      return;
    }

    const { municipalityId } = req.user;

    // Deletar customização existente
    await prisma.$executeRaw`
      DELETE FROM customizations WHERE "municipalityId" = ${municipalityId}
    `;

    // Criar nova com valores padrão
    await prisma.$executeRaw`
      INSERT INTO customizations ("id", "municipalityId")
      VALUES (gen_random_uuid()::text, ${municipalityId})
    `;

    // Buscar customização criada
    const customizations = await prisma.$queryRaw<any[]>`
      SELECT * FROM customizations WHERE "municipalityId" = ${municipalityId}
    `;

    res.json({ 
      message: 'Customização resetada com sucesso', 
      customization: customizations[0]
    });
  } catch (error) {
    console.error('Erro ao resetar customização:', error);
    res.status(500).json({ error: 'Erro ao resetar customização' });
  }
};

