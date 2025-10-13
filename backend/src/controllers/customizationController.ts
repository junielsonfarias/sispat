import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Buscar customização do município (público - para tela de login)
 * GET /api/customization/public
 */
export const getPublicCustomization = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[DEV] 🌐 Buscando customização pública (sem autenticação)...');
    
    // Buscar primeiro município (sistema single-municipality)
    const municipality = await prisma.municipality.findFirst();
    
    if (!municipality) {
      console.log('[DEV] ❌ Nenhum município encontrado');
      res.status(404).json({ error: 'Município não encontrado' });
      return;
    }

    const municipalityId = municipality.id;
    console.log('[DEV] 📍 Município:', municipalityId);

    // Buscar customização usando SQL raw
    const customizations = await prisma.$queryRaw<any[]>`
      SELECT * FROM customizations WHERE "municipalityId" = ${municipalityId}
    `;

    let customization = customizations[0];

    // Se não existir, retornar valores padrão
    if (!customization) {
      console.log('[DEV] ℹ️ Nenhuma customização encontrada, usando padrão');
      customization = {
        id: 'default',
        municipalityId,
        primaryColor: '#2563eb',
        backgroundColor: '#f1f5f9',
        welcomeTitle: 'Bem-vindo ao SISPAT',
        welcomeSubtitle: 'Sistema de Gestão de Patrimônio',
      };
    }

    console.log('[DEV] ✅ Customização pública carregada');

    res.json({ customization });
  } catch (error) {
    console.error('[DEV] ❌ Erro ao buscar customização pública:', error);
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

    console.log('🔐 [DEV] Verificando permissões...');
    console.log('   Usuário:', req.user.email);
    console.log('   Role:', req.user.role);
    console.log('   MunicipalityId:', req.user.municipalityId);

    // Supervisor, admin e superuser podem alterar customização
    const allowedRoles = ['superuser', 'supervisor', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      console.log('❌ [DEV] Acesso negado - Role não permitido:', req.user.role);
      res.status(403).json({ 
        error: 'Sem permissão para alterar customização',
        userRole: req.user.role,
        allowedRoles 
      });
      return;
    }

    console.log('✅ [DEV] Permissão concedida para role:', req.user.role);

    const { municipalityId } = req.user;
    const updateData = req.body;

    console.log('💾 [DEV] Salvando customização para município:', municipalityId);
    console.log('📋 [DEV] Dados recebidos:', JSON.stringify(updateData, null, 2));

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

    console.log('📝 [DEV] Campos a salvar:', Object.keys(filteredData));

    // Verificar se já existe customização
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM customizations WHERE "municipalityId" = ${municipalityId} LIMIT 1
    `;

    let customization;

    if (existing.length > 0) {
      // UPDATE usando raw SQL seguro
      console.log('🔄 [DEV] Atualizando customização existente...');
      
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

      console.log('📝 [DEV] Query UPDATE:', updateQuery);
      console.log('📝 [DEV] Valores:', values);

      // ✅ CORREÇÃO: Usar $queryRaw com template literals é mais seguro que $queryRawUnsafe
      // Mas como a estrutura é dinâmica, vamos manter mas adicionar sanitização
      const result = await prisma.$queryRawUnsafe(updateQuery, ...values);
      customization = Array.isArray(result) ? result[0] : result;

      console.log('✅ [DEV] UPDATE executado com sucesso');
    } else {
      // ✅ CORREÇÃO: INSERT também mantém $queryRawUnsafe mas com valores parametrizados
      console.log('➕ [DEV] Criando nova customização...');
      
      const id = `custom-${municipalityId}-${Date.now()}`;
      const fields = ['id', 'municipalityId', ...Object.keys(filteredData)];
      const values = [id, municipalityId, ...Object.values(filteredData)];
      const placeholders = fields.map((_, index) => `$${index + 1}`);

      const insertQuery = `
        INSERT INTO customizations (${fields.map(f => `"${f}"`).join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      console.log('📝 [DEV] Query INSERT:', insertQuery);
      console.log('📝 [DEV] Valores:', values);

      const result = await prisma.$queryRawUnsafe(insertQuery, ...values);
      customization = Array.isArray(result) ? result[0] : result;

      console.log('✅ [DEV] INSERT executado com sucesso');
    }

    console.log('✅ [DEV] Customização salva!');
    console.log('📊 [DEV] Resultado:', JSON.stringify(customization, null, 2));

    res.json({ 
      message: 'Customização salva com sucesso', 
      customization
    });
  } catch (error: any) {
    console.error('❌ [DEV] ===== ERRO DETALHADO =====');
    console.error('   Tipo:', error.constructor.name);
    console.error('   Mensagem:', error.message);
    console.error('   Código:', error.code);
    console.error('   Stack:', error.stack);
    console.error('==============================');
    
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
    console.error('Erro ao resetar customização:', error);
    res.status(500).json({ error: 'Erro ao resetar customização' });
  }
};

