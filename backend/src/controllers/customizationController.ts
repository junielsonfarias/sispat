import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logError, logInfo, logWarn, logDebug } from '../config/logger';

const prisma = new PrismaClient();

/**
 * Buscar customização do município (público - para tela de login)
 * GET /api/customization/public
 */
export const getPublicCustomization = async (req: Request, res: Response): Promise<void> => {
  try {
    logDebug('🌐 Buscando customização pública (sem autenticação)');
    
    // Buscar primeiro município (sistema single-municipality)
    const municipality = await prisma.municipality.findFirst();
    
    if (!municipality) {
      logWarn('❌ Nenhum município encontrado');
      res.status(404).json({ error: 'Município não encontrado' });
      return;
    }

    const municipalityId = municipality.id;
    logDebug('📍 Município encontrado', { municipalityId });

    // Buscar customização usando SQL raw
    const customizations = await prisma.$queryRaw<any[]>`
      SELECT * FROM customizations WHERE "municipalityId" = ${municipalityId}
    `;

    let customization = customizations[0];

    // Se não existir, retornar valores padrão
    if (!customization) {
      logDebug('ℹ️ Nenhuma customização encontrada, usando padrão');
      customization = {
        id: 'default',
        municipalityId,
        primaryColor: '#2563eb',
        backgroundColor: '#f1f5f9',
        welcomeTitle: 'Bem-vindo ao SISPAT',
        welcomeSubtitle: 'Sistema de Gestão de Patrimônio',
      };
    }

    logDebug('✅ Customização pública carregada');

    res.json({ customization });
  } catch (error) {
    logError('❌ Erro ao buscar customização pública', error);
    res.status(500).json({ error: 'Erro ao buscar customização' });
  }
};

/**
 * Buscar customização do município (autenticado)
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
    logError('Erro ao buscar customização', error, { userId: req.user?.userId });
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

    logDebug('🔐 Verificando permissões', {
      email: req.user.email,
      role: req.user.role,
      municipalityId: req.user.municipalityId
    });

    // Supervisor, admin e superuser podem alterar customização
    const allowedRoles = ['superuser', 'supervisor', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      logWarn('❌ Acesso negado - Role não permitido', { role: req.user.role, allowedRoles });
      res.status(403).json({ 
        error: 'Sem permissão para alterar customização',
        userRole: req.user.role,
        allowedRoles 
      });
      return;
    }

    logDebug('✅ Permissão concedida para role', { role: req.user.role });

    const { municipalityId } = req.user;
    const updateData = req.body;

    logDebug('💾 Salvando customização para município', { municipalityId, fieldsCount: Object.keys(updateData).length });

    // Campos permitidos para update
    const allowedFields = [
      'activeLogoUrl', 'secondaryLogoUrl', 'backgroundType', 'backgroundColor',
      'backgroundImageUrl', 'backgroundVideoUrl', 'videoLoop', 'videoMuted',
      'layout', 'welcomeTitle', 'welcomeSubtitle', 'primaryColor', 'buttonTextColor',
      'fontFamily', 'browserTitle', 'faviconUrl', 'loginFooterText', 
      'systemFooterText', 'superUserFooterText', 'prefeituraName', 
      'secretariaResponsavel', 'departamentoResponsavel'
    ];

    // Filtrar apenas campos permitidos
    const filteredData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    // Adicionar updatedAt
    filteredData.updatedAt = new Date();

    logDebug('📝 Campos a salvar', { fields: Object.keys(filteredData) });

    // Verificar se já existe customização
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM customizations WHERE "municipalityId" = ${municipalityId} LIMIT 1
    `;

    let customization;

    if (existing.length > 0) {
      // UPDATE usando raw SQL seguro
      logDebug('🔄 Atualizando customização existente');
      
      const setStatements: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(filteredData)) {
        setStatements.push(`"${key}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      // Adicionar municipalityId como último parâmetro
      values.push(municipalityId);

      const updateQuery = `
        UPDATE customizations 
        SET ${setStatements.join(', ')}
        WHERE "municipalityId" = $${paramIndex}
        RETURNING *
      `;

      logDebug('📝 Query UPDATE', { queryLength: updateQuery.length, paramsCount: values.length });

      // ✅ CORREÇÃO: Usar $queryRaw com template literals é mais seguro que $queryRawUnsafe
      // Mas como a estrutura é dinâmica, vamos manter mas adicionar sanitização
      const result = await prisma.$queryRawUnsafe(updateQuery, ...values);
      customization = Array.isArray(result) ? result[0] : result;

      logDebug('✅ UPDATE executado com sucesso');
    } else {
      // ✅ CORREÇÃO: INSERT também mantém $queryRawUnsafe mas com valores parametrizados
      logDebug('➕ Criando nova customização');
      
      const id = `custom-${municipalityId}-${Date.now()}`;
      const fields = ['id', 'municipalityId', ...Object.keys(filteredData)];
      const values = [id, municipalityId, ...Object.values(filteredData)];
      const placeholders = fields.map((_, index) => `$${index + 1}`);

      const insertQuery = `
        INSERT INTO customizations (${fields.map(f => `"${f}"`).join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      logDebug('📝 Query INSERT', { queryLength: insertQuery.length, paramsCount: values.length });

      const result = await prisma.$queryRawUnsafe(insertQuery, ...values);
      customization = Array.isArray(result) ? result[0] : result;

      logDebug('✅ INSERT executado com sucesso');
    }

    logInfo('✅ Customização salva', { customizationId: customization?.id });

    res.json({ 
      message: 'Customização salva com sucesso', 
      customization
    });
  } catch (error: any) {
    logError('❌ Erro ao salvar customização', error, {
      errorType: error.constructor.name,
      errorCode: error.code,
      userId: req.user?.userId
    });
    
    res.status(500).json({ 
      error: 'Erro ao salvar customização',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

    // Supervisor, admin e superuser podem resetar customização
    const allowedRoles = ['superuser', 'supervisor', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Sem permissão para resetar customização',
        userRole: req.user.role,
        allowedRoles
      });
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
    logError('Erro ao resetar customização', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao resetar customização' });
  }
};

