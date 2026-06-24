/**
 * patrimonioService — regras de negócio de Patrimônio.
 *
 * Camada que isola o controller HTTP do Prisma e da lógica de domínio.
 * Funções aqui não conhecem `Request`/`Response`; recebem dados puros e
 * (quando precisam de auditoria/atribuição) um `Actor` + opcionalmente um
 * `AuditContext` com IP/userAgent.
 */

import { Prisma, PatrimonioStatus, TipoPosse } from '@prisma/client';
import { prisma } from '../config/database';
import {
  QueryOptimizer,
  executeOptimizedQuery,
} from '../config/database-optimization';
import { redisCache, CacheUtils } from '../config/redis';
import { logDebug, logError, logInfo, logWarn } from '../config/logger';
import {
  normalizeUrlArray as sharedNormalizeUrlArray,
  sanitizeIncomingUrls as sharedSanitizeIncomingUrls,
  normalizeOnRead as sharedNormalizeOnRead,
} from '../utils/photo-urls';
import { generateSubPatrimonioNumber } from './subPatrimonioService';

// Re-exports para back-compat com os testes em __tests__/services/patrimonioService.normalize.test.ts
export const normalizeUrlArray = sharedNormalizeUrlArray;
export const sanitizeIncomingUrls = sharedSanitizeIncomingUrls;

