import { Prisma } from '@prisma/client';
import { prisma } from '../index';

/** Service de NumberingPattern — extraído do configController. Keyed por municipalityId. */

/** Busca o padrão do município; cria um padrão vazio se não existir. */
export const getNumberingPattern = async (municipalityId: string) => {
  const existing = await prisma.numberingPattern.findUnique({ where: { municipalityId } });
  if (existing) return existing;
  return prisma.numberingPattern.create({ data: { municipalityId, components: [] } });
};

export const upsertNumberingPattern = (
  municipalityId: string,
  components: Prisma.InputJsonValue,
) =>
  prisma.numberingPattern.upsert({
    where: { municipalityId },
    update: { components },
    create: { municipalityId, components },
  });
