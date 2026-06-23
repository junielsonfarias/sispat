/**
 * desafetacaoService — desafetação de bens (Art. 22 da Lei). Retira a destinação
 * de uso comum/especial, passando o bem à categoria dominical (alienável).
 *
 * Regra central: ao CONCLUIR, atualiza Patrimonio/Imovel.destinacao = dominical,
 * marca destinacaoRevisada e grava HistoricoEntry — tudo numa transação.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { redisCache } from '../config/redis';
import { logInfo } from '../config/logger';

export interface Actor {
  userId: string;
  role: string;
  municipalityId: string;
  email: string;
}

export class DesafetacaoNotFoundError extends Error {
  constructor(message = 'Desafetação não encontrada') {
    super(message);
    this.name = 'DesafetacaoNotFoundError';
  }
}

export class DesafetacaoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DesafetacaoValidationError';
  }
}

type DestinacaoBem = 'uso_comum' | 'uso_especial' | 'dominical' | 'nao_classificado';

interface BemRef {
  tipo: 'patrimonio' | 'imovel';
  id: string;
  destinacao: DestinacaoBem;
  identificacao: string;
}

// Carrega o bem (patrimônio ou imóvel) garantindo tenant; lança se cross-tenant.
const loadBem = async (
  patrimonioId: string | null | undefined,
  imovelId: string | null | undefined,
  actor: Actor,
): Promise<BemRef> => {
  const isSuper = actor.role === 'superuser';
  if (patrimonioId) {
    const p = await prisma.patrimonio.findUnique({
      where: { id: patrimonioId },
      select: { id: true, destinacao: true, numero_patrimonio: true, municipalityId: true },
    });
    if (!p || (!isSuper && p.municipalityId !== actor.municipalityId)) {
      throw new DesafetacaoNotFoundError('Patrimônio não encontrado');
    }
    return {
      tipo: 'patrimonio',
      id: p.id,
      destinacao: p.destinacao as DestinacaoBem,
      identificacao: p.numero_patrimonio,
    };
  }
  if (imovelId) {
    const i = await prisma.imovel.findUnique({
      where: { id: imovelId },
      select: { id: true, destinacao: true, numero_patrimonio: true, municipalityId: true },
    });
    if (!i || (!isSuper && i.municipalityId !== actor.municipalityId)) {
      throw new DesafetacaoNotFoundError('Imóvel não encontrado');
    }
    return {
      tipo: 'imovel',
      id: i.id,
      destinacao: i.destinacao as DestinacaoBem,
      identificacao: i.numero_patrimonio,
    };
  }
  throw new DesafetacaoValidationError('Informe um patrimônio ou um imóvel');
};

interface ListQuery {
  page?: string;
  limit?: string;
  status?: string;
}

export const listDesafetacoes = async (query: ListQuery, actor: Actor) => {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit ?? '50', 10) || 50));

  const where: Prisma.DesafetacaoWhereInput = {};
  if (actor.role !== 'superuser') where.municipalityId = actor.municipalityId;
  if (query.status) where.status = query.status as Prisma.DesafetacaoWhereInput['status'];

  const [desafetacoes, total] = await Promise.all([
    prisma.desafetacao.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        comissao: { select: { id: true, tipo: true, portariaNumero: true } },
        patrimonio: { select: { id: true, numero_patrimonio: true, descricao_bem: true } },
        imovel: { select: { id: true, numero_patrimonio: true, denominacao: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.desafetacao.count({ where }),
  ]);

  return { desafetacoes, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getDesafetacaoById = async (id: string, actor: Actor) => {
  const d = await prisma.desafetacao.findUnique({
    where: { id },
    include: {
      comissao: { select: { id: true, tipo: true, portariaNumero: true } },
      patrimonio: { select: { id: true, numero_patrimonio: true, descricao_bem: true, destinacao: true } },
      imovel: { select: { id: true, numero_patrimonio: true, denominacao: true, destinacao: true } },
    },
  });
  if (!d) throw new DesafetacaoNotFoundError();
  if (actor.role !== 'superuser' && d.municipalityId !== actor.municipalityId) {
    throw new DesafetacaoNotFoundError();
  }
  return d;
};

export interface CreateDesafetacaoInput {
  patrimonioId?: string | null;
  imovelId?: string | null;
  comissaoId?: string | null;
  baseLegalTipo: string;
  baseLegalNumero: string;
  baseLegalData: string | Date;
  justificativa: string;
  observacoes?: string | null;
}

export const createDesafetacao = async (input: CreateDesafetacaoInput, actor: Actor) => {
  if (!!input.patrimonioId === !!input.imovelId) {
    throw new DesafetacaoValidationError('Informe um patrimônio OU um imóvel (exatamente um)');
  }

  const bem = await loadBem(input.patrimonioId, input.imovelId, actor);

  // Só bens de uso comum/especial podem ser desafetados (Art. 22). Dominical já é
  // alienável; não classificado deve ser classificado antes.
  if (bem.destinacao === 'dominical') {
    throw new DesafetacaoValidationError('O bem já é dominical — não requer desafetação');
  }
  if (bem.destinacao === 'nao_classificado') {
    throw new DesafetacaoValidationError(
      'Classifique a destinação do bem (uso comum/especial) antes de desafetar',
    );
  }

  // Bloqueia desafetação em andamento duplicada para o mesmo bem.
  const emAndamento = await prisma.desafetacao.findFirst({
    where: {
      status: 'em_andamento',
      ...(bem.tipo === 'patrimonio' ? { patrimonioId: bem.id } : { imovelId: bem.id }),
    },
    select: { id: true },
  });
  if (emAndamento) {
    throw new DesafetacaoValidationError('Já existe uma desafetação em andamento para este bem');
  }

  // Comissão informada deve ser do mesmo município.
  if (input.comissaoId) {
    const c = await prisma.comissao.findUnique({
      where: { id: input.comissaoId },
      select: { id: true, municipalityId: true },
    });
    if (!c || (actor.role !== 'superuser' && c.municipalityId !== actor.municipalityId)) {
      throw new DesafetacaoValidationError('Comissão inválida');
    }
  }

  const created = await prisma.desafetacao.create({
    data: {
      patrimonioId: bem.tipo === 'patrimonio' ? bem.id : null,
      imovelId: bem.tipo === 'imovel' ? bem.id : null,
      comissaoId: input.comissaoId ?? null,
      baseLegalTipo: input.baseLegalTipo as Prisma.DesafetacaoCreateInput['baseLegalTipo'],
      baseLegalNumero: input.baseLegalNumero,
      baseLegalData: new Date(input.baseLegalData),
      justificativa: input.justificativa,
      destinacaoAnterior: bem.destinacao as Prisma.DesafetacaoCreateInput['destinacaoAnterior'],
      observacoes: input.observacoes ?? null,
      municipalityId: actor.municipalityId,
      createdBy: actor.userId,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'CREATE_DESAFETACAO',
      entityType: 'Desafetacao',
      entityId: created.id,
      details: `Desafetação iniciada para ${bem.tipo} ${bem.identificacao}`,
    },
  });

  logInfo('✅ Desafetação criada', { desafetacaoId: created.id, bem: bem.identificacao });
  return created;
};

export interface UpdateDesafetacaoInput {
  comissaoId?: string | null;
  baseLegalTipo?: string;
  baseLegalNumero?: string;
  baseLegalData?: string | Date;
  justificativa?: string;
  observacoes?: string | null;
}

export const updateDesafetacao = async (id: string, input: UpdateDesafetacaoInput, actor: Actor) => {
  const existing = await getDesafetacaoById(id, actor);
  if (existing.status !== 'em_andamento') {
    throw new DesafetacaoValidationError('Apenas desafetações em andamento podem ser editadas');
  }

  const data: Prisma.DesafetacaoUpdateInput = {};
  if (input.baseLegalTipo !== undefined)
    data.baseLegalTipo = input.baseLegalTipo as Prisma.DesafetacaoUpdateInput['baseLegalTipo'];
  if (input.baseLegalNumero !== undefined) data.baseLegalNumero = input.baseLegalNumero;
  if (input.baseLegalData !== undefined) data.baseLegalData = new Date(input.baseLegalData);
  if (input.justificativa !== undefined) data.justificativa = input.justificativa;
  if (input.observacoes !== undefined) data.observacoes = input.observacoes;
  if (input.comissaoId !== undefined) {
    if (input.comissaoId) {
      const c = await prisma.comissao.findUnique({
        where: { id: input.comissaoId },
        select: { id: true, municipalityId: true },
      });
      if (!c || (actor.role !== 'superuser' && c.municipalityId !== actor.municipalityId)) {
        throw new DesafetacaoValidationError('Comissão inválida');
      }
      data.comissao = { connect: { id: input.comissaoId } };
    } else {
      data.comissao = { disconnect: true };
    }
  }

  return prisma.desafetacao.update({ where: { id }, data });
};

// Conclui a desafetação: bem -> dominical, histórico e auditoria. Atômico.
export const concluirDesafetacao = async (id: string, actor: Actor) => {
  const existing = await getDesafetacaoById(id, actor);
  if (existing.status !== 'em_andamento') {
    throw new DesafetacaoValidationError('Esta desafetação não está em andamento');
  }

  const isPatrimonio = !!existing.patrimonioId;
  const bemId = (existing.patrimonioId || existing.imovelId)!;

  const result = await prisma.$transaction(async (tx) => {
    if (isPatrimonio) {
      await tx.patrimonio.update({
        where: { id: bemId },
        data: { destinacao: 'dominical', destinacaoRevisada: true },
      });
      await tx.historicoEntry.create({
        data: {
          patrimonioId: bemId,
          date: new Date(),
          action: 'DESAFETACAO',
          details: `Bem desafetado (${existing.destinacaoAnterior} → dominical) por ${existing.baseLegalTipo} ${existing.baseLegalNumero}`,
          user: actor.userId,
        },
      });
    } else {
      await tx.imovel.update({
        where: { id: bemId },
        data: { destinacao: 'dominical', destinacaoRevisada: true },
      });
      await tx.historicoEntry.create({
        data: {
          imovelId: bemId,
          date: new Date(),
          action: 'DESAFETACAO',
          details: `Imóvel desafetado (${existing.destinacaoAnterior} → dominical) por ${existing.baseLegalTipo} ${existing.baseLegalNumero}`,
          user: actor.userId,
        },
      });
    }

    const updated = await tx.desafetacao.update({
      where: { id },
      data: { status: 'concluida', dataConclusao: new Date() },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.userId,
        action: 'CONCLUDE_DESAFETACAO',
        entityType: 'Desafetacao',
        entityId: id,
        details: `Desafetação concluída — bem agora dominical (${existing.baseLegalTipo} ${existing.baseLegalNumero})`,
      },
    });

    return updated;
  });

  // Status/destinação do bem mudaram → invalida caches de listagem.
  await redisCache.deletePattern(isPatrimonio ? 'patrimonios:*' : 'imoveis:*');
  logInfo('✅ Desafetação concluída', { desafetacaoId: id });
  return result;
};

export const cancelarDesafetacao = async (id: string, actor: Actor) => {
  const existing = await getDesafetacaoById(id, actor);
  if (existing.status !== 'em_andamento') {
    throw new DesafetacaoValidationError('Apenas desafetações em andamento podem ser canceladas');
  }
  return prisma.desafetacao.update({ where: { id }, data: { status: 'cancelada' } });
};

export const deleteDesafetacao = async (id: string, actor: Actor) => {
  await getDesafetacaoById(id, actor);
  await prisma.desafetacao.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'DELETE_DESAFETACAO',
      entityType: 'Desafetacao',
      entityId: id,
      details: 'Desafetação excluída',
    },
  });
};

// Reclassifica a destinação de um bem diretamente (revisão do acervo que entrou
// como uso_especial por padrão). Não é desafetação formal — é saneamento.
export const reclassificarDestinacao = async (
  bemTipo: 'patrimonio' | 'imovel',
  bemId: string,
  destinacao: DestinacaoBem,
  actor: Actor,
) => {
  const bem = await loadBem(
    bemTipo === 'patrimonio' ? bemId : null,
    bemTipo === 'imovel' ? bemId : null,
    actor,
  );

  if (bemTipo === 'patrimonio') {
    await prisma.patrimonio.update({
      where: { id: bemId },
      data: { destinacao, destinacaoRevisada: true },
    });
    await prisma.historicoEntry.create({
      data: {
        patrimonioId: bemId,
        date: new Date(),
        action: 'RECLASSIFICACAO_DESTINACAO',
        details: `Destinação reclassificada: ${bem.destinacao} → ${destinacao}`,
        user: actor.userId,
      },
    });
    await redisCache.deletePattern('patrimonios:*');
  } else {
    await prisma.imovel.update({
      where: { id: bemId },
      data: { destinacao, destinacaoRevisada: true },
    });
    await prisma.historicoEntry.create({
      data: {
        imovelId: bemId,
        date: new Date(),
        action: 'RECLASSIFICACAO_DESTINACAO',
        details: `Destinação reclassificada: ${bem.destinacao} → ${destinacao}`,
        user: actor.userId,
      },
    });
    await redisCache.deletePattern('imoveis:*');
  }

  return { tipo: bemTipo, id: bemId, destinacao };
};
