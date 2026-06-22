import { Request, Response } from 'express';
import {
  type Actor,
  type ListQuery,
  PatrimonioConflictError,
  PatrimonioForbiddenError,
  PatrimonioNotFoundError,
  addNote as svcAddNote,
  createPatrimonio as svcCreate,
  deletePatrimonio as svcDelete,
  gerarNumeroPatrimonial as svcGerarNumero,
  getByNumero as svcGetByNumero,
  getPatrimonioById as svcGetById,
  getPublicPatrimonioByNumero as svcGetPublicByNumero,
  listPatrimonios as svcList,
  listPublicPatrimonios as svcListPublic,
  registrarBaixa as svcRegistrarBaixa,
  updatePatrimonio as svcUpdate,
} from '../services/patrimonioService';
import { logError, logInfo } from '../config/logger';

/**
 * Controllers de Patrimônio — finos, só orquestram HTTP.
 * Regras de negócio em `services/patrimonioService.ts`.
 */

const asActor = (req: Request): Actor | null => {
  if (!req.user) return null;
  return {
    userId: req.user.userId,
    role: req.user.role,
    municipalityId: req.user.municipalityId,
    name: (req.user as { name?: string }).name,
  };
};

const auditFromReq = (req: Request) => ({
  ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
  userAgent: req.get('user-agent') || 'unknown',
});

/**
 * Listar patrimônios públicos (sem autenticação)
 * GET /api/public/patrimonios
 */
export const listPublicPatrimonios = async (_req: Request, res: Response): Promise<void> => {
  try {
    const patrimonios = await svcListPublic();
    res.json({ patrimonios });
  } catch (error) {
    logError('Erro ao listar patrimônios públicos', error);
    res.status(500).json({ error: 'Erro ao listar patrimônios' });
  }
};

/**
 * Buscar patrimônio público por número (sem autenticação)
 * GET /api/public/patrimonios/:numero
 */
export const getPublicPatrimonioByNumero = async (req: Request, res: Response): Promise<void> => {
  try {
    const patrimonio = await svcGetPublicByNumero(req.params.numero);
    if (!patrimonio) {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }
    res.json({ patrimonio });
  } catch (error) {
    logError('Erro ao buscar patrimônio público', error, { numero: req.params.numero });
    res.status(500).json({ error: 'Erro ao buscar patrimônio' });
  }
};

/**
 * Listar patrimônios com filtros
 * GET /api/patrimonios
 */
export const listPatrimonios = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = asActor(req);
    if (!actor) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const result = await svcList(req.query as ListQuery, actor);
    res.json(result);
  } catch (error) {
    logError('Erro ao listar patrimônios', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao listar patrimônios' });
  }
};

/**
 * Obter patrimônio por ID
 * GET /api/patrimonios/:id
 */
export const getPatrimonio = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = asActor(req);
    if (!actor) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const result = await svcGetById(req.params.id, actor);
    if (result.kind === 'not-found') {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }
    if (result.kind === 'forbidden') {
      res.status(403).json({ error: 'Acesso negado: sem permissão para este setor' });
      return;
    }
    res.json({ patrimonio: result.patrimonio });
  } catch (error) {
    logError('Erro ao buscar patrimônio', error, { patrimonioId: req.params.id });
    res.status(500).json({ error: 'Erro ao buscar patrimônio' });
  }
};

/**
 * Buscar patrimônio por número
 * GET /api/patrimonios/numero/:numero
 */
export const getByNumero = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = asActor(req);
    if (!actor) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const result = await svcGetByNumero(req.params.numero, actor);
    if (result.kind === 'not-found') {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }
    if (result.kind === 'forbidden') {
      res.status(403).json({ error: 'Acesso negado: sem permissão para este setor' });
      return;
    }
    res.json({ patrimonio: result.patrimonio });
  } catch (error) {
    logError('Erro ao buscar patrimônio por número', error, { numero: req.params.numero });
    res.status(500).json({ error: 'Erro ao buscar patrimônio' });
  }
};

/**
 * Gerar próximo número patrimonial (atômico)
 * GET /api/patrimonios/gerar-numero
 */
export const gerarNumeroPatrimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prefix, year, sectorCode } = req.query as Record<string, string | undefined>;
    const result = await svcGerarNumero({ prefix, year, sectorCode });
    res.json(result);
  } catch (error) {
    logError('Erro ao gerar número patrimonial', error, {
      prefix: req.query.prefix,
      year: req.query.year,
    });
    res.status(500).json({ error: 'Erro ao gerar número patrimonial' });
  }
};

