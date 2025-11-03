import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { logError } from '../config/logger';

// Interface para o payload do JWT
export interface JwtPayload {
  userId: string;
  email: string;
  name?: string;
  role: string;
  municipalityId: string;
}

// Extender Request para incluir user
// Os tipos do Multer.File já estão disponíveis via @types/multer
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      // file e files são adicionados automaticamente pelo multer middleware
      // Não precisamos redeclará-los aqui para evitar conflitos
    }
  }
}

/**
 * Middleware de autenticação JWT
 * Verifica se o token é válido e adiciona os dados do usuário ao request
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Pegar token do header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    // Verificar token - JWT_SECRET é obrigatório (validado no startup)
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      logError('JWT_SECRET não configurado no middleware de autenticação');
      res.status(500).json({ error: 'Erro de configuração do servidor' });
      return;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Verificar se o usuário ainda existe e está ativo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        municipalityId: true,
        isActive: true,
        responsibleSectors: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Usuário não autorizado' });
      return;
    }

    // Adicionar dados do usuário ao request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      municipalityId: user.municipalityId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expirado' });
      return;
    }
    res.status(500).json({ error: 'Erro ao verificar autenticação' });
  }
};

/**
 * Middleware para verificar se o usuário tem uma das roles permitidas
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Acesso negado',
        message: `Requer uma das seguintes permissões: ${allowedRoles.join(', ')}` 
      });
      return;
    }

    next();
  };
};

/**
 * Middleware para verificar se o usuário é do mesmo município
 */
export const checkMunicipality = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  const municipalityId = req.params.municipalityId || req.body.municipalityId;

  if (municipalityId && municipalityId !== req.user.municipalityId) {
    // Superuser pode acessar qualquer município
    if (req.user.role !== 'superuser') {
      res.status(403).json({ error: 'Acesso negado: município diferente' });
      return;
    }
  }

  next();
};

/**
 * Middleware para verificar se o usuário tem acesso ao setor
 */
export const checkSectorAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  // Superuser e admin têm acesso a todos os setores
  if (['superuser', 'admin'].includes(req.user.role)) {
    next();
    return;
  }

  try {
    // Pegar sectorId da requisição
    const sectorId = req.params.sectorId || req.body.sectorId || req.body.setorId;

    if (!sectorId) {
      next();
      return;
    }

    // Buscar usuário com seus setores responsáveis
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { responsibleSectors: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Verificar se o setor está na lista de responsáveis
    if (!user.responsibleSectors.includes(sectorId)) {
      res.status(403).json({ error: 'Acesso negado: sem permissão para este setor' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar acesso ao setor' });
  }
};

/**
 * Middleware opcional de autenticação (não retorna erro se não houver token)
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const JWT_SECRET = process.env.JWT_SECRET;
      
      if (!JWT_SECRET) {
        // Se JWT_SECRET não está configurado, pular autenticação opcional
        next();
        return;
      }
      
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          municipalityId: true,
          isActive: true,
        },
      });

      if (user && user.isActive) {
        req.user = {
          userId: user.id,
          email: user.email,
          role: user.role,
          municipalityId: user.municipalityId,
        };
      }
    }

    next();
  } catch (error) {
    // Ignorar erros e continuar sem autenticação
    next();
  }
};

