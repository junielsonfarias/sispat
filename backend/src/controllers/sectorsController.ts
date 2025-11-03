import { Request, Response } from 'express';
import { prisma } from '../index';
import { logError, logInfo, logWarn, logDebug } from '../config/logger';

/**
 * @desc    Obter todos os setores
 * @route   GET /api/sectors
 * @access  Private
 */
export const getSectors = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    logDebug('🔍 GET /api/sectors', { role: userRole, email: userEmail });

    let where: any = {};

    // ✅ FILTRO POR PERMISSÃO DE USUÁRIO
    // Admin e Supervisor veem TODOS os setores
    // Usuário e Visualizador veem apenas seus setores responsáveis
    if (userRole !== 'admin' && userRole !== 'supervisor') {
      // Buscar setores do usuário
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { responsibleSectors: true },
      });

      const responsibleSectors = user?.responsibleSectors || [];
      logDebug('🔍 Setores responsáveis do usuário', { responsibleSectors });

      if (responsibleSectors.length > 0) {
        // Filtrar por nomes dos setores
        where.name = { in: responsibleSectors };
      } else {
        // Usuário sem setores atribuídos não vê nada
        logDebug('⚠️ Usuário sem setores atribuídos - retornando vazio');
        res.json([]);
        return;
      }
    } else {
      logDebug('✅ Admin/Supervisor - retornando TODOS os setores');
    }

    const sectors = await prisma.sector.findMany({
      where,
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

    logDebug('✅ Setores encontrados', { count: sectors.length });

    // ✅ PERFORMANCE: Cache HTTP para dados estáticos
    res.setHeader('Cache-Control', 'public, max-age=600'); // 10 minutos
    res.json(sectors);
  } catch (error) {
    logError('❌ Erro ao buscar setores', error, { userId: req.user?.userId });
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
    logError('Erro ao buscar setor', error, { sectorId: req.params.id });
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
    const { name, sigla, codigo, description, endereco, cnpj, responsavel, parentId } = req.body;

    logDebug('➕ Criando setor', {
      dadosRecebidos: { name, sigla, codigo, description, endereco, cnpj, responsavel, parentId },
      usuario: userId,
    });

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
        sigla,
        codigo,
        description,
        endereco,
        cnpj,
        responsavel,
        parentId,
        municipalityId: req.user?.municipalityId || '',
      },
    });

    logInfo('✅ Setor criado', { sectorId: sector.id, name: sector.name });

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
  } catch (error: any) {
    logError('❌ Erro ao criar setor', error, { userId: req.user?.userId, name: req.body.name });
    res.status(500).json({ error: 'Erro ao criar setor' });
  }
};

/**
 * @desc    Atualizar setor
 * @route   PUT /api/sectors/:id
 * @access  Private (Superuser/Supervisor)
 */
export const updateSector = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { name, sigla, codigo, description, endereco, cnpj, responsavel, parentId } = req.body;

    logDebug('🔄 Atualizando setor', {
      id,
      dadosRecebidos: { name, sigla, codigo, description, endereco, cnpj, responsavel, parentId },
      usuario: userId,
    });

    const sector = await prisma.sector.findUnique({
      where: { id },
    });

    if (!sector) {
      logWarn('❌ Setor não encontrado', { id });
      res.status(404).json({ error: 'Setor não encontrado' });
      return;
    }

    logDebug('📊 Setor atual', { sectorId: sector.id, name: sector.name });

    // Preparar dados para atualização (apenas campos fornecidos)
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (sigla !== undefined) updateData.sigla = sigla;
    if (codigo !== undefined) updateData.codigo = codigo;
    if (description !== undefined) updateData.description = description;
    if (endereco !== undefined) updateData.endereco = endereco;
    if (cnpj !== undefined) updateData.cnpj = cnpj;
    if (responsavel !== undefined) updateData.responsavel = responsavel;
    if (parentId !== undefined) updateData.parentId = parentId;

    logDebug('📝 Dados a atualizar', { updateData });

    const updated = await prisma.sector.update({
      where: { id },
      data: updateData,
    });

    logInfo('✅ Setor atualizado', { sectorId: updated.id, name: updated.name });

    // Registrar atividade
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'UPDATE_SECTOR',
        entityType: 'Sector',
        entityId: id,
        details: `Setor "${updated.name}" atualizado`,
      },
    });

    res.json(updated);
  } catch (error: any) {
    logError('❌ Erro ao atualizar setor', error, {
      sectorId: req.params.id,
      userId: req.user?.userId,
      errorCode: error.code
    });
    res.status(500).json({ 
      error: 'Erro ao atualizar setor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    logError('Erro ao deletar setor', error, { sectorId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao deletar setor' });
  }
};