/**
 * Criar patrimônio
 * POST /api/patrimonios
 */
export const createPatrimonio = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = asActor(req);
    if (!actor) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const body = req.body ?? {};
    if (!body.numero_patrimonio || !body.descricao_bem || !body.data_aquisicao || !body.valor_aquisicao || !body.sectorId) {
      res.status(400).json({
        error: 'Campos obrigatórios faltando (número, descrição, data aquisição, valor e setor)',
      });
      return;
    }

    const patrimonio = await svcCreate(body, actor, auditFromReq(req));
    logInfo('Patrimônio criado', { patrimonioId: patrimonio.id, numero: patrimonio.numero_patrimonio });
    res.status(201).json({ message: 'Patrimônio criado com sucesso', patrimonio });
  } catch (error) {
    if (error instanceof PatrimonioConflictError) {
      res.status(400).json({ error: error.message });
      return;
    }
    logError('Erro ao criar patrimônio', error, {
      numero_patrimonio: req.body?.numero_patrimonio,
      userId: req.user?.userId,
    });
    res.status(500).json({
      error: 'Erro ao criar patrimônio',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Atualizar patrimônio
 * PUT /api/patrimonios/:id
 */
export const updatePatrimonio = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = asActor(req);
    if (!actor) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const patrimonio = await svcUpdate(req.params.id, req.body ?? {}, actor, auditFromReq(req));
    res.json({ message: 'Patrimônio atualizado com sucesso', patrimonio });
  } catch (error) {
    if (error instanceof PatrimonioNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof PatrimonioForbiddenError) {
      res.status(403).json({ error: error.message });
      return;
    }
    logError('Erro ao atualizar patrimônio', error, {
      patrimonioId: req.params.id,
      userId: req.user?.userId,
    });
    res.status(500).json({
      error: 'Erro ao atualizar patrimônio',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Deletar patrimônio
 * DELETE /api/patrimonios/:id
 */
export const deletePatrimonio = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = asActor(req);
    if (!actor) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    await svcDelete(req.params.id, actor, auditFromReq(req));
    res.json({ message: 'Patrimônio deletado com sucesso' });
  } catch (error) {
    if (error instanceof PatrimonioNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof PatrimonioForbiddenError) {
      res.status(403).json({ error: error.message });
      return;
    }
    logError('Erro ao deletar patrimônio', error, {
      patrimonioId: req.params.id,
      userId: req.user?.userId,
    });
    res.status(500).json({ error: 'Erro ao deletar patrimônio' });
  }
};

/**
 * Adicionar observação ao patrimônio
 * POST /api/patrimonios/:id/notes
 */
export const addNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = asActor(req);
    if (!actor) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const note = await svcAddNote(req.params.id, req.body?.text, actor);
    res.status(201).json({
      message: 'Observação adicionada com sucesso',
      note: {
        id: note.id,
        text: note.text,
        date: note.date,
        userId: note.userId,
        userName: note.userName,
      },
    });
  } catch (error) {
    if (error instanceof PatrimonioConflictError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof PatrimonioNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    logError('Erro ao adicionar observação', error, {
      patrimonioId: req.params.id,
      userId: req.user?.userId,
    });
    res.status(500).json({
      error: 'Erro ao adicionar observação',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

/**
 * Registrar baixa de patrimônio
 * POST /api/patrimonios/:id/baixa
 */
export const registrarBaixaPatrimonio = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = asActor(req);
    if (!actor) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { data_baixa, motivo_baixa, documentos_baixa, observacoes } = req.body ?? {};
    if (!data_baixa || !motivo_baixa) {
      res.status(400).json({ error: 'Data e motivo da baixa são obrigatórios' });
      return;
    }

    const patrimonio = await svcRegistrarBaixa(
      req.params.id,
      { data_baixa, motivo_baixa, documentos_baixa, observacoes },
      actor,
      auditFromReq(req),
    );
    res.json({ message: 'Baixa registrada com sucesso', patrimonio });
  } catch (error) {
    if (error instanceof PatrimonioNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof PatrimonioConflictError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof PatrimonioForbiddenError) {
      res.status(403).json({ error: error.message });
      return;
    }
    logError('Erro ao registrar baixa', error, {
      patrimonioId: req.params.id,
      userId: req.user?.userId,
    });
    res.status(500).json({ error: 'Erro ao registrar baixa do patrimônio' });
  }
};