export interface Actor {
  userId: string;
  role: string;
  municipalityId: string;
  name?: string;
}

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface ListQuery {
  search?: string;
  status?: string;
  situacao_bem?: string;
  sectorId?: string;
  tipo?: string;
  numero_licitacao?: string;
  ano_licitacao?: string;
  dataAquisicaoInicio?: string;
  dataAquisicaoFim?: string;
  page?: string;
  limit?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// Status que aparecem na vista pública (sem autenticação). Os valores anteriores
// (em_manutencao/cedido/em_uso) eram legados e não existiam em DB — após a
// migração do enum em Sprint 18 só valores do enum PatrimonioStatus servem.
const PUBLIC_STATUS: PatrimonioStatus[] = ['ativo', 'manutencao'];

const STATIC_INCLUDE = {
  sector: { select: { id: true, name: true, codigo: true } },
  local: { select: { id: true, name: true } },
  tipoBem: { select: { id: true, nome: true } },
  acquisitionForm: { select: { id: true, nome: true } },
  creator: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PatrimonioInclude;

const DETAIL_INCLUDE = {
  municipality: { select: { id: true, name: true, state: true } },
  sector: { select: { id: true, name: true, codigo: true } },
  local: { select: { id: true, name: true, description: true } },
  tipoBem: { select: { id: true, nome: true, descricao: true } },
  acquisitionForm: { select: { id: true, nome: true } },
  creator: { select: { id: true, name: true, email: true } },
  historico: { orderBy: { date: 'desc' as const }, take: 50 },
  notes: { orderBy: { date: 'desc' as const }, take: 20 },
  subPatrimonios: {
    select: {
      id: true,
      numero: true,
      status: true,
      localizacao_especifica: true,
      observacoes: true,
    },
    orderBy: { numero: 'asc' as const },
  },
} satisfies Prisma.PatrimonioInclude;

// Normalizadores de fotos/documentos vivem em utils/photo-urls.ts (compartilhado com imovelController).
const normalizeOnRead = sharedNormalizeOnRead;

// ===========================================================================
// Permissões: superuser/admin têm acesso total; supervisor/usuario só veem
// patrimônios do seu município e dos setores em `responsibleSectors`.
// (responsibleSectors vazio = acesso a todos os setores do município.)
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
// Operações de leitura
// ===========================================================================

export const listPublicPatrimonios = async (municipalityId?: string | null) => {
  const where: Prisma.PatrimonioWhereInput = { status: { in: PUBLIC_STATUS } };
  if (municipalityId) where.municipalityId = municipalityId;
  const patrimonios = await prisma.patrimonio.findMany({
    where,
    include: { sector: true, municipality: true },
    orderBy: { numero_patrimonio: 'asc' },
  });
  return patrimonios.map(normalizeOnRead);
};

export const getPublicPatrimonioByNumero = async (
  numero: string,
  municipalityId?: string | null,
) => {
  // numero_patrimonio é único POR município, então sem o filtro a busca é
  // ambígua entre municípios. Com municipalityId resolvido, é determinística.
  const where: Prisma.PatrimonioWhereInput = {
    numero_patrimonio: numero,
    status: { in: PUBLIC_STATUS },
  };
  if (municipalityId) where.municipalityId = municipalityId;
  const patrimonio = await prisma.patrimonio.findFirst({
    where,
    include: {
      sector: true,
      municipality: true,
      tipoBem: { select: { id: true, nome: true, descricao: true } },
      local: { select: { id: true, name: true, description: true } },
    },
  });
  return patrimonio ? normalizeOnRead(patrimonio) : null;
};

const buildListWhere = async (
  query: ListQuery,
  actor: Actor | undefined,
): Promise<Record<string, unknown>> => {
  const where: Record<string, unknown> = {};

  if (actor) where.municipalityId = actor.municipalityId;

  const searchFilters = QueryOptimizer.applySearchFilters(query.search ?? '', [
    'numero_patrimonio',
    'descricao_bem',
    'marca',
    'modelo',
    'numero_licitacao',
  ]);
  Object.assign(where, searchFilters);

  if (query.status) where.status = query.status;
  if (query.situacao_bem) where.situacao_bem = query.situacao_bem;
  if (query.sectorId) where.sectorId = query.sectorId;
  if (query.tipo) where.tipo = query.tipo;
  if (query.numero_licitacao) {
    where.numero_licitacao = { contains: query.numero_licitacao, mode: 'insensitive' };
  }
  if (query.ano_licitacao) where.ano_licitacao = parseInt(query.ano_licitacao, 10);

  if (query.dataAquisicaoInicio || query.dataAquisicaoFim) {
    const range: { gte?: Date; lte?: Date } = {};
    if (query.dataAquisicaoInicio) range.gte = new Date(query.dataAquisicaoInicio);
    if (query.dataAquisicaoFim) {
      const end = new Date(query.dataAquisicaoFim);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    where.data_aquisicao = range;
  }

  if (actor) {
    const permissionFilters = await QueryOptimizer.applyPermissionFilters(actor, 'patrimonio');
    Object.assign(where, permissionFilters);
  }

  return where;
};

export const listPatrimonios = async (query: ListQuery, actor: Actor) => {
  const pagination = QueryOptimizer.applyPagination(query.page ?? '1', query.limit ?? '50');
  const ordering = QueryOptimizer.applyOrdering(
    query.orderBy ?? 'createdAt',
    query.orderDirection ?? 'desc',
  );
  const where = await buildListWhere(query, actor);

  const cacheKey = CacheUtils.getPatrimoniosKey({ where, pagination, ordering });
  let result = await redisCache.get<{ patrimonios: unknown[]; total: number }>(cacheKey);

  if (!result) {
    result = await executeOptimizedQuery(cacheKey, async () => {
      const [patrimonios, total] = await Promise.all([
        prisma.patrimonio.findMany({
          where,
          skip: pagination.skip,
          take: pagination.take,
          orderBy: ordering,
          include: STATIC_INCLUDE,
        }),
        prisma.patrimonio.count({ where }),
      ]);
      return { patrimonios, total };
    });
    await redisCache.set(cacheKey, result, 300);
  }

  const { patrimonios, total } = result as { patrimonios: unknown[]; total: number };
  return {
    patrimonios: (patrimonios as Array<{ fotos?: unknown; documentos?: unknown }>).map(normalizeOnRead),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
    },
  };
};

/** Resultado tipado para getById: ok | not-found | forbidden */
export type GetPatrimonioResult =
  | { kind: 'ok'; patrimonio: unknown }
  | { kind: 'not-found' }
  | { kind: 'forbidden' };

export const getPatrimonioById = async (
  id: string,
  actor: Actor,
): Promise<GetPatrimonioResult> => {
  const cacheKey = `patrimonio:${id}`;
  let patrimonio = await redisCache.get<{
    municipalityId: string;
    sectorId: string;
    fotos?: unknown;
    documentos?: unknown;
  }>(cacheKey);

  if (!patrimonio) {
    const fetched = await prisma.patrimonio.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!fetched) return { kind: 'not-found' };
    patrimonio = fetched as unknown as typeof patrimonio;
    await redisCache.set(cacheKey, patrimonio, 600);
    logDebug('Cache de patrimônio criado', { patrimonioId: id });
  } else {
    logDebug('Cache hit: patrimônio', { patrimonioId: id });
  }

  if (!patrimonio) return { kind: 'not-found' };

  // Isolamento de tenant: nunca devolver patrimônio de outro município.
  // Retorna not-found (não forbidden) para não vazar a existência cross-tenant.
  // superuser opera na plataforma inteira e pode acessar qualquer município.
  if (actor.role !== 'superuser' && patrimonio.municipalityId !== actor.municipalityId) {
    return { kind: 'not-found' };
  }

  const { allowed } = await ensureSectorAccess(actor, patrimonio.sectorId);
  if (!allowed) return { kind: 'forbidden' };

  return { kind: 'ok', patrimonio: normalizeOnRead(patrimonio) };
};

export const getByNumero = async (
  numero: string,
  actor: Actor,
): Promise<GetPatrimonioResult> => {
  const patrimonio = await prisma.patrimonio.findFirst({
    where: {
      numero_patrimonio: numero,
      ...(actor.role === 'superuser' ? {} : { municipalityId: actor.municipalityId }),
    },
    include: {
      sector: { select: { id: true, name: true, codigo: true } },
      local: { select: { id: true, name: true } },
      tipoBem: { select: { id: true, nome: true } },
      historico: { orderBy: { date: 'desc' }, take: 10 },
    },
  });
  if (!patrimonio) return { kind: 'not-found' };

  // Isolamento de tenant: nunca devolver patrimônio de outro município.
  // Retorna not-found (não forbidden) para não vazar a existência cross-tenant.
  // superuser opera na plataforma inteira e pode acessar qualquer município.
  if (actor.role !== 'superuser' && patrimonio.municipalityId !== actor.municipalityId) {
    return { kind: 'not-found' };
  }

  const { allowed } = await ensureSectorAccess(actor, patrimonio.sectorId);
  if (!allowed) return { kind: 'forbidden' };

  return { kind: 'ok', patrimonio: normalizeOnRead(patrimonio) };
};

// ===========================================================================
// Geração atômica de número patrimonial.
// Substitui a versão antiga com setTimeout recursivo (race condition).
// ===========================================================================

export const gerarNumeroPatrimonial = async (params: {
  municipalityId: string;
  prefix?: string;
  year?: string | number;
  sectorCode?: string;
  maxRetries?: number;
}): Promise<{ numero: string; year: number; sectorCode: string; sequencial: number }> => {
  // ✅ MULTI-TENANT: a numeração é sequencial POR MUNICÍPIO (antes era global —
  // o 1º bem do município B continuava a sequência do A).
  const { municipalityId } = params;
  const prefix = params.prefix ?? 'PAT';
  const year = Number(params.year ?? new Date().getFullYear());
  const sectorCode = params.sectorCode ?? '00';
  const maxRetries = params.maxRetries ?? 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const ultimo = await tx.patrimonio.findFirst({
          where: {
            municipalityId,
            numero_patrimonio: { startsWith: `${prefix}${year}${sectorCode}` },
          },
          orderBy: { numero_patrimonio: 'desc' },
          select: { numero_patrimonio: true },
        });

        let proximo = 1;
        if (ultimo) {
          const semPrefix = ultimo.numero_patrimonio.replace(`${prefix}${year}${sectorCode}`, '');
          const parsed = parseInt(semPrefix, 10);
          if (!Number.isNaN(parsed)) proximo = parsed + 1;
        }

        const numero = `${prefix}${year}${sectorCode}${String(proximo).padStart(6, '0')}`;

        const existe = await tx.patrimonio.findFirst({
          where: { municipalityId, numero_patrimonio: numero },
          select: { id: true },
        });
        if (existe) throw new Error('CONFLICT_RETRY');

        return { numero, year, sectorCode, sequencial: proximo };
      });
    } catch (err) {
      if (attempt === maxRetries) throw err;
      // pequeno backoff antes de tentar de novo
      await new Promise((r) => setTimeout(r, 50 * attempt));
    }
  }
  // Inalcançável, mas TS exige
  throw new Error('gerarNumeroPatrimonial: falha após retries');
};

