import { Request, Response } from 'express';
import { prisma } from '../index';
import { AppError } from '../middlewares/errorHandler';
import { 
  QueryOptimizer, 
  executeOptimizedQuery, 
  queryCache 
} from '../config/database-optimization';
import { redisCache, CacheUtils } from '../config/redis';

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
    console.error('Erro ao listar patrimônios públicos:', error);
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
      },
    });

    if (!patrimonio) {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    res.json({ patrimonio });
  } catch (error) {
    console.error('Erro ao buscar patrimônio público:', error);
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
      sectorId,
      tipo,
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
      ['numero_patrimonio', 'descricao_bem', 'marca', 'modelo']
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

    // Filtro de setor
    if (sectorId) {
      where.sectorId = sectorId;
    }

    // Filtro de tipo
    if (tipo) {
      where.tipo = tipo;
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
    
    const { patrimonios, total } = result;

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
    console.error('[DEV] ❌ Erro ao listar patrimônios:', error);
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

    const patrimonio = await prisma.patrimonio.findUnique({
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
        subPatrimonios: true,
      },
    });

    if (!patrimonio) {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    // ✅ DEBUG: Log de verificação de acesso
    console.log('Verificando acesso para patrimônio:', {
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

      console.log('🔍 DEBUG - Verificação de acesso detalhada:', {
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
        console.log('Acesso negado - setor não permitido');
        res.status(403).json({ error: 'Acesso negado: sem permissão para este setor' });
        return;
      }
    }

    // ✅ DEBUG: Log de sucesso
    console.log('Acesso permitido para patrimônio:', patrimonio.id);

    res.json({ patrimonio });
  } catch (error) {
    console.error('Erro ao buscar patrimônio:', error);
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
    console.error('Erro ao buscar patrimônio por número:', error);
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
    console.error('Erro ao gerar número patrimonial:', error)
    
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
    console.log('[CREATE PATRIMONIO] Request body:', JSON.stringify(req.body, null, 2));

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
      console.log('[CREATE PATRIMONIO] Validação falhou:', {
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

    res.status(201).json({ message: 'Patrimônio criado com sucesso', patrimonio });
  } catch (error) {
    console.error('[CREATE PATRIMONIO] Erro completo:', error);
    console.error('[CREATE PATRIMONIO] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.error('[CREATE PATRIMONIO] Mensagem:', error instanceof Error ? error.message : String(error));
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
    console.log('🚀 [UPDATE PATRIMONIO] INICIANDO - Versão com filtro de objetos Date');
    
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    // ✅ DEBUG: Log dos dados recebidos
    console.log('Dados recebidos para atualização:', JSON.stringify(updateData, null, 2));
    console.log('ID do patrimônio:', id);

    // Verificar se existe
    const existing = await prisma.patrimonio.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    // ✅ DEBUG: Log das informações de acesso
    console.log('🔍 DEBUG - Verificação de acesso:', {
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

      console.log('🔍 DEBUG - Setores responsáveis do usuário:', user?.responsibleSectors);
      console.log('🔍 DEBUG - Nome do setor do patrimônio:', patrimonioSector?.name);

      // ✅ CORREÇÃO: Comparar nomes dos setores, não IDs
      // Se responsibleSectors está vazio, usuário tem acesso a todos os setores
      if (user && patrimonioSector && user.responsibleSectors.length > 0 && !user.responsibleSectors.includes(patrimonioSector.name)) {
        console.log('❌ DEBUG - Acesso negado: usuário não tem permissão para este setor');
        res.status(403).json({ 
          error: 'Acesso negado',
          details: `Usuário não tem permissão para editar patrimônios do setor ${patrimonioSector.name}`,
          userSectors: user.responsibleSectors,
          patrimonioSector: patrimonioSector.name
        });
        return;
      } else if (user && user.responsibleSectors.length === 0) {
        console.log('✅ DEBUG - Supervisor com acesso total (responsibleSectors vazio)');
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
        console.log(`❌ Campo readonly excluído: ${key}`);
        return;
      }
      
      // Verificar se é um objeto (relacionamento) - mas permitir Date
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
        console.log(`❌ Objeto excluído: ${key} = ${JSON.stringify(value)}`);
        return;
      }
      
      // Verificar se é válido
      if (value !== undefined && value !== null && value !== '') {
        dataToUpdate[key] = value;
        console.log(`✅ Campo incluído: ${key} = ${typeof value === 'object' ? JSON.stringify(value) : value}`);
      } else {
        console.log(`❌ Campo vazio excluído: ${key} = ${value}`);
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

    // Atualizar
    console.log('🔍 DEBUG - Dados que serão enviados para atualização:', JSON.stringify(dataToUpdate, null, 2));
    
    const patrimonio = await prisma.patrimonio.update({
      where: { id },
      data: dataToUpdate,
      include: {
        sector: { select: { id: true, name: true } },
        local: { select: { id: true, name: true } },
        tipoBem: { select: { id: true, nome: true } },
      },
    });
    
    console.log('✅ Patrimônio atualizado com sucesso:', patrimonio.id);

    // Criar entrada no histórico
    try {
      await prisma.historicoEntry.create({
        data: {
          patrimonioId: patrimonio.id,
          date: new Date(),
          action: 'ATUALIZAÇÃO',
          details: `Patrimônio atualizado por ${req.user.userId}`,
          user: req.user.userId,
        },
      });
      console.log('✅ Histórico criado com sucesso');
    } catch (histError) {
      console.error('❌ Erro ao criar histórico:', histError);
      // Não falhar a operação por causa do histórico
    }

    // Log de atividade
    try {
      await prisma.activityLog.create({
        data: {
          userId: req.user.userId,
          action: 'UPDATE_PATRIMONIO',
          entityType: 'PATRIMONIO',
          entityId: patrimonio.id,
          details: `Atualizado patrimônio ${patrimonio.numero_patrimonio}`,
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });
      console.log('✅ Log de atividade criado com sucesso');
    } catch (logError) {
      console.error('❌ Erro ao criar log de atividade:', logError);
      // Não falhar a operação por causa do log
    }

    res.json({ message: 'Patrimônio atualizado com sucesso', patrimonio });
  } catch (error) {
    console.error('❌ ERRO COMPLETO ao atualizar patrimônio:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.error('❌ Mensagem:', error instanceof Error ? error.message : String(error));
    console.error('❌ Dados recebidos:', JSON.stringify(req.body, null, 2));
    console.error('❌ ID do patrimônio:', req.params.id);
    console.error('❌ Usuário:', req.user);
    
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

    res.json({ message: 'Patrimônio deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar patrimônio:', error);
    res.status(500).json({ error: 'Erro ao deletar patrimônio' });
  }
};

/**
 * Adicionar observação ao patrimônio
 * POST /api/patrimonios/:id/notes
 */
export const addNote = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 [DEBUG] addNote - Iniciando processo:', {
      userId: req.user?.userId,
      patrimonioId: req.params.id,
      text: req.body.text
    });

    if (!req.user) {
      console.log('❌ [DEBUG] addNote - Usuário não autenticado');
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;
    const { text } = req.body;

    console.log('🔍 [DEBUG] addNote - Dados recebidos:', { id, text });

    if (!text || text.trim().length === 0) {
      console.log('❌ [DEBUG] addNote - Texto vazio ou inválido');
      res.status(400).json({ error: 'Texto da observação é obrigatório' });
      return;
    }

    // Verificar se patrimônio existe
    console.log('🔍 [DEBUG] addNote - Verificando se patrimônio existe:', id);
    const patrimonio = await prisma.patrimonio.findUnique({
      where: { id },
      select: { id: true, numero_patrimonio: true, descricao_bem: true }
    });

    if (!patrimonio) {
      console.log('❌ [DEBUG] addNote - Patrimônio não encontrado:', id);
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    console.log('✅ [DEBUG] addNote - Patrimônio encontrado:', {
      id: patrimonio.id,
      numero: patrimonio.numero_patrimonio,
      descricao: patrimonio.descricao_bem
    });

    // Buscar nome do usuário
    console.log('🔍 [DEBUG] addNote - Buscando dados do usuário:', req.user.userId);
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      console.log('❌ [DEBUG] addNote - Usuário não encontrado no banco:', req.user.userId);
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    console.log('✅ [DEBUG] addNote - Usuário encontrado:', {
      id: user.id,
      name: user.name,
      email: user.email
    });

    // Criar observação
    console.log('🔍 [DEBUG] addNote - Criando nota no banco:', {
      text: text.trim(),
      patrimonioId: id,
      userId: req.user.userId,
      userName: user.name
    });

    const note = await prisma.note.create({
      data: {
        text: text.trim(),
        patrimonioId: id,
        userId: req.user.userId,
        userName: user.name,
      },
    });

    console.log('✅ [DEBUG] addNote - Nota criada com sucesso:', {
      id: note.id,
      text: note.text,
      date: note.date,
      userId: note.userId,
      userName: note.userName
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
    console.error('❌ [ERROR] addNote - Erro ao adicionar observação:', error);
    console.error('❌ [ERROR] addNote - Stack trace:', error instanceof Error ? error.stack : 'N/A');
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

    console.log('📝 Registrando baixa de patrimônio:', { id, data_baixa, motivo_baixa });

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

    // Atualizar patrimônio com dados da baixa
    const patrimonioAtualizado = await prisma.patrimonio.update({
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
      await prisma.historicoEntry.create({
        data: {
          patrimonioId: id,
          action: 'BAIXA',
          details: `Baixa registrada: ${motivo_baixa}${observacoes ? ` - ${observacoes}` : ''}`,
          user: req.user?.name || 'Sistema',
          date: new Date(),
        },
      });
    } catch (histError) {
      console.error('⚠️ Erro ao criar histórico:', histError);
    }

    // Registrar log de atividade
    try {
      await prisma.activityLog.create({
        data: {
          userId: userId!,
          action: 'BAIXA_PATRIMONIO',
          entityType: 'Patrimonio',
          entityId: id,
          details: `Baixa do patrimônio ${patrimonio.numero_patrimonio}: ${motivo_baixa}`,
        },
      });
    } catch (logError) {
      console.error('⚠️ Erro ao criar log de atividade:', logError);
    }

    console.log('✅ Baixa registrada com sucesso:', patrimonioAtualizado.numero_patrimonio);

    res.status(200).json({
      message: 'Baixa registrada com sucesso',
      patrimonio: patrimonioAtualizado,
    });
  } catch (error) {
    console.error('❌ Erro ao registrar baixa:', error);
    res.status(500).json({ error: 'Erro ao registrar baixa do patrimônio' });
  }
};

