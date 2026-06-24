/**
 * regularizacaoService — regularização de bens pré-existentes / origem desconhecida
 * (Cap XIII da Lei / Cap IX do Decreto): constatação + avaliação a valor justo +
 * incorporação. Ao incorporar, cria um Patrimônio com a anotação de regularização.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { redisCache } from '../config/redis';
import { logInfo } from '../config/logger';
import { gerarNumeroPatrimonial, proximoNumeroPatrimonialTx } from './patrimonioService';

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

export interface IncorporarLoteInput {
  itens: { regularizacaoId: string; numero_patrimonio?: string | null }[];
  sectorId: string;
  localId?: string | null;
  setor_responsavel: string;
  local_objeto: string;
  tipo: string;
}

// Incorporação em LOTE: incorpora várias regularizações ao mesmo setor/local/tipo
// de uma vez (agiliza a regularização do acervo antigo). Cada regularização vira
// um patrimônio. Atômico: valida todas antes; ou incorpora todas, ou nenhuma.
export const incorporarRegularizacaoLote = async (input: IncorporarLoteInput, actor: Actor) => {
  if (!input.itens?.length) {
    throw new RegularizacaoValidationError('Informe ao menos uma regularização para o lote');
  }

  // Defesa em profundidade: a incorporação cria patrimônios com actor.municipalityId
  // e gera números por município. Um superuser fora do contexto de um município
  // criaria bens com tenant nulo / numeração ambígua.
  if (actor.role === 'superuser' && !actor.municipalityId) {
    throw new RegularizacaoValidationError(
      'Superuser deve operar no contexto de um município para incorporar regularizações em lote',
    );
  }

  // Sem regularizações repetidas no lote.
  const ids = new Set<string>();
  for (const it of input.itens) {
    if (ids.has(it.regularizacaoId)) {
      throw new RegularizacaoValidationError('Há regularizações repetidas no lote');
    }
    ids.add(it.regularizacaoId);
  }

  // Setor (um só para o lote) deve ser do município.
  const setor = await prisma.sector.findUnique({
    where: { id: input.sectorId },
    select: { id: true, municipalityId: true },
  });
  if (!setor || (actor.role !== 'superuser' && setor.municipalityId !== actor.municipalityId)) {
    throw new RegularizacaoValidationError('Setor inválido');
  }

  // Valida CADA regularização (tenant, status, comissão obrigatória — Art. 19).
  type RegValidada = Awaited<ReturnType<typeof getRegularizacaoById>>;
  const validados: { reg: RegValidada; numero?: string | null }[] = [];
  for (const it of input.itens) {
    const reg = await getRegularizacaoById(it.regularizacaoId, actor);
    if (reg.status !== 'em_andamento') {
      throw new RegularizacaoValidationError(
        `Regularização "${reg.descricao}" não está em andamento`,
      );
    }
    if (!reg.comissaoId || !reg.comissao) {
      throw new RegularizacaoValidationError(
        `Incorporação exige Comissão de Regularização designada (Art. 19) — regularização "${reg.descricao}"`,
      );
    }
    if (reg.comissao.tipo !== 'regularizacao') {
      throw new RegularizacaoValidationError(
        `A comissão da regularização "${reg.descricao}" deve ser do tipo "regularizacao" (Art. 19)`,
      );
    }
    if (reg.comissao.status !== 'ativa') {
      throw new RegularizacaoValidationError(
        `A comissão da regularização "${reg.descricao}" não está ativa`,
      );
    }
    validados.push({ reg, numero: it.numero_patrimonio });
  }

  const result = await prisma.$transaction(async (tx) => {
    // Numeração DENTRO da transação: lê o último número com o mesmo `tx` que cria
    // os patrimônios e incrementa em memória para os itens sem número explícito.
    // Manter a leitura do último número e as criações na MESMA transação evita a
    // race em que dois lotes concorrentes leem o mesmo "último número" e colidem
    // no UNIQUE de numero_patrimonio.
    const primeiro = await proximoNumeroPatrimonialTx(tx, { municipalityId: actor.municipalityId });
    const prefixoSeq = primeiro.numero.slice(0, primeiro.numero.length - 6);
    let seq = primeiro.sequencial;
    const proximoNumeroAuto = (): string => {
      const n = `${prefixoSeq}${String(seq).padStart(6, '0')}`;
      seq += 1;
      return n;
    };

    const incorporados = [];
    for (const { reg, numero } of validados) {
      const numeroFinal = numero || proximoNumeroAuto();
      const obs = [ANOTACAO, reg.observacoes].filter(Boolean).join(' | ');

      const patrimonio = await tx.patrimonio.create({
        data: {
          numero_patrimonio: numeroFinal,
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

      await tx.regularizacao.update({
        where: { id: reg.id },
        data: { status: 'incorporado', patrimonioId: patrimonio.id, dataIncorporacao: new Date() },
      });

      incorporados.push({ regularizacaoId: reg.id, patrimonio });
    }

    await tx.activityLog.create({
      data: {
        userId: actor.userId,
        action: 'INCORPORAR_REGULARIZACAO_LOTE',
        entityType: 'Regularizacao',
        entityId: incorporados[0].regularizacaoId,
        details: `Incorporação em lote de ${incorporados.length} regularizações ao setor ${input.setor_responsavel}`,
      },
    });

    return incorporados;
  });

  await redisCache.deletePattern('patrimonios:*');
  logInfo('✅ Regularização incorporada em lote', { total: result.length });
  return { total: result.length, incorporados: result };
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
