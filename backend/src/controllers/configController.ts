import { Request, Response } from 'express';
import { prisma } from '../index';
import { logError, logInfo, logDebug } from '../config/logger';

const MUNICIPALITY_ID = '1'; // ID fixo do município único

// ============================================
// USER REPORT CONFIGS
// ============================================

export const getUserReportConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const configs = await prisma.userReportConfig.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(configs);
  } catch (error) {
    logError('Erro ao buscar configurações de relatório', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao buscar configurações de relatório' });
  }
};

export const createUserReportConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    
    const { name, columns, filters, format } = req.body;

    const config = await prisma.userReportConfig.create({
      data: {
        userId,
        name,
        columns,
        filters: filters || {},
        format: format || 'csv',
      },
    });

    res.status(201).json(config);
  } catch (error) {
    logError('Erro ao criar configuração de relatório', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao criar configuração de relatório' });
  }
};

export const deleteUserReportConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const existingConfig = await prisma.userReportConfig.findUnique({
      where: { id },
    });

    if (!existingConfig || existingConfig.userId !== userId) {
      res.status(404).json({ error: 'Configuração não encontrada' });
      return;
    }

    await prisma.userReportConfig.delete({ where: { id } });
    res.json({ message: 'Configuração excluída com sucesso' });
  } catch (error) {
    logError('Erro ao excluir configuração de relatório', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao excluir configuração de relatório' });
  }
};

// ============================================
// EXCEL CSV TEMPLATES
// ============================================

export const getExcelCsvTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.excelCsvTemplate.findMany({
      where: { municipalityId: MUNICIPALITY_ID },
      orderBy: { createdAt: 'desc' },
    });

    res.json(templates);
  } catch (error) {
    logError('Erro ao buscar templates de exportação', error);
    res.status(500).json({ error: 'Erro ao buscar templates de exportação' });
  }
};

export const createExcelCsvTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, columns, conditionalFormatting } = req.body;

    const template = await prisma.excelCsvTemplate.create({
      data: {
        name,
        municipalityId: MUNICIPALITY_ID,
        columns,
        conditionalFormatting,
      },
    });

    res.status(201).json(template);
  } catch (error) {
    logError('Erro ao criar template de exportação', error);
    res.status(500).json({ error: 'Erro ao criar template de exportação' });
  }
};

export const updateExcelCsvTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, columns, conditionalFormatting } = req.body;

    const template = await prisma.excelCsvTemplate.update({
      where: { id },
      data: {
        name,
        columns,
        conditionalFormatting,
      },
    });

    res.json(template);
  } catch (error) {
    logError('Erro ao atualizar template de exportação', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao atualizar template de exportação' });
  }
};

export const deleteExcelCsvTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.excelCsvTemplate.delete({ where: { id } });
    res.json({ message: 'Template excluído com sucesso' });
  } catch (error) {
    logError('Erro ao excluir template de exportação', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao excluir template de exportação' });
  }
};

// ============================================
// FORM FIELD CONFIGS
// ============================================

export const getFormFieldConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    const fields = await prisma.formFieldConfig.findMany({
      where: { municipalityId: MUNICIPALITY_ID },
      orderBy: { id: 'asc' },
    });

    res.json(fields);
  } catch (error) {
    logError('Erro ao buscar configurações de campos', error);
    res.status(500).json({ error: 'Erro ao buscar configurações de campos' });
  }
};

export const createFormFieldConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, label, type, required, defaultValue, options, isCustom, isSystem } = req.body;

    const field = await prisma.formFieldConfig.create({
      data: {
        key,
        label,
        type,
        required: required || false,
        defaultValue,
        options: options || [],
        isCustom: isCustom || false,
        isSystem: isSystem || false,
        municipalityId: MUNICIPALITY_ID,
      },
    });

    res.status(201).json(field);
  } catch (error) {
    logError('Erro ao criar configuração de campo', error);
    res.status(500).json({ error: 'Erro ao criar configuração de campo' });
  }
};

export const updateFormFieldConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { key, label, type, required, defaultValue, options, isCustom, isSystem } = req.body;

    const field = await prisma.formFieldConfig.update({
      where: { id },
      data: {
        key,
        label,
        type,
        required,
        defaultValue,
        options,
        isCustom,
        isSystem,
      },
    });

    res.json(field);
  } catch (error) {
    logError('Erro ao atualizar configuração de campo', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao atualizar configuração de campo' });
  }
};

