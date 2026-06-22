import { prisma } from '../index';

/**
 * Service de CloudStorage — extraído do god-controller configController.
 * Keyed por municipalityId (@unique); não há ownership por id, então recebe o
 * municipalityId diretamente.
 */

export interface CloudStorageInput {
  provider?: string | null;
  isConnected?: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: Date | string | null;
}

/** Busca a config do município; cria uma vazia (desconectada) se não existir. */
export const getCloudStorage = async (municipalityId: string) => {
  const existing = await prisma.cloudStorage.findUnique({ where: { municipalityId } });
  if (existing) return existing;
  return prisma.cloudStorage.create({
    data: { municipalityId, isConnected: false },
  });
};

export const upsertCloudStorage = (municipalityId: string, input: CloudStorageInput) =>
  prisma.cloudStorage.upsert({
    where: { municipalityId },
    update: {
      provider: input.provider,
      isConnected: input.isConnected,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
    },
    create: {
      municipalityId,
      provider: input.provider,
      isConnected: input.isConnected,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
    },
  });
