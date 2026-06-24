/**
 * regularizacaoController — adapta HTTP <-> regularizacaoService.
 */

import { Request, Response } from 'express';
import { logError } from '../config/logger';
import {
  Actor,
  RegularizacaoNotFoundError,
  RegularizacaoValidationError,
  cancelarRegularizacao as svcCancelar,
  createRegularizacao as svcCreate,
  deleteRegularizacao as svcDelete,
  getRegularizacaoById as svcGetById,
  incorporarRegularizacao as svcIncorporar,
  incorporarRegularizacaoLote as svcIncorporarLote,
  listRegularizacoes as svcList,
  updateRegularizacao as svcUpdate,
} from '../services/regularizacaoService';

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
  if (error instanceof RegularizacaoNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof RegularizacaoValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  logError(`❌ ${fallback}`, error);
  res.status(500).json({ error: fallback });
};

export const getRegularizacoes = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcList(req.query as Record<string, string>, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao listar regularizações');
  }
};

export const getRegularizacaoById = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcGetById(req.params.id, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao buscar regularização');
  }
};

export const createRegularizacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.status(201).json(await svcCreate(req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao criar regularização');
  }
};

export const updateRegularizacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcUpdate(req.params.id, req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao atualizar regularização');
  }
};

export const incorporarRegularizacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.status(201).json(await svcIncorporar(req.params.id, req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao incorporar regularização');
  }
};

export const incorporarRegularizacaoLote = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.status(201).json(await svcIncorporarLote(req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao incorporar regularizações em lote');
  }
};

export const cancelarRegularizacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcCancelar(req.params.id, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao cancelar regularização');
  }
};

export const deleteRegularizacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    await svcDelete(req.params.id, actor);
    res.json({ message: 'Regularização excluída com sucesso' });
  } catch (error) {
    sendError(res, error, 'Erro ao excluir regularização');
  }
};
