/**
 * conformidadeService — avalia o estado atual do sistema contra as exigências da
 * Lei de Gestão Patrimonial e produz (1) um checklist de adequação e (2) alertas
 * agregados. Tudo read-only e computado on-the-fly (sem persistência).
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export interface Actor {
  userId: string;
  role: string;
  municipalityId: string;
  email: string;
}

type StatusItem = 'conforme' | 'atencao' | 'nao_conforme';

interface ItemConformidade {
  chave: string;
  categoria: string;
  descricao: string;
  status: StatusItem;
  detalhe: string;
  referenciaLegal: string;
}

const TIPOS_COMISSAO: { tipo: string; label: string }[] = [
  { tipo: 'inventario', label: 'Comissão de Inventário Patrimonial' },
  { tipo: 'avaliacao', label: 'Comissão de Avaliação e Reavaliação de Bens' },
  { tipo: 'regularizacao', label: 'Comissão Especial de Regularização' },
  { tipo: 'desfazimento_desafetacao', label: 'Comissão de Desfazimento e Desafetação' },
];

const MIN_MEMBROS = 3;
const DIA = 24 * 60 * 60 * 1000;
const ALERTA_DIAS = 30;

const tenant = (actor: Actor): Prisma.ComissaoWhereInput =>
  actor.role !== 'superuser' ? { municipalityId: actor.municipalityId } : {};

export const getChecklist = async (actor: Actor, now: Date = new Date()) => {
  const munWhere = actor.role !== 'superuser' ? { municipalityId: actor.municipalityId } : {};

  const [comissoes, patrimoniosPendentes, imoveisPendentes, dominicaisP, dominicaisI, conciliacoes] =
    await Promise.all([
      prisma.comissao.findMany({
        where: { ...tenant(actor), status: 'ativa' },
        include: { _count: { select: { membros: true } } },
      }),
      prisma.patrimonio.count({
        where: {
          ...munWhere,
          OR: [{ destinacaoRevisada: false }, { destinacao: 'nao_classificado' }],
        },
      }),
      prisma.imovel.count({
        where: {
          ...munWhere,
          OR: [{ destinacaoRevisada: false }, { destinacao: 'nao_classificado' }],
        },
      }),
      prisma.patrimonio.count({ where: { ...munWhere, destinacao: 'dominical' } }),
      prisma.imovel.count({ where: { ...munWhere, destinacao: 'dominical' } }),
      prisma.conciliacao.findMany({
        where: munWhere,
        orderBy: { competencia: 'desc' },
      }),
    ]);

  const itens: ItemConformidade[] = [];

  // 1. As 4 comissões exigidas (Art. 19) — instituídas, mandato vigente, >= 3 membros.
  for (const { tipo, label } of TIPOS_COMISSAO) {
    const ativas = comissoes.filter((c) => c.tipo === tipo);
    if (ativas.length === 0) {
      itens.push({
        chave: `comissao_${tipo}`,
        categoria: 'Comissões',
        descricao: label,
        status: 'nao_conforme',
        detalhe: 'Nenhuma comissão ativa deste tipo.',
        referenciaLegal: 'Art. 19 da Lei / Art. 8 do Decreto',
      });
      continue;
    }
    const problemas: string[] = [];
    let pior: StatusItem = 'conforme';
    for (const c of ativas) {
      const dias = Math.ceil((c.mandatoFim.getTime() - now.getTime()) / DIA);
      if (dias < 0) {
        problemas.push(`portaria ${c.portariaNumero}: mandato vencido`);
        pior = 'nao_conforme';
      } else if (dias <= ALERTA_DIAS) {
        problemas.push(`portaria ${c.portariaNumero}: mandato vence em ${dias} dia(s)`);
        if (pior === 'conforme') pior = 'atencao';
      }
      if (c._count.membros < MIN_MEMBROS) {
        problemas.push(`portaria ${c.portariaNumero}: ${c._count.membros} membro(s) (mín. ${MIN_MEMBROS})`);
        if (pior === 'conforme') pior = 'atencao';
      }
    }
    itens.push({
      chave: `comissao_${tipo}`,
      categoria: 'Comissões',
      descricao: label,
      status: pior,
      detalhe: problemas.length ? problemas.join('; ') : 'Instituída, mandato vigente e quórum mínimo.',
      referenciaLegal: 'Art. 19 da Lei / Art. 8 do Decreto',
    });
  }

  // 2. Classificação por destinação (Art. 6).
  const pendentesDestinacao = patrimoniosPendentes + imoveisPendentes;
  itens.push({
    chave: 'destinacao_classificada',
    categoria: 'Classificação',
    descricao: 'Bens com destinação classificada e revisada',
    status: pendentesDestinacao > 0 ? 'atencao' : 'conforme',
    detalhe:
      pendentesDestinacao > 0
        ? `${pendentesDestinacao} bem(ns) com destinação pendente de revisão.`
        : 'Todos os bens têm destinação revisada.',
    referenciaLegal: 'Art. 6 da Lei',
  });

  // 3. Conciliação físico-contábil (Art. 8 V) por categoria.
  for (const categoria of ['bens_moveis', 'bens_imoveis'] as const) {
    const ult = conciliacoes.find((c) => c.categoria === categoria);
    const labelCat = categoria === 'bens_moveis' ? 'bens móveis' : 'bens imóveis';
    if (!ult) {
      itens.push({
        chave: `conciliacao_${categoria}`,
        categoria: 'Conciliação contábil',
        descricao: `Conciliação físico-contábil de ${labelCat}`,
        status: 'atencao',
        detalhe: 'Nenhuma conciliação registrada.',
        referenciaLegal: 'Art. 3 II e Art. 8 V da Lei (SIAFIC)',
      });
      continue;
    }
    itens.push({
      chave: `conciliacao_${categoria}`,
      categoria: 'Conciliação contábil',
      descricao: `Conciliação físico-contábil de ${labelCat}`,
      status: ult.status === 'divergente' ? 'nao_conforme' : 'conforme',
      detalhe:
        ult.status === 'divergente'
          ? `Divergência de R$ ${ult.divergencia.toFixed(2)} na competência ${ult.competencia}.`
          : `Conciliada na competência ${ult.competencia}.`,
      referenciaLegal: 'Art. 3 II e Art. 8 V da Lei (SIAFIC)',
    });
  }

  // 4. Bens dominicais (informativo) — desafetados, aptos à alienação.
  const dominicais = dominicaisP + dominicaisI;
  itens.push({
    chave: 'bens_dominicais',
    categoria: 'Desafetação',
    descricao: 'Bens dominicais (desafetados)',
    status: 'conforme',
    detalhe: `${dominicais} bem(ns) na categoria dominical.`,
    referenciaLegal: 'Art. 22 da Lei',
  });

  const resumo = {
    conforme: itens.filter((i) => i.status === 'conforme').length,
    atencao: itens.filter((i) => i.status === 'atencao').length,
    naoConforme: itens.filter((i) => i.status === 'nao_conforme').length,
    total: itens.length,
  };

  return { geradoEm: now.toISOString(), resumo, itens };
};

// Alertas agregados (feed/badge) — itens que exigem ação (atencao/nao_conforme).
export const getAlertas = async (actor: Actor, now: Date = new Date()) => {
  const { itens } = await getChecklist(actor, now);
  const alertas = itens.filter((i) => i.status !== 'conforme');
  return {
    total: alertas.length,
    naoConforme: alertas.filter((i) => i.status === 'nao_conforme'),
    atencao: alertas.filter((i) => i.status === 'atencao'),
  };
};
