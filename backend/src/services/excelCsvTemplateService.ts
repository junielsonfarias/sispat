import { Prisma } from '@prisma/client';
import { prisma } from '../index';

/**
 * Service de templates Excel/CSV — extraído do god-controller configController.
 * Padrão do projeto: regra/queries no service, controller só orquestra HTTP.
 * O `prisma` vem de '../index' (mesma instância que o controller usava) para
 * preservar exatamente o comportamento; unificar para config/database é tarefa
 * separada.
 */

export interface Actor {
  role: string;
  municipalityId: string;
}

export class ExcelCsvTemplateNotFoundError extends Error {
  constructor() {
    super('Template não encontrado');
    this.name = 'ExcelCsvTemplateNotFoundError';
  }
}

export interface CreateExcelCsvTemplateInput {
  name: string;
  columns: Prisma.InputJsonValue;
  conditionalFormatting?: Prisma.InputJsonValue;
}

export interface UpdateExcelCsvTemplateInput {
  name?: string;
  columns?: Prisma.InputJsonValue;
  conditionalFormatting?: Prisma.InputJsonValue;
}

// Escopo de propriedade: superuser acessa qualquer município; demais só o seu.
const ownershipWhere = (actor: Actor, id: string): Prisma.ExcelCsvTemplateWhereInput => ({
  id,
  ...(actor.role === 'superuser' ? {} : { municipalityId: actor.municipalityId }),
});

export const listExcelCsvTemplates = (actor: Actor) =>
  prisma.excelCsvTemplate.findMany({
    where: actor.role === 'superuser' ? {} : { municipalityId: actor.municipalityId },
    orderBy: { createdAt: 'desc' },
  });

export const createExcelCsvTemplate = (actor: Actor, input: CreateExcelCsvTemplateInput) =>
  prisma.excelCsvTemplate.create({
    data: {
      name: input.name,
      municipalityId: actor.municipalityId,
      columns: input.columns,
      conditionalFormatting: input.conditionalFormatting,
    },
  });

export const updateExcelCsvTemplate = async (
  actor: Actor,
  id: string,
  input: UpdateExcelCsvTemplateInput,
) => {
  const existing = await prisma.excelCsvTemplate.findFirst({
    where: ownershipWhere(actor, id),
    select: { id: true },
  });
  if (!existing) throw new ExcelCsvTemplateNotFoundError();

  return prisma.excelCsvTemplate.update({
    where: { id },
    data: {
      name: input.name,
      columns: input.columns,
      conditionalFormatting: input.conditionalFormatting,
    },
  });
};

export const removeExcelCsvTemplate = async (actor: Actor, id: string): Promise<void> => {
  const existing = await prisma.excelCsvTemplate.findFirst({
    where: ownershipWhere(actor, id),
    select: { id: true },
  });
  if (!existing) throw new ExcelCsvTemplateNotFoundError();

  await prisma.excelCsvTemplate.delete({ where: { id } });
};