export const deleteFormFieldConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.formFieldConfig.delete({ where: { id } });
    res.json({ message: 'Configuração de campo excluída com sucesso' });
  } catch (error) {
    logError('Erro ao excluir configuração de campo', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao excluir configuração de campo' });
  }
};

// ============================================
// ROLE PERMISSIONS
// ============================================

export const getRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await prisma.rolePermission.findMany({
      orderBy: { roleId: 'asc' },
    });

    res.json(permissions);
  } catch (error) {
    logError('Erro ao buscar permissões de roles', error);
    res.status(500).json({ error: 'Erro ao buscar permissões de roles' });
  }
};

export const updateRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roleId } = req.params;
    const { name, permissions } = req.body;

    const rolePermission = await prisma.rolePermission.upsert({
      where: { roleId },
      update: {
        name,
        permissions,
      },
      create: {
        roleId,
        name,
        permissions,
      },
    });

    res.json(rolePermission);
  } catch (error) {
    logError('Erro ao atualizar permissões de role', error, { roleId: req.params.roleId });
    res.status(500).json({ error: 'Erro ao atualizar permissões de role' });
  }
};

// ============================================
// CLOUD STORAGE
// ============================================

export const getCloudStorage = async (req: Request, res: Response): Promise<void> => {
  try {
    let cloudStorage = await prisma.cloudStorage.findUnique({
      where: { municipalityId: MUNICIPALITY_ID },
    });

    if (!cloudStorage) {
      cloudStorage = await prisma.cloudStorage.create({
        data: {
          municipalityId: MUNICIPALITY_ID,
          isConnected: false,
        },
      });
    }

    res.json(cloudStorage);
  } catch (error) {
    logError('Erro ao buscar configuração de cloud storage', error);
    res.status(500).json({ error: 'Erro ao buscar configuração de cloud storage' });
  }
};

export const updateCloudStorage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider, isConnected, accessToken, refreshToken, expiresAt } = req.body;

    const cloudStorage = await prisma.cloudStorage.upsert({
      where: { municipalityId: MUNICIPALITY_ID },
      update: {
        provider,
        isConnected,
        accessToken,
        refreshToken,
        expiresAt,
      },
      create: {
        municipalityId: MUNICIPALITY_ID,
        provider,
        isConnected,
        accessToken,
        refreshToken,
        expiresAt,
      },
    });

    res.json(cloudStorage);
  } catch (error) {
    logError('Erro ao atualizar configuração de cloud storage', error);
    res.status(500).json({ error: 'Erro ao atualizar configuração de cloud storage' });
  }
};

// ============================================
// REPORT TEMPLATES
// ============================================

