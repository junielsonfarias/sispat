import jwt from 'jsonwebtoken';
import { getRow } from '../database/connection.js';
import { logDebug, logError, logSecurity } from '../utils/logger.js';

export const authenticateToken = async (req, res, next) => {
  // Permitir endpoints públicos sem autenticação
  try {
    const url = req.originalUrl || req.url || '';
    const isPublicGet =
      req.method === 'GET' &&
      (url.startsWith('/api/municipalities/public') ||
        url.startsWith('/api/patrimonios/public') ||
        url.startsWith('/api/imoveis/public'));
    if (isPublicGet) {
      return next();
    }
  } catch (_) {
    // se algo falhar na checagem, segue o fluxo normal
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  // Verificar se JWT_SECRET está configurado
  if (!process.env.JWT_SECRET) {
    logError('JWT_SECRET não configurado', null, {
      type: 'SECURITY',
      severity: 'CRITICAL',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    return res
      .status(500)
      .json({ error: 'Configuração de segurança inválida' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database with sectors information
    const user = await getRow(
      `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.municipality_id, 
        u.login_attempts, 
        u.locked_until,
        u.sector,
        u.responsible_sectors as "responsibleSectors",
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', s.id,
              'name', s.name,
              'isPrimary', us.is_primary
            )
          ) FILTER (WHERE s.id IS NOT NULL), 
          '[]'::json
        ) as sectors
      FROM users u
      LEFT JOIN user_sectors us ON u.id = us.user_id
      LEFT JOIN sectors s ON us.sector_id = s.id
      WHERE u.id = $1
      GROUP BY u.id, u.name, u.email, u.role, u.municipality_id, u.login_attempts, u.locked_until, u.sector, u.responsible_sectors
    `,
      [decoded.userId]
    );

    if (!user) {
      logSecurity(
        'Tentativa de acesso com token de usuário inexistente',
        'warn',
        {
          userId: decoded.userId,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        }
      );
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Check if user is locked out
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      logSecurity('Tentativa de acesso com conta bloqueada', 'warn', {
        userId: user.id,
        userName: user.name,
        lockoutUntil: user.locked_until,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return res.status(423).json({
        error:
          'Conta bloqueada temporariamente devido a múltiplas tentativas de login',
        lockoutUntil: user.locked_until,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logSecurity('Token expirado', 'info', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        tokenError: error.name,
      });
      return res.status(401).json({ error: 'Token expirado' });
    }

    logSecurity('Token inválido', 'warn', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      tokenError: error.name,
      errorMessage: error.message,
    });
    return res.status(403).json({ error: 'Token inválido' });
  }
};

export const requireRole = allowedRoles => {
  return (req, res, next) => {
    logDebug('Verificando permissões de role', {
      userRole: req.user?.role,
      allowedRoles,
      userId: req.user?.id,
    });

    if (!req.user) {
      logSecurity('Tentativa de acesso sem autenticação', 'warn', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requiredRoles: allowedRoles,
      });
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logSecurity('Acesso negado por permissão insuficiente', 'warn', {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return res.status(403).json({
        error: 'Acesso negado. Permissão insuficiente.',
      });
    }

    logDebug('Acesso autorizado', {
      userId: req.user.id,
      userRole: req.user.role,
      allowedRoles,
    });
    next();
  };
};

export const requireSuperuser = requireRole(['superuser']);
export const requireAdmin = requireRole(['superuser', 'admin']);
export const requireSupervisor = requireRole([
  'superuser',
  'admin',
  'supervisor',
]);
export const requireUser = requireRole([
  'superuser',
  'admin',
  'supervisor',
  'usuario',
]);
export const requireUserManagement = requireRole([
  'superuser',
  'admin',
  'supervisor',
]);

// Middleware de autenticação configurado

// Middleware to check if user has access to municipality
export const requireMunicipalityAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  // Superuser has access to everything
  if (req.user.role === 'superuser') {
    return next();
  }

  const municipalityId =
    req.params.municipalityId ||
    req.body.municipalityId ||
    req.query.municipalityId;

  if (!municipalityId) {
    return res.status(400).json({ error: 'ID do município necessário' });
  }

  // Check if user belongs to this municipality
  if (req.user.municipality_id !== municipalityId) {
    return res.status(403).json({
      error: 'Acesso negado. Usuário não pertence a este município.',
    });
  }

  next();
};
