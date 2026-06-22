import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index';
import { logError, logInfo, logDebug } from '../config/logger';
import * as excelCsvTemplates from '../services/excelCsvTemplateService';
import * as formFieldConfigs from '../services/formFieldConfigService';
import * as cloudStorageService from '../services/cloudStorageService';
import * as userReportConfigs from '../services/userReportConfigService';
import * as rolePermissionService from '../services/rolePermissionService';
import * as numberingPatternService from '../services/numberingPatternService';
import * as userDashboardService from '../services/userDashboardService';
import * as reportTemplateService from '../services/reportTemplateService';
import * as imovelReportTemplates from '../services/imovelReportTemplateService';

// ============================================
// USER REPORT CONFIGS
// ============================================

export const getUserReportConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const configs = await userReportConfigs.listUserReportConfigs(userId);
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
    const config = await userReportConfigs.createUserReportConfig(userId, {
      name,
      columns,
      filters,
      format,
    });
    res.status(201).json(config);
  } catch (error) {
    logError('Erro ao criar configuração de relatório', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao criar configuração de relatório' });
  }
};

export const deleteUserReportConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    await userReportConfigs.removeUserReportConfig(userId, id);
    res.json({ message: 'Configuração excluída com sucesso' });
  } catch (error) {
    if (error instanceof userReportConfigs.UserReportConfigNotFoundError) {
      res.status(404).json({ error: 'Configuração não encontrada' });
      return;
    }
    logError('Erro ao excluir configuração de relatório', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao excluir configuração de relatório' });
  }
};

// ============================================
// EXCEL CSV TEMPLATES
// ============================================

export const getExcelCsvTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const templates = await excelCsvTemplates.listExcelCsvTemplates({
      role: req.user!.role,
      municipalityId,
    });
    res.json(templates);
  } catch (error) {
    logError('Erro ao buscar templates de exportação', error);
    res.status(500).json({ error: 'Erro ao buscar templates de exportação' });
  }
};

export const createExcelCsvTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { name, columns, conditionalFormatting } = req.body;
    const template = await excelCsvTemplates.createExcelCsvTemplate(
      { role: req.user!.role, municipalityId },
      { name, columns, conditionalFormatting },
    );
    res.status(201).json(template);
  } catch (error) {
    logError('Erro ao criar template de exportação', error);
    res.status(500).json({ error: 'Erro ao criar template de exportação' });
  }
};

export const updateExcelCsvTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    const { name, columns, conditionalFormatting } = req.body;
    const template = await excelCsvTemplates.updateExcelCsvTemplate(
      { role: req.user!.role, municipalityId },
      id,
      { name, columns, conditionalFormatting },
    );
    res.json(template);
  } catch (error) {
    if (error instanceof excelCsvTemplates.ExcelCsvTemplateNotFoundError) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }
    logError('Erro ao atualizar template de exportação', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao atualizar template de exportação' });
  }
};

export const deleteExcelCsvTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    await excelCsvTemplates.removeExcelCsvTemplate(
      { role: req.user!.role, municipalityId },
      id,
    );
    res.json({ message: 'Template excluído com sucesso' });
  } catch (error) {
    if (error instanceof excelCsvTemplates.ExcelCsvTemplateNotFoundError) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }
    logError('Erro ao excluir template de exportação', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao excluir template de exportação' });
  }
};

// ============================================
// FORM FIELD CONFIGS
// ============================================

export const getFormFieldConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const fields = await formFieldConfigs.listFormFieldConfigs({
      role: req.user!.role,
      municipalityId,
    });
    res.json(fields);
  } catch (error) {
    logError('Erro ao buscar configurações de campos', error);
    res.status(500).json({ error: 'Erro ao buscar configurações de campos' });
  }
};

