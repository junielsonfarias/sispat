/**
 * inventarioService — regras de negócio de Inventory.
 *
 * Substitui a lógica que vivia em controllers/inventarioController.ts. Aproveita
 * a coluna `municipalityId` adicionada na migration 20260512130000 — não há mais
 * subquery por usuários do município para isolar tenant.
 *
 * Padrão idêntico a imovelService/patrimonioService: erros tipados, Actor puro,
 * caching via Redis e ActivityLog para auditoria.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { redisCache } from '../config/redis';
import { logDebug, logInfo } from '../config/logger';

export interface Actor {
  userId: string;
  role: string;
  municipalityId: string;
  email: string;
}

export interface ListInventariosQuery {
  page?: string;
  limit?: string;
  status?: string;
  search?: string;
}

// ===========================================================================
// Erros tipados — controller mapeia para status HTTP
// ===========================================================================

export class InventarioNotFoundError extends Error {
  constructor(message = 'Inventário não encontrado') {
    super(message);
    this.name = 'InventarioNotFoundError';
  }
}

export class InventarioForbiddenError extends Error {
  constructor(message = 'Acesso negado') {
    super(message);
    this.name = 'InventarioForbiddenError';
  }
}

export class InventarioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventarioValidationError';
  }
}

// ===========================================================================
// Listagem
// ===========================================================================

export const listInventarios = async (query: ListInventariosQuery, actor: Actor) => {
  const pageNum = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(query.limit ?? '50', 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.InventoryWhereInput = {};

  // Tenant isolation: superuser vê tudo; demais só do município.
  if (actor.role !== 'superuser') {
    where.municipalityId = actor.municipalityId;
  }

  // Permissão extra: supervisor/usuario só veem inventários onde são responsáveis
  // (admin vê todos os do município).
  if (actor.role === 'supervisor' || actor.role === 'usuario') {
    where.responsavel = actor.userId;
  }

  if (query.status) where.status = query.status;

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const cacheKey = `inventarios:${actor.role === 'superuser' ? 'all' : actor.municipalityId}:${pageNum}:${limitNum}:${JSON.stringify(where)}`;
  let result = await redisCache.get<{ inventarios: unknown[]; total: number }>(cacheKey);

  if (!result) {
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
                  sector: { select: { id: true, name: true, codigo: true } },
                  local: { select: { id: true, name: true } },
                },
              },
              imovel: {
                select: {
                  id: true,
                  numero_patrimonio: true,
                  denominacao: true,
                  endereco: true,
                  setor: true,
                  situacao: true,
                },
              },
            },
            take: 10,
          },
        },
        orderBy: { dataInicio: 'desc' },
      }),
      prisma.inventory.count({ where }),
    ]);

    result = { inventarios, total };
    await redisCache.set(cacheKey, result, 300);
    logDebug('✅ Cache de inventários criado', { page: pageNum, limit: limitNum });
  } else {
    logDebug('✅ Cache hit: inventários', { page: pageNum, limit: limitNum });
  }

  return {
    inventarios: result.inventarios,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      pages: Math.ceil(result.total / limitNum),
    },
  };
};

// ===========================================================================
// Leitura por ID — tenant via municipalityId direto
// ===========================================================================

export const getInventarioById = async (id: string, actor: Actor) => {
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
              tipoBem: { select: { id: true, nome: true, descricao: true } },
              sector: { select: { id: true, name: true, codigo: true } },
              local: { select: { id: true, name: true } },
            },
          },
          imovel: {
            select: {
              id: true,
              numero_patrimonio: true,
              denominacao: true,
              endereco: true,
              setor: true,
              situacao: true,
            },
          },
        },
      },
    },
  });

  if (!inventario) throw new InventarioNotFoundError();

  if (actor.role !== 'superuser' && inventario.municipalityId !== actor.municipalityId) {
    // Mascara como 404 para não vazar existência cross-tenant
    throw new InventarioNotFoundError();
  }

  return inventario;
};

// ===========================================================================
// Criação
// ===========================================================================

export interface CreateInventarioInput {
  title?: string;
  description?: string;
  setor?: string;
  local?: string;
  dataInicio?: string | Date;
  scope?: string;
  tipo?: string;
  dataBase?: string | Date | null;
  exercicio?: number | null;
  agenteAnterior?: string | null;
  agenteNovo?: string | null;
}

export const createInventario = async (input: CreateInventarioInput, actor: Actor) => {
  if (!input.title) throw new InventarioValidationError('O título do inventário é obrigatório');
  if (!input.setor) throw new InventarioValidationError('O setor é obrigatório');

  // Patrimônios no escopo — sempre filtra por município do usuário (defesa contra
  // setores de mesmo nome em municípios diferentes).
  const scope = input.scope || 'sector';
  const patrimoniosInScope = await prisma.patrimonio.findMany({
    where: {
      municipalityId: actor.municipalityId,
      setor_responsavel: input.setor,
      ...(scope === 'location' && input.local
        ? { local_objeto: { contains: input.local, mode: 'insensitive' as const } }
        : {}),
      ...(scope === 'specific_location' && input.local ? { localId: input.local } : {}),
    },
    select: { id: true, numero_patrimonio: true, descricao_bem: true },
  });

  // Art. 16: o inventário cobre também os bens IMÓVEIS. Imóveis são bens de nível
  // de setor (não têm sub-localização como os móveis), então entram no inventário
  // do setor (escopo 'sector' — usado pelo inventário anual). Conferências por
  // localização específica de móveis não arrastam os imóveis do setor.
  const imoveisInScope =
    scope === 'sector'
      ? await prisma.imovel.findMany({
          where: { municipalityId: actor.municipalityId, setor: input.setor },
          select: { id: true, numero_patrimonio: true, denominacao: true },
        })
      : [];

  const inventario = await prisma.$transaction(async (tx) => {
    const created = await tx.inventory.create({
      data: {
        title: input.title!,
        description: input.description || '',
        responsavel: actor.userId,
        setor: input.setor!,
        local: input.local || '',
        dataInicio: input.dataInicio ? new Date(input.dataInicio) : new Date(),
        status: 'em_andamento',
        scope,
        tipo: (input.tipo ?? 'extraordinario') as Prisma.InventoryCreateInput['tipo'],
        dataBase: input.dataBase ? new Date(input.dataBase) : null,
        exercicio: input.exercicio ?? null,
        agenteAnterior: input.agenteAnterior ?? null,
        agenteNovo: input.agenteNovo ?? null,
        municipalityId: actor.municipalityId,
      },
    });

    // Art. 16: cada item do inventário representa EXATAMENTE um bem — ou um móvel
    // (patrimonioId) ou um imóvel (imovelId), nunca ambos nem nenhum. O schema do
    // banco deixa as duas FKs anuláveis (XOR validado aqui no service). Monta-se
    // uma lista única e valida-se o XOR de cada item antes de persistir.
    const itensData: { patrimonioId?: string; imovelId?: string }[] = [
      ...patrimoniosInScope.map((p) => ({ patrimonioId: p.id })),
      ...imoveisInScope.map((im) => ({ imovelId: im.id })),
    ];
    for (const it of itensData) {
      if (!!it.patrimonioId === !!it.imovelId) {
        throw new InventarioValidationError(
          'Cada item de inventário deve referenciar exatamente um bem (patrimônio OU imóvel).',
        );
      }
    }

    if (itensData.length > 0) {
      await tx.inventoryItem.createMany({
        data: itensData.map((it) => ({
          inventoryId: created.id,
          patrimonioId: it.patrimonioId,
          imovelId: it.imovelId,
          encontrado: false,
        })),
      });
    }

    await tx.activityLog.create({
      data: {
        userId: actor.userId,
        action: 'CREATE_INVENTORY',
        entityType: 'Inventory',
        entityId: created.id,
        details: `Inventário "${created.title}" criado`,
      },
    });

    return tx.inventory.findUnique({
      where: { id: created.id },
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
                tipoBem: { select: { id: true, nome: true } },
                sector: { select: { id: true, name: true, codigo: true } },
                local: { select: { id: true, name: true } },
              },
            },
            imovel: {
              select: {
                id: true,
                numero_patrimonio: true,
                denominacao: true,
                endereco: true,
                setor: true,
                situacao: true,
              },
            },
          },
        },
      },
    });
  });

  await redisCache.deletePattern('inventarios:*');
  logInfo('✅ Inventário criado', {
    inventarioId: inventario!.id,
    title: inventario!.title,
    itemsCount: inventario!.items.length,
  });

  return inventario!;
};

// ===========================================================================
// Atualização — apenas superuser/admin/responsável podem editar
// ===========================================================================

export interface UpdateInventarioInput {
  title?: string;
  description?: string;
  setor?: string;
  local?: string;
  status?: string;
  dataFim?: string | Date | null;
  tipo?: string;
  dataBase?: string | Date | null;
  exercicio?: number | null;
  agenteAnterior?: string | null;
  agenteNovo?: string | null;
}

export const updateInventario = async (
  id: string,
  input: UpdateInventarioInput,
  actor: Actor,
) => {
  const existing = await prisma.inventory.findUnique({
    where: { id },
    select: { id: true, title: true, municipalityId: true, responsavel: true },
  });

  if (!existing) throw new InventarioNotFoundError();
  if (actor.role !== 'superuser' && existing.municipalityId !== actor.municipalityId) {
    throw new InventarioNotFoundError();
  }

  if (
    actor.role !== 'superuser' &&
    actor.role !== 'admin' &&
    existing.responsavel !== actor.userId
  ) {
    throw new InventarioForbiddenError('Sem permissão para editar este inventário');
  }

  const updated = await prisma.inventory.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      setor: input.setor,
      local: input.local,
      status: input.status,
      dataFim: input.dataFim ? new Date(input.dataFim) : null,
      ...(input.tipo !== undefined
        ? { tipo: input.tipo as Prisma.InventoryUpdateInput['tipo'] }
        : {}),
      ...(input.dataBase !== undefined
        ? { dataBase: input.dataBase ? new Date(input.dataBase) : null }
        : {}),
      ...(input.exercicio !== undefined ? { exercicio: input.exercicio } : {}),
      ...(input.agenteAnterior !== undefined ? { agenteAnterior: input.agenteAnterior } : {}),
      ...(input.agenteNovo !== undefined ? { agenteNovo: input.agenteNovo } : {}),
    },
    include: { items: { include: { patrimonio: true } } },
  });

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'UPDATE_INVENTORY',
      entityType: 'Inventory',
      entityId: id,
      details: `Inventário "${input.title || existing.title}" atualizado`,
    },
  });

  await redisCache.deletePattern('inventarios:*');
  return updated;
};

// ===========================================================================
// Conferência de item — persiste InventoryItem.encontrado + verificadoEm/Por
// ===========================================================================

/**
 * Carrega o inventário garantindo tenant + permissão de edição (superuser/admin
 * ou responsável). Lança erro tipado. Reaproveitado por item-update e finalizar.
 */
