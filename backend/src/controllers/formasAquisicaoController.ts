import { Request, Response } from 'express';
import { prisma } from '../index';
import { logError } from '../config/logger';

/**
 * @desc    Obter todas as formas de aquisição
 * @route   GET /api/formas-aquisicao
 * @access  Private
 */
export const getFormasAquisicao = async (req: Request, res: Response): Promise<void> => {
  try {
    const formasAquisicao = await prisma.acquisitionForm.findMany({
      include: {
        _count: {
          select: {
            patrimonios: true,
          },
        },
      },
      orderBy: {
        nome: 'asc',
      },
    });

    // ✅ PERFORMANCE: Cache HTTP para dados estáticos
    res.setHeader('Cache-Control', 'public, max-age=600'); // 10 minutos
    res.json(formasAquisicao);
  } catch (error) {
    logError('Erro ao buscar formas de aquisição', error);
    res.status(500).json({ error: 'Erro ao buscar formas de aquisição' });
  }
};

/**
 * @desc    Obter forma de aquisição por ID
 * @route   GET /api/formas-aquisicao/:id
 * @access  Private
 */
export const getFormaAquisicaoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const formaAquisicao = await prisma.acquisitionForm.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            patrimonios: true,
          },
        },
      },
    });

    if (!formaAquisicao) {
      res.status(404).json({ error: 'Forma de aquisição não encontrada' });
      return;
    }

    res.json(formaAquisicao);
  } catch (error) {
    logError('Erro ao buscar forma de aquisição', error, { formaAquisicaoId: req.params.id });
    res.status(500).json({ error: 'Erro ao buscar forma de aquisição' });
  }
};

/**
 * @desc    Criar nova forma de aquisição
 * @route   POST /api/formas-aquisicao
 * @access  Private (Admin/Gestor)
 */
export const createFormaAquisicao = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { nome, descricao } = req.body;

    // Validações
    if (!nome) {
      res.status(400).json({ error: 'Nome é obrigatório' });
      return;
    }

    // Verificar se já existe
    const existente = await prisma.acquisitionForm.findFirst({
      where: { nome },
    });

    if (existente) {
      res.status(400).json({ error: 'Forma de aquisição já existe' });
      return;
    }

    const formaAquisicao = await prisma.acquisitionForm.create({
      data: {
        nome,
        descricao,
        municipalityId: req.user?.municipalityId || '',
      },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'CREATE_ACQUISITION_FORM',
        entityType: 'AcquisitionForm',
        entityId: formaAquisicao.id,
        details: `Forma de aquisição "${nome}" criada`,
      },
    });

    res.status(201).json(formaAquisicao);
  } catch (error) {
    logError('Erro ao criar forma de aquisição', error, { userId: req.user?.userId, nome: req.body.nome });
    res.status(500).json({ error: 'Erro ao criar forma de aquisição' });
  }
};

/**
 * @desc    Atualizar forma de aquisição
 * @route   PUT /api/formas-aquisicao/:id
 * @access  Private (Admin/Gestor)
 */
export const updateFormaAquisicao = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { nome, descricao } = req.body;

    const formaAquisicao = await prisma.acquisitionForm.findUnique({
      where: { id },
    });

    if (!formaAquisicao) {
      res.status(404).json({ error: 'Forma de aquisição não encontrada' });
      return;
    }

    const updated = await prisma.acquisitionForm.update({
      where: { id },
      data: {
        nome,
        descricao,
      },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'UPDATE_ACQUISITION_FORM',
        entityType: 'AcquisitionForm',
        entityId: id,
        details: `Forma de aquisição "${nome || formaAquisicao.nome}" atualizada`,
      },
    });

    res.json(updated);
  } catch (error) {
    logError('Erro ao atualizar forma de aquisição', error, { formaAquisicaoId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao atualizar forma de aquisição' });
  }
};

/**
 * @desc    Deletar forma de aquisição
 * @route   DELETE /api/formas-aquisicao/:id
 * @access  Private (Admin only)
 */
export const deleteFormaAquisicao = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const formaAquisicao = await prisma.acquisitionForm.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            patrimonios: true,
          },
        },
      },
    });

    if (!formaAquisicao) {
      res.status(404).json({ error: 'Forma de aquisição não encontrada' });
      return;
    }

    // Verificar se está em uso
    if (formaAquisicao._count.patrimonios > 0) {
      res.status(400).json({
        error: 'Não é possível excluir. Forma de aquisição está em uso.',
      });
      return;
    }

    await prisma.acquisitionForm.delete({
      where: { id },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'DELETE_ACQUISITION_FORM',
        entityType: 'AcquisitionForm',
        entityId: id,
        details: `Forma de aquisição "${formaAquisicao.nome}" excluída`,
      },
    });

    res.json({ message: 'Forma de aquisição excluída com sucesso' });
  } catch (error) {
    logError('Erro ao deletar forma de aquisição', error, { formaAquisicaoId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao deletar forma de aquisição' });
  }
};


