import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { emailService } from '../config/email';
import { logActivity } from '../utils/activityLogger';
import { logError, logInfo, logWarn, logDebug } from '../config/logger';

/**
 * Obter configuração de email
 * GET /api/email-config
 */
export const getEmailConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore - Modelo EmailConfig pode não estar disponível ainda
    const emailConfig = await prisma.emailConfig?.findFirst();

    if (!emailConfig) {
      res.json({
        configured: false,
        enabled: false,
      });
      return;
    }

    // Não retornar a senha por segurança
    const { password, ...configWithoutPassword } = emailConfig;

    res.json({
      configured: true,
      enabled: emailConfig.enabled,
      config: configWithoutPassword,
    });
  } catch (error) {
    logError('Erro ao obter configuração de email', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Atualizar configuração de email
 * PUT /api/email-config
 */
export const updateEmailConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { host, port, secure, user, password, fromAddress, enabled } = req.body;

    logDebug('📧 Atualizando configuração de email', {
      userId,
      host,
      port,
      secure,
      user,
      fromAddress,
      enabled,
      hasPassword: !!password,
    });

    // Validações
    if (!host || !port || !user || !fromAddress) {
      res.status(400).json({ 
        error: 'Host, porta, usuário e endereço de origem são obrigatórios' 
      });
      return;
    }

    if (port < 1 || port > 65535) {
      res.status(400).json({ error: 'Porta deve estar entre 1 e 65535' });
      return;
    }

    if (!fromAddress.includes('@')) {
      res.status(400).json({ error: 'Endereço de origem deve ser um email válido' });
      return;
    }

    // Verificar se já existe configuração
    // @ts-ignore - Modelo EmailConfig pode não estar disponível ainda
    const existingConfig = await prisma.emailConfig?.findFirst();

    let emailConfig;

    if (existingConfig) {
      // Atualizar configuração existente
      // @ts-ignore - Modelo EmailConfig pode não estar disponível ainda
      emailConfig = await prisma.emailConfig?.update({
        where: { id: existingConfig.id },
        data: {
          host,
          port: parseInt(port.toString()),
          secure: Boolean(secure),
          user,
          password: password || existingConfig.password, // Manter senha atual se não fornecida
          fromAddress,
          enabled: Boolean(enabled),
          updatedAt: new Date(),
        },
      });
    } else {
      // Criar nova configuração
      if (!password) {
        res.status(400).json({ error: 'Senha é obrigatória para nova configuração' });
        return;
      }

      // @ts-ignore - Modelo EmailConfig pode não estar disponível ainda
      emailConfig = await prisma.emailConfig?.create({
        data: {
          host,
          port: parseInt(port.toString()),
          secure: Boolean(secure),
          user,
          password,
          fromAddress,
          enabled: Boolean(enabled),
        },
      });
    }

    logInfo('💾 Configuração de email salva', { emailConfigId: emailConfig.id });

    // Recarregar configuração no serviço de email
    await emailService.reloadConfig();

    logDebug('🔄 Configuração recarregada no serviço');

    // Log da atividade
    try {
      await logActivity(
        req,
        'UPDATE_EMAIL_CONFIG',
        'EmailConfig',
        emailConfig.id,
        `Configuração de email ${enabled ? 'ativada' : 'desativada'} - ${host}:${port}`
      );
    } catch (activityError) {
      logWarn('⚠️ Erro ao registrar atividade', activityError);
    }

    // Retornar configuração sem senha
    const { password: _, ...configWithoutPassword } = emailConfig;

    res.json({
      message: 'Configuração de email atualizada com sucesso',
      config: configWithoutPassword,
      configured: true,
      enabled: emailConfig.enabled,
    });
  } catch (error) {
    logError('❌ Erro ao atualizar configuração de email', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Testar configuração de email
 * POST /api/email-config/test
 */
export const testEmailConfig = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  
  try {
    const userId = req.user?.userId;

    logDebug('🧪 Testando configuração de email', { email });

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Email de teste é obrigatório e deve ser válido' });
      return;
    }

    // Verificar se email está configurado
    if (!(await emailService.isConfigured())) {
      res.status(400).json({ 
        error: 'Serviço de email não está configurado ou habilitado' 
      });
      return;
    }

    // Obter nome da municipalidade para o template
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        municipality: {
          select: {
            name: true,
          },
        },
      },
    });

    const municipalityName = user?.municipality?.name || 'SISPAT';

    // Enviar email de teste
    const emailSent = await emailService.sendTestEmail(email, municipalityName);

    if (!emailSent) {
      res.status(500).json({ 
        error: 'Falha ao enviar email de teste. Verifique a configuração.' 
      });
      return;
    }

    logInfo('✅ Email de teste enviado com sucesso', { email });

    // Log da atividade
    try {
      await logActivity(
        req,
        'TEST_EMAIL_CONFIG',
        'EmailConfig',
        'test',
        `Email de teste enviado para ${email}`
      );
    } catch (logError) {
      logWarn('⚠️ Erro ao registrar atividade', logError);
    }

    res.json({ 
      message: 'Email de teste enviado com sucesso',
      email,
    });
  } catch (error) {
    logError('❌ Erro ao testar configuração de email', error, { userId: req.user?.userId, email });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Desabilitar configuração de email
 * DELETE /api/email-config
 */
export const deleteEmailConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    logDebug('🗑️ Desabilitando configuração de email', { userId: req.user?.userId });

    // @ts-ignore - Modelo EmailConfig pode não estar disponível ainda
    const existingConfig = await prisma.emailConfig?.findFirst();

    if (!existingConfig) {
      res.status(404).json({ error: 'Configuração de email não encontrada' });
      return;
    }

    // Desabilitar em vez de deletar (manter histórico)
    // @ts-ignore - Modelo EmailConfig pode não estar disponível ainda
    await prisma.emailConfig?.update({
      where: { id: existingConfig.id },
      data: {
        enabled: false,
        updatedAt: new Date(),
      },
    });

    // Recarregar configuração no serviço
    await emailService.reloadConfig();

    logInfo('✅ Configuração de email desabilitada', { emailConfigId: existingConfig.id });

    // Log da atividade
    try {
      await logActivity(
        req,
        'DISABLE_EMAIL_CONFIG',
        'EmailConfig',
        existingConfig.id,
        'Configuração de email desabilitada'
      );
    } catch (logError) {
      logWarn('⚠️ Erro ao registrar atividade', logError);
    }

    res.json({ 
      message: 'Configuração de email desabilitada com sucesso',
    });
  } catch (error) {
    logError('❌ Erro ao desabilitar configuração de email', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
