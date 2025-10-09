import { Router } from 'express';
import { listPublicPatrimonios, getPublicPatrimonioByNumero } from '../controllers/patrimonioController';

const router = Router();

/**
 * Rotas públicas - NÃO requerem autenticação
 * Utilizadas para consulta pública de patrimônios
 */

/**
 * @route GET /api/public/patrimonios
 * @desc Listar patrimônios públicos (sem autenticação)
 * @access Public
 */
router.get('/patrimonios', listPublicPatrimonios);

/**
 * @route GET /api/public/patrimonios/:numero
 * @desc Buscar patrimônio por número (sem autenticação)
 * @access Public
 */
router.get('/patrimonios/:numero', getPublicPatrimonioByNumero);

export default router;

