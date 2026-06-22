import { Prisma } from '@prisma/client';
import { prisma } from '../index';

/** Service de ImovelReportTemplate — extraído do configController (CRUD padrão). */

export interface Actor {
  role: string;
  municipalityId: string;
}

export class ImovelReportTemplateNotFoundError extends Error {
  constructor() {
    super('Template não encontrado');
    this.name = 'ImovelReportTemplateNotFoundError';
  }
}

export interface CreateImovelReportTemplateInput {
  name: string;
  fields: string[];
  filters?: Prisma.InputJsonValue;
}

export interface UpdateImovelReportTemplateInput {
  name?: string;
  fields?: string[];
  filters?: Prisma.InputJsonValue;
}

const ownershipWhere = (actor: Actor, id: string): Prisma.ImovelReportTemplateWhereInput => ({
  id,
  ...(actor.role === 'superuser' ? {} : { municipalityId: actor.municipalityId }),
});

export const listImovelReportTemplates = (actor: Actor) =>
  prisma.imovelReportTemplate.findMany({
    where: { municipalityId: actor.municipalityId },
    orderBy: { createdAt: 'desc' },
  });

export const createImovelReportTemplate = (actor: Actor, input: CreateImovelReportTemplateInput) =>
  prisma.imovelReportTemplate.create({
    data: {
      name: input.name,
      municipalityId: actor.municipalityId,
      fields: input.fields,
      filters: input.filters,
    },
  });

export const updateImovelReportTemplate = async (
  actor: Actor,
  id: string,
  input: UpdateImovelReportTemplateInput,
) => {
  const existing = await prisma.imovelReportTemplate.findFirst({
    where: ownershipWhere(actor, id),
    select: { id: true },
  });
  if (!existing) throw new ImovelReportTemplateNotFoundError();

  return prisma.imovelReportTemplate.update({
    where: { id },
    data: { name: input.name, fields: input.fields, filters: input.filters },
  });
};

export const removeImovelReportTemplate = async (actor: Actor, id: string): Promise<void> => {
  const existing = await prisma.imovelReportTemplate.findFirst({
    where: ownershipWhere(actor, id),
    select: { id: true },
  });
  if (!existing) throw new ImovelReportTemplateNotFoundError();

  await prisma.imovelReportTemplate.delete({ where: { id } });
};
