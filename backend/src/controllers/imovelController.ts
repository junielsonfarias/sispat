/**
 * imovelController — orquestra a camada HTTP de imóveis.
 *
 * Lógica de negócio vive em `services/imovelService.ts`. Aqui só:
 *  - extrair body/params/user do request
 *  - chamar o service
 *  - mapear erros tipados (ImovelNotFoundError etc) para status HTTP
 *  - retornar resposta
 *
 * Padrão idêntico ao patrimonioController (estabelecido no Sprint 3).
 */

import { Request, Response } from 'express';
import { logError } from '../config/logger';
import * as imovelService from '../services/imovelService';
import {
  ImovelNotFoundError,
  ImovelConflictError,
  ImovelForbiddenError,
  ImovelValidationError,
  Actor,
} from '../services/imovelService';

/** Converte req.user em Actor; lança 401 se ausente. */
const requireActor = (req: Request): Actor | null => {
  if (!req.user) return null;
  return {
    userId: req.user.userId,
    role: req.user.role,
    municipalityId: req.user.municipalityId,
    email: req.user.email,
  };
};

const auditFrom = (req: Request) => ({
  ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
  userAgent: req.get('user-agent') || 'unknown',
});

/** Mapeia erros do service para status HTTP. */
const handleServiceError = (res: Response, error: unknown, defaultMessage: string): void => {
  if (error instanceof ImovelNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof ImovelForbiddenError) {
    res.status(403).json({ error: error.message });
    return;
  }
  if (error instanceof ImovelConflictError) {
    res.status(409).json({ error: error.message });
    return;
  }
  if (error instanceof ImovelValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  logError(defaultMessage, error);
  res.status(500).json({ error: defaultMessage });
};

/**
 * Listar imóveis com filtros
 * GET /api/imoveis
 */
export const listImoveis = async (req: Request, res: Response): Promise<void> => {
  const actor = requireActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  try {
    const result = await imovelService.listImoveis(req.query as any, actor);
    res.json(result);
  } catch (error) {
    handleServiceError(res, error, 'Erro ao listar imóveis');
  }
};

/**
 * Obter imóvel por ID
 * GET /api/imoveis/:id
 */
export const getImovel = async (req: Request, res: Response): Promise<void> => {
  const actor = requireActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  try {
    const imovel = await imovelService.getImovelById(req.params.id, actor);
    res.json({ imovel });
  } catch (error) {
    handleServiceError(res, error, 'Erro ao buscar imóvel');
  }
};

/**
 * Buscar imóvel por número
 * GET /api/imoveis/numero/:numero
 */
export const getByNumero = async (req: Request, res: Response): Promise<void> => {
  const actor = requireActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  try {
    const imovel = await imovelService.getImovelByNumero(req.params.numero, actor);
    res.json({ imovel });
  } catch (error) {
    handleServiceError(res, error, 'Erro ao buscar imóvel');
  }
};

/**
 * Criar imóvel
 * POST /api/imoveis
 */
export const createImovel = async (req: Request, res: Response): Promise<void> => {
  const actor = requireActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  try {
    const imovel = await imovelService.createImovel(req.body, actor, auditFrom(req));
    res.status(201).json({ message: 'Imóvel criado com sucesso', imovel });
  } catch (error) {
    handleServiceError(res, error, 'Erro ao criar imóvel');
  }
};

/**
 * Atualizar imóvel
 * PUT /api/imoveis/:id
 */
export const updateImovel = async (req: Request, res: Response): Promise<void> => {
  const actor = requireActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  try {
    const imovel = await imovelService.updateImovel(req.params.id, req.body, actor, auditFrom(req));
    res.json({ message: 'Imóvel atualizado com sucesso', imovel });
  } catch (error) {
    handleServiceError(res, error, 'Erro ao atualizar imóvel');
  }
};

/**
 * Deletar imóvel
 * DELETE /api/imoveis/:id
 */
export const deleteImovel = async (req: Request, res: Response): Promise<void> => {
  const actor = requireActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  try {
    await imovelService.deleteImovel(req.params.id, actor, auditFrom(req));
    res.json({ message: 'Imóvel deletado com sucesso' });
  } catch (error) {
    handleServiceError(res, error, 'Erro ao deletar imóvel');
  }
};

/**
 * Gerar próximo número de imóvel
 * GET /api/imoveis/gerar-numero
 */
export const gerarNumeroImovel = async (req: Request, res: Response): Promise<void> => {
  try {
    const sectorId = (req.query.sectorId as string) || '';
    const result = await imovelService.gerarNumeroImovel(sectorId);
    res.json(result);
  } catch (error) {
    handleServiceError(res, error, 'Erro ao gerar número de imóvel');
  }
};
