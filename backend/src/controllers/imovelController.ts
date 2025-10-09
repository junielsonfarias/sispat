import { Request, Response } from 'express';
import { prisma } from '../index';

/**
 * Listar imóveis com filtros
 * GET /api/imoveis
 */
export const listImoveis = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      sectorId,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const where: any = {
      municipalityId: req.user?.municipalityId,
    };

    // Filtro de busca
    if (search) {
      where.OR = [
        { numero_patrimonio: { contains: search as string, mode: 'insensitive' } },
        { denominacao: { contains: search as string, mode: 'insensitive' } },
        { endereco: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Filtro de setor
    if (sectorId) {
      where.sectorId = sectorId;
    }

    // Verificar acesso por perfil
    // ✅ Admin e Supervisor veem TODOS os setores
    // Apenas usuário e visualizador tem filtro por setor
    if (req.user?.role === 'usuario' || req.user?.role === 'visualizador') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { responsibleSectors: true },
      });

      if (user && user.responsibleSectors.length > 0) {
        // Buscar IDs dos setores pelos nomes
        const sectors = await prisma.sector.findMany({
          where: { 
            name: { in: user.responsibleSectors },
            municipalityId: req.user.municipalityId
          },
          select: { id: true }
        });
        
        const sectorIds = sectors.map(s => s.id);
        if (sectorIds.length > 0) {
          where.sectorId = { in: sectorIds };
        }
      }
    }

    // Buscar imóveis
    const [imoveis, total] = await Promise.all([
      prisma.imovel.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          sector: {
            select: { id: true, name: true, codigo: true },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.imovel.count({ where }),
    ]);

    res.json({
      imoveis,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Erro ao listar imóveis:', error);
    res.status(500).json({ error: 'Erro ao listar imóveis' });
  }
};

/**
 * Obter imóvel por ID
 * GET /api/imoveis/:id
 */
export const getImovel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const imovel = await prisma.imovel.findUnique({
      where: { id },
      include: {
        municipality: {
          select: { id: true, name: true, state: true },
        },
        sector: {
          select: { id: true, name: true, codigo: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        historico: {
          orderBy: { date: 'desc' },
          take: 50,
        },
        manutencoes: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!imovel) {
      res.status(404).json({ error: 'Imóvel não encontrado' });
      return;
    }

    // Verificar acesso
    if (req.user?.role === 'supervisor' || req.user?.role === 'usuario') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { responsibleSectors: true },
      });

      // Buscar o setor do imóvel para obter o nome
      const imovelSector = await prisma.sector.findUnique({
        where: { id: imovel.sectorId },
        select: { name: true },
      });

      if (user && imovelSector && user.responsibleSectors.length > 0 && !user.responsibleSectors.includes(imovelSector.name)) {
        res.status(403).json({ error: 'Acesso negado: sem permissão para este setor' });
        return;
      }
    }

    res.json({ imovel });
  } catch (error) {
    console.error('Erro ao buscar imóvel:', error);
    res.status(500).json({ error: 'Erro ao buscar imóvel' });
  }
};

/**
 * Buscar imóvel por número
 * GET /api/imoveis/numero/:numero
 */
export const getByNumero = async (req: Request, res: Response): Promise<void> => {
  try {
    const { numero } = req.params;

    const imovel = await prisma.imovel.findUnique({
      where: { numero_patrimonio: numero },
      include: {
        sector: { select: { id: true, name: true, codigo: true } },
        historico: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!imovel) {
      res.status(404).json({ error: 'Imóvel não encontrado' });
      return;
    }

    res.json({ imovel });
  } catch (error) {
    console.error('Erro ao buscar imóvel por número:', error);
    res.status(500).json({ error: 'Erro ao buscar imóvel' });
  }
};

/**
 * Criar imóvel
 * POST /api/imoveis
 */
export const createImovel = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    console.log('[CREATE IMOVEL] Request body:', JSON.stringify(req.body, null, 2));

    const {
      numero_patrimonio,
      denominacao,
      endereco,
      setor,
      data_aquisicao,
      valor_aquisicao,
      area_terreno,
      area_construida,
      latitude,
      longitude,
      descricao,
      observacoes,
      tipo_imovel,
      situacao,
      fotos,
      documentos,
      url_documentos,
      sectorId,
    } = req.body;

    console.log('[CREATE IMOVEL] Campos extraídos:', {
      numero_patrimonio,
      denominacao,
      endereco,
      data_aquisicao,
      valor_aquisicao,
      sectorId
    });

    // Validações
    if (!numero_patrimonio || !denominacao || !endereco || !data_aquisicao || !valor_aquisicao) {
      console.log('[CREATE IMOVEL] ❌ Validação falhou:', {
        numero_patrimonio: !!numero_patrimonio,
        denominacao: !!denominacao,
        endereco: !!endereco,
        data_aquisicao: !!data_aquisicao,
        valor_aquisicao: !!valor_aquisicao
      });
      res.status(400).json({ error: 'Campos obrigatórios faltando' });
      return;
    }

    // Verificar se número já existe
    const existing = await prisma.imovel.findUnique({
      where: { numero_patrimonio },
    });

    if (existing) {
      res.status(400).json({ error: 'Número de patrimônio já existe' });
      return;
    }

    // Buscar sectorId pelo nome do setor se não foi fornecido
    let finalSectorId = sectorId;
    if (!finalSectorId && setor) {
      const sector = await prisma.sector.findFirst({
        where: {
          name: setor,
          municipalityId: req.user.municipalityId,
        },
        select: { id: true },
      });
      finalSectorId = sector?.id;
      console.log('[CREATE IMOVEL] SectorId encontrado pelo nome:', { setor, finalSectorId });
    }

    if (!finalSectorId) {
      console.log('[CREATE IMOVEL] ❌ Setor não encontrado');
      res.status(400).json({ error: 'Setor não encontrado ou não especificado' });
      return;
    }

    // Processar fotos (extrair apenas URLs se for array de objetos)
    const processedFotos = Array.isArray(fotos) 
      ? fotos.map(f => typeof f === 'string' ? f : (f.file_url || f.url || ''))
      : [];
    
    console.log('[CREATE IMOVEL] Fotos processadas:', processedFotos);

    // Criar imóvel
    const imovel = await prisma.imovel.create({
      data: {
        numero_patrimonio,
        denominacao,
        endereco,
        setor: setor || 'Não especificado',
        data_aquisicao: new Date(data_aquisicao),
        valor_aquisicao: parseFloat(valor_aquisicao),
        area_terreno: area_terreno ? parseFloat(area_terreno) : 0,
        area_construida: area_construida ? parseFloat(area_construida) : 0,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        descricao,
        observacoes,
        tipo_imovel,
        situacao,
        fotos: processedFotos,
        documentos: documentos || [],
        url_documentos,
        municipalityId: req.user.municipalityId,
        sectorId: finalSectorId,
        createdBy: req.user.userId,
        updatedBy: req.user.userId,
      },
      include: {
        sector: { select: { id: true, name: true } },
      },
    });

    // Criar entrada no histórico
    await prisma.historicoEntry.create({
      data: {
        imovelId: imovel.id,
        date: new Date(),
        action: 'CADASTRO',
        details: `Imóvel cadastrado por ${req.user.userId}`,
        user: req.user.userId,
      },
    });

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId: req.user.userId,
        action: 'CREATE_IMOVEL',
        entityType: 'IMOVEL',
        entityId: imovel.id,
        details: `Criado imóvel ${numero_patrimonio}`,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    res.status(201).json({ message: 'Imóvel criado com sucesso', imovel });
  } catch (error) {
    console.error('Erro ao criar imóvel:', error);
    res.status(500).json({ error: 'Erro ao criar imóvel' });
  }
};