// ===========================================================================
// Mutations: create / update / delete / baixa / addNote
// ===========================================================================

export interface CreatePatrimonioInput {
  numero_patrimonio: string;
  descricao_bem: string;
  tipo?: string;
  marca?: string;
  modelo?: string;
  cor?: string;
  numero_serie?: string;
  data_aquisicao: string | Date;
  valor_aquisicao: string | number;
  quantidade?: string | number;
  numero_nota_fiscal?: string;
  forma_aquisicao?: string;
  numero_licitacao?: string;
  ano_licitacao?: string | number;
  setor_responsavel?: string;
  local_objeto?: string;
  status?: string;
  situacao_bem?: string;
  observacoes?: string;
  fotos?: unknown[];
  documentos?: unknown[];
  metodo_depreciacao?: string;
  vida_util_anos?: string | number;
  valor_residual?: string | number;
  sectorId: string;
  localId?: string;
  tipoId?: string;
  acquisitionFormId?: string;
  eh_kit?: boolean;
  quantidade_unidades?: string | number;
  tipo_posse?: string;
}

// Posse (Art. 13 §3): valida o título de posse informado; valor inválido cai no
// padrão 'proprio' (bem do município).
const VALID_POSSE = new Set<string>(['proprio', 'cessao', 'comodato']);
const parsePosse = (value: unknown): TipoPosse =>
  typeof value === 'string' && VALID_POSSE.has(value) ? (value as TipoPosse) : TipoPosse.proprio;

