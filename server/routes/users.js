import bcrypt from 'bcryptjs';
import express from 'express';
import { getRow, getRows, query } from '../database/connection.js';
import {
  authenticateToken,
  requireAdmin,
  requireSuperuser,
  requireUserManagement,
} from '../middleware/auth.js';
import { usersCacheMiddleware } from '../middleware/cacheMiddleware.js';
import { validateUUID } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Reset login attempts for all users (superuser only)
router.post('/reset-login-attempts', requireSuperuser, async (req, res) => {
  try {
    await query(`
      UPDATE users 
      SET login_attempts = 0, locked_until = NULL 
      WHERE login_attempts > 0 OR locked_until IS NOT NULL
    `);

    res.json({
      message:
        'Tentativas de login resetadas com sucesso para todos os usuários',
    });
  } catch (error) {
    console.error('Reset login attempts error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get all users (filtered by role)
router.get('/', usersCacheMiddleware, async (req, res) => {
  try {
    let usersQuery = `
      SELECT 
        u.id, u.name, u.email, u.role, 
        u.avatar_url as "avatarUrl",
        u.sector,
        u.responsible_sectors as "responsibleSectors",
        u.failed_login_attempts as "failedLoginAttempts",
        u.lockout_until as "lockoutUntil",
        u.is_active as "isActive",
        u.municipality_id as "municipalityId", u.created_at as "createdAt", u.updated_at as "updatedAt",
        m.name as municipality_name,
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
      LEFT JOIN municipalities m ON u.municipality_id = m.id
      LEFT JOIN user_sectors us ON u.id = us.user_id
      LEFT JOIN sectors s ON us.sector_id = s.id
    `;

    const params = [];
    let whereClause = '';

    // Superuser can see all users
    if (req.user.role !== 'superuser') {
      whereClause = 'WHERE u.municipality_id = $1';
      params.push(req.user.municipality_id);
    }

    usersQuery +=
      whereClause +
      ' GROUP BY u.id, u.name, u.email, u.role, u.municipality_id, u.created_at, u.updated_at, m.name ORDER BY u.name';

    const users = await getRows(usersQuery, params);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has permission to view this user
    if (req.user.role !== 'superuser' && req.user.id !== id) {
      const targetUser = await getRow(
        'SELECT municipality_id FROM users WHERE id = $1',
        [id]
      );

      if (
        !targetUser ||
        targetUser.municipality_id !== req.user.municipality_id
      ) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    const user = await getRow(
      `
      SELECT 
        u.id, u.name, u.email, u.role, 
        u.municipality_id as "municipalityId", u.created_at as "createdAt", u.updated_at as "updatedAt",
        m.name as municipality_name
      FROM users u
      LEFT JOIN municipalities m ON u.municipality_id = m.id
      WHERE u.id = $1
    `,
      [id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create user
router.post('/', requireUserManagement, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      sector,
      responsibleSectors,
      municipalityId,
      avatarUrl,
    } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Nome, email, senha e papel são obrigatórios',
      });
    }

    // Check if email already exists
    const existingUser = await getRow('SELECT id FROM users WHERE email = $1', [
      email,
    ]);

    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Validate role permissions
    const allowedRoles =
      req.user.role === 'superuser'
        ? ['superuser', 'supervisor', 'admin', 'usuario', 'visualizador']
        : ['supervisor', 'admin', 'usuario', 'visualizador'];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error: 'Papel não permitido para este usuário',
      });
    }

    // Set municipality_id based on user role
    let finalMunicipalityId = municipalityId;
    if (req.user.role !== 'superuser') {
      finalMunicipalityId = req.user.municipality_id;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await query(
      `
      INSERT INTO users (
        name, email, password, role, 
        municipality_id, avatar_url
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, 
                municipality_id, avatar_url as "avatarUrl", created_at, updated_at
    `,
      [name, email, hashedPassword, role, finalMunicipalityId, avatarUrl]
    );

    const newUser = result.rows[0];

    // Lógica de atribuição de setores baseada no papel do criador
    if (req.user.role === 'superuser') {
      // Superusuário: usuário tem acesso a todos os setores do município
      // Não precisa salvar setores específicos na tabela user_sectors
      console.log(
        '🔍 Superusuário criou usuário - acesso a todos os setores do município'
      );
    } else if (
      req.user.role === 'supervisor' &&
      responsibleSectors &&
      responsibleSectors.length > 0
    ) {
      // Supervisor: usuário tem acesso aos setores específicos atribuídos
      console.log(
        '🔍 Supervisor criou usuário - setores atribuídos:',
        responsibleSectors
      );

      // Buscar IDs dos setores
      const sectorIds = await getRows(
        'SELECT id FROM sectors WHERE name = ANY($1) AND municipality_id = $2',
        [responsibleSectors, finalMunicipalityId]
      );

      if (sectorIds.length > 0) {
        // Inserir múltiplos setores
        for (let i = 0; i < sectorIds.length; i++) {
          const isPrimary = i === 0; // Primeiro setor é o primário
          await query(
            `
            INSERT INTO user_sectors (user_id, sector_id, is_primary)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, sector_id) DO UPDATE SET is_primary = $3
          `,
            [newUser.id, sectorIds[i].id, isPrimary]
          );
        }

        console.log(
          '✅ Setores atribuídos com sucesso:',
          sectorIds.length,
          'setores'
        );
      } else {
        console.log('⚠️ Nenhum setor encontrado para os nomes fornecidos');
      }
    } else if (req.user.role === 'supervisor' && sector) {
      // Fallback para compatibilidade: setor único
      const sectorRecord = await getRow(
        'SELECT id FROM sectors WHERE name = $1 AND municipality_id = $2',
        [sector, finalMunicipalityId]
      );

      if (sectorRecord) {
        await query(
          `
          INSERT INTO user_sectors (user_id, sector_id, is_primary)
          VALUES ($1, $2, true)
          ON CONFLICT (user_id, sector_id) DO UPDATE SET is_primary = true
        `,
          [newUser.id, sectorRecord.id]
        );

        console.log(
          '🔍 Supervisor criou usuário - acesso apenas ao setor:',
          sector
        );
      } else {
        console.log('⚠️ Setor não encontrado:', sector);
      }
    }

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        req.user.id,
        'USER_CREATE',
        'users',
        newUser.id,
        JSON.stringify({ name, email, role }),
        finalMunicipalityId,
      ]
    );

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update user
router.put('/:id', requireUserManagement, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      role,
      sector,
      responsibleSectors,
      municipalityId,
      avatarUrl,
      isActive,
    } = req.body;

    // Check if user exists
    const existingUser = await getRow(
      'SELECT name, role, municipality_id FROM users WHERE id = $1',
      [id]
    );

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Check permissions
    if (
      req.user.role !== 'superuser' &&
      existingUser.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Check if email already exists (excluding current user)
    if (email) {
      const emailExists = await getRow(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (emailExists) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }
    }

    // Validate role permissions
    const allowedRoles =
      req.user.role === 'superuser'
        ? ['superuser', 'supervisor', 'admin', 'usuario', 'visualizador']
        : ['supervisor', 'admin', 'usuario', 'visualizador'];

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        error: 'Papel não permitido para este usuário',
      });
    }

    // Set municipality_id based on user role
    let finalMunicipalityId = municipalityId;
    if (req.user.role !== 'superuser') {
      finalMunicipalityId = req.user.municipality_id;
    }

    // Update user
    const result = await query(
      `
      UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        municipality_id = COALESCE($4, municipality_id),
        sector = $5,
        responsible_sectors = $6,
        avatar_url = COALESCE($7, avatar_url),
        is_active = COALESCE($8, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING id, name, email, role, 
                municipality_id as "municipalityId", 
                sector, 
                responsible_sectors as "responsibleSectors",
                avatar_url as "avatarUrl",
                is_active as "isActive",
                created_at as "createdAt", 
                updated_at as "updatedAt"
    `,
      [
        name,
        email,
        role,
        finalMunicipalityId,
        sector,
        responsibleSectors || null,
        avatarUrl,
        isActive,
        id,
      ]
    );

    const updatedUser = result.rows[0];

    // Lógica de atualização de setores baseada no papel do editor
    if (req.user.role === 'superuser') {
      // Superusuário: remover restrições de setor - usuário tem acesso a todos os setores do município
      await query('DELETE FROM user_sectors WHERE user_id = $1', [id]);
      console.log(
        '🔍 Superusuário atualizou usuário - acesso a todos os setores do município'
      );
    } else if (
      req.user.role === 'supervisor' &&
      responsibleSectors &&
      responsibleSectors.length > 0
    ) {
      // Supervisor: definir múltiplos setores específicos
      console.log(
        '🔍 Supervisor atualizou usuário - setores atribuídos:',
        responsibleSectors
      );

      // Remover setores anteriores
      await query('DELETE FROM user_sectors WHERE user_id = $1', [id]);

      // Buscar IDs dos setores
      const sectorIds = await getRows(
        'SELECT id FROM sectors WHERE name = ANY($1) AND municipality_id = $2',
        [responsibleSectors, finalMunicipalityId]
      );

      if (sectorIds.length > 0) {
        // Inserir múltiplos setores
        for (let i = 0; i < sectorIds.length; i++) {
          const isPrimary = i === 0; // Primeiro setor é o primário
          await query(
            `
            INSERT INTO user_sectors (user_id, sector_id, is_primary)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, sector_id) DO UPDATE SET is_primary = $3
          `,
            [id, sectorIds[i].id, isPrimary]
          );
        }

        console.log(
          '✅ Setores atualizados com sucesso:',
          sectorIds.length,
          'setores'
        );
      } else {
        console.log('⚠️ Nenhum setor encontrado para os nomes fornecidos');
      }
    } else if (req.user.role === 'supervisor' && sector) {
      // Fallback para compatibilidade: setor único
      const sectorRecord = await getRow(
        'SELECT id FROM sectors WHERE name = $1 AND municipality_id = $2',
        [sector, finalMunicipalityId]
      );

      if (sectorRecord) {
        // Remover setores anteriores
        await query('DELETE FROM user_sectors WHERE user_id = $1', [id]);

        // Adicionar novo setor
        await query(
          `
          INSERT INTO user_sectors (user_id, sector_id, is_primary)
          VALUES ($1, $2, true)
          ON CONFLICT (user_id, sector_id) DO UPDATE SET is_primary = true
        `,
          [id, sectorRecord.id]
        );

        console.log(
          '🔍 Supervisor atualizou usuário - acesso apenas ao setor:',
          sector
        );
      } else {
        console.log('⚠️ Setor não encontrado:', sector);
      }
    }

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        req.user.id,
        'USER_UPDATE',
        'users',
        updatedUser.id,
        JSON.stringify({
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          sector: updatedUser.sector,
          responsible_sectors: updatedUser.responsible_sectors,
        }),
        finalMunicipalityId,
      ]
    );

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update user password
router.put('/:id/password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Nova senha é obrigatória' });
    }

    // Check if user exists
    const existingUser = await getRow(
      'SELECT name, municipality_id FROM users WHERE id = $1',
      [id]
    );

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Check permissions
    if (
      req.user.role !== 'superuser' &&
      existingUser.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password
    await query(
      'UPDATE users SET password = $1, login_attempts = 0, locked_until = NULL WHERE id = $2',
      [hashedPassword, id]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        req.user.id,
        'PASSWORD_CHANGE',
        'users',
        existingUser.id,
        JSON.stringify({ action: 'password_changed' }),
        existingUser.municipality_id,
      ]
    );

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Unlock user
router.post('/:id/unlock', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await getRow(
      'SELECT name, municipality_id FROM users WHERE id = $1',
      [id]
    );

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Check permissions
    if (
      req.user.role !== 'superuser' &&
      existingUser.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Unlock user
    await query(
      'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1',
      [id]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        req.user.id,
        'USER_UNLOCK',
        'users',
        existingUser.id,
        JSON.stringify({ action: 'user_unlocked' }),
        existingUser.municipality_id,
      ]
    );

    res.json({ message: 'Usuário desbloqueado com sucesso' });
  } catch (error) {
    console.error('Unlock user error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete user
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await getRow(
      'SELECT name, role, municipality_id FROM users WHERE id = $1',
      [id]
    );

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Prevent deletion of superuser
    if (existingUser.role === 'superuser') {
      return res
        .status(400)
        .json({ error: 'Não é possível excluir um superusuário' });
    }

    // Check permissions
    if (
      req.user.role !== 'superuser' &&
      existingUser.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Remove user from municipality supervisor references (simplified)
    try {
      await query(
        'UPDATE municipalities SET supervisor_id = NULL WHERE supervisor_id = $1',
        [id]
      );
    } catch (error) {
      console.log('Supervisor reference removal skipped:', error.message);
    }

    // Delete user
    await query('DELETE FROM users WHERE id = $1', [id]);

    // Log activity (simplified)
    try {
      await query(
        'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          req.user.id,
          'USER_DELETE',
          'users',
          existingUser.id,
          JSON.stringify({ name: existingUser.name, role: existingUser.role }),
          existingUser.municipality_id,
        ]
      );
    } catch (error) {
      console.log('Activity log skipped:', error.message);
    }

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get users by municipality (for superuser)
router.get(
  '/municipality/:municipalityId',
  requireSuperuser,
  validateUUID('municipalityId'),
  async (req, res) => {
    try {
      const { municipalityId } = req.params;

      const users = await getRows(
        `
      SELECT 
        u.id, u.name, u.email, u.role, 
        u.municipality_id, u.created_at, u.updated_at,
        m.name as municipality_name
      FROM users u
      LEFT JOIN municipalities m ON u.municipality_id = m.id
      WHERE u.municipality_id = $1
      ORDER BY u.name
    `,
        [municipalityId]
      );

      res.json(users);
    } catch (error) {
      console.error('Get users by municipality error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

export default router;
