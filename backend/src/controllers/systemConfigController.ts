import { Request, Response } from 'express';
import { prisma } from '../index';
import { logError, logInfo, logDebug } from '../config/logger';

/**
 * @desc    Obter configuração do sistema (público)
 * @route   GET /api/public/system-configuration
 * @access  Public
 */
export const getPublicSystemConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscar configuração do sistema (sempre existe apenas uma)
    let config = await prisma.systemConfiguration.findFirst();

    // Se não existir, criar com valores padrão
    if (!config) {
      config = await prisma.systemConfiguration.create({
        data: {},
      });
    }

    res.json(config);
  } catch (error) {
    logError('Erro ao buscar configuração do sistema', error);
    res.status(500).json({ error: 'Erro ao buscar configuração do sistema' });
  }
};

/**
 * @desc    Obter configuração do sistema (autenticado)
 * @route   GET /api/system-configuration
 * @access  Private
 */
export const getSystemConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    let config = await prisma.systemConfiguration.findFirst();

    if (!config) {
      config = await prisma.systemConfiguration.create({
        data: {},
      });
    }

    res.json(config);
  } catch (error) {
    logError('Erro ao buscar configuração do sistema', error);
    res.status(500).json({ error: 'Erro ao buscar configuração do sistema' });
  }
};

/**
 * @desc    Atualizar configuração do sistema
 * @route   PUT /api/system-configuration
 * @access  Private (Admin, Superuser)
 */
// Campos que o admin pode alterar — evita mass-assignment (ex.: injetar id/updatedAt)
const ALLOWED_CONFIG_FIELDS = [
  'autoBackupEnabled',
  'backupFrequency',
  'maintenanceMode',
  'allowPublicSearch',
  'maxUploadSize',
  'sessionTimeout',
  'passwordExpiryDays',
  'requirePasswordChange',
] as const;

export const updateSystemConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ Whitelist explícita de campos atualizáveis
    const data: Record<string, unknown> = {};
    for (const field of ALLOWED_CONFIG_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }

    logDebug('🔧 Atualizando configuração do sistema', { campos: Object.keys(data) });

    let config = await prisma.systemConfiguration.findFirst();

    if (!config) {
      config = await prisma.systemConfiguration.create({
        data,
      });
    } else {
      config = await prisma.systemConfiguration.update({
        where: { id: config.id },
        data,
      });
    }

    logInfo('✅ Configuração do sistema atualizada', { id: config.id });
    res.json(config);
  } catch (error) {
    logError('Erro ao atualizar configuração do sistema', error);
    res.status(500).json({ error: 'Erro ao atualizar configuração do sistema' });
  }
};

