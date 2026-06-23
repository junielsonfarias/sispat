import { Router } from 'express';
import {
  getConformidadeChecklist,
  getConformidadeAlertas,
} from '../controllers/conformidadeController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/checklist', authorize('superuser', 'admin', 'supervisor'), getConformidadeChecklist);
router.get('/alertas', authorize('superuser', 'admin', 'supervisor'), getConformidadeAlertas);

export default router;
