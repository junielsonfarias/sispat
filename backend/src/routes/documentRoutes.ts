import { Router } from 'express';
import {
  listDocuments,
  createDocument,
  getDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
  listPublicDocuments,
  upload
} from '../controllers/documentController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { handleValidationErrors, documentValidations, queryValidations } from '../middlewares/validation';

const router = Router();

router.get('/public', listPublicDocuments);

router.use(authenticateToken);

router.get('/', queryValidations.pagination, handleValidationErrors, listDocuments);

router.get('/:id', documentValidations.byId, handleValidationErrors, getDocument);

router.get('/:id/download', documentValidations.byId, handleValidationErrors, downloadDocument);

router.post(
  '/',
  authorize('admin', 'supervisor', 'usuario'),
  upload.single('file'),
  documentValidations.create,
  handleValidationErrors,
  createDocument,
);

router.put(
  '/:id',
  authorize('admin', 'supervisor', 'usuario'),
  documentValidations.update,
  handleValidationErrors,
  updateDocument,
);

router.delete(
  '/:id',
  authorize('admin', 'supervisor', 'usuario'),
  documentValidations.byId,
  handleValidationErrors,
  deleteDocument,
);

export default router;
