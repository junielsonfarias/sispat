import { Request, Response } from 'express';
import { prisma } from '../index';

/**
 * @desc    Obter todos os inventários
 * @route   GET /api/inventarios
 * @access  Private
 */
export const getInventarios = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    // Remover sectorId do JwtPayload pois não existe

    let inventarios;

    if (userRole === 'admin' || userRole === 'superuser') {
      // Admin e Superuser veem todos
      inventarios = await prisma.inventory.findMany({
        include: {
          items: {
            include: {
              patrimonio: true,
            },
          },
        },
        orderBy: {
          dataInicio: 'desc',
        },
      });
    } else {
      // Outros usuários veem apenas inventários do seu setor
      inventarios = await prisma.inventory.findMany({
        where: {
          setor: req.user?.municipalityId, // Filtrar por município
        },
        include: {
          items: {
            include: {
              patrimonio: true,
            },
          },
        },
        orderBy: {
          dataInicio: 'desc',
        },
      });
    }

    res.json(inventarios);
  } catch (error) {
    console.error('Erro ao buscar inventários:', error);
    res.status(500).json({ error: 'Erro ao buscar inventários' });
  }
};

/**
 * @desc    Obter inventário por ID
 * @route   GET /api/inventarios/:id
 * @access  Private
 */
export const getInventarioById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const inventario = await prisma.inventory.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            patrimonio: {
              include: {
                tipoBem: true,
              },
            },
          },
        },
      },
    });

    if (!inventario) {
      res.status(404).json({ error: 'Inventário não encontrado' });
      return;
    }

    res.json(inventario);
  } catch (error) {
    console.error('Erro ao buscar inventário:', error);
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

    console.log('📝 [DEV] Criando inventário:', { 
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
      console.log('❌ [DEV] Erro: título não fornecido');
      res.status(400).json({ error: 'O título do inventário é obrigatório' });
      return;
    }

    if (!setor) {
      console.log('❌ [DEV] Erro: setor não fornecido');
      res.status(400).json({ error: 'O setor é obrigatório' });
      return;
    }

    if (!userId) {
      console.log('❌ [DEV] Erro: userId não encontrado');
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    console.log('🔍 [DEV] Dados antes de criar no banco:', {
      title,
      description: description || '',
      responsavel: userId,
      setor,
      local: local || '',
      dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
      status: 'em_andamento',
      scope: scope || 'sector',
    });

    const inventario = await prisma.inventory.create({
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
      include: {
        items: true,
      },
    });

    console.log('✅ [DEV] Inventário criado com sucesso:', {
      id: inventario.id,
      title: inventario.title,
      status: inventario.status,
    });

    // Registrar atividade
    try {
      await prisma.activityLog.create({
        data: {
          userId: userId,
          action: 'CREATE_INVENTORY',
          entityType: 'Inventory',
          entityId: inventario.id,
          details: `Inventário "${title}" criado`,
        },
      });
      console.log('✅ [DEV] Atividade registrada com sucesso');
    } catch (logError) {
      console.error('⚠️ [DEV] Erro ao registrar atividade (não crítico):', logError);
    }

    res.status(201).json(inventario);
  } catch (error) {
    console.error('❌ [DEV] Erro ao criar inventário:', error);
    console.error('❌ [DEV] Stack trace:', error instanceof Error ? error.stack : 'N/A');
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

    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar inventário:', error);
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

    res.json({ message: 'Inventário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar inventário:', error);
    res.status(500).json({ error: 'Erro ao deletar inventário' });
  }
};


