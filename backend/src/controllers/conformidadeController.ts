/**
 * conformidadeController — checklist de adequação à Lei de Gestão Patrimonial e
 * alertas agregados. Read-only.
 */

import { Request, Response } from 'express';
import { logError } from '../config/logger';
import { Actor, getAlertas as svcAlertas, getChecklist as svcChecklist } from '../services/conformidadeService';

const buildActor = (req: Request): Actor | null => {
  if (!req.user?.userId || !req.user.role || !req.user.municipalityId) return null;
  return {
    userId: req.user.userId,
    role: req.user.role,
    municipalityId: req.user.municipalityId,
    email: req.user.email,
  };
};

export const getConformidadeChecklist = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcChecklist(actor));
  } catch (error) {
    logError('❌ Erro ao gerar checklist de conformidade', error);
    res.status(500).json({ error: 'Erro ao gerar checklist de conformidade' });
  }
};

export const getConformidadeAlertas = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  try {
    res.json(await svcAlertas(actor));
  } catch (error) {
    logError('❌ Erro ao obter alertas de conformidade', error);
    res.status(500).json({ error: 'Erro ao obter alertas de conformidade' });
  }
};
