import express from 'express';
import { getRow, getRows, query } from '../database/connection.js';
import { authenticateToken, requireUser } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all inventories (filtered by municipality)
router.get('/', async (req, res) => {
  try {
    let inventoriesQuery = `
      SELECT 
        i.*,
        m.name as municipality_name
      FROM inventories i
      LEFT JOIN municipalities m ON i.municipality_id = m.id
    `;

    const params = [];
    let whereClause = '';

    // Filter by municipality if not superuser
    if (req.user.role !== 'superuser') {
      whereClause = 'WHERE i.municipality_id = $1';
      params.push(req.user.municipality_id);
    }

    inventoriesQuery += whereClause + ' ORDER BY i.created_at DESC';

    const inventories = await getRows(inventoriesQuery, params);
    res.json(inventories);
  } catch (error) {
    console.error('Get inventories error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get inventory by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const inventory = await getRow(
      `
      SELECT 
        i.*,
        m.name as municipality_name
      FROM inventories i
      LEFT JOIN municipalities m ON i.municipality_id = m.id
      WHERE i.id = $1
    `,
      [id]
    );

    if (!inventory) {
      return res.status(404).json({ error: 'Inventário não encontrado' });
    }

    // Check if user has access to this inventory's municipality
    if (
      req.user.role !== 'superuser' &&
      inventory.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Get inventory items
    const items = await getRows(
      'SELECT * FROM inventory_items WHERE inventory_id = $1',
      [id]
    );

    res.json({
      ...inventory,
      items: items,
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create inventory
router.post('/', requireUser, async (req, res) => {
  try {
    const { name, sectorName, scope, locationType } = req.body;

    // Validation
    if (!name || !sectorName) {
      return res.status(400).json({
        error: 'Nome e setor são obrigatórios',
      });
    }

    // Set municipality_id based on user role
    let municipalityId = req.user.municipality_id;
    if (req.user.role === 'superuser' && req.body.municipalityId) {
      municipalityId = req.body.municipalityId;
    }

    // Create inventory
    const result = await query(
      `
      INSERT INTO inventories (name, sector_name, scope, location_type, municipality_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [name, sectorName, scope || 'sector', locationType, municipalityId]
    );

    const newInventory = result.rows[0];

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user.id,
        req.user.name,
        'INVENTORY_CREATE',
        `Inventário "${name}" criado.`,
        municipalityId,
      ]
    );

    res.status(201).json(newInventory);
  } catch (error) {
    console.error('Create inventory error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update inventory
router.put('/:id', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if inventory exists
    const existingInventory = await getRow(
      'SELECT name, municipality_id FROM inventories WHERE id = $1',
      [id]
    );

    if (!existingInventory) {
      return res.status(404).json({ error: 'Inventário não encontrado' });
    }

    // Check if user has access to this inventory's municipality
    if (
      req.user.role !== 'superuser' &&
      existingInventory.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Update inventory
    const result = await query(
      `
      UPDATE inventories SET
        name = COALESCE($1, name),
        sector_name = COALESCE($2, sector_name),
        scope = COALESCE($3, scope),
        location_type = $4,
        status = COALESCE($5, status),
        finalized_at = $6
      WHERE id = $7
      RETURNING *
    `,
      [
        updateData.name,
        updateData.sectorName,
        updateData.scope,
        updateData.locationType,
        updateData.status,
        updateData.finalizedAt,
        id,
      ]
    );

    const updatedInventory = result.rows[0];

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user.id,
        req.user.name,
        'INVENTORY_UPDATE',
        `Inventário "${updatedInventory.name}" atualizado.`,
        existingInventory.municipality_id,
      ]
    );

    res.json(updatedInventory);
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete inventory
router.delete('/:id', requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if inventory exists
    const existingInventory = await getRow(
      'SELECT name, municipality_id FROM inventories WHERE id = $1',
      [id]
    );

    if (!existingInventory) {
      return res.status(404).json({ error: 'Inventário não encontrado' });
    }

    // Check if user has access to this inventory's municipality
    if (
      req.user.role !== 'superuser' &&
      existingInventory.municipality_id !== req.user.municipality_id
    ) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Delete inventory (cascade will handle related data)
    await query('DELETE FROM inventories WHERE id = $1', [id]);

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, municipality_id) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user.id,
        req.user.name,
        'INVENTORY_DELETE',
        `Inventário "${existingInventory.name}" excluído.`,
        existingInventory.municipality_id,
      ]
    );

    res.json({ message: 'Inventário excluído com sucesso' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