/**
 * Atualizar imóvel
 * PUT /api/imoveis/:id
 */
export const updateImovel = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    // Verificar se existe
    const existing = await prisma.imovel.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Imóvel não encontrado' });
      return;
    }

    // Verificar acesso
    if (req.user.role === 'supervisor' || req.user.role === 'usuario') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { responsibleSectors: true },
      });

      if (user && !user.responsibleSectors.includes(existing.sectorId)) {
        res.status(403).json({ error: 'Acesso negado' });
        return;
      }
    }

    // Preparar dados para atualização
    const dataToUpdate: any = {
      ...updateData,
      updatedBy: req.user.userId,
    };

    // Converter datas se necessário
    if (updateData.data_aquisicao) {
      dataToUpdate.data_aquisicao = new Date(updateData.data_aquisicao);
    }

    // Converter valores numéricos
    if (updateData.valor_aquisicao) {
      dataToUpdate.valor_aquisicao = parseFloat(updateData.valor_aquisicao);
    }
    if (updateData.area_terreno) {
      dataToUpdate.area_terreno = parseFloat(updateData.area_terreno);
    }
    if (updateData.area_construida) {
      dataToUpdate.area_construida = parseFloat(updateData.area_construida);
    }
    if (updateData.latitude) {
      dataToUpdate.latitude = parseFloat(updateData.latitude);
    }
    if (updateData.longitude) {
      dataToUpdate.longitude = parseFloat(updateData.longitude);
    }

    // Atualizar
    const imovel = await prisma.imovel.update({
      where: { id },
      data: dataToUpdate,
      include: {
        sector: { select: { id: true, name: true } },
      },
    });

    // Criar entrada no histórico
    await prisma.historicoEntry.create({
      data: {
        imovelId: imovel.id,
        date: new Date(),
        action: 'ATUALIZAÇÃO',
        details: `Imóvel atualizado por ${req.user.userId}`,
        user: req.user.userId,
      },
    });

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId: req.user.userId,
        action: 'UPDATE_IMOVEL',
        entityType: 'IMOVEL',
        entityId: imovel.id,
        details: `Atualizado imóvel ${imovel.numero_patrimonio}`,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    res.json({ message: 'Imóvel atualizado com sucesso', imovel });
  } catch (error) {
    console.error('Erro ao atualizar imóvel:', error);
    res.status(500).json({ error: 'Erro ao atualizar imóvel' });
  }
};

/**
 * Deletar imóvel
 * DELETE /api/imoveis/:id
 */
export const deleteImovel = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;

    // Verificar se existe
    const existing = await prisma.imovel.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Imóvel não encontrado' });
      return;
    }

    // Apenas superuser e supervisor podem deletar
    if (req.user.role !== 'superuser' && req.user.role !== 'supervisor') {
      res.status(403).json({ error: 'Acesso negado: apenas superuser/supervisor podem deletar' });
      return;
    }

    // Deletar (cascade vai remover histórico)
    await prisma.imovel.delete({
      where: { id },
    });

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId: req.user.userId,
        action: 'DELETE_IMOVEL',
        entityType: 'IMOVEL',
        entityId: id,
        details: `Deletado imóvel ${existing.numero_patrimonio}`,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    res.json({ message: 'Imóvel deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar imóvel:', error);
    res.status(500).json({ error: 'Erro ao deletar imóvel' });
  }
};

