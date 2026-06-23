/**
 * termosController — emite os dados estruturados de um termo patrimonial.
 */

import { Request, Response } from 'express';
import { logError } from '../config/logger';
import {
  Actor,
  TermoNotFoundError,
  TermoValidationError,
  TipoTermo,
  getTermo as svcGetTermo,
} from '../services/termosService';

const TIPOS_VALIDOS: TipoTermo[] = ['carga', 'incorporacao', 'baixa'];

const buildActor = (req: Request): Actor | null => {
  if (!req.user?.userId || !req.user.role || !req.user.municipalityId) return null;
  return {
    userId: req.user.userId,
    role: req.user.role,
    municipalityId: req.user.municipalityId,
    email: req.user.email,
  };
};

export const getTermo = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const tipo = req.params.tipo as TipoTermo;
  if (!TIPOS_VALIDOS.includes(tipo)) {
    res.status(400).json({ error: `Tipo de termo inválido. Use: ${TIPOS_VALIDOS.join(', ')}` });
    return;
  }
  try {
    res.json(await svcGetTermo(tipo, req.params.patrimonioId, actor));
  } catch (error) {
    if (error instanceof TermoNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof TermoValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    logError('❌ Erro ao gerar termo', error);
    res.status(500).json({ error: 'Erro ao gerar termo' });
  }
};
