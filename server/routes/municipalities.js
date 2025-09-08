import express from 'express';
import { getRow, getRows, query } from '../database/connection.js';
import { authenticateToken, requireSuperuser } from '../middleware/auth.js';

const router = express.Router();

// Public route for municipalities (for login page)
router.get('/public', async (req, res) => {
  try {
    const municipalities = await getRows(`
      SELECT 
        id,
        name,
        state
      FROM municipalities
      ORDER BY name
    `);

    res.json(municipalities);
  } catch (error) {
    console.error('Get public municipalities error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Apply authentication to all other routes
router.use(authenticateToken);
console.log('Municipalities router - authenticateToken middleware applied');
console.log('Municipalities router - authenticateToken middleware applied');

// Get all municipalities
router.get('/', async (req, res) => {
  try {
    const municipalities = await getRows(`
      SELECT 
        m.id,
        m.name,
        m.logo_url as "logoUrl",
        m.supervisor_id as "supervisorId",
        m.full_address as "fullAddress",
        m.cnpj,
        m.contact_email as "contactEmail",
        m.mayor_name as "mayorName",
        m.mayor_cpf as "mayorCpf",
        m.access_start_date as "accessStartDate",
        m.access_end_date as "accessEndDate",
        m.state,
        m.created_at as "createdAt",
        m.updated_at as "updatedAt",
        u.name as supervisor_name,
        u.email as supervisor_email
      FROM municipalities m
      LEFT JOIN users u ON m.supervisor_id = u.id
      ORDER BY m.name
    `);

    res.json(municipalities);
  } catch (error) {
    console.error('Get municipalities error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get municipality by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const municipality = await getRow(
      `
      SELECT 
        m.*,
        u.name as supervisor_name,
        u.email as supervisor_email
      FROM municipalities m
      LEFT JOIN users u ON m.supervisor_id = u.id
      WHERE m.id = $1
    `,
      [id]
    );

    if (!municipality) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }

    res.json(municipality);
  } catch (error) {
    console.error('Get municipality error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create municipality (without supervisor)
router.post('/', requireSuperuser, async (req, res) => {
  try {
    console.log('=== CREATE MUNICIPALITY START ===');
    console.log(
      'Create municipality - Request body:',
      JSON.stringify(req.body, null, 2)
    );
    console.log(
      'Create municipality - Content-Type:',
      req.headers['content-type']
    );
    console.log('Create municipality - Raw body:', req.body);
    console.log('Create municipality - User:', req.user);
    console.log('Create municipality - User role:', req.user?.role);

    const {
      name,
      logoUrl,
      fullAddress,
      cnpj,
      contactEmail,
      mayorName,
      mayorCpf,
      accessStartDate,
      accessEndDate,
      state = 'SP', // Default para São Paulo
    } = req.body;

    // Validation
    if (
      !name ||
      !fullAddress ||
      !cnpj ||
      !contactEmail ||
      !mayorName ||
      !mayorCpf
    ) {
      return res.status(400).json({
        error: 'Todos os campos obrigatórios devem ser preenchidos',
      });
    }

    // Check if CNPJ already exists
    const existingMunicipality = await getRow(
      'SELECT id FROM municipalities WHERE cnpj = $1',
      [cnpj]
    );

    if (existingMunicipality) {
      return res.status(400).json({ error: 'CNPJ já cadastrado' });
    }

    // Create municipality
    console.log('Create municipality - Inserting with values:', {
      name,
      state,
      logoUrl,
      fullAddress,
      cnpj,
      contactEmail,
      mayorName,
      mayorCpf,
      accessStartDate,
      accessEndDate,
    });

    const result = await query(
      `
      INSERT INTO municipalities (
        name, state, logo_url, full_address, cnpj, contact_email, 
        mayor_name, mayor_cpf, access_start_date, access_end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
      [
        name,
        state,
        logoUrl,
        fullAddress,
        cnpj,
        contactEmail,
        mayorName,
        mayorCpf,
        accessStartDate,
        accessEndDate,
      ]
    );

    const municipality = result.rows[0];
    console.log('Create municipality - Created:', municipality);

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        req.user.id,
        'MUNICIPALITY_CREATE',
        'municipalities',
        municipality.id,
        JSON.stringify({ name }),
        municipality.id,
      ]
    );

    res.status(201).json(municipality);
  } catch (error) {
    console.error('Create municipality error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update municipality
router.put('/:id', requireSuperuser, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      state,
      logoUrl,
      fullAddress,
      cnpj,
      contactEmail,
      mayorName,
      mayorCpf,
      accessStartDate,
      accessEndDate,
    } = req.body;

    // Check if municipality exists
    const existingMunicipality = await getRow(
      'SELECT name FROM municipalities WHERE id = $1',
      [id]
    );

    if (!existingMunicipality) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }

    // Check if CNPJ already exists (excluding current municipality)
    if (cnpj) {
      const cnpjExists = await getRow(
        'SELECT id FROM municipalities WHERE cnpj = $1 AND id != $2',
        [cnpj, id]
      );

      if (cnpjExists) {
        return res.status(400).json({ error: 'CNPJ já cadastrado' });
      }
    }

    // Update municipality
    const result = await query(
      `
      UPDATE municipalities SET
        name = COALESCE($1, name),
        state = COALESCE($2, state),
        logo_url = $3,
        full_address = COALESCE($4, full_address),
        cnpj = COALESCE($5, cnpj),
        contact_email = COALESCE($6, contact_email),
        mayor_name = COALESCE($7, mayor_name),
        mayor_cpf = COALESCE($8, mayor_cpf),
        access_start_date = $9,
        access_end_date = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `,
      [
        name,
        state,
        logoUrl,
        fullAddress,
        cnpj,
        contactEmail,
        mayorName,
        mayorCpf,
        accessStartDate,
        accessEndDate,
        id,
      ]
    );

    const municipality = result.rows[0];

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        req.user.id,
        'MUNICIPALITY_UPDATE',
        'municipalities',
        municipality.id,
        JSON.stringify({ name: municipality.name }),
        municipality.id,
      ]
    );

    res.json(municipality);
  } catch (error) {
    console.error('Update municipality error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Assign supervisor to municipality
router.post('/:id/assign-supervisor', async (req, res) => {
  try {
    const { id } = req.params;
    const { supervisorId } = req.body;

    if (!supervisorId) {
      return res.status(400).json({ error: 'ID do supervisor é obrigatório' });
    }

    // Check if municipality exists
    const municipality = await getRow(
      'SELECT name FROM municipalities WHERE id = $1',
      [id]
    );

    if (!municipality) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }

    // Check if supervisor exists and has supervisor role
    const supervisor = await getRow(
      'SELECT id, name, role FROM users WHERE id = $1',
      [supervisorId]
    );

    if (!supervisor) {
      return res.status(404).json({ error: 'Supervisor não encontrado' });
    }

    if (!['supervisor', 'admin'].includes(supervisor.role)) {
      return res.status(400).json({
        error: 'Usuário deve ter papel de supervisor ou admin',
      });
    }

    // Update municipality with supervisor
    await query(
      'UPDATE municipalities SET supervisor_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [supervisorId, id]
    );

    // Update supervisor's municipality_id
    await query('UPDATE users SET municipality_id = $1 WHERE id = $2', [
      id,
      supervisorId,
    ]);

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        req.user.id,
        'SUPERVISOR_ASSIGNED',
        'municipalities',
        id,
        JSON.stringify({ supervisor_name: supervisor.name }),
        id,
      ]
    );

    res.json({
      message: 'Supervisor atribuído com sucesso',
      municipality: municipality.name,
      supervisor: supervisor.name,
    });
  } catch (error) {
    console.error('Assign supervisor error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remove supervisor from municipality
router.delete('/:id/remove-supervisor', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if municipality exists
    const municipality = await getRow(
      'SELECT name, supervisor_id FROM municipalities WHERE id = $1',
      [id]
    );

    if (!municipality) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }

    if (!municipality.supervisor_id) {
      return res
        .status(400)
        .json({ error: 'Município não possui supervisor atribuído' });
    }

    // Get supervisor name for logging
    const supervisor = await getRow('SELECT name FROM users WHERE id = $1', [
      municipality.supervisor_id,
    ]);

    // Remove supervisor from municipality
    await query(
      'UPDATE municipalities SET supervisor_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Remove municipality_id from supervisor
    await query('UPDATE users SET municipality_id = NULL WHERE id = $1', [
      municipality.supervisor_id,
    ]);

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, municipality_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        req.user.id,
        'SUPERVISOR_REMOVED',
        'municipalities',
        id,
        JSON.stringify({ supervisor_name: supervisor.name }),
        id,
      ]
    );

    res.json({
      message: 'Supervisor removido com sucesso',
      municipality: municipality.name,
      supervisor: supervisor.name,
    });
  } catch (error) {
    console.error('Remove supervisor error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete municipality - FORCE MODE FOR DEVELOPMENT
router.delete('/:id', requireSuperuser, async (req, res) => {
  try {
    const { id } = req.params;
    const { force = 'true' } = req.query; // Default to force=true for development

    console.log(`🗑️ FORCE DELETING MUNICIPALITY: ${id} (DEVELOPMENT MODE)`);

    // Check if municipality exists
    const municipality = await getRow(
      'SELECT name FROM municipalities WHERE id = $1',
      [id]
    );

    if (!municipality) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }

    console.log(
      `🗑️ Found municipality: ${municipality.name} - Starting FORCE deletion...`
    );

    // FORCE DELETION - Remove ALL dependencies in correct order
    try {
      // Start transaction for data consistency
      await query('BEGIN');
      console.log('🔄 Transaction started');

      // Define all tables that might reference municipality_id in order of deletion
      const deleteQueries = [
        // First: Remove child records that reference other tables
        {
          table: 'patrimonio_notes',
          query:
            'DELETE FROM patrimonio_notes WHERE patrimonio_id IN (SELECT id FROM patrimonios WHERE municipality_id = $1)',
        },
        {
          table: 'inventory_items',
          query:
            'DELETE FROM inventory_items WHERE inventory_id IN (SELECT id FROM inventories WHERE municipality_id = $1)',
        },
        {
          table: 'transfers',
          query: 'DELETE FROM transfers WHERE municipality_id = $1',
        },

        // Second: Remove activity and audit logs
        {
          table: 'activity_logs',
          query: 'DELETE FROM activity_logs WHERE municipality_id = $1',
        },
        {
          table: 'audit_logs',
          query: 'DELETE FROM audit_logs WHERE municipality_id = $1',
        },
        {
          table: 'notifications',
          query: 'DELETE FROM notifications WHERE municipality_id = $1',
        },
        {
          table: 'lockout_records',
          query: 'DELETE FROM lockout_records WHERE municipality_id = $1',
        },

        // Third: Remove analytics and reports
        {
          table: 'analytics_metrics',
          query: 'DELETE FROM analytics_metrics WHERE municipality_id = $1',
        },
        {
          table: 'report_queue',
          query: 'DELETE FROM report_queue WHERE municipality_id = $1',
        },

        // Fourth: Remove main data tables
        {
          table: 'patrimonios',
          query: 'DELETE FROM patrimonios WHERE municipality_id = $1',
        },
        {
          table: 'imoveis',
          query: 'DELETE FROM imoveis WHERE municipality_id = $1',
        },
        {
          table: 'inventories',
          query: 'DELETE FROM inventories WHERE municipality_id = $1',
        },

        // Fifth: Remove configuration tables
        {
          table: 'themes',
          query: 'DELETE FROM themes WHERE municipality_id = $1',
        },
        {
          table: 'report_templates',
          query: 'DELETE FROM report_templates WHERE municipality_id = $1',
        },
        {
          table: 'label_templates',
          query: 'DELETE FROM label_templates WHERE municipality_id = $1',
        },
        {
          table: 'locals',
          query: 'DELETE FROM locals WHERE municipality_id = $1',
        },
        {
          table: 'sectors',
          query: 'DELETE FROM sectors WHERE municipality_id = $1',
        },

        // Last: Remove users (except superuser)
        {
          table: 'users',
          query: 'DELETE FROM users WHERE municipality_id = $1 AND role != $2',
          params: [id, 'superuser'],
        },
      ];

      // Execute all delete queries
      for (const {
        table,
        query: deleteQuery,
        params = [id],
      } of deleteQueries) {
        try {
          console.log(`🗑️ Deleting from ${table}...`);
          const result = await query(deleteQuery, params);
          console.log(`✅ Deleted from ${table}: ${result.rowCount || 0} rows`);
        } catch (error) {
          console.log(`⚠️ Error deleting from ${table}: ${error.message}`);
          // Continue with other tables even if one fails
        }
      }

      // Finally delete the municipality
      console.log('🗑️ Deleting municipality...');
      const municipalityResult = await query(
        'DELETE FROM municipalities WHERE id = $1',
        [id]
      );
      console.log(
        `✅ Municipality deleted: ${municipalityResult.rowCount} rows`
      );

      // Commit transaction
      await query('COMMIT');
      console.log('✅ Transaction committed successfully');

      res.json({
        success: true,
        message:
          'Município excluído com sucesso (FORÇADO - MODO DESENVOLVIMENTO)',
        details: 'Todos os dados vinculados foram removidos',
        municipality: municipality.name,
      });
    } catch (cleanupError) {
      // Rollback transaction on error
      await query('ROLLBACK');
      console.error('❌ Error during FORCE deletion:', cleanupError);
      return res.status(500).json({
        error: 'Erro durante exclusão forçada',
        details: cleanupError.message,
      });
    }
  } catch (error) {
    console.error('❌ Delete municipality error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Helper function to check municipality dependencies
async function checkMunicipalityDependencies(municipalityId) {
  const dependencies = {
    hasDependencies: false,
    details: [],
  };

  try {
    // Check users
    const usersCount = await getRow(
      'SELECT COUNT(*) as count FROM users WHERE municipality_id = $1 AND role != $2',
      [municipalityId, 'superuser']
    );
    if (usersCount && parseInt(usersCount.count) > 0) {
      dependencies.hasDependencies = true;
      dependencies.details.push(`Usuários: ${usersCount.count}`);
    }

    // Check sectors
    const sectorsCount = await getRow(
      'SELECT COUNT(*) as count FROM sectors WHERE municipality_id = $1',
      [municipalityId]
    );
    if (sectorsCount && parseInt(sectorsCount.count) > 0) {
      dependencies.hasDependencies = true;
      dependencies.details.push(`Setores: ${sectorsCount.count}`);
    }

    // Check locals
    const localsCount = await getRow(
      'SELECT COUNT(*) as count FROM locals WHERE municipality_id = $1',
      [municipalityId]
    );
    if (localsCount && parseInt(localsCount.count) > 0) {
      dependencies.hasDependencies = true;
      dependencies.details.push(`Locais: ${localsCount.count}`);
    }

    // Check patrimonios
    const patrimoniosCount = await getRow(
      'SELECT COUNT(*) as count FROM patrimonios WHERE municipality_id = $1',
      [municipalityId]
    );
    if (patrimoniosCount && parseInt(patrimoniosCount.count) > 0) {
      dependencies.hasDependencies = true;
      dependencies.details.push(`Patrimônios: ${patrimoniosCount.count}`);
    }

    // Check imoveis
    const imoveisCount = await getRow(
      'SELECT COUNT(*) as count FROM imoveis WHERE municipality_id = $1',
      [municipalityId]
    );
    if (imoveisCount && parseInt(imoveisCount.count) > 0) {
      dependencies.hasDependencies = true;
      dependencies.details.push(`Imóveis: ${imoveisCount.count}`);
    }

    // Check inventories
    const inventoriesCount = await getRow(
      'SELECT COUNT(*) as count FROM inventories WHERE municipality_id = $1',
      [municipalityId]
    );
    if (inventoriesCount && parseInt(inventoriesCount.count) > 0) {
      dependencies.hasDependencies = true;
      dependencies.details.push(`Inventários: ${inventoriesCount.count}`);
    }

    // Check activity logs
    const activityLogsCount = await getRow(
      'SELECT COUNT(*) as count FROM activity_logs WHERE municipality_id = $1',
      [municipalityId]
    );
    if (activityLogsCount && parseInt(activityLogsCount.count) > 0) {
      dependencies.hasDependencies = true;
      dependencies.details.push(
        `Logs de atividade: ${activityLogsCount.count}`
      );
    }

    // Check label templates
    const labelTemplatesCount = await getRow(
      'SELECT COUNT(*) as count FROM label_templates WHERE municipality_id = $1',
      [municipalityId]
    );
    if (labelTemplatesCount && parseInt(labelTemplatesCount.count) > 0) {
      dependencies.hasDependencies = true;
      dependencies.details.push(
        `Templates de etiquetas: ${labelTemplatesCount.count}`
      );
    }

    // Check report templates
    const reportTemplatesCount = await getRow(
      'SELECT COUNT(*) as count FROM report_templates WHERE municipality_id = $1',
      [municipalityId]
    );
    if (reportTemplatesCount && parseInt(reportTemplatesCount.count) > 0) {
      dependencies.hasDependencies = true;
      dependencies.details.push(
        `Templates de relatórios: ${reportTemplatesCount.count}`
      );
    }

    // Check themes
    const themesCount = await getRow(
      'SELECT COUNT(*) as count FROM themes WHERE municipality_id = $1',
      [municipalityId]
    );
    if (themesCount && parseInt(themesCount.count) > 0) {
      dependencies.hasDependencies = true;
      dependencies.details.push(`Temas: ${themesCount.count}`);
    }
  } catch (error) {
    console.error('Error checking dependencies:', error);
    dependencies.hasDependencies = true;
    dependencies.details.push('Erro ao verificar dependências');
  }

  return dependencies;
}

// Get municipality statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if municipality exists
    const municipality = await getRow(
      'SELECT name FROM municipalities WHERE id = $1',
      [id]
    );

    if (!municipality) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }

    // Get statistics
    const stats = await getRow(
      `
      SELECT
        (SELECT COUNT(*) FROM users WHERE municipality_id = $1) as total_users,
        (SELECT COUNT(*) FROM sectors WHERE municipality_id = $1) as total_sectors,
        (SELECT COUNT(*) FROM locals WHERE municipality_id = $1) as total_locals,
        (SELECT COUNT(*) FROM patrimonios WHERE municipality_id = $1) as total_patrimonios,
        (SELECT COUNT(*) FROM imoveis WHERE municipality_id = $1) as total_imoveis,
        (SELECT COUNT(*) FROM inventories WHERE municipality_id = $1) as total_inventories
    `,
      [id]
    );

    res.json(stats);
  } catch (error) {
    console.error('Get municipality stats error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
