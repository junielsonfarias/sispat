import { Request, Response } from 'express';
import { prisma } from '../index';
import { logError, logInfo, logWarn, logDebug } from '../config/logger';
import { redisCache, CacheUtils } from '../config/redis';
import { maskEmail } from '../utils/mask';

/**
 * Hierarquia de papéis (quanto maior, mais privilégio).
 * Guard anti-escalada: um ator só pode atribuir papéis cujo nível seja
 * <= ao seu próprio. Assim um 'supervisor' não consegue criar/promover
 * para 'admin' ou 'superuser' (o que daria bypass de municipalityId).
 */
const ROLE_RANK: Record<string, number> = {
  superuser: 4,
  admin: 3,
  supervisor: 2,
  usuario: 1,
  visualizador: 0,
};

/**
 * Retorna true se o ator (actorRole) tem permissão para atribuir targetRole.
 * Papéis desconhecidos são tratados como não-atribuíveis.
 */
function canAssignRole(actorRole: string, targetRole: string): boolean {
  const actorRank = ROLE_RANK[actorRole];
  const targetRank = ROLE_RANK[targetRole];
  if (actorRank === undefined || targetRank === undefined) {
    return false;
  }
  return targetRank <= actorRank;
}

/**
 * Listar todos os usuários
 * GET /api/users
 */
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // ✅ CACHE: Gerar chave de cache baseada no município
    const cacheKey = `users:${req.user.municipalityId}:active`;
    
    // Tentar obter do cache Redis primeiro
    let users = await redisCache.get<any[]>(cacheKey);
    
    if (!users) {
      // Buscar usuários do mesmo município
      users = await prisma.user.findMany({
        where: {
          municipalityId: req.user.municipalityId,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          responsibleSectors: true,
          municipalityId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      // ✅ CACHE: Armazenar no cache Redis por 10 minutos (dados relativamente estáticos)
      await redisCache.set(cacheKey, users, 600);
      logDebug('✅ Cache de usuários criado', { municipalityId: req.user.municipalityId });
    } else {
      logDebug('✅ Cache hit: usuários', { municipalityId: req.user.municipalityId });
    }

    res.json(users);
  } catch (error) {
    logError('Erro ao buscar usuários', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
};

/**
 * Buscar usuário por ID
 * GET /api/users/:id
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;

    // Buscar perfil de OUTRO usuário é função de gestão. Não-gestores só podem
    // ler o próprio registro (usado no bootstrap do AuthContext) — sem isso um
    // visualizador/usuario enumeraria perfis de colegas (email/role) por UUID.
    const isManager = ['superuser', 'admin', 'supervisor'].includes(req.user.role);
    if (!isManager && id !== req.user.userId) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
        municipalityId: req.user.municipalityId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        responsibleSectors: true,
        municipalityId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        municipality: {
          select: {
            id: true,
            name: true,
            state: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json(user);
  } catch (error) {
    logError('Erro ao buscar usuário', error, { userId: req.user?.userId, targetUserId: req.params.id });
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
};

/**
 * Criar novo usuário
 * POST /api/users
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // superuser, admin e supervisor podem criar usuários (anti-escalada via canAssignRole)
    if (!['superuser', 'admin', 'supervisor'].includes(req.user.role)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    const { email, name, password, role, responsibleSectors } = req.body;

    // Schema Zod compartilhado (@sispat/shared → createUserSchema) já validou
    // presença dos campos, formato do e-mail e força da senha
    // (STRONG_PASSWORD_REGEX: ≥12 chars, lower/upper/digit/símbolo).

    // 🔒 Anti-escalada de privilégio: o ator não pode atribuir um papel de
    // nível superior ao seu (ex.: supervisor criando admin/superuser).
    if (!canAssignRole(req.user.role, role)) {
      logWarn('Tentativa de escalada de privilégio bloqueada (createUser)', {
        userId: req.user.userId,
        actorRole: req.user.role,
        attemptedRole: role,
      });
      res.status(403).json({ error: 'Acesso negado: papel não permitido para seu nível' });
      return;
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      res.status(400).json({ error: 'Email já está em uso' });
      return;
    }

    // Hash da senha
    const bcrypt = require('bcryptjs');
    // ✅ Bcrypt rounds aumentado para 12 (mais seguro)
    const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Criar usuário
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
        role,
        responsibleSectors: responsibleSectors || [],
        municipalityId: req.user.municipalityId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        responsibleSectors: true,
        municipalityId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId: req.user.userId,
        action: 'CREATE_USER',
        entityType: 'USER',
        entityId: newUser.id,
        details: `Usuário criado: ${newUser.name} (${maskEmail(newUser.email)})`,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    // ✅ CACHE: Invalidar cache de usuários após criação
    await CacheUtils.invalidateByPrefix('users:');
    logDebug('✅ Cache de usuários invalidado após criação');

    res.status(201).json(newUser);
  } catch (error) {
    logError('Erro ao criar usuário', error, { userId: req.user?.userId, email: maskEmail(req.body.email) });
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

/**
 * Atualizar usuário
 * PUT /api/users/:id
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;
    const { name, email, role, responsibleSectors, isActive, avatar } = req.body;

    // Verificar se usuário existe
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        municipalityId: req.user.municipalityId,
      },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Email é @unique global: ao trocar, garantir que não colide com outro usuário.
    const normalizedEmail =
      typeof email === 'string' ? email.toLowerCase() : undefined;
    if (normalizedEmail && normalizedEmail !== existingUser.email) {
      const emailOwner = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (emailOwner && emailOwner.id !== id) {
        res.status(400).json({ error: 'Email já está em uso' });
        return;
      }
    }

    // superuser, admin e supervisor podem atualizar usuários (anti-escalada via canAssignRole)
    if (!['superuser', 'admin', 'supervisor'].includes(req.user.role)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    // 🔒 Anti-escalada de privilégio: ao alterar o papel, o ator não pode
    // promover alvo (nem a si mesmo) para um nível acima do seu, e também
    // não pode rebaixar/tocar um usuário cujo papel atual já seja superior
    // ao seu (ex.: supervisor não mexe em admin/superuser existente).
    if (!canAssignRole(req.user.role, existingUser.role)) {
      logWarn('Tentativa de alterar usuário de nível superior bloqueada (updateUser)', {
        userId: req.user.userId,
        actorRole: req.user.role,
        targetCurrentRole: existingUser.role,
      });
      res.status(403).json({ error: 'Acesso negado: usuário de nível superior' });
      return;
    }

    if (role !== undefined && !canAssignRole(req.user.role, role)) {
      logWarn('Tentativa de escalada de privilégio bloqueada (updateUser)', {
        userId: req.user.userId,
        actorRole: req.user.role,
        attemptedRole: role,
      });
      res.status(403).json({ error: 'Acesso negado: papel não permitido para seu nível' });
      return;
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(normalizedEmail && { email: normalizedEmail }),
        ...(role && { role }),
        ...(responsibleSectors && { responsibleSectors }),
        ...(isActive !== undefined && { isActive }),
        ...(avatar !== undefined && { avatar }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        responsibleSectors: true,
        municipalityId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId: req.user.userId,
        action: 'UPDATE_USER',
        entityType: 'USER',
        entityId: updatedUser.id,
        details: `Usuário atualizado: ${updatedUser.name}`,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    // ✅ CACHE: Invalidar cache de usuários após atualização
    await CacheUtils.invalidateByPrefix('users:');
    logDebug('✅ Cache de usuários invalidado após atualização');

    res.json(updatedUser);
  } catch (error) {
    logError('Erro ao atualizar usuário', error, { userId: req.user?.userId, targetUserId: req.params.id });
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
};

/**
 * Redefinir a senha de OUTRO usuário (gestor redefine senha de terceiro)
 * POST /api/users/:id/reset-password
 *
 * Diferente de /auth/change-password (que exige a senha atual do próprio
 * usuário). Aqui um superuser/admin/supervisor define uma nova senha para um
 * usuário do seu município, respeitando a anti-escalada (não redefine senha de
 * usuário de nível superior ao seu).
 */
export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;
    const { password } = req.body;

    // Verificar se usuário existe (no mesmo município)
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        municipalityId: req.user.municipalityId,
      },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // 🔒 Anti-escalada: não pode redefinir senha de usuário de nível superior
    if (!canAssignRole(req.user.role, existingUser.role)) {
      logWarn('Tentativa de redefinir senha de usuário de nível superior bloqueada', {
        userId: req.user.userId,
        actorRole: req.user.role,
        targetCurrentRole: existingUser.role,
      });
      res.status(403).json({ error: 'Acesso negado: usuário de nível superior' });
      return;
    }

    // Hash da nova senha
    const bcrypt = require('bcryptjs');
    const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        responsibleSectors: true,
        municipalityId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log de atividade (nunca registrar a senha)
    await prisma.activityLog.create({
      data: {
        userId: req.user.userId,
        action: 'RESET_USER_PASSWORD',
        entityType: 'USER',
        entityId: updatedUser.id,
        details: `Senha redefinida para o usuário: ${updatedUser.name}`,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    await CacheUtils.invalidateByPrefix('users:');

    res.json(updatedUser);
  } catch (error) {
    logError('Erro ao redefinir senha de usuário', error, {
      userId: req.user?.userId,
      targetUserId: req.params.id,
    });
    res.status(500).json({ error: 'Erro ao redefinir senha de usuário' });
  }
};

/**
 * Deletar usuário (Soft Delete)
 * DELETE /api/users/:id
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;

    // Verificar se usuário existe
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        municipalityId: req.user.municipalityId,
      },
      include: {
        _count: {
          select: {
            patrimoniosCreated: true,
            imoveisCreated: true,
            activityLogs: true,
          },
        },
      },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // superuser, admin e supervisor podem deletar usuários (anti-escalada via canAssignRole)
    if (!['superuser', 'admin', 'supervisor'].includes(req.user.role)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    // Anti-escalada: não pode deletar usuário de nível igual/superior ao seu
    // (ex.: admin não deleta superuser). superuser (rank máximo) deleta qualquer um.
    if (!canAssignRole(req.user.role, existingUser.role)) {
      res.status(403).json({ error: 'Acesso negado: usuário de nível superior' });
      return;
    }

    // Não permitir deletar a si mesmo
    if (id === req.user.userId) {
      res.status(400).json({ error: 'Não é possível deletar seu próprio usuário' });
      return;
    }

    logDebug('Tentando deletar usuário', {
      userId: id,
      userName: existingUser.name,
      registrosVinculados: {
        patrimonios: existingUser._count.patrimoniosCreated,
        imoveis: existingUser._count.imoveisCreated,
        activityLogs: existingUser._count.activityLogs,
      },
    });

    // Verificar se há registros vinculados
    const hasRelatedRecords =
      existingUser._count.patrimoniosCreated > 0 ||
      existingUser._count.imoveisCreated > 0;

    if (hasRelatedRecords) {
      // Soft Delete: Marcar como inativo ao invés de deletar
      logDebug('Usuário tem registros vinculados. Fazendo soft delete');

      await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          email: `deleted_${Date.now()}_${existingUser.email}`, // Liberar o email para reutilização
        },
      });

      // Log de atividade
      await prisma.activityLog.create({
        data: {
          userId: req.user.userId,
          action: 'DEACTIVATE_USER',
          entityType: 'USER',
          entityId: id,
          details: `Usuário desativado (soft delete): ${existingUser.name}. Registros vinculados preservados.`,
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });

      logInfo('✅ Soft delete concluído', { userId: id, userName: existingUser.name });

      // ✅ CACHE: Invalidar cache de usuários após soft delete
      await CacheUtils.invalidateByPrefix('users:');
      logDebug('✅ Cache de usuários invalidado após soft delete');

      res.json({
        message: 'Usuário desativado com sucesso',
        type: 'soft_delete',
        reason: 'Usuário possui registros vinculados (patrimônios ou imóveis)',
      });
    } else {
      // Hard Delete: Deletar permanentemente (sem registros vinculados)
      logDebug('Usuário sem registros vinculados. Fazendo hard delete');

      // Atômico: apaga os logs do usuário, apaga o usuário e grava a trilha de
      // auditoria do DELETE numa única transação — assim a exclusão e seu
      // registro de auditoria nunca ficam dessincronizados.
      await prisma.$transaction([
        ...(existingUser._count.activityLogs > 0
          ? [prisma.activityLog.deleteMany({ where: { userId: id } })]
          : []),
        prisma.user.delete({ where: { id } }),
        prisma.activityLog.create({
          data: {
            userId: req.user.userId,
            action: 'DELETE_USER',
            entityType: 'USER',
            entityId: id,
            details: `Usuário deletado permanentemente: ${existingUser.name}`,
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent') || 'unknown',
          },
        }),
      ]);

      logInfo('✅ Hard delete concluído', { userId: id, userName: existingUser.name });

      // ✅ CACHE: Invalidar cache de usuários após hard delete
      await CacheUtils.invalidateByPrefix('users:');
      logDebug('✅ Cache de usuários invalidado após hard delete');

      res.json({
        message: 'Usuário deletado com sucesso',
        type: 'hard_delete',
      });
    }
  } catch (error: any) {
    logError('❌ Erro ao deletar usuário', error, {
      userId: req.user?.userId,
      targetUserId: req.params.id,
      errorCode: error.code
    });

    res.status(500).json({
      error: 'Erro ao deletar usuário',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
