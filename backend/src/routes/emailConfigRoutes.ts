import { Router } from 'express';
import {
  getEmailConfig,
  updateEmailConfig,
  testEmailConfig,
  deleteEmailConfig,
} from '../controllers/emailConfigController';
import { authenticateToken } from '../middlewares/auth';
import { authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação e permissão de superuser
router.use(authenticateToken);
router.use(authorize('superuser'));

/**
 * @swagger
 * /api/email-config:
 *   get:
 *     tags: [Configuração de Email]
 *     summary: Obter configuração de email
 *     description: Retorna a configuração atual do serviço de email
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuração de email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configured:
 *                   type: boolean
 *                 enabled:
 *                   type: boolean
 *                 config:
 *                   type: object
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão
 * @route GET /api/email-config
 * @desc Obter configuração de email
 * @access Private (Superuser only)
 */
router.get('/', getEmailConfig);

/**
 * @swagger
 * /api/email-config:
 *   put:
 *     tags: [Configuração de Email]
 *     summary: Atualizar configuração de email
 *     description: Atualiza ou cria a configuração do serviço de email
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - host
 *               - port
 *               - user
 *               - password
 *               - fromAddress
 *             properties:
 *               host:
 *                 type: string
 *                 example: smtp.gmail.com
 *               port:
 *                 type: integer
 *                 example: 587
 *               secure:
 *                 type: boolean
 *                 example: false
 *               user:
 *                 type: string
 *                 example: seu-email@gmail.com
 *               password:
 *                 type: string
 *                 example: sua-senha-de-app
 *               fromAddress:
 *                 type: string
 *                 example: SISPAT <noreply@seudominio.com>
 *               enabled:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Configuração atualizada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão
 * @route PUT /api/email-config
 * @desc Atualizar configuração de email
 * @access Private (Superuser only)
 */
router.put('/', updateEmailConfig);

/**
 * @swagger
 * /api/email-config/test:
 *   post:
 *     tags: [Configuração de Email]
 *     summary: Testar configuração de email
 *     description: Envia um email de teste para verificar se a configuração está funcionando
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: teste@exemplo.com
 *     responses:
 *       200:
 *         description: Email de teste enviado com sucesso
 *       400:
 *         description: Email inválido ou configuração não habilitada
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão
 * @route POST /api/email-config/test
 * @desc Testar configuração de email
 * @access Private (Superuser only)
 */
router.post('/test', testEmailConfig);

/**
 * @swagger
 * /api/email-config:
 *   delete:
 *     tags: [Configuração de Email]
 *     summary: Desabilitar configuração de email
 *     description: Desabilita a configuração de email (não deleta os dados)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuração desabilitada com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Configuração não encontrada
 * @route DELETE /api/email-config
 * @desc Desabilitar configuração de email
 * @access Private (Superuser only)
 */
router.delete('/', deleteEmailConfig);

export default router;
