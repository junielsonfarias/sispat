import { Request, Response } from 'express';
import { prisma } from '../index';
import { logError, logInfo, logDebug } from '../config/logger';

/**
 * municipalityController — gestão de municípios (tenants) pelo SUPERUSER.
 * Municípios são os próprios tenants do SISPAT; apenas o superuser administra.
 * Não há filtro por municipalityId aqui (o superuser opera sobre todos).
 */

// %3B... evita mass-assignment: só estes campos entram em create/update.
const sanitize = (body: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);
  if (str(body.name) !== undefined) out.name = str(body.name);
  if (str(body.state) !== undefined) out.state = str(body.state);
  if (body.logoUrl !== undefined) out.logoUrl = str(body.logoUrl) || null;
  if (body.footerText !== undefined) out.footerText = str(body.footerText) || null;
  if (str(body.primaryColor) !== undefined) out.primaryColor = str(body.primaryColor);
  return out;
};

/**
 * @desc    Listar municípios (com contagens de uso)
 * @route   GET /api/municipalities
 * @access  Superuser
 */
export const getMunicipalities = async (_req: Request, res: Response): Promise<void> => {
  try {
    const municipalities = await prisma.municipality.findMany({
      include: {
        _count: {
          select: { users: true, patrimonios: true, sectors: true, imoveis: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(municipalities);
  } catch (error) {
    logError('Erro ao listar municípios', error);
    res.status(500).json({ error: 'Erro ao listar municípios' });
  }
};

/**
 * @desc    Criar município
 * @route   POST /api/municipalities
 * @access  Superuser
 */
export const createMunicipality = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = sanitize(req.body);
    if (!data.name || !data.state) {
      res.status(400).json({ error: 'Nome e estado (UF) são obrigatórios.' });
      return;
    }

    const municipality = await prisma.municipality.create({ data: data as never });
    logInfo('✅ Município criado', { id: municipality.id, name: municipality.name });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE_MUNICIPALITY',
        entityType: 'Municipality',
        entityId: municipality.id,
        details: `Município "${municipality.name}" criado`,
      },
    });

    res.status(201).json(municipality);
  } catch (error) {
    logError('Erro ao criar município', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao criar município' });
  }
};

/**
 * @desc    Atualizar município
 * @route   PUT /api/municipalities/:id
 * @access  Superuser
 */
export const updateMunicipality = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existente = await prisma.municipality.findUnique({ where: { id } });
    if (!existente) {
      res.status(404).json({ error: 'Município não encontrado' });
      return;
    }

    const data = sanitize(req.body);
    logDebug('🔧 Atualizando município', { id, campos: Object.keys(data) });

    const municipality = await prisma.municipality.update({ where: { id }, data });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE_MUNICIPALITY',
        entityType: 'Municipality',
        entityId: id,
        details: `Município "${municipality.name}" atualizado`,
      },
    });

    res.json(municipality);
  } catch (error) {
    logError('Erro ao atualizar município', error, { municipalityId: req.params.id });
    res.status(500).json({ error: 'Erro ao atualizar município' });
  }
};

/**
 * @desc    Excluir município (bloqueado se houver dados vinculados)
 * @route   DELETE /api/municipalities/:id
 * @access  Superuser
 */
export const deleteMunicipality = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const municipality = await prisma.municipality.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, patrimonios: true, sectors: true, imoveis: true },
        },
      },
    });
    if (!municipality) {
      res.status(404).json({ error: 'Município não encontrado' });
      return;
    }

    const { users, patrimonios, sectors, imoveis } = municipality._count;
    if (users + patrimonios + sectors + imoveis > 0) {
      res.status(400).json({
        error:
          'Não é possível excluir: o município possui usuários, setores, bens ou imóveis vinculados.',
      });
      return;
    }

    await prisma.municipality.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE_MUNICIPALITY',
        entityType: 'Municipality',
        entityId: id,
        details: `Município "${municipality.name}" excluído`,
      },
    });

    res.json({ message: 'Município excluído com sucesso' });
  } catch (error) {
    logError('Erro ao excluir município', error, { municipalityId: req.params.id });
    res.status(500).json({ error: 'Erro ao excluir município' });
  }
};
