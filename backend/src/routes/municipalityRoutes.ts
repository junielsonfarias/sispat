import { Router } from 'express';
import { z } from 'zod';
import {
  getMunicipalities,
  createMunicipality,
  updateMunicipality,
  deleteMunicipality,
} from '../controllers/municipalityController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import { uuidParamSchema } from '@sispat/shared';

// Gestão de municípios (tenants) — exclusiva do superuser.
const createMunicipalitySchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(150),
  state: z.string().trim().min(2, 'UF é obrigatória.').max(50),
  logoUrl: z.string().trim().max(2048).optional().nullable(),
  footerText: z.string().trim().max(500).optional().nullable(),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve estar no formato #RRGGBB.')
    .optional(),
});

const updateMunicipalitySchema = createMunicipalitySchema.partial();

const router = Router();

router.use(authenticateToken);
router.use(authorize('superuser'));

router.get('/', getMunicipalities);
router.post('/', zodValidate({ body: createMunicipalitySchema }), createMunicipality);
router.put(
  '/:id',
  zodValidate({ params: uuidParamSchema, body: updateMunicipalitySchema }),
  updateMunicipality,
);
router.delete('/:id', zodValidate({ params: uuidParamSchema }), deleteMunicipality);

export default router;
