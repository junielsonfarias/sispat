/**
 * imovelService — regras de negócio de Imóvel.
 *
 * Mesmo padrão de `patrimonioService.ts`: funções recebem `Actor` + dados
 * puros e usam erros tipados para que o controller possa mapear status HTTP
 * de forma consistente. Tenant isolation via municipalityId.
 */

import { TipoPosse } from '@prisma/client';
import { prisma } from '../config/database';
import { redisCache, CacheUtils } from '../config/redis';
import { logDebug, logError, logInfo, logWarn } from '../config/logger';
import { sanitizeIncomingUrls, sanitizeSingleUrl, normalizeOnRead } from '../utils/photo-urls';

// Posse (Art. 13 §3): imóveis em cessão/comodato não integram o ativo do
// município (excluídos da conciliação). Valor inválido cai no padrão 'proprio'.
const VALID_POSSE = new Set<string>(['proprio', 'cessao', 'comodato']);
const parsePosse = (value: unknown): TipoPosse =>
  typeof value === 'string' && VALID_POSSE.has(value) ? (value as TipoPosse) : TipoPosse.proprio;

export interface Actor {
  userId: string;
  role: string;
  municipalityId: string;
  email: string;
}

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface ListImoveisQuery {
  search?: string;
  sectorId?: string;
  page?: string;
  limit?: string;
}

// ===========================================================================
// Erros tipados — controller mapeia para status HTTP
// ===========================================================================

export class ImovelNotFoundError extends Error {
  constructor(message = 'Imóvel não encontrado') {
    super(message);
    this.name = 'ImovelNotFoundError';
  }
}

export class ImovelConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImovelConflictError';
  }
}

export class ImovelForbiddenError extends Error {
  constructor(message = 'Acesso negado') {
    super(message);
    this.name = 'ImovelForbiddenError';
  }
}

export class ImovelValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImovelValidationError';
  }
}

// ===========================================================================
// Permissões: superuser/admin têm acesso total; supervisor/usuario só veem
// imóveis dos setores em `responsibleSectors` (vazio = todos do município).
// ===========================================================================

const hasFullAccess = (role: string): boolean => role === 'superuser' || role === 'admin';

const ensureSectorAccess = async (
  actor: Actor,
  sectorId: string,
): Promise<{ allowed: boolean; sectorName?: string }> => {
  if (hasFullAccess(actor.role)) return { allowed: true };

  const [user, sector] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actor.userId },
      select: { responsibleSectors: true },
    }),
    prisma.sector.findUnique({
      where: { id: sectorId },
      select: { name: true },
    }),
  ]);

  if (!user || !sector) return { allowed: false };
  if (user.responsibleSectors.length === 0) return { allowed: true };
  return {
    allowed: user.responsibleSectors.includes(sector.name),
    sectorName: sector.name,
  };
};

// ===========================================================================
// Listagem
// ===========================================================================