export const createFormFieldConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { key, label, type, required, defaultValue, options, isCustom, isSystem } = req.body;
    const field = await formFieldConfigs.createFormFieldConfig(
      { role: req.user!.role, municipalityId },
      { key, label, type, required, defaultValue, options, isCustom, isSystem },
    );
    res.status(201).json(field);
  } catch (error) {
    logError('Erro ao criar configuração de campo', error);
    res.status(500).json({ error: 'Erro ao criar configuração de campo' });
  }
};

export const updateFormFieldConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    const { key, label, type, required, defaultValue, options, isCustom, isSystem } = req.body;
    const field = await formFieldConfigs.updateFormFieldConfig(
      { role: req.user!.role, municipalityId },
      id,
      { key, label, type, required, defaultValue, options, isCustom, isSystem },
    );
    res.json(field);
  } catch (error) {
    if (error instanceof formFieldConfigs.FormFieldConfigNotFoundError) {
      res.status(404).json({ error: 'Configuração de campo não encontrada' });
      return;
    }
    logError('Erro ao atualizar configuração de campo', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao atualizar configuração de campo' });
  }
};

export const deleteFormFieldConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    await formFieldConfigs.removeFormFieldConfig({ role: req.user!.role, municipalityId }, id);
    res.json({ message: 'Configuração de campo excluída com sucesso' });
  } catch (error) {
    if (error instanceof formFieldConfigs.FormFieldConfigNotFoundError) {
      res.status(404).json({ error: 'Configuração de campo não encontrada' });
      return;
    }
    logError('Erro ao excluir configuração de campo', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao excluir configuração de campo' });
  }
};

// ============================================
// ROLE PERMISSIONS
// ============================================

export const getRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await rolePermissionService.listRolePermissions();
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
    const rolePermission = await rolePermissionService.upsertRolePermission(roleId, {
      name,
      permissions,
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
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const cloudStorage = await cloudStorageService.getCloudStorage(municipalityId);
    res.json(cloudStorage);
  } catch (error) {
    logError('Erro ao buscar configuração de cloud storage', error);
    res.status(500).json({ error: 'Erro ao buscar configuração de cloud storage' });
  }
};

