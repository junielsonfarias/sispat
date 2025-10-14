import { Request, Response } from 'express';
import { prisma } from '../index';

/**
 * @desc    Obter todos os locais
 * @route   GET /api/locais
 * @access  Private
 */
export const getLocais = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectorId } = req.query;
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    console.log('🔍 [DEV] GET /api/locais - Usuário:', { role: userRole, email: userEmail });

    let where: any = {};

    // ✅ FILTRO POR SETOR (se especificado na query)
    if (sectorId) {
      where.sectorId = sectorId as string;
    }

    // ✅ FILTRO POR PERMISSÃO DE USUÁRIO
    // Admin e Supervisor veem TODOS os locais
    // Usuário e Visualizador veem apenas locais dos seus setores
    if (userRole !== 'admin' && userRole !== 'supervisor') {
      // Buscar setores do usuário
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { responsibleSectors: true },
      });

      const responsibleSectors = user?.responsibleSectors || [];
      console.log('🔍 [DEV] Setores responsáveis do usuário:', responsibleSectors);

      if (responsibleSectors.length > 0) {
        // Buscar IDs dos setores pelos nomes
        const sectors = await prisma.sector.findMany({
          where: {
            name: { in: responsibleSectors },
          },
          select: { id: true },
        });

        const sectorIds = sectors.map(s => s.id);
        console.log('🔍 [DEV] IDs dos setores:', sectorIds);

        // Aplicar filtro de setores
        where.sectorId = { in: sectorIds };
      } else {
        // Usuário sem setores atribuídos não vê nada
        console.log('⚠️  [DEV] Usuário sem setores atribuídos - retornando vazio');
        res.json([]);
        return;
      }
    } else {
      console.log('✅ [DEV] Admin/Supervisor - retornando TODOS os locais');
    }

    const locais = await prisma.local.findMany({
      where,
      include: {
        sector: true,
        _count: {
          select: {
            patrimonios: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log('✅ [DEV] Locais encontrados:', locais.length);

    // ✅ PERFORMANCE: Cache HTTP para dados estáticos
    res.setHeader('Cache-Control', 'public, max-age=600'); // 10 minutos
    res.json(locais);
  } catch (error) {
    console.error('❌ [DEV] Erro ao buscar locais:', error);
    res.status(500).json({ error: 'Erro ao buscar locais' });
  }
};

/**
 * @desc    Obter local por ID
 * @route   GET /api/locais/:id
 * @access  Private
 */
export const getLocalById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const local = await prisma.local.findUnique({
      where: { id },
      include: {
        sector: true,
        _count: {
          select: {
            patrimonios: true,
          },
        },
      },
    });

    if (!local) {
      res.status(404).json({ error: 'Local não encontrado' });
      return;
    }

    res.json(local);
  } catch (error) {
    console.error('Erro ao buscar local:', error);
    res.status(500).json({ error: 'Erro ao buscar local' });
  }
};

/**
 * @desc    Criar novo local
 * @route   POST /api/locais
 * @access  Private (Admin/Gestor)
 */
export const createLocal = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { name, description, sectorId } = req.body;

    // Validações
    if (!name || !sectorId) {
      res.status(400).json({ error: 'Nome e setor são obrigatórios' });
      return;
    }

    // Verificar se setor existe
    const sector = await prisma.sector.findUnique({
      where: { id: sectorId },
    });

    if (!sector) {
      res.status(404).json({ error: 'Setor não encontrado' });
      return;
    }

    const local = await prisma.local.create({
      data: {
        name,
        description,
        sectorId,
        municipalityId: req.user?.municipalityId || '',
      },
      include: {
        sector: true,
      },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'CREATE_LOCAL',
        entityType: 'Local',
        entityId: local.id,
        details: `Local "${name}" criado`,
      },
    });

    res.status(201).json(local);
  } catch (error) {
    console.error('Erro ao criar local:', error);
    res.status(500).json({ error: 'Erro ao criar local' });
  }
};

/**
 * @desc    Atualizar local
 * @route   PUT /api/locais/:id
 * @access  Private (Admin/Gestor)
 */
export const updateLocal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { name, description, sectorId } = req.body;

    const local = await prisma.local.findUnique({
      where: { id },
    });

    if (!local) {
      res.status(404).json({ error: 'Local não encontrado' });
      return;
    }

    const updated = await prisma.local.update({
      where: { id },
      data: {
        name,
        description,
        sectorId,
      },
      include: {
        sector: true,
      },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'UPDATE_LOCAL',
        entityType: 'Local',
        entityId: id,
        details: `Local "${name || local.name}" atualizado`,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar local:', error);
    res.status(500).json({ error: 'Erro ao atualizar local' });
  }
};

/**
 * @desc    Deletar local
 * @route   DELETE /api/locais/:id
 * @access  Private (Admin only)
 */
export const deleteLocal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const local = await prisma.local.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            patrimonios: true,
          },
        },
      },
    });

    if (!local) {
      res.status(404).json({ error: 'Local não encontrado' });
      return;
    }

    // Verificar se está em uso
    if (local._count.patrimonios > 0) {
      res.status(400).json({
        error: 'Não é possível excluir. Local está em uso.',
      });
      return;
    }

    await prisma.local.delete({
      where: { id },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'DELETE_LOCAL',
        entityType: 'Local',
        entityId: id,
        details: `Local "${local.name}" excluído`,
      },
    });

    res.json({ message: 'Local excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar local:', error);
    res.status(500).json({ error: 'Erro ao deletar local' });
  }
};


