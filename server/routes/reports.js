import express from 'express';
import { getRow, getRows, query } from '../database/connection.js';
import { authenticateToken, requireSupervisor } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all report templates (filtered by municipality)
router.get('/templates', async (req, res) => {
  try {
    let templatesQuery = `
      SELECT 
        rt.*,
        m.name as municipality_name
      FROM report_templates rt
      LEFT JOIN municipalities m ON rt.municipality_id = m.id
    `;

    const params = [];
    let whereClause = '';

    // Filter by municipality if not superuser
    if (req.user.role !== 'superuser') {
      whereClause = 'WHERE rt.municipality_id = $1';
      params.push(req.user.municipality_id);
    }

    templatesQuery += whereClause + ' ORDER BY rt.name';

    const templates = await getRows(templatesQuery, params);
    res.json(templates);
  } catch (error) {
    console.error('Get report templates error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get report template by ID
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const template = await getRow(
      `
      SELECT 
        rt.*,
        m.name as municipality_name
      FROM report_templates rt
      LEFT JOIN municipalities m ON rt.municipality_id = m.id
      WHERE rt.id = $1
    `,
      [id]
    );

    if (!template) {
      return res
        .status(404)
        .json({ error: 'Template de relatório não encontrado' });
    }

    // Check if user has access to this template's municipality
    if (
      req.user.role !== 'superuser' &&
      template.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json(template);
  } catch (error) {
    console.error('Get report template error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create report template
router.post('/templates', requireSupervisor, async (req, res) => {
  try {
    const { name, fields, filters, layout } = req.body;

    // Validation
    if (!name || !fields) {
      return res.status(400).json({
        error: 'Nome e campos são obrigatórios',
      });
    }

    // Set municipality_id based on user role
    let municipalityId = req.user.municipality_id;
    if (req.user.role === 'superuser' && req.body.municipalityId) {
      municipalityId = req.body.municipalityId;
    }

    // Create template
    const result = await query(
      `
      INSERT INTO report_templates (name, fields, filters, layout, municipality_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [
        name,
        JSON.stringify(fields),
        JSON.stringify(filters),
        JSON.stringify(layout),
        municipalityId,
      ]
    );

    const newTemplate = result.rows[0];

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user.id,
        req.user.name,
        'REPORT_TEMPLATE_CREATE',
        `Template de relatório "${name}" criado.`,
        municipalityId,
      ]
    );

    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Create report template error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update report template
router.put('/templates/:id', requireSupervisor, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, fields, filters, layout } = req.body;

    // Check if template exists
    const existingTemplate = await getRow(
      'SELECT name, municipality_id FROM report_templates WHERE id = $1',
      [id]
    );

    if (!existingTemplate) {
      return res
        .status(404)
        .json({ error: 'Template de relatório não encontrado' });
    }

    // Check if user has access to this template's municipality
    if (
      req.user.role !== 'superuser' &&
      existingTemplate.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Update template
    const result = await query(
      `
      UPDATE report_templates SET
        name = COALESCE($1, name),
        fields = COALESCE($2, fields),
        filters = COALESCE($3, filters),
        layout = COALESCE($4, layout),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `,
      [
        name,
        fields ? JSON.stringify(fields) : null,
        filters ? JSON.stringify(filters) : null,
        layout ? JSON.stringify(layout) : null,
        id,
      ]
    );

    const updatedTemplate = result.rows[0];

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user.id,
        req.user.name,
        'REPORT_TEMPLATE_UPDATE',
        `Template de relatório "${updatedTemplate.name}" atualizado.`,
        existingTemplate.municipality_id,
      ]
    );

    res.json(updatedTemplate);
  } catch (error) {
    console.error('Update report template error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete report template
router.delete('/templates/:id', requireSupervisor, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if template exists
    const existingTemplate = await getRow(
      'SELECT name, municipality_id FROM report_templates WHERE id = $1',
      [id]
    );

    if (!existingTemplate) {
      return res
        .status(404)
        .json({ error: 'Template de relatório não encontrado' });
    }

    // Check if user has access to this template's municipality
    if (
      req.user.role !== 'superuser' &&
      existingTemplate.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Delete template
    await query('DELETE FROM report_templates WHERE id = $1', [id]);

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user.id,
        req.user.name,
        'REPORT_TEMPLATE_DELETE',
        `Template de relatório "${existingTemplate.name}" excluído.`,
        existingTemplate.municipality_id,
      ]
    );

    res.json({ message: 'Template de relatório excluído com sucesso' });
  } catch (error) {
    console.error('Delete report template error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
