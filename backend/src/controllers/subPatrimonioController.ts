/**
 * subPatrimonioController — adapta HTTP <-> subPatrimonioService (B2).
 * Rotas aninhadas sob /api/patrimonios/:patrimonioId/sub-patrimonios.
 */

import { Request, Response } from 'express';
import { logError } from '../config/logger';
import {
  Actor,
  SubPatrimonioNotFoundError,
  SubPatrimonioValidationError,
  listSubPatrimonios as svcList,
  createSubPatrimonio as svcCreate,
  updateSubPatrimonio as svcUpdate,
  deleteSubPatrimonio as svcDelete,
  bulkUpdateStatus as svcBulk,
} from '../services/subPatrimonioService';

const buildActor = (req: Request): Actor | null => {
  if (!req.user?.userId || !req.user.role || !req.user.municipalityId) return null;
  return {
    userId: req.user.userId,
    role: req.user.role,
    municipalityId: req.user.municipalityId,
    email: req.user.email,
  };
};

const sendError = (res: Response, error: unknown, fallback: string): void => {
  if (error instanceof SubPatrimonioNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof SubPatrimonioValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  logError(`❌ ${fallback}`, error);
  res.status(500).json({ error: fallback });
};

export const getSubPatrimonios = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcList(req.params.patrimonioId, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao listar sub-patrimônios');
  }
};

export const createSubPatrimonio = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.status(201).json(await svcCreate(req.params.patrimonioId, req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao criar sub-patrimônio');
  }
};

export const updateSubPatrimonio = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcUpdate(req.params.id, req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao atualizar sub-patrimônio');
  }
};

export const deleteSubPatrimonio = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    await svcDelete(req.params.id, actor);
    res.json({ message: 'Sub-patrimônio excluído com sucesso' });
  } catch (error) {
    sendError(res, error, 'Erro ao excluir sub-patrimônio');
  }
};

export const bulkStatusSubPatrimonios = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    const count = await svcBulk(
      req.params.patrimonioId,
      req.body.ids,
      req.body.status,
      actor,
    );
    res.json({ count });
  } catch (error) {
    sendError(res, error, 'Erro ao atualizar sub-patrimônios em lote');
  }
};
