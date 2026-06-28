import { Router } from 'express';
import { z } from 'zod';
import {
  uploadRelatorio,
  previewImportacao,
  confirmarImportacao,
} from '../controllers/importacaoController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';

// Validação do payload de confirmação da importação. Evita mass-assignment de
// strings sem limite e arrays absurdos (o service ainda valida regra de negócio
// e o teto de unidades). origemRecurso é restrito ao enum do Patrimônio.
const itemConfirmadoSchema = z.object({
  descricao: z.string().trim().min(1).max(500),
  quantidade: z.number().int().min(1).max(10000),
  valorUnitario: z.number().min(0),
  dataAquisicao: z.string().min(1),
  numeroNotaFiscal: z.string().max(100).optional().nullable(),
  fornecedor: z.string().max(300).optional().nullable(),
  numeroEmpenho: z.string().max(100).optional().nullable(),
  numeroLiquidacao: z.string().max(100).optional().nullable(),
  tipo: z.string().trim().min(1).max(150),
  formaAquisicao: z.string().trim().min(1).max(150),
  origemRecurso: z
    .enum(['proprio', 'convenio', 'emenda', 'transferencia_ente', 'outro'])
    .optional()
    .nullable(),
  fundoRecurso: z.string().max(100).optional().nullable(),
  numeroLicitacao: z.string().max(100).optional().nullable(),
  anoLicitacao: z.number().int().min(1900).max(2200).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  sectorId: z.string().uuid(),
  setorNome: z.string().max(150).optional(),
  localObjeto: z.string().max(200).optional().nullable(),
  vidaUtilAnos: z.number().int().min(0).max(200).optional().nullable(),
  valorResidual: z.number().min(0).optional().nullable(),
});

const confirmarImportacaoSchema = z.object({
  itens: z.array(itemConfirmadoSchema).min(1, 'Envie ao menos um item.').max(5000),
});

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
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ body: confirmarImportacaoSchema }),
  confirmarImportacao,
);

export default router;
