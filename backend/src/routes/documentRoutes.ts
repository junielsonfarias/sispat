import { Router } from 'express';
import {
  listDocuments,
  createDocument,
  getDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
  listPublicDocuments,
  upload,
} from '../controllers/documentController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createDocumentSchema,
  updateDocumentSchema,
  uuidParamSchema,
  paginationQuerySchema,
} from '@sispat/shared';

const router = Router();

router.get('/public', listPublicDocuments);

router.use(authenticateToken);

router.get('/', zodValidate({ query: paginationQuerySchema }), listDocuments);
router.get('/:id', zodValidate({ params: uuidParamSchema }), getDocument);
router.get('/:id/download', zodValidate({ params: uuidParamSchema }), downloadDocument);

router.post(
  '/',
  authorize('admin', 'supervisor', 'usuario'),
  upload.single('file'),
  zodValidate({ body: createDocumentSchema }),
  createDocument,
);

router.put(
  '/:id',
  authorize('admin', 'supervisor', 'usuario'),
  zodValidate({ params: uuidParamSchema, body: updateDocumentSchema }),
  updateDocument,
);

router.delete(
  '/:id',
  authorize('admin', 'supervisor', 'usuario'),
  zodValidate({ params: uuidParamSchema }),
  deleteDocument,
);

export default router;
