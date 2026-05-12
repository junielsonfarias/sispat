/**
 * transferController — adapta HTTP <-> transferService.
 *
 * Toda lógica (tenant, estado do patrimônio, snapshot previousStatus, cache)
 * vive em src/services/transferService.ts.
 */

import { Request, Response } from 'express';
import { logError } from '../config/logger';
import {
  Actor,
  TransferConflictError,
  TransferForbiddenError,
  TransferNotFoundError,
  TransferValidationError,
  approveTransfer as svcApprove,
  createTransfer as svcCreate,
  deleteTransfer as svcDelete,
  getTransfer as svcGet,
  listTransfers as svcList,
  rejectTransfer as svcReject,
} from '../services/transferService';

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
  if (error instanceof TransferNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof TransferForbiddenError) {
    res.status(403).json({ error: error.message });
    return;
  }
  if (error instanceof TransferConflictError) {
    res.status(409).json({ error: error.message });
    return;
  }
  if (error instanceof TransferValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  logError(`❌ ${fallback}`, error);
  res.status(500).json({ error: fallback });
};

export const listTransfers = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    const data = await svcList(req.query as Record<string, string>, actor);
    res.json(data);
  } catch (error) {
    sendError(res, error, 'Erro ao listar transferências');
  }
};

export const getTransfer = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    const data = await svcGet(req.params.id, actor);
    res.json(data);
  } catch (error) {
    sendError(res, error, 'Erro ao obter transferência');
  }
};

export const createTransfer = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    const transfer = await svcCreate(req.body, actor);
    res.status(201).json(transfer);
  } catch (error) {
    sendError(res, error, 'Erro ao criar transferência');
  }
};

export const approveTransfer = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    const updated = await svcApprove(req.params.id, req.body?.observacoes, actor);
    res.json(updated);
  } catch (error) {
    sendError(res, error, 'Erro ao aprovar transferência');
  }
};

export const rejectTransfer = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    const updated = await svcReject(req.params.id, req.body?.motivo, actor);
    res.json(updated);
  } catch (error) {
    sendError(res, error, 'Erro ao rejeitar transferência');
  }
};

export const deleteTransfer = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    await svcDelete(req.params.id, actor);
    res.status(204).send();
  } catch (error) {
    sendError(res, error, 'Erro ao deletar transferência');
  }
};