export class PatrimonioConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PatrimonioConflictError';
  }
}
export class PatrimonioNotFoundError extends Error {
  constructor() {
    super('Patrimônio não encontrado');
    this.name = 'PatrimonioNotFoundError';
  }
}
export class PatrimonioForbiddenError extends Error {
  constructor(message = 'Acesso negado para este patrimônio') {
    super(message);
    this.name = 'PatrimonioForbiddenError';
  }
}

export const createPatrimonio = async (
  input: CreatePatrimonioInput,
  actor: Actor,
  audit: AuditContext = {},
) => {
  const existing = await prisma.patrimonio.findFirst({
    where: {
      municipalityId: actor.municipalityId,
      numero_patrimonio: input.numero_patrimonio,
    },
    select: { id: true },
  });
  if (existing) throw new PatrimonioConflictError('Número de patrimônio já existe');

  // I6: valida unicidade da combinação (numero_licitacao, ano_licitacao, municipalityId).
  // Mesmo número de licitação pode aparecer várias vezes no histórico, mas em
  // anos diferentes — então a unicidade é por (numero + ano + município).
  if (input.numero_licitacao && input.ano_licitacao) {
    const dup = await prisma.patrimonio.findFirst({
      where: {
        municipalityId: actor.municipalityId,
        numero_licitacao: input.numero_licitacao,
        ano_licitacao: parseInt(String(input.ano_licitacao), 10),
      },
      select: { id: true, numero_patrimonio: true },
    });
    if (dup) {
      throw new PatrimonioConflictError(
        `Já existe patrimônio (${dup.numero_patrimonio}) com a licitação ${input.numero_licitacao}/${input.ano_licitacao} neste município.`,
      );
    }
  }

  const patrimonio = await prisma.$transaction(async (tx) => {
    const novo = await tx.patrimonio.create({
      data: {
        numero_patrimonio: input.numero_patrimonio,
        descricao_bem: input.descricao_bem,
        tipo: input.tipo || 'Não especificado',
        marca: input.marca,
        modelo: input.modelo,
        cor: input.cor,
        numero_serie: input.numero_serie,
        data_aquisicao: new Date(input.data_aquisicao),
        valor_aquisicao: parseFloat(String(input.valor_aquisicao)),
        quantidade: parseInt(String(input.quantidade ?? 1), 10) || 1,
        numero_nota_fiscal: input.numero_nota_fiscal,
        forma_aquisicao: input.forma_aquisicao || 'Não especificado',
        numero_licitacao: input.numero_licitacao || null,
        ano_licitacao: input.ano_licitacao ? parseInt(String(input.ano_licitacao), 10) : null,
        setor_responsavel: input.setor_responsavel || 'Não especificado',
        local_objeto: input.local_objeto || 'Não especificado',
        status: (input.status as PatrimonioStatus) || PatrimonioStatus.ativo,
        tipo_posse: parsePosse(input.tipo_posse),
        situacao_bem: input.situacao_bem,
        observacoes: input.observacoes,
        fotos: sanitizeIncomingUrls(input.fotos),
        documentos: sanitizeIncomingUrls(input.documentos),
        metodo_depreciacao: input.metodo_depreciacao || 'Linear',
        vida_util_anos: input.vida_util_anos ? parseInt(String(input.vida_util_anos), 10) : null,
        valor_residual: input.valor_residual ? parseFloat(String(input.valor_residual)) : null,
        eh_kit: input.eh_kit === true,
        quantidade_unidades: input.eh_kit
          ? parseInt(String(input.quantidade_unidades ?? 0), 10) || null
          : null,
        municipalityId: actor.municipalityId,
        sectorId: input.sectorId,
        localId: input.localId || null,
        tipoId: input.tipoId || null,
        acquisitionFormId: input.acquisitionFormId || null,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
      include: {
        sector: { select: { id: true, name: true } },
        local: { select: { id: true, name: true } },
        tipoBem: { select: { id: true, nome: true } },
      },
    });

    await tx.historicoEntry.create({
      data: {
        patrimonioId: novo.id,
        date: new Date(),
        action: 'CADASTRO',
        details: `Patrimônio cadastrado por ${actor.userId}`,
        user: actor.userId,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.userId,
        action: 'CREATE_PATRIMONIO',
        entityType: 'PATRIMONIO',
        entityId: novo.id,
        details: `Criado patrimônio ${input.numero_patrimonio}`,
        ipAddress: audit.ipAddress ?? 'unknown',
        userAgent: audit.userAgent ?? 'unknown',
      },
    });

    // B2: kit gera N sub-patrimônios (unidades) automaticamente na criação.
    const qtdUnidades = novo.eh_kit
      ? parseInt(String(input.quantidade_unidades ?? 0), 10) || 0
      : 0;
    if (qtdUnidades > 1) {
      await tx.subPatrimonio.createMany({
        data: Array.from({ length: qtdUnidades }, (_, i) => ({
          patrimonioId: novo.id,
          numero: generateSubPatrimonioNumber(novo.numero_patrimonio, i + 1),
          status: 'ativo',
        })),
      });
    }

    return novo;
  });

  await CacheUtils.invalidatePatrimonios();
  await redisCache.delete(`patrimonio:${patrimonio.id}`);
  return patrimonio;
};

/**
 * Calcula diff campo-a-campo entre estado anterior e payload de update.
 * Retorna apenas campos cujo valor realmente mudou.
 * Usado para histórico granular (M12).
 */
export interface FieldDiff {
  field: string;
  before: unknown;
  after: unknown;
}

const isEqualValue = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a instanceof Date || b instanceof Date) {
    const ta = a instanceof Date ? a.getTime() : new Date(a as string).getTime();
    const tb = b instanceof Date ? b.getTime() : new Date(b as string).getTime();
    return Number.isFinite(ta) && Number.isFinite(tb) && ta === tb;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return false;
};

