/**
 * comissaoController — adapta HTTP <-> comissaoService. Regra de negócio (tenant,
 * mandato, membros, alertas) vive no service.
 */

import { Request, Response } from 'express';
import { logError } from '../config/logger';
import {
  Actor,
  ComissaoNotFoundError,
  ComissaoValidationError,
  addMembro as svcAddMembro,
  createComissao as svcCreate,
  deleteComissao as svcDelete,
  getAlertas as svcAlertas,
  getComissaoById as svcGetById,
  listComissoes as svcList,
  removeMembro as svcRemoveMembro,
  updateComissao as svcUpdate,
} from '../services/comissaoService';

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
  if (error instanceof ComissaoNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof ComissaoValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  logError(`❌ ${fallback}`, error);
  res.status(500).json({ error: fallback });
};

export const getComissoes = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcList(req.query as Record<string, string>, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao listar comissões');
  }
};

export const getComissaoAlertas = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcAlertas(actor));
  } catch (error) {
    sendError(res, error, 'Erro ao obter alertas de comissões');
  }
};

export const getComissaoById = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcGetById(req.params.id, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao buscar comissão');
  }
};

export const createComissao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.status(201).json(await svcCreate(req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao criar comissão');
  }
};

export const updateComissao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcUpdate(req.params.id, req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao atualizar comissão');
  }
};

export const deleteComissao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    await svcDelete(req.params.id, actor);
    res.json({ message: 'Comissão excluída com sucesso' });
  } catch (error) {
    sendError(res, error, 'Erro ao excluir comissão');
  }
};

export const addComissaoMembro = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.status(201).json(await svcAddMembro(req.params.id, req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao adicionar membro');
  }
};

export const removeComissaoMembro = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    await svcRemoveMembro(req.params.id, req.params.membroId, actor);
    res.json({ message: 'Membro removido com sucesso' });
  } catch (error) {
    sendError(res, error, 'Erro ao remover membro');
  }
};
