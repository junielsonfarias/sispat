import { Prisma } from '@prisma/client';
import { prisma } from '../index';

/** Service de UserReportConfig — extraído do configController. Escopo por userId. */

export class UserReportConfigNotFoundError extends Error {
  constructor() {
    super('Configuração não encontrada');
    this.name = 'UserReportConfigNotFoundError';
  }
}

export interface CreateUserReportConfigInput {
  name: string;
  columns: Prisma.InputJsonValue;
  filters?: Prisma.InputJsonValue;
  format?: string;
}

export const listUserReportConfigs = (userId: string) =>
  prisma.userReportConfig.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });

export const createUserReportConfig = (userId: string, input: CreateUserReportConfigInput) =>
  prisma.userReportConfig.create({
    data: {
      userId,
      name: input.name,
      columns: input.columns,
      filters: input.filters ?? {},
      format: input.format || 'csv',
    },
  });

export const removeUserReportConfig = async (userId: string, id: string): Promise<void> => {
  const existing = await prisma.userReportConfig.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new UserReportConfigNotFoundError();
  await prisma.userReportConfig.delete({ where: { id } });
};
