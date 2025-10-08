import { Request, Response } from 'express';
import { prisma } from '../index';

/**
 * @desc    Obter todos os setores
 * @route   GET /api/sectors
 * @access  Private
 */
export const getSectors = async (req: Request, res: Response): Promise<void> => {
  try {
    const sectors = await prisma.sector.findMany({
      include: {
        _count: {
          select: {
            patrimonios: true,
            locais: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(sectors);
  } catch (error) {
    console.error('Erro ao buscar setores:', error);
    res.status(500).json({ error: 'Erro ao buscar setores' });
  }
};

/**
 * @desc    Obter setor por ID
 * @route   GET /api/sectors/:id
 * @access  Private
 */
export const getSectorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const sector = await prisma.sector.findUnique({
      where: { id },
      include: {
        locais: true,
        _count: {
          select: {
            patrimonios: true,
          },
        },
      },
    });

    if (!sector) {
      res.status(404).json({ error: 'Setor não encontrado' });
      return;
    }

    res.json(sector);
  } catch (error) {
    console.error('Erro ao buscar setor:', error);
    res.status(500).json({ error: 'Erro ao buscar setor' });
  }
};

/**
 * @desc    Criar novo setor
 * @route   POST /api/sectors
 * @access  Private (Admin only)
 */
export const createSector = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { name, codigo, description } = req.body;

    // Validações
    if (!name || !codigo) {
      res.status(400).json({ error: 'Nome e código são obrigatórios' });
      return;
    }

    // Verificar se já existe
    const existente = await prisma.sector.findFirst({
      where: {
        OR: [{ name }, { codigo }],
      },
    });

    if (existente) {
      res.status(400).json({ error: 'Setor com este nome ou código já existe' });
      return;
    }

    const sector = await prisma.sector.create({
      data: {
        name,
        codigo,
        description,
        municipalityId: req.user?.municipalityId || '',
      },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'CREATE_SECTOR',
        entityType: 'Sector',
        entityId: sector.id,
        details: `Setor "${name}" criado`,
      },
    });

    res.status(201).json(sector);
  } catch (error) {
    console.error('Erro ao criar setor:', error);
    res.status(500).json({ error: 'Erro ao criar setor' });
  }
};

/**
 * @desc    Atualizar setor
 * @route   PUT /api/sectors/:id
 * @access  Private (Admin only)
 */
export const updateSector = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { name, codigo, description } = req.body;

    const sector = await prisma.sector.findUnique({
      where: { id },
    });

    if (!sector) {
      res.status(404).json({ error: 'Setor não encontrado' });
      return;
    }

    const updated = await prisma.sector.update({
      where: { id },
      data: {
        name,
        codigo,
        description,
      },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'UPDATE_SECTOR',
        entityType: 'Sector',
        entityId: id,
        details: `Setor "${name || sector.name}" atualizado`,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar setor:', error);
    res.status(500).json({ error: 'Erro ao atualizar setor' });
  }
};

/**
 * @desc    Deletar setor
 * @route   DELETE /api/sectors/:id
 * @access  Private (Admin only)
 */
export const deleteSector = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const sector = await prisma.sector.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            patrimonios: true,
            locais: true,
          },
        },
      },
    });

    if (!sector) {
      res.status(404).json({ error: 'Setor não encontrado' });
      return;
    }

    // Verificar se está em uso
    if (
      sector._count.patrimonios > 0 ||
      sector._count.locais > 0
    ) {
      res.status(400).json({
        error: 'Não é possível excluir. Setor está em uso.',
      });
      return;
    }

    await prisma.sector.delete({
      where: { id },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'DELETE_SECTOR',
        entityType: 'Sector',
        entityId: id,
        details: `Setor "${sector.name}" excluído`,
      },
    });

    res.json({ message: 'Setor excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar setor:', error);
    res.status(500).json({ error: 'Erro ao deletar setor' });
  }
};