export const getReportTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const templates = await prisma.reportTemplate.findMany({
      where: { municipalityId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(templates);
  } catch (error) {
    logError('Erro ao buscar templates de relatório', error, { municipalityId: req.user?.municipalityId });
    res.status(500).json({ error: 'Erro ao buscar templates de relatório' });
  }
};

export const createReportTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { name, layout, fields, filters, isDefault } = req.body;

    // Validação básica
    if (!name || name.trim() === '') {
      res.status(400).json({ error: 'Nome do template é obrigatório' });
      return;
    }

    // Se o frontend enviar fields mas não layout, criar layout padrão baseado nos fields
    let finalLayout = layout;
    if (!finalLayout && fields && Array.isArray(fields) && fields.length > 0) {
      // Criar layout padrão tabular com os campos selecionados
      finalLayout = [
        {
          id: 'header',
          type: 'HEADER',
          x: 0,
          y: 0,
          w: 12,
          h: 1,
          styles: { paddingBottom: 16, borderBottomWidth: 2, borderStyle: 'solid' },
        },
        {
          id: 'table',
          type: 'TABLE',
          x: 0,
          y: 1,
          w: 12,
          h: 10,
          styles: { fontSize: 10 },
          props: { fields },
        },
        {
          id: 'footer',
          type: 'FOOTER',
          x: 0,
          y: 11,
          w: 12,
          h: 1,
          styles: {
            paddingTop: 16,
            fontSize: 8,
            textAlign: 'center',
            borderTopWidth: 1,
            borderStyle: 'solid',
          },
        },
      ];
    }

    // Se ainda não tiver layout, usar layout padrão vazio
    if (!finalLayout) {
      finalLayout = [
        {
          id: 'header',
          type: 'HEADER',
          x: 0,
          y: 0,
          w: 12,
          h: 1,
        },
        {
          id: 'table',
          type: 'TABLE',
          x: 0,
          y: 1,
          w: 12,
          h: 10,
        },
        {
          id: 'footer',
          type: 'FOOTER',
          x: 0,
          y: 11,
          w: 12,
          h: 1,
        },
      ];
    }

    // Se for marcado como padrão, desmarcar outros
    if (isDefault) {
      await prisma.reportTemplate.updateMany({
        where: {
          municipalityId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const template = await prisma.reportTemplate.create({
      data: {
        name: name.trim(),
        municipalityId,
        layout: finalLayout,
        isDefault: isDefault || false,
      },
    });

    logInfo('Template de relatório criado', { templateId: template.id, name, municipalityId });
    res.status(201).json(template);
  } catch (error: any) {
    logError('Erro ao criar template de relatório', error, { 
      name: req.body.name,
      municipalityId: req.user?.municipalityId,
      hasLayout: !!req.body.layout,
      hasFields: !!req.body.fields,
      errorMessage: error?.message,
      errorCode: error?.code,
    });
    
    // Retornar mensagem de erro mais específica
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'Já existe um template com este nome' });
    } else if (error?.message?.includes('municipalityId')) {
      res.status(400).json({ error: 'Município inválido' });
    } else {
      res.status(500).json({ 
        error: 'Erro ao criar template de relatório',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      });
    }
  }
};

export const updateReportTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;
    const { name, layout, fields, filters, isDefault } = req.body;

    // Verificar se o template pertence ao município do usuário
    const existingTemplate = await prisma.reportTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }

    if (existingTemplate.municipalityId !== municipalityId) {
      res.status(403).json({ error: 'Acesso negado: template de outro município' });
      return;
    }

    // Preparar dados para atualização
    const updateData: any = {};
    
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        res.status(400).json({ error: 'Nome do template é obrigatório' });
        return;
      }
      updateData.name = name.trim();
    }

    if (layout !== undefined) {
      updateData.layout = layout;
    } else if (fields !== undefined && Array.isArray(fields) && fields.length > 0) {
      // Se enviou fields mas não layout, atualizar layout
      updateData.layout = [
        {
          id: 'header',
          type: 'HEADER',
          x: 0,
          y: 0,
          w: 12,
          h: 1,
          styles: { paddingBottom: 16, borderBottomWidth: 2, borderStyle: 'solid' },
        },
        {
          id: 'table',
          type: 'TABLE',
          x: 0,
          y: 1,
          w: 12,
          h: 10,
          styles: { fontSize: 10 },
          props: { fields },
        },
        {
          id: 'footer',
          type: 'FOOTER',
          x: 0,
          y: 11,
          w: 12,
          h: 1,
          styles: {
            paddingTop: 16,
            fontSize: 8,
            textAlign: 'center',
            borderTopWidth: 1,
            borderStyle: 'solid',
          },
        },
      ];
    }

    if (isDefault !== undefined) {
      updateData.isDefault = isDefault;
      
      // Se for marcado como padrão, desmarcar outros
      if (isDefault) {
        await prisma.reportTemplate.updateMany({
          where: {
            municipalityId,
            isDefault: true,
            id: { not: id },
          },
          data: {
            isDefault: false,
          },
        });
      }
    }

    const template = await prisma.reportTemplate.update({
      where: { id },
      data: updateData,
    });

    logInfo('Template de relatório atualizado', { templateId: id, municipalityId });
    res.json(template);
  } catch (error: any) {
    logError('Erro ao atualizar template de relatório', error, { 
      id: req.params.id,
      municipalityId: req.user?.municipalityId,
      errorMessage: error?.message,
    });
    res.status(500).json({ error: 'Erro ao atualizar template de relatório' });
  }
};

