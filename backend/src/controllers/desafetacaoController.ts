/**
 * desafetacaoController — adapta HTTP <-> desafetacaoService.
 */

import { Request, Response } from 'express';
import { logError } from '../config/logger';
import {
  Actor,
  DesafetacaoNotFoundError,
  DesafetacaoValidationError,
  cancelarDesafetacao as svcCancelar,
  concluirDesafetacao as svcConcluir,
  createDesafetacao as svcCreate,
  deleteDesafetacao as svcDelete,
  getDesafetacaoById as svcGetById,
  listDesafetacoes as svcList,
  reclassificarDestinacao as svcReclassificar,
  updateDesafetacao as svcUpdate,
} from '../services/desafetacaoService';

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
  if (error instanceof DesafetacaoNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof DesafetacaoValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  logError(`❌ ${fallback}`, error);
  res.status(500).json({ error: fallback });
};

export const getDesafetacoes = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcList(req.query as Record<string, string>, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao listar desafetações');
  }
};

export const getDesafetacaoById = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcGetById(req.params.id, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao buscar desafetação');
  }
};

export const createDesafetacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.status(201).json(await svcCreate(req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao criar desafetação');
  }
};

export const updateDesafetacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcUpdate(req.params.id, req.body, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao atualizar desafetação');
  }
};

export const concluirDesafetacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcConcluir(req.params.id, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao concluir desafetação');
  }
};

export const cancelarDesafetacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcCancelar(req.params.id, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao cancelar desafetação');
  }
};

export const deleteDesafetacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    await svcDelete(req.params.id, actor);
    res.json({ message: 'Desafetação excluída com sucesso' });
  } catch (error) {
    sendError(res, error, 'Erro ao excluir desafetação');
  }
};

// Reclassificação direta da destinação (revisão do acervo). tipo: patrimonio|imovel
export const reclassificarDestinacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const tipo = req.params.tipo;
  if (tipo !== 'patrimonio' && tipo !== 'imovel') {
    res.status(400).json({ error: 'Tipo deve ser patrimonio ou imovel' });
    return;
  }
  try {
    res.json(await svcReclassificar(tipo, req.params.bemId, req.body.destinacao, actor));
  } catch (error) {
    sendError(res, error, 'Erro ao reclassificar destinação');
  }
};
