import { Request, Response } from 'express';
import { prisma } from '../index';
import { AppError } from '../middlewares/errorHandler';
import { 
  QueryOptimizer, 
  executeOptimizedQuery, 
  queryCache 
} from '../config/database-optimization';
import { redisCache, CacheUtils } from '../config/redis';
import { logError, logInfo, logWarn, logDebug } from '../config/logger';

/**
 * Listar patrimônios públicos (sem autenticação)
 * GET /api/public/patrimonios
 */
export const listPublicPatrimonios = async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscar todos os patrimônios ativos
    const patrimonios = await prisma.patrimonio.findMany({
      where: {
        status: {
          in: ['ativo', 'em_manutencao', 'cedido', 'em_uso']
        }
      },
      include: {
        sector: true,
        municipality: true,
      },
      orderBy: {
        numero_patrimonio: 'asc'
      }
    });

    res.json({ patrimonios });
  } catch (error) {
    logError('Erro ao listar patrimônios públicos', error);
    res.status(500).json({ error: 'Erro ao listar patrimônios' });
  }
};

/**
 * Buscar patrimônio público por número (sem autenticação)
 * GET /api/public/patrimonios/:numero
 */
export const getPublicPatrimonioByNumero = async (req: Request, res: Response): Promise<void> => {
  try {
    const { numero } = req.params;

    const patrimonio = await prisma.patrimonio.findFirst({
      where: {
        numero_patrimonio: numero,
        status: {
          in: ['ativo', 'em_manutencao', 'cedido', 'em_uso']
        }
      },
      include: {
        sector: true,
        municipality: true,
        tipoBem: {
          select: {
            id: true,
            nome: true,
            descricao: true,
          }
        },
        local: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
      },
    });

    if (!patrimonio) {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    res.json({ patrimonio });
  } catch (error) {
    logError('Erro ao buscar patrimônio público', error, { numero: req.params.numero });
    res.status(500).json({ error: 'Erro ao buscar patrimônio' });
  }
};

/**
 * Listar patrimônios com filtros
 * GET /api/patrimonios
 */
export const listPatrimonios = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      status,
      situacao_bem,
      sectorId,
      tipo,
      numero_licitacao,
      ano_licitacao,
      dataAquisicaoInicio,
      dataAquisicaoFim,
      page = '1',
      limit = '50',
      orderBy = 'createdAt',
      orderDirection = 'desc'
    } = req.query;

    // ✅ OTIMIZAÇÃO: Usar QueryOptimizer para paginação
    const pagination = QueryOptimizer.applyPagination(page as string, limit as string);

    // ✅ OTIMIZAÇÃO: Usar QueryOptimizer para busca
    const searchFilters = QueryOptimizer.applySearchFilters(
      search as string,
      ['numero_patrimonio', 'descricao_bem', 'marca', 'modelo', 'numero_licitacao']
    );

    // ✅ OTIMIZAÇÃO: Usar QueryOptimizer para ordenação
    const ordering = QueryOptimizer.applyOrdering(
      orderBy as string,
      orderDirection as 'asc' | 'desc'
    );

    // Construir filtros
    const where: any = {
      municipalityId: req.user?.municipalityId,
      ...searchFilters,
    };

    // Filtro de status
    if (status) {
      where.status = status;
    }

    // Filtro de situação do bem
    if (situacao_bem) {
      where.situacao_bem = situacao_bem;
    }

    // Filtro de setor
    if (sectorId) {
      where.sectorId = sectorId;
    }

    // Filtro de tipo
    if (tipo) {
      where.tipo = tipo;
    }

    // Filtro de data de aquisição (período)
    if (dataAquisicaoInicio || dataAquisicaoFim) {
      where.data_aquisicao = {};
      if (dataAquisicaoInicio) {
        where.data_aquisicao.gte = new Date(dataAquisicaoInicio as string);
      }
      if (dataAquisicaoFim) {
        // Adicionar 1 dia para incluir todo o dia final
        const endDate = new Date(dataAquisicaoFim as string);
        endDate.setHours(23, 59, 59, 999);
        where.data_aquisicao.lte = endDate;
      }
    }

    // Filtro de número de licitação
    if (numero_licitacao) {
      where.numero_licitacao = { contains: numero_licitacao as string, mode: 'insensitive' };
    }

    // Filtro de ano de licitação
    if (ano_licitacao) {
      where.ano_licitacao = parseInt(ano_licitacao as string);
    }

    // ✅ OTIMIZAÇÃO: Usar QueryOptimizer para filtros de permissão
    const permissionFilters = await QueryOptimizer.applyPermissionFilters(req.user, 'patrimonio');
    Object.assign(where, permissionFilters);

    // ✅ OTIMIZAÇÃO: Usar Redis cache e query otimizada
    const cacheKey = CacheUtils.getPatrimoniosKey({ where, pagination, ordering });
    
    // Tentar obter do cache Redis primeiro
    let result = await redisCache.get(cacheKey);
    
    if (!result) {
      // Se não estiver no cache, executar query
      result = await executeOptimizedQuery(
        cacheKey,
        async () => {
        const [patrimonios, total] = await Promise.all([
          prisma.patrimonio.findMany({
            where,
            skip: pagination.skip,
            take: pagination.take,
            orderBy: ordering,
        include: {
          sector: {
            select: { id: true, name: true, codigo: true },
          },
          local: {
            select: { id: true, name: true },
          },
          tipoBem: {
            select: { id: true, nome: true },
          },
          acquisitionForm: {
            select: { id: true, nome: true },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.patrimonio.count({ where }),
    ]);
    
    return { patrimonios, total };
        }
      );
      
      // Armazenar no cache Redis por 5 minutos
      await redisCache.set(cacheKey, result, 300);
    }
    
    const { patrimonios, total } = result as { patrimonios: any[]; total: number };

    res.json({
      patrimonios,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error) {
    logError('❌ Erro ao listar patrimônios', error, {
      userId: req.user?.userId,
      query: req.query
    });
    res.status(500).json({ error: 'Erro ao listar patrimônios' });
  }
};

/**
 * Obter patrimônio por ID
 * GET /api/patrimonios/:id
 */
export const getPatrimonio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // ✅ CACHE: Tentar obter do cache primeiro
    const cacheKey = `patrimonio:${id}`;
    let patrimonio = await redisCache.get<any>(cacheKey);
    
    if (!patrimonio) {
      // ✅ QUERY N+1: Include otimizado com select específico
      patrimonio = await prisma.patrimonio.findUnique({
        where: { id },
        include: {
          municipality: {
            select: { id: true, name: true, state: true },
          },
          sector: {
            select: { id: true, name: true, codigo: true },
          },
        local: {
          select: { id: true, name: true, description: true },
        },
        tipoBem: {
          select: { id: true, nome: true, descricao: true },
        },
        acquisitionForm: {
          select: { id: true, nome: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        historico: {
          orderBy: { date: 'desc' },
          take: 50,
        },
        notes: {
          orderBy: { date: 'desc' },
          take: 20,
        },
        subPatrimonios: {
          select: {
            id: true,
            descricao: true,
            quantidade: true,
            valor: true,
            status: true,
            observacoes: true
          }
        },
      },
    });

      // ✅ CACHE: Armazenar no cache Redis por 10 minutos
      await redisCache.set(cacheKey, patrimonio, 600);
      logDebug('✅ Cache de patrimônio criado', { patrimonioId: id });
    } else {
      logDebug('✅ Cache hit: patrimônio', { patrimonioId: id });
    }

    if (!patrimonio) {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    // ✅ DEBUG: Log de verificação de acesso
    logDebug('Verificando acesso para patrimônio', {
      patrimonioId: patrimonio.id,
      sectorId: patrimonio.sectorId,
      userRole: req.user?.role,
      userId: req.user?.userId
    });

    // ✅ CORREÇÃO: Verificar acesso (admin e superuser têm acesso total)
    if (req.user?.role === 'supervisor' || req.user?.role === 'usuario') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { responsibleSectors: true },
      });

      // Buscar o setor do patrimônio para obter o nome
      const patrimonioSector = await prisma.sector.findUnique({
        where: { id: patrimonio.sectorId },
        select: { name: true },
      });

      logDebug('🔍 Verificação de acesso detalhada', {
        userId: req.user.userId,
        userRole: req.user.role,
        responsibleSectors: user?.responsibleSectors,
        patrimonioSectorId: patrimonio.sectorId,
        patrimonioSectorName: patrimonioSector?.name,
        hasAccess: user?.responsibleSectors?.includes(patrimonioSector?.name || ''),
        responsibleSectorsLength: user?.responsibleSectors?.length || 0
      });

      // ✅ CORREÇÃO: Verificar se usuário tem acesso ao setor
      // Se responsibleSectors está vazio, usuário tem acesso a todos os setores
      if (user && patrimonioSector && user.responsibleSectors.length > 0 && !user.responsibleSectors.includes(patrimonioSector.name)) {
        logDebug('Acesso negado - setor não permitido');
        res.status(403).json({ error: 'Acesso negado: sem permissão para este setor' });
        return;
      }
    }

    // ✅ DEBUG: Log de sucesso
    logDebug('Acesso permitido para patrimônio', { patrimonioId: patrimonio.id });

    res.json({ patrimonio });
  } catch (error) {
    logError('Erro ao buscar patrimônio', error, { patrimonioId: req.params.id });
    res.status(500).json({ error: 'Erro ao buscar patrimônio' });
  }
};

/**
 * Buscar patrimônio por número
 * GET /api/patrimonios/numero/:numero
 */
export const getByNumero = async (req: Request, res: Response): Promise<void> => {
  try {
    const { numero } = req.params;

    const patrimonio = await prisma.patrimonio.findUnique({
      where: { numero_patrimonio: numero },
      include: {
        sector: { select: { id: true, name: true, codigo: true } },
        local: { select: { id: true, name: true } },
        tipoBem: { select: { id: true, nome: true } },
        historico: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!patrimonio) {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    res.json({ patrimonio });
  } catch (error) {
    logError('Erro ao buscar patrimônio por número', error, { numero: req.params.numero });
    res.status(500).json({ error: 'Erro ao buscar patrimônio' });
  }
};

/**
 * Gerar próximo número patrimonial (ATÔMICO)
 * GET /api/patrimonios/gerar-numero
 */
export const gerarNumeroPatrimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prefix = 'PAT', year, sectorCode } = req.query
    const currentYear = year || new Date().getFullYear()
    const sectorCodeValue = sectorCode || '00'

    // Usar transação para garantir atomicidade
    const result = await prisma.$transaction(async (tx) => {
      // Buscar último número do ano e setor
      const ultimoPatrimonio = await tx.patrimonio.findFirst({
        where: {
          numero_patrimonio: {
            startsWith: `${prefix}${currentYear}${sectorCodeValue}`,
          },
        },
        orderBy: {
          numero_patrimonio: 'desc',
        },
        select: {
          numero_patrimonio: true,
        },
      })

      let proximoNumero = 1

      if (ultimoPatrimonio) {
        // Extrair número sequencial do formato: PAT2025000001
        const numeroSemPrefix = ultimoPatrimonio.numero_patrimonio.replace(`${prefix}${currentYear}${sectorCodeValue}`, '')
        const ultimoSequencial = parseInt(numeroSemPrefix)
        proximoNumero = ultimoSequencial + 1
      }

      // Formatar: PAT2025000001 (Ano + Código do Setor + Sequencial)
      const numeroGerado = `${prefix}${currentYear}${sectorCodeValue}${proximoNumero.toString().padStart(6, '0')}`

      // Verificar se o número já existe (dupla verificação)
      const existe = await tx.patrimonio.findUnique({
        where: {
          numero_patrimonio: numeroGerado,
        },
        select: {
          id: true,
        },
      })

      if (existe) {
        throw new Error('Número patrimonial já existe, tentando novamente...')
      }

      return {
        numero: numeroGerado,
        year: currentYear,
        sectorCode: sectorCodeValue,
        sequencial: proximoNumero,
      }
    })

    res.json(result)
  } catch (error) {
    logError('Erro ao gerar número patrimonial', error, { prefix: req.query.prefix, year: req.query.year })
    
    // Se for erro de duplicação, tentar novamente
    if (error.message.includes('já existe')) {
      // Retry uma vez
      setTimeout(async () => {
        try {
          const retryResult = await gerarNumeroPatrimonial(req, res)
          return retryResult
        } catch (retryError) {
          res.status(500).json({ error: 'Erro ao gerar número patrimonial após retry' })
        }
      }, 100)
      return
    }
    
    res.status(500).json({ error: 'Erro ao gerar número patrimonial' })
  }
}

/**
 * Criar patrimônio
 * POST /api/patrimonios
 */
export const createPatrimonio = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // Log do body completo para debug
    logDebug('[CREATE PATRIMONIO] Request body', { body: req.body });

    const {
      numero_patrimonio,
      descricao_bem,
      tipo,
      marca,
      modelo,
      cor,
      numero_serie,
      data_aquisicao,
      valor_aquisicao,
      quantidade,
      numero_nota_fiscal,
      forma_aquisicao,
      numero_licitacao,
      ano_licitacao,
      setor_responsavel,
      local_objeto,
      status,
      situacao_bem,
      observacoes,
      fotos,
      documentos,
      metodo_depreciacao,
      vida_util_anos,
      valor_residual,
      sectorId,
      localId,
      tipoId,
      acquisitionFormId,
    } = req.body;

    // Validações
    if (!numero_patrimonio || !descricao_bem || !data_aquisicao || !valor_aquisicao || !sectorId) {
      logWarn('[CREATE PATRIMONIO] Validação falhou', {
        numero_patrimonio: !!numero_patrimonio,
        descricao_bem: !!descricao_bem,
        data_aquisicao: !!data_aquisicao,
        valor_aquisicao: !!valor_aquisicao,
        sectorId: !!sectorId,
      });
      res.status(400).json({ error: 'Campos obrigatórios faltando (número, descrição, data aquisição, valor e setor)' });
      return;
    }

    // Verificar se número já existe
    const existing = await prisma.patrimonio.findUnique({
      where: { numero_patrimonio },
    });

    if (existing) {
      res.status(400).json({ error: 'Número de patrimônio já existe' });
      return;
    }

    // ✅ CORREÇÃO: Criar patrimônio com transaction atômica
    const patrimonio = await prisma.$transaction(async (tx) => {
      // 1. Criar patrimônio
      const novoPatrimonio = await tx.patrimonio.create({
        data: {
          numero_patrimonio,
          descricao_bem,
          tipo: tipo || 'Não especificado',
          marca,
          modelo,
          cor,
          numero_serie,
          data_aquisicao: new Date(data_aquisicao),
          valor_aquisicao: parseFloat(valor_aquisicao),
          quantidade: parseInt(quantidade) || 1,
          numero_nota_fiscal,
          forma_aquisicao: forma_aquisicao || 'Não especificado',
          numero_licitacao: numero_licitacao || null,
          ano_licitacao: ano_licitacao ? parseInt(ano_licitacao) : null,
          setor_responsavel: setor_responsavel || 'Não especificado',
          local_objeto: local_objeto || 'Não especificado',
          status: status || 'ativo',
          situacao_bem,
          observacoes,
          fotos: Array.isArray(fotos) ? fotos.map(foto => typeof foto === 'string' ? foto : foto.file_url || foto.fileName || String(foto)) : [],
          documentos: Array.isArray(documentos) ? documentos.map(doc => typeof doc === 'string' ? doc : doc.file_url || doc.fileName || String(doc)) : [],
          metodo_depreciacao: metodo_depreciacao || 'Linear',
          vida_util_anos: vida_util_anos ? parseInt(vida_util_anos) : null,
          valor_residual: valor_residual ? parseFloat(valor_residual) : null,
          municipalityId: req.user!.municipalityId,
          sectorId,
          localId: localId || null,
          tipoId: tipoId || null,
          acquisitionFormId: acquisitionFormId || null,
          createdBy: req.user!.userId,
          updatedBy: req.user!.userId,
        },
        include: {
          sector: { select: { id: true, name: true } },
          local: { select: { id: true, name: true } },
          tipoBem: { select: { id: true, nome: true } },
        },
      });

      // 2. Criar entrada no histórico (apenas se patrimônio criar com sucesso)
      await tx.historicoEntry.create({
        data: {
          patrimonioId: novoPatrimonio.id,
          date: new Date(),
          action: 'CADASTRO',
          details: `Patrimônio cadastrado por ${req.user!.userId}`,
          user: req.user!.userId,
        },
      });

      // 3. Log de atividade
      await tx.activityLog.create({
        data: {
          userId: req.user!.userId,
          action: 'CREATE_PATRIMONIO',
          entityType: 'PATRIMONIO',
          entityId: novoPatrimonio.id,
          details: `Criado patrimônio ${numero_patrimonio}`,
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });

      return novoPatrimonio;
    });

    // ✅ CACHE: Invalidar cache de patrimônios após criação
    await CacheUtils.invalidatePatrimonios();
    await redisCache.delete(`patrimonio:${patrimonio.id}`);
    logDebug('✅ Cache de patrimônios invalidado após criação');

    res.status(201).json({ message: 'Patrimônio criado com sucesso', patrimonio });
  } catch (error) {
    logError('[CREATE PATRIMONIO] Erro completo', error, {
      numero_patrimonio: req.body.numero_patrimonio,
      userId: req.user?.userId
    });
    res.status(500).json({ 
      error: 'Erro ao criar patrimônio',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Atualizar patrimônio
 * PUT /api/patrimonios/:id
 */
export const updatePatrimonio = async (req: Request, res: Response): Promise<void> => {
  try {
    logDebug('🚀 [UPDATE PATRIMONIO] INICIANDO - Versão com filtro de objetos Date');
    
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    // ✅ DEBUG: Log dos dados recebidos
    logDebug('Dados recebidos para atualização', { updateData, patrimonioId: id });

    // Verificar se existe
    const existing = await prisma.patrimonio.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    // ✅ DEBUG: Log das informações de acesso
    logDebug('🔍 Verificação de acesso', {
      userRole: req.user.role,
      userId: req.user.userId,
      patrimonioSectorId: existing.sectorId,
      patrimonioMunicipalityId: existing.municipalityId,
      userMunicipalityId: req.user.municipalityId
    });

    // Verificar acesso - admin e superuser têm acesso total, supervisor e usuario precisam de verificação de setor
    if (req.user.role === 'supervisor' || req.user.role === 'usuario') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { responsibleSectors: true },
      });

      // Buscar o setor do patrimônio para obter o nome
      const patrimonioSector = await prisma.sector.findUnique({
        where: { id: existing.sectorId },
        select: { name: true },
      });

      logDebug('🔍 Setores responsáveis do usuário', { responsibleSectors: user?.responsibleSectors });
      logDebug('🔍 Nome do setor do patrimônio', { sectorName: patrimonioSector?.name });

      // ✅ CORREÇÃO: Comparar nomes dos setores, não IDs
      // Se responsibleSectors está vazio, usuário tem acesso a todos os setores
      if (user && patrimonioSector && user.responsibleSectors.length > 0 && !user.responsibleSectors.includes(patrimonioSector.name)) {
        logDebug('❌ Acesso negado: usuário não tem permissão para este setor');
        res.status(403).json({ 
          error: 'Acesso negado',
          details: `Usuário não tem permissão para editar patrimônios do setor ${patrimonioSector.name}`,
          userSectors: user.responsibleSectors,
          patrimonioSector: patrimonioSector.name
        });
        return;
      } else if (user && user.responsibleSectors.length === 0) {
        logDebug('✅ Supervisor com acesso total (responsibleSectors vazio)');
      }
    }

    // Preparar dados para atualização - filtrar campos undefined/null
    const dataToUpdate: any = {
      updatedBy: req.user.userId,
    };

    // Campos que não podem ser atualizados
    const readonlyFields = [
      'id', 'createdAt', 'createdBy', 'updatedAt',
      'sector', 'local', 'tipoBem', 'municipality', 'acquisitionForm',
      'creator', 'historico', 'notes', 'notas', 'transferencias', 'emprestimos',
      'subPatrimonios', 'inventoryItems', 'manutencoes', 'documentosFiles'
    ];

    // Filtrar apenas campos válidos e que podem ser atualizados
    Object.keys(updateData).forEach(key => {
      const value = updateData[key];
      
      // Verificar se é um campo readonly
      if (readonlyFields.includes(key)) {
        logDebug(`❌ Campo readonly excluído: ${key}`);
        return;
      }
      
      // Verificar se é um objeto (relacionamento) - mas permitir Date
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
        logDebug(`❌ Objeto excluído: ${key}`, { value });
        return;
      }
      
      // Verificar se é válido
      if (value !== undefined && value !== null && value !== '') {
        dataToUpdate[key] = value;
        logDebug(`✅ Campo incluído: ${key}`, { value });
      } else {
        logDebug(`❌ Campo vazio excluído: ${key}`, { value });
      }
    });

    // Converter datas se necessário
    if (dataToUpdate.data_aquisicao) {
      dataToUpdate.data_aquisicao = new Date(dataToUpdate.data_aquisicao);
    }
    if (dataToUpdate.data_baixa) {
      dataToUpdate.data_baixa = new Date(dataToUpdate.data_baixa);
    }

    // ✅ CORREÇÃO: Converter valores numéricos (incluindo 0)
    if (dataToUpdate.valor_aquisicao !== undefined && dataToUpdate.valor_aquisicao !== null) {
      dataToUpdate.valor_aquisicao = parseFloat(dataToUpdate.valor_aquisicao);
    }
    if (dataToUpdate.quantidade !== undefined && dataToUpdate.quantidade !== null) {
      dataToUpdate.quantidade = parseInt(dataToUpdate.quantidade);
    }
    if (dataToUpdate.vida_util_anos !== undefined && dataToUpdate.vida_util_anos !== null) {
      dataToUpdate.vida_util_anos = parseInt(dataToUpdate.vida_util_anos);
    }
    if (dataToUpdate.valor_residual !== undefined && dataToUpdate.valor_residual !== null) {
      dataToUpdate.valor_residual = parseFloat(dataToUpdate.valor_residual);
    }
    if (dataToUpdate.ano_licitacao !== undefined && dataToUpdate.ano_licitacao !== null) {
      dataToUpdate.ano_licitacao = parseInt(dataToUpdate.ano_licitacao);
    }

    // Atualizar usando transaction para garantir consistência
    logDebug('🔍 Dados que serão enviados para atualização', { dataToUpdate });
    
    const patrimonio = await prisma.$transaction(async (tx) => {
      // Atualizar patrimônio
      const updatedPatrimonio = await tx.patrimonio.update({
        where: { id },
        data: dataToUpdate,
        include: {
          sector: { select: { id: true, name: true } },
          local: { select: { id: true, name: true } },
          tipoBem: { select: { id: true, nome: true } },
        },
      });

      // Criar entrada no histórico
      try {
        if (req.user) {
          await tx.historicoEntry.create({
            data: {
              patrimonioId: updatedPatrimonio.id,
              date: new Date(),
              action: 'ATUALIZAÇÃO',
              details: `Patrimônio atualizado por ${req.user.userId}`,
              user: req.user.userId,
            },
          });
        }
        logDebug('✅ Histórico criado com sucesso');
      } catch (histError) {
        logError('❌ Erro ao criar histórico', histError);
        // Não falhar a operação por causa do histórico
      }

      // Log de atividade
      try {
        if (req.user) {
          await tx.activityLog.create({
            data: {
              userId: req.user.userId,
              action: 'UPDATE_PATRIMONIO',
              entityType: 'PATRIMONIO',
              entityId: updatedPatrimonio.id,
              details: `Atualizado patrimônio ${updatedPatrimonio.numero_patrimonio}`,
              ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
              userAgent: req.get('user-agent') || 'unknown',
            },
          });
          logDebug('✅ Log de atividade criado com sucesso');
        }
      } catch (logError) {
        logError('❌ Erro ao criar log de atividade', logError);
        // Não falhar a operação por causa do log
      }

      return updatedPatrimonio;
    });
    
    logInfo('✅ Patrimônio atualizado com sucesso', { patrimonioId: patrimonio.id });

    // ✅ CACHE: Invalidar cache de patrimônios após atualização
    await CacheUtils.invalidatePatrimonios();
    await redisCache.delete(`patrimonio:${patrimonio.id}`);
    logDebug('✅ Cache de patrimônios invalidado após atualização');

    res.json({ message: 'Patrimônio atualizado com sucesso', patrimonio });
  } catch (error) {
    logError('❌ ERRO COMPLETO ao atualizar patrimônio', error, {
      patrimonioId: req.params.id,
      userId: req.user?.userId,
      body: req.body
    });
    
    res.status(500).json({ 
      error: 'Erro ao atualizar patrimônio',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Deletar patrimônio
 * DELETE /api/patrimonios/:id
 */
export const deletePatrimonio = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;

    // Verificar se existe
    const existing = await prisma.patrimonio.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    // Apenas superuser e supervisor podem deletar
    if (req.user.role !== 'superuser' && req.user.role !== 'supervisor') {
      res.status(403).json({ error: 'Acesso negado: apenas superuser/supervisor podem deletar' });
      return;
    }

    // Deletar (cascade vai remover histórico e notas)
    await prisma.patrimonio.delete({
      where: { id },
    });

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId: req.user.userId,
        action: 'DELETE_PATRIMONIO',
        entityType: 'PATRIMONIO',
        entityId: id,
        details: `Deletado patrimônio ${existing.numero_patrimonio}`,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    // ✅ CACHE: Invalidar cache de patrimônios após deleção
    await CacheUtils.invalidatePatrimonios();
    await redisCache.delete(`patrimonio:${id}`);
    logDebug('✅ Cache de patrimônios invalidado após deleção');

    res.json({ message: 'Patrimônio deletado com sucesso' });
  } catch (error) {
    logError('Erro ao deletar patrimônio', error, { patrimonioId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao deletar patrimônio' });
  }
};

/**
 * Adicionar observação ao patrimônio
 * POST /api/patrimonios/:id/notes
 */
export const addNote = async (req: Request, res: Response): Promise<void> => {
  try {
    logDebug('🔍 addNote - Iniciando processo', {
      userId: req.user?.userId,
      patrimonioId: req.params.id,
      textLength: req.body.text?.length
    });

    if (!req.user) {
      logDebug('❌ addNote - Usuário não autenticado');
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;
    const { text } = req.body;

    logDebug('🔍 addNote - Dados recebidos', { id, textLength: text?.length });

    if (!text || text.trim().length === 0) {
      logWarn('❌ addNote - Texto vazio ou inválido');
      res.status(400).json({ error: 'Texto da observação é obrigatório' });
      return;
    }

    // Verificar se patrimônio existe
    logDebug('🔍 addNote - Verificando se patrimônio existe', { id });
    const patrimonio = await prisma.patrimonio.findUnique({
      where: { id },
      select: { id: true, numero_patrimonio: true, descricao_bem: true }
    });

    if (!patrimonio) {
      logWarn('❌ addNote - Patrimônio não encontrado', { id });
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    logDebug('✅ addNote - Patrimônio encontrado', {
      id: patrimonio.id,
      numero: patrimonio.numero_patrimonio
    });

    // Buscar nome do usuário
    logDebug('🔍 addNote - Buscando dados do usuário', { userId: req.user.userId });
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      logError('❌ addNote - Usuário não encontrado no banco', undefined, { userId: req.user.userId });
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    logDebug('✅ addNote - Usuário encontrado', {
      id: user.id,
      name: user.name
    });

    // Criar observação
    logDebug('🔍 addNote - Criando nota no banco', {
      textLength: text.trim().length,
      patrimonioId: id,
      userId: req.user.userId
    });

    const note = await prisma.note.create({
      data: {
        text: text.trim(),
        patrimonioId: id,
        userId: req.user.userId,
        userName: user.name,
      },
    });

    logInfo('✅ addNote - Nota criada com sucesso', {
      noteId: note.id,
      patrimonioId: id
    });

    res.status(201).json({ 
      message: 'Observação adicionada com sucesso', 
      note: {
        id: note.id,
        text: note.text,
        date: note.date,
        userId: note.userId,
        userName: note.userName
      }
    });
  } catch (error) {
    logError('❌ addNote - Erro ao adicionar observação', error, {
      patrimonioId: req.params.id,
      userId: req.user?.userId
    });
    res.status(500).json({ 
      error: 'Erro ao adicionar observação',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Registrar baixa de patrimônio
 * POST /api/patrimonios/:id/baixa
 */
export const registrarBaixaPatrimonio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { data_baixa, motivo_baixa, documentos_baixa, observacoes } = req.body;

    logInfo('📝 Registrando baixa de patrimônio', { id, data_baixa, motivo_baixaLength: motivo_baixa?.length });

    // Validações
    if (!data_baixa || !motivo_baixa) {
      res.status(400).json({ error: 'Data e motivo da baixa são obrigatórios' });
      return;
    }

    // Verificar se patrimônio existe
    const patrimonio = await prisma.patrimonio.findUnique({
      where: { id },
      include: {
        sector: { select: { name: true } },
      },
    });

    if (!patrimonio) {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    // Verificar se já está baixado
    if (patrimonio.status === 'baixado') {
      res.status(400).json({ error: 'Patrimônio já está baixado' });
      return;
    }

    // Verificar permissões de acesso
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    if (userRole === 'supervisor' || userRole === 'usuario') {
      // Buscar setores responsáveis do usuário
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { responsibleSectors: true },
      });

      const patrimonioSector = await prisma.sector.findUnique({
        where: { id: patrimonio.sectorId },
        select: { name: true },
      });

      // ✅ CORREÇÃO: Se responsibleSectors está vazio, usuário tem acesso a todos os setores
      if (user && patrimonioSector && user.responsibleSectors.length > 0 && !user.responsibleSectors.includes(patrimonioSector.name)) {
        res.status(403).json({ error: 'Acesso negado: sem permissão para este setor' });
        return;
      }
    }

    // Atualizar patrimônio com dados da baixa usando transaction
    const patrimonioAtualizado = await prisma.$transaction(async (tx) => {
      // Atualizar patrimônio
      const updated = await tx.patrimonio.update({
        where: { id },
        data: {
          status: 'baixado',
          situacao_bem: 'baixado',
          data_baixa: new Date(data_baixa),
          motivo_baixa,
          documentos_baixa: documentos_baixa || [],
          updatedBy: userId,
          updatedAt: new Date(),
        },
        include: {
          sector: { select: { id: true, name: true, codigo: true } },
          local: { select: { id: true, name: true, description: true } },
          tipoBem: { select: { id: true, nome: true, descricao: true } },
          acquisitionForm: { select: { id: true, nome: true } },
        },
      });

      // Registrar no histórico
      try {
        await tx.historicoEntry.create({
          data: {
            patrimonioId: id,
            action: 'BAIXA',
            details: `Baixa registrada: ${motivo_baixa}${observacoes ? ` - ${observacoes}` : ''}`,
            user: req.user?.name || 'Sistema',
            date: new Date(),
          },
        });
      } catch (histError) {
        logError('⚠️ Erro ao criar histórico', histError);
      }

      // Registrar log de atividade
      try {
        await tx.activityLog.create({
          data: {
            userId: userId!,
            action: 'BAIXA_PATRIMONIO',
            entityType: 'Patrimonio',
            entityId: id,
            details: `Baixa do patrimônio ${patrimonio.numero_patrimonio}: ${motivo_baixa}`,
          },
        });
      } catch (logError) {
        logError('⚠️ Erro ao criar log de atividade', logError);
      }

      return updated;
    });

    logInfo('✅ Baixa registrada com sucesso', { numeroPatrimonio: patrimonioAtualizado.numero_patrimonio });

    // ✅ CACHE: Invalidar cache de patrimônios após baixa
    await CacheUtils.invalidatePatrimonios();
    await redisCache.delete(`patrimonio:${id}`);
    logDebug('✅ Cache de patrimônios invalidado após baixa');

    res.status(200).json({
      message: 'Baixa registrada com sucesso',
      patrimonio: patrimonioAtualizado,
    });
  } catch (error) {
    const { id } = req.params;
    logError('❌ Erro ao registrar baixa', error, { patrimonioId: id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao registrar baixa do patrimônio' });
  }
};

