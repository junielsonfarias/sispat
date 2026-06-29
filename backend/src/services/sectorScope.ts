/**
 * Escopo de setor por papel (RBAC) — fonte única para listas/escrita.
 *
 * Regra (REGRAS_NEGOCIO §2, atualizado 2026-06-28):
 *  - superuser/admin/SUPERVISOR têm acesso total (sem filtro por setor).
 *  - usuario/visualizador são restritos aos setores em `responsibleSectors`,
 *    tanto na listagem quanto na escrita. SEM setor vinculado = SEM acesso.
 *
 * Mesma semântica de `hasFullAccess`/`ensureSectorAccess` em
 * patrimonioService/imovelService — centralizada aqui para reuso em
 * empréstimos, manutenções e inventários.
 */

import { prisma } from '../config/database';

export interface SectorActor {
  userId: string;
  role: string;
  municipalityId: string;
}

export const hasFullSectorAccess = (role: string): boolean =>
  role === 'superuser' || role === 'admin' || role === 'supervisor';

export interface SectorScope {
  /** Nomes dos setores vinculados (vazio = nenhum). */
  names: string[];
  /** IDs dos setores vinculados no município (vazio = nenhum). */
  ids: string[];
}

/**
 * Resolve o escopo de setor do ator.
 *  - `null`  => acesso total (não aplicar filtro por setor).
 *  - `{ names, ids }` => restringir a esses setores. Arrays vazios = sem acesso
 *    (deve resultar em "nenhum registro" nas listas e em bloqueio na escrita).
 */
export const resolveSectorScope = async (
  actor: SectorActor,
): Promise<SectorScope | null> => {
  if (hasFullSectorAccess(actor.role)) return null;

  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { responsibleSectors: true },
  });
  const names = user?.responsibleSectors ?? [];
  if (names.length === 0) return { names: [], ids: [] };

  const sectors = await prisma.sector.findMany({
    where: { name: { in: names }, municipalityId: actor.municipalityId },
    select: { id: true },
  });
  return { names, ids: sectors.map((s) => s.id) };
};
