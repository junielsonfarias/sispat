import { Router } from 'express';
import { getTermo } from '../controllers/termosController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// Emite os dados de um termo (carga | incorporacao | baixa) de um patrimônio.
// Leitura para todos os autenticados — é um documento dos dados existentes.
router.get('/:tipo/:patrimonioId', getTermo);

export default router;
