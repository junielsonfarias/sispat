import { Request, Response } from 'express';
import { prisma } from '../index';
import { logError } from '../config/logger';

/**
 * @desc    Obter todos os tipos de bens
 * @route   GET /api/tipos-bens
 * @access  Private
 */
export const getTiposBens = async (req: Request, res: Response): Promise<void> => {
  try {
    const tiposBens = await prisma.tipoBem.findMany({
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

    // ✅ PERFORMANCE: Cache HTTP para dados estáticos (mudam pouco)
    res.setHeader('Cache-Control', 'public, max-age=600'); // 10 minutos
    res.json(tiposBens);
  } catch (error) {
    logError('Erro ao buscar tipos de bens', error);
    res.status(500).json({ error: 'Erro ao buscar tipos de bens' });
  }
};

/**
 * @desc    Obter tipo de bem por ID
 * @route   GET /api/tipos-bens/:id
 * @access  Private
 */
export const getTipoBemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tipoBem = await prisma.tipoBem.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            patrimonios: true,
          },
        },
      },
    });

    if (!tipoBem) {
      res.status(404).json({ error: 'Tipo de bem não encontrado' });
      return;
    }

    res.json(tipoBem);
  } catch (error) {
    logError('Erro ao buscar tipo de bem', error, { tipoBemId: req.params.id });
    res.status(500).json({ error: 'Erro ao buscar tipo de bem' });
  }
};

/**
 * @desc    Criar novo tipo de bem
 * @route   POST /api/tipos-bens
 * @access  Private (Admin/Gestor)
 */
export const createTipoBem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const {
      nome,
      descricao,
      vidaUtilPadrao,
      taxaDepreciacao,
    } = req.body;

    // Validações
    if (!nome) {
      res.status(400).json({ error: 'Nome é obrigatório' });
      return;
    }

    // Verificar se já existe
    const existente = await prisma.tipoBem.findFirst({
      where: { nome },
    });

    if (existente) {
      res.status(400).json({ error: 'Tipo de bem já existe' });
      return;
    }

    const tipoBem = await prisma.tipoBem.create({
      data: {
        nome,
        descricao,
        vidaUtilPadrao,
        taxaDepreciacao,
        municipalityId: req.user?.municipalityId || '',
      },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'CREATE_TIPO_BEM',
        entityType: 'TipoBem',
        entityId: tipoBem.id,
        details: `Tipo de bem "${nome}" criado`,
      },
    });

    res.status(201).json(tipoBem);
  } catch (error) {
    logError('Erro ao criar tipo de bem', error, { userId: req.user?.userId, nome: req.body.nome });
    res.status(500).json({ error: 'Erro ao criar tipo de bem' });
  }
};

/**
 * @desc    Atualizar tipo de bem
 * @route   PUT /api/tipos-bens/:id
 * @access  Private (Admin/Gestor)
 */
export const updateTipoBem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const {
      nome,
      descricao,
      vidaUtilPadrao,
      taxaDepreciacao,
    } = req.body;

    const tipoBem = await prisma.tipoBem.findUnique({
      where: { id },
    });

    if (!tipoBem) {
      res.status(404).json({ error: 'Tipo de bem não encontrado' });
      return;
    }

    const updated = await prisma.tipoBem.update({
      where: { id },
      data: {
        nome,
        descricao,
        vidaUtilPadrao,
        taxaDepreciacao,
      },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'UPDATE_TIPO_BEM',
        entityType: 'TipoBem',
        entityId: id,
        details: `Tipo de bem "${nome || tipoBem.nome}" atualizado`,
      },
    });

    res.json(updated);
  } catch (error) {
    logError('Erro ao atualizar tipo de bem', error, { tipoBemId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao atualizar tipo de bem' });
  }
};

/**
 * @desc    Deletar tipo de bem
 * @route   DELETE /api/tipos-bens/:id
 * @access  Private (Admin only)
 */
export const deleteTipoBem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const tipoBem = await prisma.tipoBem.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            patrimonios: true,
          },
        },
      },
    });

    if (!tipoBem) {
      res.status(404).json({ error: 'Tipo de bem não encontrado' });
      return;
    }

    // Verificar se está em uso
    if (tipoBem._count.patrimonios > 0) {
      res.status(400).json({
        error: 'Não é possível excluir. Tipo de bem está em uso.',
      });
      return;
    }

    await prisma.tipoBem.delete({
      where: { id },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'DELETE_TIPO_BEM',
        entityType: 'TipoBem',
        entityId: id,
        details: `Tipo de bem "${tipoBem.nome}" excluído`,
      },
    });

    res.json({ message: 'Tipo de bem excluído com sucesso' });
  } catch (error) {
    logError('Erro ao deletar tipo de bem', error, { tipoBemId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao deletar tipo de bem' });
  }
};