const loadEditableInventario = async (id: string, actor: Actor) => {
  const existing = await prisma.inventory.findUnique({
    where: { id },
    select: { id: true, title: true, municipalityId: true, responsavel: true, status: true },
  });

  if (!existing) throw new InventarioNotFoundError();
  if (actor.role !== 'superuser' && existing.municipalityId !== actor.municipalityId) {
    throw new InventarioNotFoundError();
  }
  if (
    actor.role !== 'superuser' &&
    actor.role !== 'admin' &&
    existing.responsavel !== actor.userId
  ) {
    throw new InventarioForbiddenError('Sem permissão para alterar este inventário');
  }
  return existing;
};

export interface UpdateInventarioItemInput {
  encontrado: boolean;
  observacoes?: string | null;
}

export const updateInventarioItem = async (
  inventarioId: string,
  // id do bem conferido — pode ser um patrimônio (móvel) ou um imóvel.
  bemId: string,
  input: UpdateInventarioItemInput,
  actor: Actor,
) => {
  const inventario = await loadEditableInventario(inventarioId, actor);

  if (inventario.status !== 'em_andamento') {
    throw new InventarioValidationError(
      'Inventário não está em andamento — não é possível conferir itens',
    );
  }

  // Art. 16: o item pode ser móvel (patrimonioId) ou imóvel (imovelId).
  const item = await prisma.inventoryItem.findFirst({
    where: { inventoryId: inventarioId, OR: [{ patrimonioId: bemId }, { imovelId: bemId }] },
    select: { id: true },
  });
  if (!item) throw new InventarioNotFoundError('Item não encontrado neste inventário');

  const updated = await prisma.inventoryItem.update({
    where: { id: item.id },
    data: {
      encontrado: input.encontrado,
      observacoes: input.observacoes ?? null,
      verificadoEm: new Date(),
      verificadoPor: actor.userId,
    },
    include: {
      patrimonio: {
        select: { id: true, numero_patrimonio: true, descricao_bem: true, status: true },
      },
      imovel: {
        select: { id: true, numero_patrimonio: true, denominacao: true, situacao: true },
      },
    },
  });

  await redisCache.deletePattern('inventarios:*');
  logDebug('✅ Item de inventário conferido', {
    inventarioId,
    bemId,
    encontrado: input.encontrado,
  });

  return updated;
};

