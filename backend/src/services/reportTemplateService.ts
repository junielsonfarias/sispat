import { Prisma } from '@prisma/client';
import { prisma } from '../index';

/**
 * Service de ReportTemplate — extraído do configController. Preserva a lógica
 * de geração de layout padrão, a deduplicação de `isDefault` e a distinção
 * entre não-encontrado (404) e de-outro-município (403) que o controller fazia.
 */

export class ReportTemplateNotFoundError extends Error {
  constructor() {
    super('Template não encontrado');
    this.name = 'ReportTemplateNotFoundError';
  }
}

export class ReportTemplateForbiddenError extends Error {
  constructor() {
    super('Acesso negado: template de outro município');
    this.name = 'ReportTemplateForbiddenError';
  }
}

export class ReportTemplateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportTemplateValidationError';
  }
}

export interface CreateReportTemplateInput {
  name?: string;
  layout?: Prisma.InputJsonValue;
  fields?: Prisma.InputJsonValue[];
  isDefault?: boolean;
}

export interface UpdateReportTemplateInput {
  name?: string;
  layout?: Prisma.InputJsonValue;
  fields?: Prisma.InputJsonValue[];
  isDefault?: boolean;
}

// Layout tabular padrão (header + tabela com os fields + footer), com estilos.
const tabularLayout = (fields: Prisma.InputJsonValue[]): Prisma.InputJsonValue => [
  {
    id: 'header',
    type: 'HEADER',
    x: 0,
    y: 0,
    w: 12,
    h: 1,
    styles: { paddingBottom: 16, borderBottomWidth: 2, borderStyle: 'solid' },
  },
  {
    id: 'table',
    type: 'TABLE',
    x: 0,
    y: 1,
    w: 12,
    h: 10,
    styles: { fontSize: 10 },
    props: { fields },
  },
  {
    id: 'footer',
    type: 'FOOTER',
    x: 0,
    y: 11,
    w: 12,
    h: 1,
    styles: {
      paddingTop: 16,
      fontSize: 8,
      textAlign: 'center',
      borderTopWidth: 1,
      borderStyle: 'solid',
    },
  },
];

// Layout padrão vazio (sem estilos), usado quando não há layout nem fields.
const emptyLayout = (): Prisma.InputJsonValue => [
  { id: 'header', type: 'HEADER', x: 0, y: 0, w: 12, h: 1 },
  { id: 'table', type: 'TABLE', x: 0, y: 1, w: 12, h: 10 },
  { id: 'footer', type: 'FOOTER', x: 0, y: 11, w: 12, h: 1 },
];

export const listReportTemplates = (municipalityId: string) =>
  prisma.reportTemplate.findMany({
    where: { municipalityId },
    orderBy: { createdAt: 'desc' },
  });

export const createReportTemplate = async (
  municipalityId: string,
  input: CreateReportTemplateInput,
) => {
  if (!input.name || input.name.trim() === '') {
    throw new ReportTemplateValidationError('Nome do template é obrigatório');
  }

  // Layout vazio ([]) é tratado como "sem layout" → regenerado a partir dos fields.
  // (O form baseado em campos manda [] de propósito; o editor visual manda layout
  // não-vazio, que é preservado.)
  let finalLayout: Prisma.InputJsonValue;
  if (Array.isArray(input.layout) && input.layout.length > 0) {
    finalLayout = input.layout;
  } else if (Array.isArray(input.fields) && input.fields.length > 0) {
    finalLayout = tabularLayout(input.fields);
  } else {
    finalLayout = emptyLayout();
  }

  // Se for marcado como padrão, desmarcar os outros do município
  if (input.isDefault) {
    await prisma.reportTemplate.updateMany({
      where: { municipalityId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.reportTemplate.create({
    data: {
      name: input.name.trim(),
      municipalityId,
      layout: finalLayout,
      isDefault: input.isDefault || false,
    },
  });
};

export const updateReportTemplate = async (
  municipalityId: string,
  id: string,
  input: UpdateReportTemplateInput,
) => {
  const existing = await prisma.reportTemplate.findUnique({ where: { id } });
  if (!existing) throw new ReportTemplateNotFoundError();
  // 404 (não 403) para recurso de outro município: não revela existência cross-tenant.
  if (existing.municipalityId !== municipalityId) throw new ReportTemplateNotFoundError();

  const updateData: Prisma.ReportTemplateUpdateInput = {};

  if (input.name !== undefined) {
    if (!input.name || input.name.trim() === '') {
      throw new ReportTemplateValidationError('Nome do template é obrigatório');
    }
    updateData.name = input.name.trim();
  }

  // Layout não-vazio (editor visual) é mantido; layout vazio/ausente + fields
  // (form de campos) regenera a tabela a partir dos fields — assim a alteração de
  // colunas não é mais descartada silenciosamente.
  if (Array.isArray(input.layout) && input.layout.length > 0) {
    updateData.layout = input.layout;
  } else if (Array.isArray(input.fields) && input.fields.length > 0) {
    updateData.layout = tabularLayout(input.fields);
  }

  if (input.isDefault !== undefined) {
    updateData.isDefault = input.isDefault;
    if (input.isDefault) {
      await prisma.reportTemplate.updateMany({
        where: { municipalityId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
  }

  return prisma.reportTemplate.update({ where: { id }, data: updateData });
};

export const removeReportTemplate = async (municipalityId: string, id: string): Promise<void> => {
  const existing = await prisma.reportTemplate.findUnique({ where: { id } });
  if (!existing) throw new ReportTemplateNotFoundError();
  // 404 (não 403) para recurso de outro município: não revela existência cross-tenant.
  if (existing.municipalityId !== municipalityId) throw new ReportTemplateNotFoundError();

  await prisma.reportTemplate.delete({ where: { id } });
};