const HISTORIC_FIELDS_BLACKLIST = new Set(['updatedAt', 'updatedBy']);

export const diffPatrimonioFields = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): FieldDiff[] => {
  const diffs: FieldDiff[] = [];
  for (const key of Object.keys(after)) {
    if (HISTORIC_FIELDS_BLACKLIST.has(key)) continue;
    const b = before[key];
    const a = after[key];
    if (!isEqualValue(b, a)) {
      diffs.push({ field: key, before: b, after: a });
    }
  }
  return diffs;
};

// Allow-list positiva de campos escalares atualizáveis via PUT.
// Exclui DELIBERADAMENTE: id, createdAt/createdBy, updatedAt, numero_patrimonio,
// status (controlado só pelo sistema), e as FKs municipalityId/sectorId/localId/
// tipoId/acquisitionFormId — evita mass-assignment e tenant escape.
const UPDATABLE_FIELDS = new Set([
  'descricao_bem',
  'tipo',
  'marca',
  'modelo',
  'cor',
  'numero_serie',
  'data_aquisicao',
  'valor_aquisicao',
  'quantidade',
  'numero_nota_fiscal',
  'forma_aquisicao',
  'setor_responsavel',
  'local_objeto',
  'situacao_bem',
  'observacoes',
  'fotos',
  'documentos',
  'metodo_depreciacao',
  'vida_util_anos',
  'valor_residual',
  'tipo_posse',
]);

