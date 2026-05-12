/**
 * inventarioController — apenas adapta HTTP <-> inventarioService.
 *
 * Toda regra de negócio (tenant, permissão por papel, criação transacional dos
 * inventory_items, cache) vive em src/services/inventarioService.ts.
 */

import { Request, Response } from 'express';
import { logError } from '../config/logger';
import {
  Actor,
  InventarioForbiddenError,
  InventarioNotFoundError,
  InventarioValidationError,
  createInventario as svcCreate,
  deleteInventario as svcDelete,
  getInventarioById as svcGetById,
  listInventarios as svcList,
  updateInventario as svcUpdate,
} from '../services/inventarioService';

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
  if (error instanceof InventarioNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof InventarioForbiddenError) {
    res.status(403).json({ error: error.message });
    return;
  }
  if (error instanceof InventarioValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  logError(`❌ ${fallback}`, error);
  res.status(500).json({
    error: fallback,
    details: error instanceof Error ? error.message : 'Erro desconhecido',
  });
};

export const getInventarios = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    const data = await svcList(req.query as Record<string, string>, actor);
    res.json(data);
  } catch (error) {
    sendError(res, error, 'Erro ao buscar inventários');
  }
};

export const getInventarioById = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    const data = await svcGetById(req.params.id, actor);
    res.json(data);
  } catch (error) {
    sendError(res, error, 'Erro ao buscar inventário');
  }
};

export const createInventario = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    const inventario = await svcCreate(req.body, actor);
    res.status(201).json(inventario);
  } catch (error) {
    sendError(res, error, 'Erro ao criar inventário');
  }
};

export const updateInventario = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    const updated = await svcUpdate(req.params.id, req.body, actor);
    res.json(updated);
  } catch (error) {
    sendError(res, error, 'Erro ao atualizar inventário');
  }
};

export const deleteInventario = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    await svcDelete(req.params.id, actor);
    res.json({ message: 'Inventário excluído com sucesso' });
  } catch (error) {
    sendError(res, error, 'Erro ao deletar inventário');
  }
};
