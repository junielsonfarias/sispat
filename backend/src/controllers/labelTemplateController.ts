import { Request, Response } from 'express';
import { prisma } from '../index';
import { logError, logInfo, logWarn, logDebug } from '../config/logger';

/**
 * @desc    Obter todos os templates de etiqueta
 * @route   GET /api/label-templates
 * @access  Private
 */
export const getLabelTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = req.user?.municipalityId;

    logDebug('🔍 GET /api/label-templates', { municipalityId });

    const templates = await prisma.labelTemplate.findMany({
      where: {
        municipalityId,
        isActive: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' }, // Padrão primeiro
        { createdAt: 'desc' },
      ],
    });

    logDebug('✅ Templates encontrados', { count: templates.length });

    res.json(templates);
  } catch (error) {
    logError('❌ Erro ao buscar templates', error, { municipalityId: req.user?.municipalityId });
    res.status(500).json({ error: 'Erro ao buscar templates de etiqueta' });
  }
};

/**
 * @desc    Obter template por ID
 * @route   GET /api/label-templates/:id
 * @access  Private
 */
export const getLabelTemplateById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isSuperuser = req.user?.role === 'superuser';
    const municipalityId = req.user?.municipalityId;

    // Isolamento tenant: não-superuser só lê template do próprio município.
    // Sem o filtro (findUnique por id puro), qualquer usuário autenticado de
    // outro tenant poderia ler templates de etiqueta alheios informando o id
    // (IDOR / vazamento cross-tenant). 404 quando não encontrado para não
    // vazar a existência do registro.
    const template = await prisma.labelTemplate.findFirst({
      where: { id, ...(isSuperuser ? {} : { municipalityId }) },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!template) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }

    res.json(template);
  } catch (error) {
    logError('Erro ao buscar template', error, { templateId: req.params.id });
    res.status(500).json({ error: 'Erro ao buscar template' });
  }
};

/**
 * @desc    Criar novo template de etiqueta
 * @route   POST /api/label-templates
 * @access  Private (Admin/Supervisor)
 */
export const createLabelTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const municipalityId = req.user?.municipalityId;

    // Apenas admin e supervisor podem criar templates
    if (userRole !== 'admin' && userRole !== 'supervisor') {
      res.status(403).json({ error: 'Acesso negado. Apenas admin e supervisor podem criar templates.' });
      return;
    }

    const { name, width, height, isDefault, elements } = req.body;

    // Validações
    if (!name || !width || !height || !elements) {
      res.status(400).json({ error: 'Nome, largura, altura e elementos são obrigatórios' });
      return;
    }

    // Se marcar como padrão, desmarcar outros
    if (isDefault) {
      await prisma.labelTemplate.updateMany({
        where: {
          municipalityId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const template = await prisma.labelTemplate.create({
      data: {
        name,
        width,
        height,
        isDefault: isDefault || false,
        elements,
        municipalityId: municipalityId!,
        createdBy: userId!,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'CREATE_LABEL_TEMPLATE',
        entityType: 'LabelTemplate',
        entityId: template.id,
        details: `Template de etiqueta "${name}" criado`,
      },
    });

    logInfo('✅ Template criado', { templateId: template.id, name: template.name });

    res.status(201).json(template);
  } catch (error) {
    logError('❌ Erro ao criar template', error, { userId: req.user?.userId, name: req.body.name });
    res.status(500).json({ error: 'Erro ao criar template' });
  }
};

/**
 * @desc    Atualizar template de etiqueta
 * @route   PUT /api/label-templates/:id
 * @access  Private (Admin/Supervisor)
 */
export const updateLabelTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const municipalityId = req.user?.municipalityId;

    // Apenas admin e supervisor podem atualizar templates
    if (userRole !== 'admin' && userRole !== 'supervisor') {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    const { name, width, height, isDefault, elements } = req.body;

    // Isolamento tenant: valida ownership do registro alvo antes de atualizar.
    // Sem o filtro por municipalityId, admin/supervisor de outro município
    // poderia alterar (e marcar como padrão) templates de etiqueta de outro
    // tenant (IDOR). Apenas admin/supervisor chegam aqui (guard acima), logo
    // não há caso superuser a tratar.
    const existingTemplate = await prisma.labelTemplate.findFirst({
      where: {
        id,
        municipalityId,
      },
    });

    if (!existingTemplate) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }

    // Se marcar como padrão, desmarcar outros
    if (isDefault && !existingTemplate.isDefault) {
      await prisma.labelTemplate.updateMany({
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

    const updated = await prisma.labelTemplate.update({
      where: { id },
      data: {
        name,
        width,
        height,
        isDefault,
        elements,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'UPDATE_LABEL_TEMPLATE',
        entityType: 'LabelTemplate',
        entityId: id,
        details: `Template de etiqueta "${name || existingTemplate.name}" atualizado`,
      },
    });

    logInfo('✅ Template atualizado', { templateId: updated.id, name: updated.name });

    res.json(updated);
  } catch (error) {
    logError('❌ Erro ao atualizar template', error, { templateId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao atualizar template' });
  }
};

/**
 * @desc    Deletar template de etiqueta
 * @route   DELETE /api/label-templates/:id
 * @access  Private (Admin/Supervisor)
 */
export const deleteLabelTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const municipalityId = req.user?.municipalityId;

    // Apenas admin e supervisor podem deletar templates
    if (userRole !== 'admin' && userRole !== 'supervisor') {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    // Isolamento tenant: valida ownership do registro alvo antes do soft-delete.
    // Sem o filtro por municipalityId, admin/supervisor de outro município
    // poderia desativar (cross-tenant tampering/DoS) templates de etiqueta de
    // outro tenant (IDOR). Apenas admin/supervisor chegam aqui (guard acima),
    // logo não há caso superuser a tratar.
    const template = await prisma.labelTemplate.findFirst({
      where: {
        id,
        municipalityId,
      },
    });

    if (!template) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }

    // Soft delete (marcar como inativo)
    await prisma.labelTemplate.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'DELETE_LABEL_TEMPLATE',
        entityType: 'LabelTemplate',
        entityId: id,
        details: `Template de etiqueta "${template.name}" excluído`,
      },
    });

    logInfo('✅ Template desativado', { templateId: id, name: template.name });

    res.json({ message: 'Template excluído com sucesso' });
  } catch (error) {
    logError('❌ Erro ao deletar template', error, { templateId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao deletar template' });
  }
};