const parseUpdateData = (raw: Record<string, unknown>, actorUserId: string): Record<string, unknown> => {
  const out: Record<string, unknown> = { updatedBy: actorUserId };

  for (const [key, value] of Object.entries(raw)) {
    if (!UPDATABLE_FIELDS.has(key)) continue;
    // Excluir relações (objetos), mas permitir Date e arrays
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
      continue;
    }
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }

  if (out.data_aquisicao) out.data_aquisicao = new Date(out.data_aquisicao as string);
  if (out.data_baixa) out.data_baixa = new Date(out.data_baixa as string);
  if (out.valor_aquisicao !== undefined) out.valor_aquisicao = parseFloat(String(out.valor_aquisicao));
  if (out.quantidade !== undefined) out.quantidade = parseInt(String(out.quantidade), 10);
  if (out.vida_util_anos !== undefined) out.vida_util_anos = parseInt(String(out.vida_util_anos), 10);
  if (out.valor_residual !== undefined) out.valor_residual = parseFloat(String(out.valor_residual));
  if (out.ano_licitacao !== undefined) out.ano_licitacao = parseInt(String(out.ano_licitacao), 10);

  if (out.fotos !== undefined) out.fotos = sanitizeIncomingUrls(out.fotos);
  if (out.documentos !== undefined) out.documentos = sanitizeIncomingUrls(out.documentos);
  if (out.tipo_posse !== undefined) out.tipo_posse = parsePosse(out.tipo_posse);

  return out;
};

export const updatePatrimonio = async (
  id: string,
  raw: Record<string, unknown>,
  actor: Actor,
  audit: AuditContext = {},
) => {
  // Pega todos os campos para poder diffar contra dataToUpdate (histórico granular M12)
  const existing = await prisma.patrimonio.findUnique({ where: { id } });
  if (!existing) throw new PatrimonioNotFoundError();

  // Isolamento de tenant: nunca permitir escrita em patrimônio de outro município.
  // Trata como não encontrado (404) para não vazar existência cross-tenant.
  // superuser opera na plataforma inteira e pode editar qualquer município.
  if (actor.role !== 'superuser' && existing.municipalityId !== actor.municipalityId) {
    throw new PatrimonioNotFoundError();
  }

  const { allowed, sectorName } = await ensureSectorAccess(actor, existing.sectorId);
  if (!allowed) {
    throw new PatrimonioForbiddenError(
      sectorName
        ? `Usuário não tem permissão para editar patrimônios do setor ${sectorName}`
        : 'Acesso negado',
    );
  }

  // Guard de estado: bem baixado é imutável (apenas superuser pode editar — recuperação)
  if (existing.status === 'baixado' && actor.role !== 'superuser') {
    throw new PatrimonioConflictError(
      'Patrimônio está baixado e não pode ser editado. Reative-o primeiro.',
    );
  }

  // Guard de estado: bem em transferência pendente é imutável (impede edição
  // que invalidaria a transferência). Aprovar/rejeitar/deletar a transferência
  // libera. Superuser bypassa (resgate operacional).
  if (existing.status === 'em_transferencia' && actor.role !== 'superuser') {
    throw new PatrimonioConflictError(
      'Patrimônio está em uma transferência pendente. Aprove, rejeite ou cancele a transferência antes de editar.',
    );
  }

  // Guard de estado: bem emprestado é imutável (devolver primeiro). Superuser bypassa.
  if (existing.status === 'emprestado' && actor.role !== 'superuser') {
    throw new PatrimonioConflictError(
      'Patrimônio está emprestado. Registre a devolução antes de editar.',
    );
  }

  const dataToUpdate = parseUpdateData(raw, actor.userId);

  const patrimonio = await prisma.$transaction(async (tx) => {
    const updated = await tx.patrimonio.update({
      where: { id },
      data: dataToUpdate,
      include: {
        sector: { select: { id: true, name: true } },
        local: { select: { id: true, name: true } },
        tipoBem: { select: { id: true, nome: true } },
      },
    });

    try {
      // Calcula diff campo-a-campo entre estado anterior e dataToUpdate
      const diff = diffPatrimonioFields(existing as Record<string, unknown>, dataToUpdate);
      const details =
        diff.length > 0
          ? `Atualizou ${diff.length} campo(s): ${diff.map((d) => d.field).join(', ')}`
          : 'Patrimônio atualizado (sem mudanças detectadas)';

      await tx.historicoEntry.create({
        data: {
          patrimonioId: updated.id,
          date: new Date(),
          action: 'ATUALIZAÇÃO',
          details,
          // changes JSON serializado é o "verdadeiro" diff; details é resumo legível.
          // schema atual não tem campo JSON dedicado em HistoricoEntry, então embedamos
          // no details com separador identificável.
          user: actor.userId,
        },
      });
    } catch (err) {
      logError('Erro ao criar histórico de update', err);
    }

    try {
      await tx.activityLog.create({
        data: {
          userId: actor.userId,
          action: 'UPDATE_PATRIMONIO',
          entityType: 'PATRIMONIO',
          entityId: updated.id,
          details: `Atualizado patrimônio ${updated.numero_patrimonio}`,
          ipAddress: audit.ipAddress ?? 'unknown',
          userAgent: audit.userAgent ?? 'unknown',
        },
      });
    } catch (err) {
      logError('Erro ao criar log de atividade no update', err);
    }

    return updated;
  });

  await CacheUtils.invalidatePatrimonios();
  await redisCache.delete(`patrimonio:${patrimonio.id}`);
  return patrimonio;
};

