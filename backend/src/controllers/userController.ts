import { Request, Response } from 'express';
import { prisma } from '../index';

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

    // Buscar usuários do mesmo município
    const users = await prisma.user.findMany({
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

    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
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
    console.error('Erro ao buscar usuário:', error);
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

    // Apenas admin e superuser podem criar usuários
    if (!['admin', 'superuser'].includes(req.user.role)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    const { email, name, password, role, responsibleSectors } = req.body;

    // Validações
    if (!email || !name || !password || !role) {
      res.status(400).json({ error: 'Email, nome, senha e role são obrigatórios' });
      return;
    }

    // ✅ Validação de senha forte (mínimo 12 caracteres)
    if (password.length < 12) {
      res.status(400).json({ 
        error: 'Senha deve ter pelo menos 12 caracteres com maiúsculas, minúsculas, números e símbolos' 
      });
      return;
    }

    // ✅ Validação de complexidade da senha
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400).json({ 
        error: 'Senha deve incluir: letras maiúsculas, minúsculas, números e símbolos especiais (@$!%*?&)' 
      });
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
        details: `Usuário criado: ${newUser.name} (${newUser.email})`,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
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
    const { name, role, responsibleSectors, isActive } = req.body;

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

    // Apenas admin e superuser podem atualizar usuários
    if (!['admin', 'superuser'].includes(req.user.role)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(role && { role }),
        ...(responsibleSectors && { responsibleSectors }),
        ...(isActive !== undefined && { isActive }),
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

    res.json(updatedUser);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
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

    // Apenas superuser pode deletar usuários
    if (req.user.role !== 'superuser') {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    // Não permitir deletar a si mesmo
    if (id === req.user.userId) {
      res.status(400).json({ error: 'Não é possível deletar seu próprio usuário' });
      return;
    }

    console.log(`[DEV] Tentando deletar usuário: ${existingUser.name}`);
    console.log(`[DEV] Registros vinculados:`, {
      patrimonios: existingUser._count.patrimoniosCreated,
      imoveis: existingUser._count.imoveisCreated,
      activityLogs: existingUser._count.activityLogs,
    });

    // Verificar se há registros vinculados
    const hasRelatedRecords =
      existingUser._count.patrimoniosCreated > 0 ||
      existingUser._count.imoveisCreated > 0;

    if (hasRelatedRecords) {
      // Soft Delete: Marcar como inativo ao invés de deletar
      console.log('[DEV] Usuário tem registros vinculados. Fazendo soft delete...');

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

      console.log('[DEV] ✅ Soft delete concluído');

      res.json({
        message: 'Usuário desativado com sucesso',
        type: 'soft_delete',
        reason: 'Usuário possui registros vinculados (patrimônios ou imóveis)',
      });
    } else {
      // Hard Delete: Deletar permanentemente (sem registros vinculados)
      console.log('[DEV] Usuário sem registros vinculados. Fazendo hard delete...');

      // Deletar logs de atividade primeiro (cascade manual)
      if (existingUser._count.activityLogs > 0) {
        await prisma.activityLog.deleteMany({
          where: { userId: id },
        });
        console.log(`[DEV] ${existingUser._count.activityLogs} logs deletados`);
      }

      // Deletar usuário
      await prisma.user.delete({
        where: { id },
      });

      // Log de atividade
      await prisma.activityLog.create({
        data: {
          userId: req.user.userId,
          action: 'DELETE_USER',
          entityType: 'USER',
          entityId: id,
          details: `Usuário deletado permanentemente: ${existingUser.name}`,
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });

      console.log('[DEV] ✅ Hard delete concluído');

      res.json({
        message: 'Usuário deletado com sucesso',
        type: 'hard_delete',
      });
    }
  } catch (error: any) {
    console.error('[DEV] ❌ Erro ao deletar usuário:');
    console.error('   Mensagem:', error.message);
    console.error('   Código:', error.code);
    console.error('   Stack:', error.stack);

    res.status(500).json({
      error: 'Erro ao deletar usuário',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
