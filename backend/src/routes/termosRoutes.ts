import { Router } from 'express';
import { getTermo, emitirTermoCarga } from '../controllers/termosController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// Formaliza a emissão do termo de carga (Art. 14/34): registra número + data +
// responsável. Escrita — restrita a quem atribui carga (não visualizador).
router.post(
  '/:patrimonioId/carga/emitir',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  emitirTermoCarga,
);

// Emite os dados de um termo (carga | incorporacao | baixa) de um patrimônio.
// Leitura para todos os autenticados — é um documento dos dados existentes.
router.get('/:tipo/:patrimonioId', getTermo);

export default router;