export const updateCloudStorage = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { provider, isConnected, accessToken, refreshToken, expiresAt } = req.body;
    const cloudStorage = await cloudStorageService.upsertCloudStorage(municipalityId, {
      provider,
      isConnected,
      accessToken,
      refreshToken,
      expiresAt,
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

    const templates = await reportTemplateService.listReportTemplates(municipalityId);
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

    const { name, layout, fields, isDefault } = req.body;
    const template = await reportTemplateService.createReportTemplate(municipalityId, {
      name,
      layout,
      fields,
      isDefault,
    });
    logInfo('Template de relatório criado', { templateId: template.id, name, municipalityId });
    res.status(201).json(template);
  } catch (error: unknown) {
    if (error instanceof reportTemplateService.ReportTemplateValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    const err = error instanceof Error ? error : new Error(String(error));
    const errorCode =
      error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
    logError('Erro ao criar template de relatório', err, {
      name: req.body.name,
      municipalityId: req.user?.municipalityId,
      hasLayout: !!req.body.layout,
      hasFields: !!req.body.fields,
      errorMessage: err.message,
      errorCode,
    });

    // Retornar mensagem de erro mais específica
    if (errorCode === 'P2002') {
      res.status(409).json({ error: 'Já existe um template com este nome' });
    } else if (err.message.includes('municipalityId')) {
      res.status(400).json({ error: 'Município inválido' });
    } else {
      res.status(500).json({
        error: 'Erro ao criar template de relatório',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
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
    const { name, layout, fields, isDefault } = req.body;
    const template = await reportTemplateService.updateReportTemplate(municipalityId, id, {
      name,
      layout,
      fields,
      isDefault,
    });
    logInfo('Template de relatório atualizado', { templateId: id, municipalityId });
    res.json(template);
  } catch (error: unknown) {
    if (error instanceof reportTemplateService.ReportTemplateNotFoundError) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }
    if (error instanceof reportTemplateService.ReportTemplateForbiddenError) {
      res.status(403).json({ error: 'Acesso negado: template de outro município' });
      return;
    }
    if (error instanceof reportTemplateService.ReportTemplateValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    const err = error instanceof Error ? error : new Error(String(error));
    logError('Erro ao atualizar template de relatório', err, {
      id: req.params.id,
      municipalityId: req.user?.municipalityId,
      errorMessage: err.message,
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
    await reportTemplateService.removeReportTemplate(municipalityId, id);
    logInfo('Template de relatório excluído', { templateId: id, municipalityId });
    res.json({ message: 'Template excluído com sucesso' });
  } catch (error: unknown) {
    if (error instanceof reportTemplateService.ReportTemplateNotFoundError) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }
    if (error instanceof reportTemplateService.ReportTemplateForbiddenError) {
      res.status(403).json({ error: 'Acesso negado: template de outro município' });
      return;
    }
    const err = error instanceof Error ? error : new Error(String(error));
    logError('Erro ao excluir template de relatório', err, {
      id: req.params.id,
      municipalityId: req.user?.municipalityId,
      errorMessage: err.message,
    });
    res.status(500).json({ error: 'Erro ao excluir template de relatório' });
  }
};

// ============================================
// IMOVEL REPORT TEMPLATES
// ============================================

export const getImovelReportTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const templates = await imovelReportTemplates.listImovelReportTemplates({
      role: req.user!.role,
      municipalityId,
    });
    res.json(templates);
  } catch (error) {
    logError('Erro ao buscar templates de relatório de imóveis', error);
    res.status(500).json({ error: 'Erro ao buscar templates de relatório de imóveis' });
  }
};

export const createImovelReportTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { name, fields, filters } = req.body;
    const template = await imovelReportTemplates.createImovelReportTemplate(
      { role: req.user!.role, municipalityId },
      { name, fields, filters },
    );
    res.status(201).json(template);
  } catch (error) {
    logError('Erro ao criar template de relatório de imóveis', error);
    res.status(500).json({ error: 'Erro ao criar template de relatório de imóveis' });
  }
};

export const updateImovelReportTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    const { name, fields, filters } = req.body;
    const template = await imovelReportTemplates.updateImovelReportTemplate(
      { role: req.user!.role, municipalityId },
      id,
      { name, fields, filters },
    );
    res.json(template);
  } catch (error) {
    if (error instanceof imovelReportTemplates.ImovelReportTemplateNotFoundError) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }
    logError('Erro ao atualizar template de relatório de imóveis', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao atualizar template de relatório de imóveis' });
  }
};

export const deleteImovelReportTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    await imovelReportTemplates.removeImovelReportTemplate(
      { role: req.user!.role, municipalityId },
      id,
    );
    res.json({ message: 'Template excluído com sucesso' });
  } catch (error) {
    if (error instanceof imovelReportTemplates.ImovelReportTemplateNotFoundError) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }
    logError('Erro ao excluir template de relatório de imóveis', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao excluir template de relatório de imóveis' });
  }
};

// ============================================
// NUMBERING PATTERNS
// ============================================

export const getNumberingPattern = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const pattern = await numberingPatternService.getNumberingPattern(municipalityId);
    res.json(pattern);
  } catch (error) {
    logError('Erro ao buscar padrão de numeração', error);
    res.status(500).json({ error: 'Erro ao buscar padrão de numeração' });
  }
};

export const updateNumberingPattern = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;
    if (!municipalityId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { components } = req.body;
    const pattern = await numberingPatternService.upsertNumberingPattern(municipalityId, components);
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
    const dashboard = await userDashboardService.getUserDashboard(userId);
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
    const dashboard = await userDashboardService.upsertUserDashboard(userId, widgets);
    res.json(dashboard);
  } catch (error) {
    logError('Erro ao atualizar dashboard do usuário', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao atualizar dashboard do usuário' });
  }
};