export const listImoveis = async (query: ListImoveisQuery, actor: Actor) => {
  const pageNum = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(query.limit ?? '50', 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {
    municipalityId: actor.municipalityId,
  };

  if (query.search) {
    where.OR = [
      { numero_patrimonio: { contains: query.search, mode: 'insensitive' } },
      { denominacao: { contains: query.search, mode: 'insensitive' } },
      { endereco: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.sectorId) where.sectorId = query.sectorId;

  // Permissão por setor: apenas usuario/visualizador são limitados por responsibleSectors
  if (actor.role === 'usuario' || actor.role === 'visualizador') {
    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { responsibleSectors: true },
    });
    if (user && user.responsibleSectors.length > 0) {
      const sectors = await prisma.sector.findMany({
        where: { name: { in: user.responsibleSectors }, municipalityId: actor.municipalityId },
        select: { id: true },
      });
      const sectorIds = sectors.map((s) => s.id);
      if (sectorIds.length > 0) where.sectorId = { in: sectorIds };
    }
  }

  const cacheKey = CacheUtils.getImoveisKey({ where, page: pageNum, limit: limitNum });
  let result = await redisCache.get<{ imoveis: any[]; total: number }>(cacheKey);

  if (!result) {
    const [imoveis, total] = await Promise.all([
      prisma.imovel.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          sector: { select: { id: true, name: true, codigo: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.imovel.count({ where }),
    ]);

    result = { imoveis, total };
    await redisCache.set(cacheKey, result, 300);
    logDebug('✅ Cache de imóveis criado', { page: pageNum, limit: limitNum });
  } else {
    logDebug('✅ Cache hit: imóveis', { page: pageNum, limit: limitNum });
  }

  return {
    imoveis: result.imoveis.map((i) => normalizeOnRead(i as any)),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      pages: Math.ceil(result.total / limitNum),
    },
  };
};

// ===========================================================================
// Leitura por ID e por número
// ===========================================================================

export const getImovelById = async (id: string, actor: Actor) => {
  const imovel = await prisma.imovel.findUnique({
    where: { id },
    include: {
      municipality: { select: { id: true, name: true, state: true } },
      sector: { select: { id: true, name: true, codigo: true } },
      creator: { select: { id: true, name: true, email: true } },
      historico: { orderBy: { date: 'desc' }, take: 50 },
      manutencoes: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!imovel) throw new ImovelNotFoundError();

  // Tenant: 404 (não vaza existência cross-tenant)
  if (actor.role !== 'superuser' && imovel.municipalityId !== actor.municipalityId) {
    throw new ImovelNotFoundError();
  }

  // Permissão por setor
  if (actor.role === 'supervisor' || actor.role === 'usuario') {
    const { allowed } = await ensureSectorAccess(actor, imovel.sectorId);
    if (!allowed) throw new ImovelForbiddenError('Sem permissão para este setor');
  }

  return normalizeOnRead(imovel as any);
};

export const getImovelByNumero = async (numero: string, actor: Actor) => {
  const imovel = await prisma.imovel.findFirst({
    where: {
      numero_patrimonio: numero,
      ...(actor.role === 'superuser' ? {} : { municipalityId: actor.municipalityId }),
    },
    include: {
      sector: { select: { id: true, name: true, codigo: true } },
      historico: { orderBy: { date: 'desc' }, take: 10 },
    },
  });

  if (!imovel) throw new ImovelNotFoundError();

  if (actor.role !== 'superuser' && imovel.municipalityId !== actor.municipalityId) {
    throw new ImovelNotFoundError();
  }

  return normalizeOnRead(imovel as any);
};

// ===========================================================================
// Criação
// ===========================================================================

export interface CreateImovelInput {
  numero_patrimonio: string;
  denominacao: string;
  endereco: string;
  setor?: string;
  sectorId?: string;
  data_aquisicao: string | Date;
  valor_aquisicao: number | string;
  area_terreno?: number | string;
  area_construida?: number | string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  descricao?: string;
  observacoes?: string;
  tipo_imovel?: string;
  situacao?: string;
  tipo_posse?: string;
  fotos?: unknown;
  documentos?: unknown;
  url_documentos?: string;
  customFields?: Record<string, unknown>;
}

export const createImovel = async (
  input: CreateImovelInput,
  actor: Actor,
  audit: AuditContext = {},
) => {
  if (
    !input.numero_patrimonio ||
    !input.denominacao ||
    !input.endereco ||
    !input.data_aquisicao ||
    input.valor_aquisicao === undefined ||
    input.valor_aquisicao === null
  ) {
    throw new ImovelValidationError('Campos obrigatórios faltando');
  }

  // Número único POR MUNICÍPIO
  const existing = await prisma.imovel.findFirst({
    where: {
      municipalityId: actor.municipalityId,
      numero_patrimonio: input.numero_patrimonio,
    },
  });
  if (existing) {
    throw new ImovelConflictError('Número de patrimônio já existe');
  }

  // Resolução de sectorId: usa o explícito; senão busca pelo nome (mesmo município)
  let finalSectorId = input.sectorId;
  if (!finalSectorId && input.setor) {
    const sector = await prisma.sector.findFirst({
      where: { name: input.setor, municipalityId: actor.municipalityId },
      select: { id: true },
    });
    finalSectorId = sector?.id;
  }
  if (!finalSectorId) {
    throw new ImovelValidationError('Setor não encontrado ou não especificado');
  }

  const processedFotos = sanitizeIncomingUrls(input.fotos);
  const processedDocumentos = sanitizeIncomingUrls(input.documentos);

  const imovel = await prisma.$transaction(async (tx) => {
    const created = await tx.imovel.create({
      data: {
        numero_patrimonio: input.numero_patrimonio,
        denominacao: input.denominacao,
        endereco: input.endereco,
        setor: input.setor || 'Não especificado',
        data_aquisicao: new Date(input.data_aquisicao),
        valor_aquisicao: parseFloat(String(input.valor_aquisicao)),
        area_terreno: input.area_terreno ? parseFloat(String(input.area_terreno)) : 0,
        area_construida: input.area_construida ? parseFloat(String(input.area_construida)) : 0,
        latitude:
          input.latitude !== undefined && input.latitude !== null && input.latitude !== ''
            ? parseFloat(String(input.latitude))
            : null,
        longitude:
          input.longitude !== undefined && input.longitude !== null && input.longitude !== ''
            ? parseFloat(String(input.longitude))
            : null,
        descricao: input.descricao,
        observacoes: input.observacoes,
        tipo_imovel: input.tipo_imovel,
        situacao: input.situacao,
        tipo_posse: parsePosse(input.tipo_posse),
        fotos: processedFotos,
        documentos: processedDocumentos,
        url_documentos: sanitizeSingleUrl(input.url_documentos),
        customFields:
          input.customFields && typeof input.customFields === 'object'
            ? (input.customFields as any)
            : undefined,
        municipalityId: actor.municipalityId,
        sectorId: finalSectorId!,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
      include: {
        sector: { select: { id: true, name: true } },
      },
    });

    await tx.historicoEntry.create({
      data: {
        imovelId: created.id,
        date: new Date(),
        action: 'CADASTRO',
        details: `Imóvel cadastrado por ${actor.userId}`,
        user: actor.userId,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.userId,
        action: 'CREATE_IMOVEL',
        entityType: 'IMOVEL',
        entityId: created.id,
        details: `Criado imóvel ${input.numero_patrimonio}`,
        ipAddress: audit.ipAddress || 'unknown',
        userAgent: audit.userAgent || 'unknown',
      },
    });

    return created;
  });

  await CacheUtils.invalidateImoveis();
  logInfo('✅ Imóvel criado', { id: imovel.id, numero: input.numero_patrimonio });
  return normalizeOnRead(imovel as any);
};

// ===========================================================================
// Atualização
// ===========================================================================

const UPDATABLE_FIELDS = [
  'denominacao',
  'endereco',
  'setor',
  'descricao',
  'observacoes',
  'tipo_imovel',
  'situacao',
  'tipo_posse',
  'fotos',
  'documentos',
  'url_documentos',
  'sectorId',
  'customFields',
] as const;

export const updateImovel = async (
  id: string,
  raw: Record<string, unknown>,
  actor: Actor,
  audit: AuditContext = {},
) => {
  const existing = await prisma.imovel.findUnique({ where: { id } });
  if (!existing) throw new ImovelNotFoundError();

  if (actor.role !== 'superuser' && existing.municipalityId !== actor.municipalityId) {
    // Mascara como 404 para não vazar existência cross-tenant
    throw new ImovelNotFoundError();
  }

  // Permissão por setor (apenas supervisor/usuario)
  if (actor.role === 'supervisor' || actor.role === 'usuario') {
    const { allowed, sectorName } = await ensureSectorAccess(actor, existing.sectorId);
    if (!allowed) {
      throw new ImovelForbiddenError(
        sectorName ? `Sem permissão para o setor ${sectorName}` : 'Acesso negado',
      );
    }
  }

  // Whitelist (evita mass-assignment de id/createdBy/etc)
  const dataToUpdate: Record<string, unknown> = { updatedBy: actor.userId };
  for (const field of UPDATABLE_FIELDS) {
    if (raw[field] !== undefined) {
      dataToUpdate[field] = raw[field];
    }
  }

  // Sanitiza fotos/documentos antes do Prisma
  if (dataToUpdate.fotos !== undefined) {
    dataToUpdate.fotos = sanitizeIncomingUrls(dataToUpdate.fotos);
  }
  if (dataToUpdate.documentos !== undefined) {
    dataToUpdate.documentos = sanitizeIncomingUrls(dataToUpdate.documentos);
  }
  if (dataToUpdate.url_documentos !== undefined) {
    dataToUpdate.url_documentos = sanitizeSingleUrl(dataToUpdate.url_documentos);
  }
  if (dataToUpdate.tipo_posse !== undefined) {
    dataToUpdate.tipo_posse = parsePosse(dataToUpdate.tipo_posse);
  }

  // Conversões de tipo
  if (raw.data_aquisicao) dataToUpdate.data_aquisicao = new Date(raw.data_aquisicao as string);
  if (raw.valor_aquisicao !== undefined) dataToUpdate.valor_aquisicao = parseFloat(String(raw.valor_aquisicao));
  if (raw.area_terreno !== undefined) dataToUpdate.area_terreno = parseFloat(String(raw.area_terreno));
  if (raw.area_construida !== undefined) dataToUpdate.area_construida = parseFloat(String(raw.area_construida));
  if (raw.latitude !== undefined) {
    dataToUpdate.latitude =
      raw.latitude === null || raw.latitude === '' ? null : parseFloat(String(raw.latitude));
  }
  if (raw.longitude !== undefined) {
    dataToUpdate.longitude =
      raw.longitude === null || raw.longitude === '' ? null : parseFloat(String(raw.longitude));
  }

  const imovel = await prisma.$transaction(async (tx) => {
    const updated = await tx.imovel.update({
      where: { id },
      data: dataToUpdate,
      include: { sector: { select: { id: true, name: true } } },
    });

    await tx.historicoEntry.create({
      data: {
        imovelId: updated.id,
        date: new Date(),
        action: 'ATUALIZAÇÃO',
        details: `Imóvel atualizado por ${actor.userId}`,
        user: actor.userId,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.userId,
        action: 'UPDATE_IMOVEL',
        entityType: 'IMOVEL',
        entityId: updated.id,
        details: `Atualizado imóvel ${updated.numero_patrimonio}`,
        ipAddress: audit.ipAddress || 'unknown',
        userAgent: audit.userAgent || 'unknown',
      },
    });

    return updated;
  });

  await CacheUtils.invalidateImoveis();
  return normalizeOnRead(imovel as any);
};

// ===========================================================================
// Deleção
// ===========================================================================

export const deleteImovel = async (id: string, actor: Actor, audit: AuditContext = {}) => {
  const existing = await prisma.imovel.findUnique({ where: { id } });
  if (!existing) throw new ImovelNotFoundError();

  if (actor.role !== 'superuser' && existing.municipalityId !== actor.municipalityId) {
    throw new ImovelNotFoundError();
  }

  if (actor.role !== 'superuser' && actor.role !== 'supervisor') {
    throw new ImovelForbiddenError('Apenas superuser/supervisor podem deletar');
  }

  await prisma.imovel.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'DELETE_IMOVEL',
      entityType: 'IMOVEL',
      entityId: id,
      details: `Deletado imóvel ${existing.numero_patrimonio}`,
      ipAddress: audit.ipAddress || 'unknown',
      userAgent: audit.userAgent || 'unknown',
    },
  });

  await CacheUtils.invalidateImoveis();
  logInfo('🗑️ Imóvel deletado', { id, numero: existing.numero_patrimonio });
};

// ===========================================================================
// Gerar próximo número
// ===========================================================================

export const gerarNumeroImovel = async (sectorId: string, municipalityId: string) => {
  if (!sectorId) {
    throw new ImovelValidationError('ID do setor é obrigatório');
  }

  // Isolamento de tenant: o setor deve pertencer ao município (sectorId vem da
  // query string). Setor de outro município → "não encontrado" (404 no controller).
  const sector = await prisma.sector.findFirst({
    where: { id: sectorId, municipalityId },
    select: { codigo: true },
  });

  if (!sector) {
    throw new ImovelNotFoundError('Setor não encontrado');
  }

  const currentYear = new Date().getFullYear();
  const prefix = `IML${currentYear}${sector.codigo}`;

  const ultimo = await prisma.imovel.findFirst({
    where: { municipalityId, numero_patrimonio: { startsWith: prefix } },
    orderBy: { numero_patrimonio: 'desc' },
    select: { numero_patrimonio: true },
  });

  let proximoSequencial = 1;
  if (ultimo) {
    const seq = ultimo.numero_patrimonio.slice(-4);
    proximoSequencial = parseInt(seq, 10) + 1;
  }

  const numeroGerado = `${prefix}${proximoSequencial.toString().padStart(4, '0')}`;

  logInfo('📋 Número de imóvel gerado', {
    prefix,
    sectorCodigo: sector.codigo,
    sequencial: proximoSequencial,
    numeroCompleto: numeroGerado,
  });

  return {
    numero: numeroGerado,
    preview: numeroGerado,
    pattern: {
      prefix: 'IML',
      year: currentYear,
      sectorCode: sector.codigo,
      sequence: proximoSequencial,
    },
  };
};
