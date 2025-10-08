import { Router } from 'express';
import {
  login,
  refreshToken,
  me,
  logout,
  changePassword,
} from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// ✅ Rate limiting para rotas de autenticação (proteção contra brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas por IP
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route POST /api/auth/login
 * @desc Login de usuário
 * @access Public
 */
router.post('/login', authLimiter, login);

/**
 * @route POST /api/auth/refresh
 * @desc Renovar token de acesso
 * @access Public
 */
router.post('/refresh', refreshToken);

/**
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
router.post('/change-password', authenticateToken, changePassword);

export default router;

