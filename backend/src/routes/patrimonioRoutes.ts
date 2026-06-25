import { Router } from 'express';
import { z } from 'zod';
import {
  listPatrimonios,
  getPatrimonio,
  getByNumero,
  gerarNumeroPatrimonial,
  createPatrimonio,
  updatePatrimonio,
  deletePatrimonio,
  distribuirPatrimonios,
  getPatrimonioStats,
  getHistoricoRecente,
  listPatrimoniosAnalytics,
  addNote,
  registrarBaixaPatrimonio,
} from '../controllers/patrimonioController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { reportRateLimiter } from '../middlewares/advanced-rate-limit';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createPatrimonioBodySchema,
  updatePatrimonioBodySchema,
  addNoteSchema,
  registrarBaixaSchema,
  paginationQuerySchema,
  uuidParamSchema,
} from '@sispat/shared';

// Distribuição em lote: lista de IDs de bens + local de destino.
const distribuirBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos um bem.').max(2000),
  localId: z.string().uuid('Local de destino inválido.'),
});

const router = Router();

router.use(authenticateToken);

/**
 * @route GET /api/patrimonios
 * @desc Listar patrimônios com filtros
 */
router.get('/', zodValidate({ query: paginationQuerySchema }), listPatrimonios);

/**
 * @route GET /api/patrimonios/sync
 * @desc Sincronizar patrimônios (retorna lista atualizada)
 */
router.get('/sync', zodValidate({ query: paginationQuerySchema }), listPatrimonios);

/**
 * @route GET /api/patrimonios/stats
 * @desc Estatísticas agregadas para o dashboard (DEVE VIR ANTES DE /:id)
 */
router.get('/stats', getPatrimonioStats);

/**
 * @route GET /api/patrimonios/analytics
 * @desc Conjunto completo (projeção mínima) p/ telas de análise (DEVE VIR ANTES DE /:id)
 */
// /analytics varre TODO o acervo (sem teto de página) — rate-limit dedicado, já
// que o limiter global ignora GET autenticado (proteção contra DoS).
router.get('/analytics', reportRateLimiter, listPatrimoniosAnalytics);

/**
 * @route GET /api/patrimonios/historico-recente
 * @desc Linha do tempo de eventos recentes (DEVE VIR ANTES DE /:id)
 */
router.get('/historico-recente', getHistoricoRecente);

/**
 * @route GET /api/patrimonios/gerar-numero
 * @desc Gerar próximo número patrimonial (DEVE VIR ANTES DE /:id)
 */
router.get('/gerar-numero', authorize('superuser', 'admin', 'supervisor', 'usuario'), gerarNumeroPatrimonial);

/**
 * @route GET /api/patrimonios/numero/:numero
 * @desc Buscar patrimônio por número
 */
router.get('/numero/:numero', getByNumero);

/**
 * @route GET /api/patrimonios/:id
 * @desc Obter patrimônio por ID
 */
router.get(
  '/:id',
  zodValidate({ params: uuidParamSchema }),
  getPatrimonio,
);

/**
 * @route POST /api/patrimonios/distribuir
 * @desc Distribuir bens do Almoxarifado para um local final (lote)
 */
router.post(
  '/distribuir',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ body: distribuirBodySchema }),
  distribuirPatrimonios,
);

/**
 * @route POST /api/patrimonios
 * @desc Criar patrimônio
 */
router.post(
  '/',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ body: createPatrimonioBodySchema }),
  createPatrimonio,
);

/**
 * @route PUT /api/patrimonios/:id
 * @desc Atualizar patrimônio
 */
router.put(
  '/:id',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ params: uuidParamSchema, body: updatePatrimonioBodySchema }),
  updatePatrimonio,
);

/**
 * @route DELETE /api/patrimonios/:id
 * @desc Deletar patrimônio
 */
router.delete(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deletePatrimonio,
);

/**
 * @route POST /api/patrimonios/:id/notes
 * @desc Adicionar observação ao patrimônio
 */
router.post(
  '/:id/notes',
  zodValidate({ params: uuidParamSchema, body: addNoteSchema }),
  addNote,
);

/**
 * @route POST /api/patrimonios/:id/baixa
 * @desc Registrar baixa de patrimônio
 */
router.post(
  '/:id/baixa',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ params: uuidParamSchema, body: registrarBaixaSchema }),
  registrarBaixaPatrimonio,
);

export default router;
