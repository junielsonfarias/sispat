import { Request, Response } from 'express';
import { prisma } from '../index';
import { logError, logInfo, logWarn, logDebug } from '../config/logger';
import { redisCache, CacheUtils } from '../config/redis';

/**
 * Tenant isolation para Inventory: o model não tem coluna municipalityId
 * (TODO: sprint de schema). Filtramos via `responsavel ∈ users do município`.
 * Superuser bypassa. Retorna `null` quando bypass — chamadores devem ignorar
 * o filtro se receber null.
 */
const tenantResponsavelFilter = async (
  req: Request,
): Promise<{ in: string[] } | null> => {
  if (req.user?.role === 'superuser' || !req.user?.municipalityId) return null;
  const users = await prisma.user.findMany({
    where: { municipalityId: req.user.municipalityId },
    select: { id: true },
  });
  return { in: users.map((u) => u.id) };
};

/**
 * @desc    Obter todos os inventários
 * @route   GET /api/inventarios
 * @access  Private
 */
export const getInventarios = async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ PAGINAÇÃO: Adicionar paginação padronizada
    const { page = 1, limit = 50, status, search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * limitNum;

    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Construir filtros
    const where: any = {};

    // Tenant isolation:
    // - superuser: vê tudo
    // - admin: vê todos os inventários do município (via responsavel ∈ users do município)
    // - supervisor/usuario: vê apenas os seus
    if (userRole === 'admin') {
      const tenantFilter = await tenantResponsavelFilter(req);
      if (tenantFilter) where.responsavel = tenantFilter;
    } else if (userRole !== 'superuser') {
      where.responsavel = userId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // ✅ CACHE: Gerar chave de cache
    const cacheKey = `inventarios:${req.user?.municipalityId}:${pageNum}:${limitNum}:${JSON.stringify(where)}`;
    
    // Tentar obter do cache Redis primeiro
    let result = await redisCache.get<{ inventarios: any[], total: number }>(cacheKey);
    
    if (!result) {
      // ✅ QUERY N+1: Include otimizado com select específico
      const [inventarios, total] = await Promise.all([
        prisma.inventory.findMany({
          where,
          skip,
          take: limitNum,
          include: {
            items: {
              include: {
                patrimonio: {
                  select: {
                    id: true,
                    numero_patrimonio: true,
                    descricao_bem: true,
                    sectorId: true,
                    localId: true,
                    status: true,
                    sector: {
                      select: {
                        id: true,
                        name: true,
                        codigo: true
                      }
                    },
                    local: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                },
              },
              take: 10 // Limitar items por inventário para performance
            }
          },
          orderBy: {
            dataInicio: 'desc',
          },
        }),
        prisma.inventory.count({ where })
      ]);

      result = {
        inventarios,
        total
      };

      // ✅ CACHE: Armazenar no cache Redis por 5 minutos
      await redisCache.set(cacheKey, result, 300);
      logDebug('✅ Cache de inventários criado', { page: pageNum, limit: limitNum });
    } else {
      logDebug('✅ Cache hit: inventários', { page: pageNum, limit: limitNum });
    }

    res.json({
      inventarios: result.inventarios,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        pages: Math.ceil(result.total / limitNum)
      }
    });
  } catch (error) {
    logError('Erro ao buscar inventários', error, { userId: req.user?.userId, role: req.user?.role });
    res.status(500).json({ error: 'Erro ao buscar inventários' });
  }
};

/**
 * @desc    Obter inventário por ID
 * @route   GET /api/inventarios/:id
 * @access  Private
 */
/**
 * Garante que o inventário pertence ao tenant do usuário (via responsavel.municipalityId).
 * Retorna o inventário ou envia 404 (mascarando como não-existe para não vazar IDs).
 */
const findInventarioOfTenant = async (
  id: string,
  req: Request,
): Promise<{ id: string; responsavel: string } | null> => {
  const inv = await prisma.inventory.findUnique({
    where: { id },
    select: { id: true, responsavel: true },
  });
  if (!inv) return null;
  if (req.user?.role === 'superuser') return inv;
  const responsavel = await prisma.user.findUnique({
    where: { id: inv.responsavel },
    select: { municipalityId: true },
  });
  if (!responsavel || responsavel.municipalityId !== req.user?.municipalityId) return null;
  return inv;
};

