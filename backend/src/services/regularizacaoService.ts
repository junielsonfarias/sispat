/**
 * regularizacaoService — regularização de bens pré-existentes / origem desconhecida
 * (Cap XIII da Lei / Cap IX do Decreto): constatação + avaliação a valor justo +
 * incorporação. Ao incorporar, cria um Patrimônio com a anotação de regularização.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { redisCache } from '../config/redis';
import { logInfo } from '../config/logger';
import { gerarNumeroPatrimonial } from './patrimonioService';

export interface Actor {
  userId: string;
  role: string;
  municipalityId: string;
  email: string;
}

export class RegularizacaoNotFoundError extends Error {
  constructor(message = 'Regularização não encontrada') {
    super(message);
    this.name = 'RegularizacaoNotFoundError';
  }
}

export class RegularizacaoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegularizacaoValidationError';
  }
}

const ANOTACAO = 'regularização — bem pré-existente';

interface ListQuery {
  page?: string;
  limit?: string;
  status?: string;
  tipoOrigem?: string;
}

export const listRegularizacoes = async (query: ListQuery, actor: Actor) => {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit ?? '50', 10) || 50));

  const where: Prisma.RegularizacaoWhereInput = {};
  if (actor.role !== 'superuser') where.municipalityId = actor.municipalityId;
  if (query.status) where.status = query.status as Prisma.RegularizacaoWhereInput['status'];
  if (query.tipoOrigem)
    where.tipoOrigem = query.tipoOrigem as Prisma.RegularizacaoWhereInput['tipoOrigem'];

  const [regularizacoes, total] = await Promise.all([
    prisma.regularizacao.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        comissao: { select: { id: true, tipo: true, portariaNumero: true } },
        patrimonio: { select: { id: true, numero_patrimonio: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.regularizacao.count({ where }),
  ]);

  return { regularizacoes, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getRegularizacaoById = async (id: string, actor: Actor) => {
  const r = await prisma.regularizacao.findUnique({
    where: { id },
    include: {
      comissao: { select: { id: true, tipo: true, status: true, portariaNumero: true } },
      patrimonio: { select: { id: true, numero_patrimonio: true, descricao_bem: true } },
    },
  });
  if (!r) throw new RegularizacaoNotFoundError();
  if (actor.role !== 'superuser' && r.municipalityId !== actor.municipalityId) {
    throw new RegularizacaoNotFoundError();
  }
  return r;
};

export interface CreateRegularizacaoInput {
  descricao: string;
  caracteristicas?: string | null;
  estadoConservacao?: string | null;
  localizacao?: string | null;
  tipoOrigem?: string;
  valorJusto: number;
  comissaoId?: string | null;
  termoConstatacao?: string | null;
  observacoes?: string | null;
  fotos?: string[];
  dataConstatacao?: string | Date;
}

const validateComissao = async (comissaoId: string, actor: Actor) => {
  const c = await prisma.comissao.findUnique({
    where: { id: comissaoId },
    select: { id: true, municipalityId: true },
  });
  if (!c || (actor.role !== 'superuser' && c.municipalityId !== actor.municipalityId)) {
    throw new RegularizacaoValidationError('Comissão inválida');
  }
};

export const createRegularizacao = async (input: CreateRegularizacaoInput, actor: Actor) => {
  if (input.comissaoId) await validateComissao(input.comissaoId, actor);

  const created = await prisma.regularizacao.create({
    data: {
      descricao: input.descricao,
      caracteristicas: input.caracteristicas ?? null,
      estadoConservacao: input.estadoConservacao ?? null,
      localizacao: input.localizacao ?? null,
      tipoOrigem: (input.tipoOrigem ?? 'pre_existente') as Prisma.RegularizacaoCreateInput['tipoOrigem'],
      valorJusto: input.valorJusto,
      comissaoId: input.comissaoId ?? null,
      termoConstatacao: input.termoConstatacao ?? null,
      observacoes: input.observacoes ?? null,
      fotos: input.fotos ?? [],
      dataConstatacao: input.dataConstatacao ? new Date(input.dataConstatacao) : new Date(),
      municipalityId: actor.municipalityId,
      createdBy: actor.userId,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'CREATE_REGULARIZACAO',
      entityType: 'Regularizacao',
      entityId: created.id,
      details: `Constatação de bem para regularização: ${created.descricao}`,
    },
  });

  logInfo('✅ Regularização criada', { id: created.id });
  return created;
};

export interface UpdateRegularizacaoInput {
  descricao?: string;
  caracteristicas?: string | null;
  estadoConservacao?: string | null;
  localizacao?: string | null;
  tipoOrigem?: string;
  valorJusto?: number;
  comissaoId?: string | null;
  termoConstatacao?: string | null;
  observacoes?: string | null;
  fotos?: string[];
}

export const updateRegularizacao = async (
  id: string,
  input: UpdateRegularizacaoInput,
  actor: Actor,
) => {
  const existing = await getRegularizacaoById(id, actor);
  if (existing.status !== 'em_andamento') {
    throw new RegularizacaoValidationError('Apenas regularizações em andamento podem ser editadas');
  }
  if (input.comissaoId) await validateComissao(input.comissaoId, actor);

  const data: Prisma.RegularizacaoUpdateInput = {};
  if (input.descricao !== undefined) data.descricao = input.descricao;
  if (input.caracteristicas !== undefined) data.caracteristicas = input.caracteristicas;
  if (input.estadoConservacao !== undefined) data.estadoConservacao = input.estadoConservacao;
  if (input.localizacao !== undefined) data.localizacao = input.localizacao;
  if (input.tipoOrigem !== undefined)
    data.tipoOrigem = input.tipoOrigem as Prisma.RegularizacaoUpdateInput['tipoOrigem'];
  if (input.valorJusto !== undefined) data.valorJusto = input.valorJusto;
  if (input.termoConstatacao !== undefined) data.termoConstatacao = input.termoConstatacao;
  if (input.observacoes !== undefined) data.observacoes = input.observacoes;
  if (input.fotos !== undefined) data.fotos = input.fotos;
  if (input.comissaoId !== undefined) {
    data.comissao = input.comissaoId
      ? { connect: { id: input.comissaoId } }
      : { disconnect: true };
  }

  return prisma.regularizacao.update({ where: { id }, data });
};

export interface IncorporarInput {
  sectorId: string;
  localId?: string | null;
  setor_responsavel: string;
  local_objeto: string;
  tipo: string;
  numero_patrimonio?: string | null;
}

// Incorpora: cria o Patrimônio a partir da regularização (Art. 31 IV-V).
export const incorporarRegularizacao = async (
  id: string,
  input: IncorporarInput,
  actor: Actor,
) => {
  const reg = await getRegularizacaoById(id, actor);
  if (reg.status !== 'em_andamento') {
    throw new RegularizacaoValidationError('Esta regularização não está em andamento');
  }

  // A regularização do acervo é conduzida por uma Comissão de Regularização
  // (Art. 19 / Cap. XIII): a incorporação só é válida com essa comissão designada
  // e em exercício. A constatação pode ficar em rascunho sem comissão, mas não
  // se incorpora ao patrimônio sem ela.
  if (!reg.comissaoId || !reg.comissao) {
    throw new RegularizacaoValidationError(
      'Incorporação exige uma Comissão de Regularização designada (Art. 19). ' +
        'Vincule a comissão à regularização antes de incorporar.',
    );
  }
  if (reg.comissao.tipo !== 'regularizacao') {
    throw new RegularizacaoValidationError(
      'A comissão vinculada deve ser do tipo "regularizacao" para incorporar o bem (Art. 19).',
    );
  }
  if (reg.comissao.status !== 'ativa') {
    throw new RegularizacaoValidationError(
      'A Comissão de Regularização vinculada não está ativa — designe/renove a comissão antes de incorporar.',
    );
  }

  // Setor precisa ser do município.
  const setor = await prisma.sector.findUnique({
    where: { id: input.sectorId },
    select: { id: true, municipalityId: true },
  });
  if (!setor || (actor.role !== 'superuser' && setor.municipalityId !== actor.municipalityId)) {
    throw new RegularizacaoValidationError('Setor inválido');
  }

  const numero =
    input.numero_patrimonio ||
    (await gerarNumeroPatrimonial({ municipalityId: actor.municipalityId })).numero;

  const obs = [ANOTACAO, reg.observacoes].filter(Boolean).join(' | ');

  const result = await prisma.$transaction(async (tx) => {
    const patrimonio = await tx.patrimonio.create({
      data: {
        numero_patrimonio: numero,
        descricao_bem: reg.descricao,
        tipo: input.tipo,
        data_aquisicao: reg.dataConstatacao,
        valor_aquisicao: reg.valorJusto,
        forma_aquisicao: 'Regularização',
        setor_responsavel: input.setor_responsavel,
        local_objeto: input.local_objeto,
        status: 'ativo',
        situacao_bem: reg.estadoConservacao ?? null,
        observacoes: obs,
        fotos: reg.fotos,
        destinacao: 'uso_especial',
        destinacaoRevisada: true,
        municipalityId: actor.municipalityId,
        sectorId: input.sectorId,
        localId: input.localId ?? null,
        createdBy: actor.userId,
      },
    });

    await tx.historicoEntry.create({
      data: {
        patrimonioId: patrimonio.id,
        date: new Date(),
        action: 'INCORPORACAO_REGULARIZACAO',
        details: `Bem incorporado por regularização (${ANOTACAO}); valor justo R$ ${reg.valorJusto.toFixed(2)}`,
        user: actor.userId,
      },
    });

    const updatedReg = await tx.regularizacao.update({
      where: { id },
      data: { status: 'incorporado', patrimonioId: patrimonio.id, dataIncorporacao: new Date() },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.userId,
        action: 'INCORPORAR_REGULARIZACAO',
        entityType: 'Regularizacao',
        entityId: id,
        details: `Regularização incorporada como patrimônio ${numero}`,
      },
    });

    return { regularizacao: updatedReg, patrimonio };
  });

  await redisCache.deletePattern('patrimonios:*');
  logInfo('✅ Regularização incorporada', { id, patrimonioId: result.patrimonio.id });
  return result;
};

export const cancelarRegularizacao = async (id: string, actor: Actor) => {
  const existing = await getRegularizacaoById(id, actor);
  if (existing.status !== 'em_andamento') {
    throw new RegularizacaoValidationError('Apenas regularizações em andamento podem ser canceladas');
  }
  return prisma.regularizacao.update({ where: { id }, data: { status: 'cancelado' } });
};

export const deleteRegularizacao = async (id: string, actor: Actor) => {
  const existing = await getRegularizacaoById(id, actor);
  if (existing.status === 'incorporado') {
    throw new RegularizacaoValidationError(
      'Regularização já incorporada não pode ser excluída (baixe o patrimônio se necessário)',
    );
  }
  await prisma.regularizacao.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'DELETE_REGULARIZACAO',
      entityType: 'Regularizacao',
      entityId: id,
      details: 'Regularização excluída',
    },
  });
};
