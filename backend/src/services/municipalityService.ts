/**
 * municipalityService — regras de negócio de Municípios (tenants).
 * Apenas o superuser administra municípios (autorização garantida na rota).
 * O controller só orquestra HTTP; a lógica (Prisma, regra de exclusão,
 * auditoria) vive aqui (padrão CLAUDE.md §4).
 */
import { prisma } from '../config/database';

export class MunicipalityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MunicipalityValidationError';
  }
}
export class MunicipalityNotFoundError extends Error {
  constructor() {
    super('Município não encontrado');
    this.name = 'MunicipalityNotFoundError';
  }
}
export class MunicipalityConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MunicipalityConflictError';
  }
}

export interface MunicipalityInput {
  name?: unknown;
  state?: unknown;
  logoUrl?: unknown;
  footerText?: unknown;
  primaryColor?: unknown;
}

// Whitelist + trim. A rota já valida via Zod; isto é defesa-em-profundidade
// (evita mass-assignment caso o service seja chamado de outro ponto).
const sanitize = (body: MunicipalityInput): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);
  if (str(body.name) !== undefined) out.name = str(body.name);
  if (str(body.state) !== undefined) out.state = str(body.state);
  if (body.logoUrl !== undefined) out.logoUrl = str(body.logoUrl) || null;
  if (body.footerText !== undefined) out.footerText = str(body.footerText) || null;
  if (str(body.primaryColor) !== undefined) out.primaryColor = str(body.primaryColor);
  return out;
};

export const listMunicipalities = () =>
  prisma.municipality.findMany({
    include: {
      _count: { select: { users: true, patrimonios: true, sectors: true, imoveis: true } },
    },
    orderBy: { name: 'asc' },
  });

export const createMunicipality = async (body: MunicipalityInput, actorUserId: string) => {
  const data = sanitize(body);
  if (!data.name || !data.state) {
    throw new MunicipalityValidationError('Nome e estado (UF) são obrigatórios.');
  }

  const municipality = await prisma.municipality.create({ data: data as never });
  await prisma.activityLog.create({
    data: {
      userId: actorUserId,
      action: 'CREATE_MUNICIPALITY',
      entityType: 'Municipality',
      entityId: municipality.id,
      details: `Município "${municipality.name}" criado`,
    },
  });
  return municipality;
};

export const updateMunicipality = async (
  id: string,
  body: MunicipalityInput,
  actorUserId: string,
) => {
  const existente = await prisma.municipality.findUnique({ where: { id } });
  if (!existente) throw new MunicipalityNotFoundError();

  const municipality = await prisma.municipality.update({ where: { id }, data: sanitize(body) });
  await prisma.activityLog.create({
    data: {
      userId: actorUserId,
      action: 'UPDATE_MUNICIPALITY',
      entityType: 'Municipality',
      entityId: id,
      details: `Município "${municipality.name}" atualizado`,
    },
  });
  return municipality;
};

export const deleteMunicipality = async (id: string, actorUserId: string) => {
  const municipality = await prisma.municipality.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, patrimonios: true, sectors: true, imoveis: true } },
    },
  });
  if (!municipality) throw new MunicipalityNotFoundError();

  const { users, patrimonios, sectors, imoveis } = municipality._count;
  if (users + patrimonios + sectors + imoveis > 0) {
    throw new MunicipalityConflictError(
      'Não é possível excluir: o município possui usuários, setores, bens ou imóveis vinculados.',
    );
  }

  await prisma.municipality.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      userId: actorUserId,
      action: 'DELETE_MUNICIPALITY',
      entityType: 'Municipality',
      entityId: id,
      details: `Município "${municipality.name}" excluído`,
    },
  });
};
