import { Prisma } from '@prisma/client';
import { prisma } from '../index';

/** Service de UserDashboard — extraído do configController. Keyed por userId. */

/** Busca o dashboard do usuário; cria um vazio se não existir. */
export const getUserDashboard = async (userId: string) => {
  const existing = await prisma.userDashboard.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userDashboard.create({ data: { userId, widgets: [] } });
};

export const upsertUserDashboard = (userId: string, widgets: Prisma.InputJsonValue) =>
  prisma.userDashboard.upsert({
    where: { userId },
    update: { widgets },
    create: { userId, widgets },
  });
