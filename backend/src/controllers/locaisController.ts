import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index';
import { logError, logInfo, logWarn, logDebug } from '../config/logger';
import { maskEmail } from '../utils/mask';

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

    logDebug('🔍 GET /api/locais', { role: userRole, email: maskEmail(userEmail), sectorId });

    const where: Prisma.LocalWhereInput = {};

    // ✅ MULTI-TENANT: superuser vê todos; demais ficam restritos ao município
    if (userRole !== 'superuser') {
      where.municipalityId = req.user?.municipalityId;
    }

    // ✅ FILTRO POR SETOR (se especificado na query)
    if (sectorId) {
      where.sectorId = sectorId as string;
    }

    // ✅ FILTRO POR PERMISSÃO DE USUÁRIO
    // Admin e Supervisor veem TODOS os locais do município
    // Usuário e Visualizador veem apenas locais dos seus setores
    if (userRole !== 'admin' && userRole !== 'supervisor' && userRole !== 'superuser') {
      // Buscar setores do usuário
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { responsibleSectors: true },
      });

      const responsibleSectors = user?.responsibleSectors || [];
      logDebug('🔍 Setores responsáveis do usuário', { responsibleSectors });

      if (responsibleSectors.length > 0) {
        // Buscar IDs dos setores pelos nomes
        const sectors = await prisma.sector.findMany({
          where: {
            name: { in: responsibleSectors },
            // Isolamento de tenant: setores com nome igual em outros municípios
            // não devem entrar na resolução (evita vazar locais cross-tenant).
            municipalityId: req.user?.municipalityId,
          },
          select: { id: true },
        });

        const sectorIds = sectors.map(s => s.id);
        logDebug('🔍 IDs dos setores', { sectorIds });

        // Aplicar filtro de setores
        where.sectorId = { in: sectorIds };
      } else {
        // Usuário sem setores atribuídos não vê nada
        logDebug('⚠️ Usuário sem setores atribuídos - retornando vazio');
        res.json([]);
        return;
      }
    } else {
      logDebug('✅ Admin/Supervisor - retornando TODOS os locais');
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

    logDebug('✅ Locais encontrados', { count: locais.length });

    // ✅ PERFORMANCE: Cache HTTP. 'private': filtrado por tenant/permissão —
    // nunca em cache compartilhado (CDN/proxy), para não vazar entre municípios.
    res.setHeader('Cache-Control', 'private, max-age=600'); // 10 minutos
    res.json(locais);
  } catch (error) {
    logError('❌ Erro ao buscar locais', error, { userId: req.user?.userId, sectorId: req.query.sectorId });
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
    const isSuperuser = req.user?.role === 'superuser';
    const municipalityId = req.user?.municipalityId;

    const local = await prisma.local.findFirst({
      where: { id, ...(isSuperuser ? {} : { municipalityId }) },
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
    logError('Erro ao buscar local', error, { localId: req.params.id });
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

    // Verificar se setor existe E pertence ao município do usuário (evita anexar local a setor de outro município)
    const isSuperuser = req.user?.role === 'superuser';
    const municipalityId = req.user?.municipalityId;
    const sector = await prisma.sector.findFirst({
      where: { id: sectorId, ...(isSuperuser ? {} : { municipalityId }) },
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
    logError('Erro ao criar local', error, { userId: req.user?.userId, name: req.body.name });
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
    const isSuperuser = req.user?.role === 'superuser';
    const municipalityId = req.user?.municipalityId;
    const { name, description, sectorId } = req.body;

    const local = await prisma.local.findFirst({
      where: { id, ...(isSuperuser ? {} : { municipalityId }) },
    });

    if (!local) {
      res.status(404).json({ error: 'Local não encontrado' });
      return;
    }

    // Se o setor está sendo alterado, garante que pertence ao município do
    // usuário (evita reatribuir o local a um setor de outro tenant via body).
    if (sectorId) {
      const sector = await prisma.sector.findFirst({
        where: { id: sectorId, ...(isSuperuser ? {} : { municipalityId }) },
      });
      if (!sector) {
        res.status(404).json({ error: 'Setor não encontrado' });
        return;
      }
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
    logError('Erro ao atualizar local', error, { localId: req.params.id, userId: req.user?.userId });
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
    const isSuperuser = req.user?.role === 'superuser';
    const municipalityId = req.user?.municipalityId;

    const local = await prisma.local.findFirst({
      where: { id, ...(isSuperuser ? {} : { municipalityId }) },
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
    logError('Erro ao deletar local', error, { localId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao deletar local' });
  }
};


