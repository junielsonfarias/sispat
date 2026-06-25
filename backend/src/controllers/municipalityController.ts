import { Request, Response } from 'express';
import { logError, logInfo } from '../config/logger';
import {
  listMunicipalities as svcList,
  createMunicipality as svcCreate,
  updateMunicipality as svcUpdate,
  deleteMunicipality as svcDelete,
  MunicipalityValidationError,
  MunicipalityNotFoundError,
  MunicipalityConflictError,
} from '../services/municipalityService';

/**
 * municipalityController — gestão de municípios (tenants) pelo SUPERUSER.
 * Controllers finos: regras de negócio em services/municipalityService.ts.
 * Autorização superuser garantida nas rotas (authorize('superuser')).
 */

/** GET /api/municipalities */
export const getMunicipalities = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json(await svcList());
  } catch (error) {
    logError('Erro ao listar municípios', error);
    res.status(500).json({ error: 'Erro ao listar municípios' });
  }
};

/** POST /api/municipalities */
export const createMunicipality = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipality = await svcCreate(req.body, req.user!.userId);
    logInfo('✅ Município criado', { id: municipality.id, name: municipality.name });
    res.status(201).json(municipality);
  } catch (error) {
    if (error instanceof MunicipalityValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    logError('Erro ao criar município', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao criar município' });
  }
};

/** PUT /api/municipalities/:id */
export const updateMunicipality = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipality = await svcUpdate(req.params.id, req.body, req.user!.userId);
    res.json(municipality);
  } catch (error) {
    if (error instanceof MunicipalityNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    logError('Erro ao atualizar município', error, { municipalityId: req.params.id });
    res.status(500).json({ error: 'Erro ao atualizar município' });
  }
};

/** DELETE /api/municipalities/:id */
export const deleteMunicipality = async (req: Request, res: Response): Promise<void> => {
  try {
    await svcDelete(req.params.id, req.user!.userId);
    res.json({ message: 'Município excluído com sucesso' });
  } catch (error) {
    if (error instanceof MunicipalityNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof MunicipalityConflictError) {
      res.status(400).json({ error: error.message });
      return;
    }
    logError('Erro ao excluir município', error, { municipalityId: req.params.id });
    res.status(500).json({ error: 'Erro ao excluir município' });
  }
};
