import { Router } from 'express';
import {
  login,
  refreshToken,
  me,
  logout,
  changePassword,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getCsrfToken,
} from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validateResetTokenParamsSchema,
} from '@sispat/shared';
import rateLimit from 'express-rate-limit';
import { logWarn } from '../config/logger';
import { maskEmail } from '../utils/mask';

const router = Router();

// ✅ Rate limiting para rotas de autenticação (proteção contra brute force)
// ✅ CORREÇÃO: Aumentar limite para 20 tentativas por 15 minutos (mais adequado para produção)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // ✅ CORREÇÃO: Máximo 20 tentativas por IP (era 5, muito restritivo)
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: any, res) => {
    logWarn('Rate limit de autenticação excedido', {
      ip: req.ip,
      email: maskEmail(req.body?.email),
    })
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Muitas tentativas de login. Por segurança, aguarde 15 minutos.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime || Date.now() + 900000) / 1000),
    })
  },
});

// Rate limiting específico para reset de senha
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // 3 tentativas por IP
  message: 'Muitas tentativas de reset de senha. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Autenticação]
 *     summary: Login de usuário
 *     description: Autentica um usuário e retorna um token JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@sistema.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token JWT para autenticação
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Muitas tentativas de login
 * @route POST /api/auth/login
 * @desc Login de usuário
 * @access Public
 */
router.post('/login', authLimiter, zodValidate({ body: loginSchema }), login);

/**
 * @route GET /api/auth/csrf
 * @desc Emite/renova cookie CSRF. Frontend chama antes de operações mutáveis
 *       quando o cookie estiver ausente ou suspeito.
 * @access Public (sem JWT necessário; rate-limit é o autoritativo)
 */
router.get('/csrf', getCsrfToken);

/**
 * @route POST /api/auth/refresh
 * @desc Renovar token de acesso
 * @access Public
 */
router.post('/refresh', zodValidate({ body: refreshSchema }), refreshToken);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Autenticação]
 *     summary: Obter dados do usuário autenticado
 *     description: Retorna as informações do usuário logado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autenticado
 * @route GET /api/auth/me
 * @desc Obter dados do usuário autenticado
 * @access Private
 */
router.get('/me', authenticateToken, me);

/**
 * @route POST /api/auth/logout
 * @desc Logout de usuário
 * @access Private
 */
router.post('/logout', authenticateToken, logout);

/**
 * @route POST /api/auth/change-password
 * @desc Alterar senha do usuário
 * @access Private
 */
router.post('/change-password', authenticateToken, zodValidate({ body: changePasswordSchema }), changePassword);

/**
 * @route POST /api/auth/forgot-password
 * @desc Solicitar reset de senha
 * @access Public
 */
router.post('/forgot-password', resetLimiter, zodValidate({ body: forgotPasswordSchema }), forgotPassword);

/**
 * @route GET /api/auth/validate-reset-token/:token
 * @desc Validar token de reset de senha
 * @access Public
 */
router.get('/validate-reset-token/:token', zodValidate({ params: validateResetTokenParamsSchema }), validateResetToken);

/**
 * @route POST /api/auth/reset-password
 * @desc Resetar senha com token
 * @access Public
 */
router.post('/reset-password', resetLimiter, zodValidate({ body: resetPasswordSchema }), resetPassword);

export default router;

