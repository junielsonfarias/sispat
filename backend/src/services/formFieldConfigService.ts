import { Prisma } from '@prisma/client';
import { prisma } from '../index';

/** Service de FormFieldConfig — extraído do god-controller configController. */

export interface Actor {
  role: string;
  municipalityId: string;
}

export class FormFieldConfigNotFoundError extends Error {
  constructor() {
    super('Configuração de campo não encontrada');
    this.name = 'FormFieldConfigNotFoundError';
  }
}

export interface CreateFormFieldConfigInput {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  defaultValue?: string | null;
  options?: string[];
  isCustom?: boolean;
  isSystem?: boolean;
}

export interface UpdateFormFieldConfigInput {
  key?: string;
  label?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | null;
  options?: string[];
  isCustom?: boolean;
  isSystem?: boolean;
}

const ownershipWhere = (actor: Actor, id: string): Prisma.FormFieldConfigWhereInput => ({
  id,
  ...(actor.role === 'superuser' ? {} : { municipalityId: actor.municipalityId }),
});

export const listFormFieldConfigs = (actor: Actor) =>
  prisma.formFieldConfig.findMany({
    where: { municipalityId: actor.municipalityId },
    orderBy: { id: 'asc' },
  });

export const createFormFieldConfig = (actor: Actor, input: CreateFormFieldConfigInput) =>
  prisma.formFieldConfig.create({
    data: {
      key: input.key,
      label: input.label,
      type: input.type,
      required: input.required || false,
      defaultValue: input.defaultValue,
      options: input.options || [],
      isCustom: input.isCustom || false,
      isSystem: input.isSystem || false,
      municipalityId: actor.municipalityId,
    },
  });

export const updateFormFieldConfig = async (
  actor: Actor,
  id: string,
  input: UpdateFormFieldConfigInput,
) => {
  const existing = await prisma.formFieldConfig.findFirst({
    where: ownershipWhere(actor, id),
    select: { id: true },
  });
  if (!existing) throw new FormFieldConfigNotFoundError();

  return prisma.formFieldConfig.update({
    where: { id },
    data: {
      key: input.key,
      label: input.label,
      type: input.type,
      required: input.required,
      defaultValue: input.defaultValue,
      options: input.options,
      isCustom: input.isCustom,
      isSystem: input.isSystem,
    },
  });
};

export const removeFormFieldConfig = async (actor: Actor, id: string): Promise<void> => {
  const existing = await prisma.formFieldConfig.findFirst({
    where: ownershipWhere(actor, id),
    select: { id: true },
  });
  if (!existing) throw new FormFieldConfigNotFoundError();

  await prisma.formFieldConfig.delete({ where: { id } });
};