export const getInventarioById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const guard = await findInventarioOfTenant(id, req);
    if (!guard) {
      res.status(404).json({ error: 'Inventário não encontrado' });
      return;
    }

    const inventario = await prisma.inventory.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            patrimonio: {
              select: {
                id: true,
                numero_patrimonio: true,
                descricao_bem: true,
                sectorId: true,
                localId: true,
                status: true,
                tipoBem: {
                  select: {
                    id: true,
                    nome: true,
                    descricao: true
                  }
                },
                sector: {
                  select: {
                    id: true,
                    name: true,
                    codigo: true
                  }
                },
                local: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
          },
        }
      },
    });

    res.json(inventario);
  } catch (error) {
    logError('Erro ao buscar inventário', error, { inventarioId: req.params.id });
    res.status(500).json({ error: 'Erro ao buscar inventário' });
  }
};

/**
 * @desc    Criar novo inventário
 * @route   POST /api/inventarios
 * @access  Private
 */
export const createInventario = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { title, description, setor, local, dataInicio, scope } = req.body;

    logDebug('📝 Criando inventário', { 
      userId,
      title, 
      description, 
      setor, 
      local, 
      dataInicio, 
      scope,
      userRole: req.user?.role 
    });

    // ✅ Validações melhoradas
    if (!title) {
      logWarn('❌ Título não fornecido');
      res.status(400).json({ error: 'O título do inventário é obrigatório' });
      return;
    }

    if (!setor) {
      logWarn('❌ Setor não fornecido');
      res.status(400).json({ error: 'O setor é obrigatório' });
      return;
    }

    if (!userId) {
      logWarn('❌ UserId não encontrado');
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    logDebug('🔍 Dados antes de criar no banco', {
      title,
      description: description || '',
      responsavel: userId,
      setor,
      local: local || '',
      dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
      status: 'em_andamento',
      scope: scope || 'sector',
    });

    // Buscar patrimônios no escopo — filtrando por município do usuário para
    // evitar trazer bens de outros municípios com setor de mesmo nome.
    let patrimoniosInScope = await prisma.patrimonio.findMany({
      where: {
        municipalityId: req.user?.municipalityId,
        setor_responsavel: setor,
        ...(scope === 'location' && local
          ? {
              local_objeto: {
                contains: local,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(scope === 'specific_location' && local
          ? {
              localId: local,
            }
          : {}),
      },
      select: {
        id: true,
        numero_patrimonio: true,
        descricao_bem: true,
      },
    });

    logDebug('✅ Patrimônios encontrados no escopo', {
      count: patrimoniosInScope.length,
      setor,
      scope,
      local,
    });

    // ✅ NOVO: Criar inventário e items em uma transação
    const inventario = await prisma.$transaction(async (tx) => {
      // Criar o inventário
      const newInventory = await tx.inventory.create({
        data: {
          title,
          description: description || '',
          responsavel: userId,
          setor,
          local: local || '',
          dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
          status: 'em_andamento',
          scope: scope || 'sector',
        },
      });

      // Criar os items do inventário
      if (patrimoniosInScope.length > 0) {
        await tx.inventoryItem.createMany({
          data: patrimoniosInScope.map((patrimonio) => ({
            inventoryId: newInventory.id,
            patrimonioId: patrimonio.id,
            encontrado: false,
          })),
        });
      }

      logDebug('✅ Items do inventário criados', {
        inventoryId: newInventory.id,
        itemsCount: patrimoniosInScope.length,
      });

      // Retornar o inventário com items
      return await tx.inventory.findUnique({
        where: { id: newInventory.id },
        include: {
          items: {
            include: {
              patrimonio: {
                select: {
                  id: true,
                  numero_patrimonio: true,
                  descricao_bem: true,
                  sectorId: true,
                  localId: true,
                  status: true,
                  tipoBem: {
                    select: {
                      id: true,
                      nome: true,
                    },
                  },
                  sector: {
                    select: {
                      id: true,
                      name: true,
                      codigo: true,
                    },
                  },
                  local: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    logInfo('✅ Inventário criado com sucesso', {
      inventarioId: inventario!.id,
      title: inventario!.title,
      status: inventario!.status,
      itemsCount: inventario!.items.length,
    });

    // Registrar atividade
    try {
      await prisma.activityLog.create({
        data: {
          userId: userId,
          action: 'CREATE_INVENTORY',
          entityType: 'Inventory',
          entityId: inventario!.id,
          details: `Inventário "${title}" criado`,
        },
      });
      logDebug('✅ Atividade registrada com sucesso');
    } catch (logError) {
      logWarn('⚠️ Erro ao registrar atividade (não crítico)', logError);
    }

    // ✅ CACHE: Invalidar cache de inventários após criação
    await redisCache.deletePattern('inventarios:*');
    logDebug('✅ Cache de inventários invalidado após criação');

    res.status(201).json(inventario);
  } catch (error) {
    logError('❌ Erro ao criar inventário', error, {
      userId: req.user?.userId,
      title: req.body.title,
      setor: req.body.setor
    });
    res.status(500).json({ 
      error: 'Erro ao criar inventário',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * @desc    Atualizar inventário
 * @route   PUT /api/inventarios/:id
 * @access  Private
 */
export const updateInventario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { title, description, setor, local, status, dataFim } = req.body;

    const guard = await findInventarioOfTenant(id, req);
    if (!guard) {
      res.status(404).json({ error: 'Inventário não encontrado' });
      return;
    }

    // Apenas superuser, admin ou o próprio responsável podem editar
    if (
      req.user?.role !== 'superuser' &&
      req.user?.role !== 'admin' &&
      guard.responsavel !== userId
    ) {
      res.status(403).json({ error: 'Sem permissão para editar este inventário' });
      return;
    }

    const inventario = await prisma.inventory.findUnique({
      where: { id },
    });

    if (!inventario) {
      res.status(404).json({ error: 'Inventário não encontrado' });
      return;
    }

    const updated = await prisma.inventory.update({
      where: { id },
      data: {
        title,
        description,
        setor,
        local,
        status,
        dataFim: dataFim ? new Date(dataFim) : null,
      },
      include: {
        items: {
          include: {
            patrimonio: true,
          },
        },
      },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'UPDATE_INVENTORY',
        entityType: 'Inventory',
        entityId: id,
        details: `Inventário "${title || inventario.title}" atualizado`,
      },
    });

    // ✅ CACHE: Invalidar cache de inventários após atualização
    await redisCache.deletePattern('inventarios:*');
    logDebug('✅ Cache de inventários invalidado após atualização');

    res.json(updated);
  } catch (error) {
    logError('Erro ao atualizar inventário', error, { inventarioId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao atualizar inventário' });
  }
};

/**
 * @desc    Deletar inventário
 * @route   DELETE /api/inventarios/:id
 * @access  Private (Admin only)
 */
export const deleteInventario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const guard = await findInventarioOfTenant(id, req);
    if (!guard) {
      res.status(404).json({ error: 'Inventário não encontrado' });
      return;
    }

    const inventario = await prisma.inventory.findUnique({
      where: { id },
    });

    if (!inventario) {
      res.status(404).json({ error: 'Inventário não encontrado' });
      return;
    }

    await prisma.inventory.delete({
      where: { id },
    });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'DELETE_INVENTORY',
        entityType: 'Inventory',
        entityId: id,
        details: `Inventário "${inventario.title}" excluído`,
      },
    });

    // ✅ CACHE: Invalidar cache de inventários após deleção
    await redisCache.deletePattern('inventarios:*');
    logDebug('✅ Cache de inventários invalidado após deleção');

    res.json({ message: 'Inventário excluído com sucesso' });
  } catch (error) {
    logError('Erro ao deletar inventário', error, { inventarioId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao deletar inventário' });
  }
};