export const deleteReportTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;

    // Verificar se o template pertence ao município do usuário
    const existingTemplate = await prisma.reportTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }

    if (existingTemplate.municipalityId !== municipalityId) {
      res.status(403).json({ error: 'Acesso negado: template de outro município' });
      return;
    }

    await prisma.reportTemplate.delete({ where: { id } });
    logInfo('Template de relatório excluído', { templateId: id, municipalityId });
    res.json({ message: 'Template excluído com sucesso' });
  } catch (error: any) {
    logError('Erro ao excluir template de relatório', error, { 
      id: req.params.id,
      municipalityId: req.user?.municipalityId,
      errorMessage: error?.message,
    });
    res.status(500).json({ error: 'Erro ao excluir template de relatório' });
  }
};

// ============================================
// IMOVEL REPORT TEMPLATES
// ============================================

export const getImovelReportTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.imovelReportTemplate.findMany({
      where: { municipalityId: MUNICIPALITY_ID },
      orderBy: { createdAt: 'desc' },
    });

    res.json(templates);
  } catch (error) {
    logError('Erro ao buscar templates de relatório de imóveis', error);
    res.status(500).json({ error: 'Erro ao buscar templates de relatório de imóveis' });
  }
};

export const createImovelReportTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, fields, filters } = req.body;

    const template = await prisma.imovelReportTemplate.create({
      data: {
        name,
        municipalityId: MUNICIPALITY_ID,
        fields,
        filters,
      },
    });

    res.status(201).json(template);
  } catch (error) {
    logError('Erro ao criar template de relatório de imóveis', error);
    res.status(500).json({ error: 'Erro ao criar template de relatório de imóveis' });
  }
};

export const updateImovelReportTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, fields, filters } = req.body;

    const template = await prisma.imovelReportTemplate.update({
      where: { id },
      data: {
        name,
        fields,
        filters,
      },
    });

    res.json(template);
  } catch (error) {
    logError('Erro ao atualizar template de relatório de imóveis', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao atualizar template de relatório de imóveis' });
  }
};

export const deleteImovelReportTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.imovelReportTemplate.delete({ where: { id } });
    res.json({ message: 'Template excluído com sucesso' });
  } catch (error) {
    logError('Erro ao excluir template de relatório de imóveis', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao excluir template de relatório de imóveis' });
  }
};

// ============================================
// NUMBERING PATTERNS
// ============================================

export const getNumberingPattern = async (req: Request, res: Response): Promise<void> => {
  try {
    let pattern = await prisma.numberingPattern.findUnique({
      where: { municipalityId: MUNICIPALITY_ID },
    });

    if (!pattern) {
      // Criar padrão padrão se não existir
      pattern = await prisma.numberingPattern.create({
        data: {
          municipalityId: MUNICIPALITY_ID,
          components: [],
        },
      });
    }

    res.json(pattern);
  } catch (error) {
    logError('Erro ao buscar padrão de numeração', error);
    res.status(500).json({ error: 'Erro ao buscar padrão de numeração' });
  }
};

export const updateNumberingPattern = async (req: Request, res: Response): Promise<void> => {
  try {
    const { components } = req.body;

    const pattern = await prisma.numberingPattern.upsert({
      where: { municipalityId: MUNICIPALITY_ID },
      update: { components },
      create: {
        municipalityId: MUNICIPALITY_ID,
        components,
      },
    });

    res.json(pattern);
  } catch (error) {
    logError('Erro ao atualizar padrão de numeração', error);
    res.status(500).json({ error: 'Erro ao atualizar padrão de numeração' });
  }
};

// ============================================
// USER DASHBOARDS
// ============================================

export const getUserDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    let dashboard = await prisma.userDashboard.findUnique({
      where: { userId },
    });

    if (!dashboard) {
      // Criar dashboard vazio se não existir
      dashboard = await prisma.userDashboard.create({
        data: {
          userId,
          widgets: [],
        },
      });
    }

    res.json(dashboard);
  } catch (error) {
    logError('Erro ao buscar dashboard do usuário', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao buscar dashboard do usuário' });
  }
};

export const updateUserDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    
    const { widgets } = req.body;

    const dashboard = await prisma.userDashboard.upsert({
      where: { userId },
      update: { widgets },
      create: {
        userId,
        widgets,
      },
    });

    res.json(dashboard);
  } catch (error) {
    logError('Erro ao atualizar dashboard do usuário', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao atualizar dashboard do usuário' });
  }
};