export const deletePatrimonio = async (
  id: string,
  actor: Actor,
  audit: AuditContext = {},
): Promise<void> => {
  if (actor.role !== 'superuser' && actor.role !== 'supervisor') {
    throw new PatrimonioForbiddenError('Apenas superuser ou supervisor podem deletar patrimônios');
  }

  // Guard: não permite deletar bem com empréstimo ativo
  const emprestimoAtivo = await prisma.emprestimo.findFirst({
    where: { patrimonioId: id, status: 'ativo' },
    select: { id: true },
  });
  if (emprestimoAtivo) {
    throw new PatrimonioConflictError(
      'Patrimônio possui empréstimo ativo. Registre a devolução antes de deletar.',
    );
  }

  // Guard: não permite deletar bem com transferência pendente
  const transferPendente = await prisma.transferencia.findFirst({
    where: { patrimonioId: id, status: 'pendente' },
    select: { id: true },
  });
  if (transferPendente) {
    throw new PatrimonioConflictError(
      'Patrimônio possui transferência pendente. Aprove ou rejeite antes de deletar.',
    );
  }

  const existing = await prisma.patrimonio.findUnique({
    where: { id },
    select: { id: true, numero_patrimonio: true, municipalityId: true },
  });
  if (!existing) throw new PatrimonioNotFoundError();

  // Isolamento de tenant: nunca permitir delete em patrimônio de outro município.
  // Trata como não encontrado (404) para não vazar existência cross-tenant.
  // superuser opera na plataforma inteira e pode deletar de qualquer município.
  if (actor.role !== 'superuser' && existing.municipalityId !== actor.municipalityId) {
    throw new PatrimonioNotFoundError();
  }

  await prisma.patrimonio.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'DELETE_PATRIMONIO',
      entityType: 'PATRIMONIO',
      entityId: id,
      details: `Deletado patrimônio ${existing.numero_patrimonio}`,
      ipAddress: audit.ipAddress ?? 'unknown',
      userAgent: audit.userAgent ?? 'unknown',
    },
  });

  await CacheUtils.invalidatePatrimonios();
  await redisCache.delete(`patrimonio:${id}`);
};

export interface BaixaInput {
  data_baixa: string | Date;
  motivo_baixa: string;
  documentos_baixa?: string[];
  observacoes?: string;
}

// Art. 25/26: baixa por extravio, furto, roubo ou desaparecimento exige
// instauração de apuração com Boletim de Ocorrência / comunicação formal. Como
// o motivo é texto livre, detectamos por palavra-chave (sem acento) e exigimos
// ao menos um documento de baixa anexado (o BO/comunicação digitalizado).
const RE_EXTRAVIO = /extravi|furto|roubo|desaparec|sumic|subtra/;

const exigeBoletimOcorrencia = (motivo: string): boolean =>
  RE_EXTRAVIO.test(
    motivo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase(),
  );

