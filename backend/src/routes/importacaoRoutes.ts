import { Router } from 'express';
import {
  uploadRelatorio,
  previewImportacao,
  confirmarImportacao,
} from '../controllers/importacaoController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// Preview: upload do PDF (em memória) → itens parseados + mapeamentos. Não grava.
router.post(
  '/material-permanente/preview',
  authorize('superuser', 'admin', 'supervisor'),
  uploadRelatorio,
  previewImportacao,
);

// Confirmar: cria os patrimônios (1 por unidade) em transação. Restrito a
// quem pode cadastrar em massa (admin/superuser).
router.post(
  '/material-permanente/confirmar',
  authorize('superuser', 'admin'),
  confirmarImportacao,
);

export default router;