// ===========================================================================
// Finalização — conclui o inventário e marca bens não encontrados como extraviados
// ===========================================================================

export const finalizeInventario = async (id: string, actor: Actor) => {
  const existing = await loadEditableInventario(id, actor);

  if (existing.status !== 'em_andamento') {
    throw new InventarioValidationError('Inventário já foi finalizado');
  }

  const result = await prisma.$transaction(async (tx) => {
    const items = await tx.inventoryItem.findMany({
      where: { inventoryId: id },
      include: { patrimonio: { select: { id: true, status: true, numero_patrimonio: true } } },
    });

    const extraviados: { id: string; numero_patrimonio: string }[] = [];

    for (const item of items) {
      if (
        !item.encontrado &&
        item.patrimonio &&
        item.patrimonio.status !== 'extraviado' &&
        item.patrimonio.status !== 'baixado'
      ) {
        await tx.patrimonio.update({
          where: { id: item.patrimonio.id },
          data: { status: 'extraviado' },
        });
        await tx.historicoEntry.create({
          data: {
            patrimonioId: item.patrimonio.id,
            date: new Date(),
            action: 'EXTRAVIO',
            details: `Marcado como extraviado na finalização do inventário "${existing.title}"`,
            user: actor.userId,
          },
        });
        extraviados.push({
          id: item.patrimonio.id,
          numero_patrimonio: item.patrimonio.numero_patrimonio,
        });
      }
    }

    const inventario = await tx.inventory.update({
      where: { id },
      data: { status: 'concluido', dataFim: new Date() },
      include: {
        items: {
          include: {
            patrimonio: {
              select: {
                id: true,
                numero_patrimonio: true,
                descricao_bem: true,
                status: true,
              },
            },
            imovel: {
              select: { id: true, numero_patrimonio: true, denominacao: true, situacao: true },
            },
          },
        },
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.userId,
        action: 'FINALIZE_INVENTORY',
        entityType: 'Inventory',
        entityId: id,
        details: `Inventário "${existing.title}" finalizado — ${extraviados.length} bem(ns) extraviado(s)`,
      },
    });

    return { inventario, extraviados };
  });

  // Status de patrimônio mudou → invalida ambos os caches.
  await redisCache.deletePattern('inventarios:*');
  await redisCache.deletePattern('patrimonios:*');
  logInfo('✅ Inventário finalizado', {
    inventarioId: id,
    extraviados: result.extraviados.length,
  });

  return result;
};

// ===========================================================================
// Deleção — admin/superuser, ou responsável.
// ===========================================================================

export const deleteInventario = async (id: string, actor: Actor) => {
  const existing = await prisma.inventory.findUnique({
    where: { id },
    select: { id: true, title: true, municipalityId: true, responsavel: true },
  });

  if (!existing) throw new InventarioNotFoundError();
  if (actor.role !== 'superuser' && existing.municipalityId !== actor.municipalityId) {
    throw new InventarioNotFoundError();
  }

  await prisma.inventory.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'DELETE_INVENTORY',
      entityType: 'Inventory',
      entityId: id,
      details: `Inventário "${existing.title}" excluído`,
    },
  });

  await redisCache.deletePattern('inventarios:*');
};