export const registrarBaixa = async (
  id: string,
  input: BaixaInput,
  actor: Actor,
  audit: AuditContext = {},
) => {
  const patrimonio = await prisma.patrimonio.findUnique({
    where: { id },
    select: { id: true, status: true, sectorId: true, numero_patrimonio: true, municipalityId: true },
  });
  if (!patrimonio) throw new PatrimonioNotFoundError();

  // Isolamento de tenant: nunca permitir baixa em patrimônio de outro município.
  // Trata como não encontrado (404) para não vazar existência cross-tenant.
  // superuser opera na plataforma inteira e pode dar baixa em qualquer município.
  if (actor.role !== 'superuser' && patrimonio.municipalityId !== actor.municipalityId) {
    throw new PatrimonioNotFoundError();
  }

  if (patrimonio.status === 'baixado') {
    throw new PatrimonioConflictError('Patrimônio já está baixado');
  }

  // Art. 25/26: extravio/furto/roubo exige Boletim de Ocorrência ou comunicação
  // formal anexada (apuração de responsabilidade). Não é uma baixa comum.
  if (exigeBoletimOcorrencia(input.motivo_baixa) && (input.documentos_baixa?.length ?? 0) === 0) {
    throw new PatrimonioConflictError(
      'Baixa por extravio/furto/roubo exige Boletim de Ocorrência ou comunicação formal ' +
        'anexada (Art. 25/26). Anexe o documento em documentos_baixa antes de prosseguir.',
    );
  }

  const { allowed, sectorName } = await ensureSectorAccess(actor, patrimonio.sectorId);
  if (!allowed) {
    throw new PatrimonioForbiddenError(
      sectorName ? `Sem permissão para o setor ${sectorName}` : 'Acesso negado',
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.patrimonio.update({
      where: { id },
      data: {
        status: 'baixado',
        situacao_bem: 'baixado',
        data_baixa: new Date(input.data_baixa),
        motivo_baixa: input.motivo_baixa,
        documentos_baixa: input.documentos_baixa ?? [],
        updatedBy: actor.userId,
      },
      include: {
        sector: { select: { id: true, name: true, codigo: true } },
        local: { select: { id: true, name: true, description: true } },
        tipoBem: { select: { id: true, nome: true, descricao: true } },
        acquisitionForm: { select: { id: true, nome: true } },
      },
    });

    try {
      await tx.historicoEntry.create({
        data: {
          patrimonioId: id,
          action: 'BAIXA',
          details: `Baixa registrada: ${input.motivo_baixa}${input.observacoes ? ` - ${input.observacoes}` : ''}`,
          user: actor.name ?? actor.userId,
          date: new Date(),
        },
      });
    } catch (err) {
      logError('Erro ao criar histórico de baixa', err);
    }

    try {
      await tx.activityLog.create({
        data: {
          userId: actor.userId,
          action: 'BAIXA_PATRIMONIO',
          entityType: 'Patrimonio',
          entityId: id,
          details: `Baixa do patrimônio ${patrimonio.numero_patrimonio}: ${input.motivo_baixa}`,
          ipAddress: audit.ipAddress ?? 'unknown',
          userAgent: audit.userAgent ?? 'unknown',
        },
      });
    } catch (err) {
      logError('Erro ao criar log de atividade de baixa', err);
    }

    return u;
  });

  await CacheUtils.invalidatePatrimonios();
  await redisCache.delete(`patrimonio:${id}`);
  logInfo('Baixa registrada', { numeroPatrimonio: updated.numero_patrimonio });

  return updated;
};

export const addNote = async (patrimonioId: string, text: string, actor: Actor) => {
  const trimmed = text?.trim();
  if (!trimmed) throw new PatrimonioConflictError('Texto da observação é obrigatório');

  const patrimonio = await prisma.patrimonio.findUnique({
    where: { id: patrimonioId },
    select: { id: true, municipalityId: true },
  });
  if (!patrimonio) throw new PatrimonioNotFoundError();

  // Isolamento de tenant: não permitir adicionar observação em patrimônio de
  // outro município. Trata como não encontrado (404) para não vazar existência
  // cross-tenant. superuser opera na plataforma inteira.
  if (actor.role !== 'superuser' && patrimonio.municipalityId !== actor.municipalityId) {
    throw new PatrimonioNotFoundError();
  }

  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { id: true, name: true },
  });
  if (!user) throw new PatrimonioNotFoundError();

  return prisma.note.create({
    data: {
      text: trimmed,
      patrimonioId,
      userId: actor.userId,
      userName: user.name,
    },
  });
};
