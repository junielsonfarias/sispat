import { Request, Response } from 'express';
import { prisma } from '../index';
import { logError, logInfo, logWarn, logDebug } from '../config/logger';
import { redisCache, CacheUtils } from '../config/redis';

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

    // ✅ CORREÇÃO: Validar e sanitizar query params
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 50));
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

    // ✅ CACHE: Gerar chave de cache baseada nos filtros
    const cacheKey = CacheUtils.getImoveisKey({ where, page: pageNum, limit: limitNum });
    
    // Tentar obter do cache Redis primeiro
    let result = await redisCache.get<{ imoveis: any[], total: number }>(cacheKey);
    
    if (!result) {
      // ✅ QUERY N+1: Include otimizado com select específico
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

      result = {
        imoveis,
        total
      };

      // ✅ CACHE: Armazenar no cache Redis por 5 minutos
      await redisCache.set(cacheKey, result, 300);
      logDebug('✅ Cache de imóveis criado', { page: pageNum, limit: limitNum });
    } else {
      logDebug('✅ Cache hit: imóveis', { page: pageNum, limit: limitNum });
    }

    res.json({
      imoveis: result.imoveis,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        pages: Math.ceil(result.total / limitNum),
      },
    });
  } catch (error) {
    logError('Erro ao listar imóveis', error, { userId: req.user?.userId, query: req.query });
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
    logError('Erro ao buscar imóvel', error, { imovelId: req.params.id, userId: req.user?.userId });
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
    logError('Erro ao buscar imóvel por número', error, { numero: req.params.numero });
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

    logDebug('[CREATE IMOVEL] Request body', { body: req.body });

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
      customFields,
    } = req.body;

    logDebug('[CREATE IMOVEL] Campos extraídos', {
      numero_patrimonio,
      denominacao,
      endereco,
      data_aquisicao,
      valor_aquisicao,
      sectorId
    });

    // Validações
    if (!numero_patrimonio || !denominacao || !endereco || !data_aquisicao || !valor_aquisicao) {
      logWarn('[CREATE IMOVEL] ❌ Validação falhou', {
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
      logDebug('[CREATE IMOVEL] SectorId encontrado pelo nome', { setor, finalSectorId });
    }

    if (!finalSectorId) {
      logWarn('[CREATE IMOVEL] ❌ Setor não encontrado', { setor });
      res.status(400).json({ error: 'Setor não encontrado ou não especificado' });
      return;
    }

    // Processar fotos (extrair apenas URLs se for array de objetos)
    const processedFotos = Array.isArray(fotos) 
      ? fotos.map(f => typeof f === 'string' ? f : (f.file_url || f.url || ''))
      : [];
    
    logDebug('[CREATE IMOVEL] Fotos processadas', { fotosCount: processedFotos.length });

    // Criar imóvel usando transaction para garantir consistência
    const imovel = await prisma.$transaction(async (tx) => {
      // Criar imóvel
      const createdImovel = await tx.imovel.create({
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
          customFields: customFields && typeof customFields === 'object' ? customFields : undefined,
          municipalityId: req.user?.municipalityId || '',
          sectorId: finalSectorId,
          createdBy: req.user?.userId || '',
          updatedBy: req.user?.userId || '',
        },
        include: {
          sector: { select: { id: true, name: true } },
        },
      });

      // Criar entrada no histórico
      if (req.user) {
        await tx.historicoEntry.create({
          data: {
            imovelId: createdImovel.id,
            date: new Date(),
            action: 'CADASTRO',
            details: `Imóvel cadastrado por ${req.user.userId}`,
            user: req.user.userId,
          },
        });

        // Log de atividade
        await tx.activityLog.create({
          data: {
            userId: req.user.userId,
            action: 'CREATE_IMOVEL',
            entityType: 'IMOVEL',
            entityId: createdImovel.id,
            details: `Criado imóvel ${numero_patrimonio}`,
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });
      }

      return createdImovel;
    });

    // ✅ CACHE: Invalidar cache de imóveis após criação
    await CacheUtils.invalidateImoveis();
    logDebug('✅ Cache de imóveis invalidado após criação');

    res.status(201).json({ message: 'Imóvel criado com sucesso', imovel });
  } catch (error) {
    logError('Erro ao criar imóvel', error, { userId: req.user?.userId, numeroPatrimonio: req.body.numero_patrimonio });
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

      const imovelSector = await prisma.sector.findUnique({
        where: { id: existing.sectorId },
        select: { name: true },
      });

      // ✅ CORREÇÃO: Comparar nomes dos setores e verificar array vazio
      // Se responsibleSectors está vazio, usuário tem acesso a todos os setores
      if (user && imovelSector && user.responsibleSectors.length > 0 && !user.responsibleSectors.includes(imovelSector.name)) {
        res.status(403).json({ error: 'Acesso negado: sem permissão para este setor' });
        return;
      }
    }

    // Whitelist de campos atualizáveis (evita mass-assignment de id/createdBy/etc)
    const UPDATABLE_FIELDS = [
      'denominacao', 'endereco', 'setor', 'descricao', 'observacoes',
      'tipo_imovel', 'situacao', 'fotos', 'documentos', 'url_documentos',
      'sectorId', 'customFields',
    ] as const;
    const dataToUpdate: Record<string, unknown> = {
      updatedBy: req.user.userId,
    };
    for (const field of UPDATABLE_FIELDS) {
      if (updateData[field] !== undefined) {
        dataToUpdate[field] = updateData[field];
      }
    }

    // Conversões de tipo
    if (updateData.data_aquisicao) {
      dataToUpdate.data_aquisicao = new Date(updateData.data_aquisicao);
    }
    if (updateData.valor_aquisicao !== undefined) {
      dataToUpdate.valor_aquisicao = parseFloat(updateData.valor_aquisicao);
    }
    if (updateData.area_terreno !== undefined) {
      dataToUpdate.area_terreno = parseFloat(updateData.area_terreno);
    }
    if (updateData.area_construida !== undefined) {
      dataToUpdate.area_construida = parseFloat(updateData.area_construida);
    }
    if (updateData.latitude !== undefined) {
      dataToUpdate.latitude = updateData.latitude === null ? null : parseFloat(updateData.latitude);
    }
    if (updateData.longitude !== undefined) {
      dataToUpdate.longitude = updateData.longitude === null ? null : parseFloat(updateData.longitude);
    }

    // Atualizar usando transaction para garantir consistência
    const imovel = await prisma.$transaction(async (tx) => {
      // Atualizar imóvel
      const updatedImovel = await tx.imovel.update({
        where: { id },
        data: dataToUpdate,
        include: {
          sector: { select: { id: true, name: true } },
        },
      });

      // Criar entrada no histórico
      if (req.user) {
        await tx.historicoEntry.create({
          data: {
            imovelId: updatedImovel.id,
            date: new Date(),
            action: 'ATUALIZAÇÃO',
            details: `Imóvel atualizado por ${req.user.userId}`,
            user: req.user.userId,
          },
        });

        // Log de atividade
        await tx.activityLog.create({
          data: {
            userId: req.user.userId,
            action: 'UPDATE_IMOVEL',
            entityType: 'IMOVEL',
            entityId: updatedImovel.id,
          details: `Atualizado imóvel ${updatedImovel.numero_patrimonio}`,
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });
      }

      return updatedImovel;
    });

    // ✅ CACHE: Invalidar cache de imóveis após atualização
    await CacheUtils.invalidateImoveis();
    logDebug('✅ Cache de imóveis invalidado após atualização');

    res.json({ message: 'Imóvel atualizado com sucesso', imovel });
  } catch (error) {
    logError('Erro ao atualizar imóvel', error, { imovelId: req.params.id, userId: req.user?.userId });
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

    // ✅ CACHE: Invalidar cache de imóveis após deleção
    await CacheUtils.invalidateImoveis();
    logDebug('✅ Cache de imóveis invalidado após deleção');

    res.json({ message: 'Imóvel deletado com sucesso' });
  } catch (error) {
    logError('Erro ao deletar imóvel', error, { imovelId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao deletar imóvel' });
  }
};

/**
 * Gerar próximo número de imóvel
 * GET /api/imoveis/gerar-numero
 */
export const gerarNumeroImovel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectorId } = req.query;
    const currentYear = new Date().getFullYear();

    if (!sectorId) {
      res.status(400).json({ error: 'ID do setor é obrigatório' });
      return;
    }

    // Buscar código do setor
    const sector = await prisma.sector.findUnique({
      where: { id: sectorId as string },
      select: { codigo: true },
    });

    if (!sector) {
      res.status(404).json({ error: 'Setor não encontrado' });
      return;
    }

    // Formato: IML + ano + código do setor + sequencial de 4 dígitos
    // Exemplo: IML2025010001 (IML + 2025 + 01 + 0001)
    const prefix = `IML${currentYear}${sector.codigo}`;

    // Buscar último número com este prefixo
    const ultimoImovel = await prisma.imovel.findFirst({
      where: {
        numero_patrimonio: {
          startsWith: prefix,
        },
      },
      orderBy: {
        numero_patrimonio: 'desc',
      },
      select: {
        numero_patrimonio: true,
      },
    });

    let proximoSequencial = 1;

    if (ultimoImovel) {
      // Extrair sequencial (últimos 4 dígitos)
      const sequencialAtual = ultimoImovel.numero_patrimonio.slice(-4);
      proximoSequencial = parseInt(sequencialAtual) + 1;
    }

    // Formatar: IML202501000 1
    const numeroGerado = `${prefix}${proximoSequencial.toString().padStart(4, '0')}`;

    logInfo('📋 Número de imóvel gerado', {
      prefix,
      sectorCodigo: sector.codigo,
      year: currentYear,
      sequencial: proximoSequencial,
      numeroCompleto: numeroGerado,
    });

    res.json({
      numero: numeroGerado,
      preview: numeroGerado,
      pattern: {
        prefix: 'IML',
        year: currentYear,
        sectorCode: sector.codigo,
        sequence: proximoSequencial,
      },
    });
  } catch (error) {
    logError('Erro ao gerar número de imóvel', error, { sectorId: req.query.sectorId });
    res.status(500).json({ error: 'Erro ao gerar número de imóvel' });
  }
};

