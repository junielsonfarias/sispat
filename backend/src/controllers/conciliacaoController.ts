/**
 * conciliacaoController — adapta HTTP <-> conciliacaoService.
 */

import { Request, Response } from 'express';
import { logError } from '../config/logger';
import {
  Actor,
  ConciliacaoNotFoundError,
  ConciliacaoValidationError,
  createConciliacao as svcCreate,
  deleteConciliacao as svcDelete,
  getConciliacaoById as svcGetById,
  listConciliacoes as svcList,
  recalcularConciliacao as svcRecalcular,
  bensSemParametrosDepreciacao as svcBensSemDepreciacao,
} from '../services/conciliacaoService';

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
  if (error instanceof ConciliacaoNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof ConciliacaoValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  logError(`❌ ${fallback}`, error);
  res.status(500).json({ error: fallback });
};

export const getConciliacoes = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcList(req.query as Record<string, string>, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao listar conciliações');
  }
};

export const getAlertaDepreciacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcBensSemDepreciacao(actor));
  } catch (error) {
    sendError(res, error, 'Erro ao apurar bens sem parâmetros de depreciação');
  }
};

export const getConciliacaoById = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcGetById(req.params.id, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao buscar conciliação');
  }
};

export const createConciliacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.status(201).json(await svcCreate(req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao criar conciliação');
  }
};

export const recalcularConciliacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcRecalcular(req.params.id, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao recalcular conciliação');
  }
};

export const deleteConciliacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    await svcDelete(req.params.id, actor);
    res.json({ message: 'Conciliação excluída com sucesso' });
  } catch (error) {
    sendError(res, error, 'Erro ao excluir conciliação');
  }
};
