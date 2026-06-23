/**
 * desfazimentoController — adapta HTTP <-> desfazimentoService.
 */

import { Request, Response } from 'express';
import { logError } from '../config/logger';
import {
  Actor,
  DesfazimentoNotFoundError,
  DesfazimentoValidationError,
  cancelarDesfazimento as svcCancelar,
  concluirDesfazimento as svcConcluir,
  createDesfazimento as svcCreate,
  deleteDesfazimento as svcDelete,
  getDesfazimentoById as svcGetById,
  listDesfazimentos as svcList,
  updateDesfazimento as svcUpdate,
} from '../services/desfazimentoService';

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
  if (error instanceof DesfazimentoNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof DesfazimentoValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  logError(`❌ ${fallback}`, error);
  res.status(500).json({ error: fallback });
};

export const getDesfazimentos = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcList(req.query as Record<string, string>, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao listar desfazimentos');
  }
};

export const getDesfazimentoById = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcGetById(req.params.id, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao buscar desfazimento');
  }
};

export const createDesfazimento = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.status(201).json(await svcCreate(req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao criar desfazimento');
  }
};

export const updateDesfazimento = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcUpdate(req.params.id, req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao atualizar desfazimento');
  }
};

export const concluirDesfazimento = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcConcluir(req.params.id, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao concluir desfazimento');
  }
};

export const cancelarDesfazimento = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcCancelar(req.params.id, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao cancelar desfazimento');
  }
};

export const deleteDesfazimento = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    await svcDelete(req.params.id, actor);
    res.json({ message: 'Desfazimento excluído com sucesso' });
  } catch (error) {
    sendError(res, error, 'Erro ao excluir desfazimento');
  }
};
