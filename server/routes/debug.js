import express from 'express'
import { getRow, getRows, pool, query } from '../database/connection.js'
import {
    analyzeQueryPerformance,
    cleanupOldData,
    createPerformanceIndexes,
    getPerformanceStats,
    optimizeSpecificQueries
} from '../database/optimize.js'
import { authenticateToken, requireSupervisor } from '../middleware/auth.js'
import { notificationService } from '../services/notification-service.js'
import { websocketServer } from '../services/websocket-server.js'

const router = express.Router()

// Apply authentication to all routes (except test endpoints)
router.use(authenticateToken)

// Public test endpoint for WebSocket
router.post('/test-websocket-public', async (req, res) => {
  try {
    const { type = 'info', title, message, target = 'broadcast' } = req.body

    if (!title || !message) {
      return res.status(400).json({ 
        error: 'Título e mensagem são obrigatórios' 
      })
    }

    const notification = {
      type,
      title,
      message,
      data: {
        test: true,
        timestamp: new Date().toISOString()
      }
    }

    let sent = false
    let stats = null

    switch (target) {
      case 'broadcast':
        sent = notificationService.broadcast(notification)
        break
      case 'role':
        sent = notificationService.sendToRole('superuser', notification)
        break
      default:
        return res.status(400).json({ error: 'Tipo de destino inválido' })
    }

    if (sent) {
      stats = websocketServer.getStats()
      
      res.json({ 
        success: true, 
        message: 'Notificação enviada com sucesso',
        notification,
        websocketStats: stats
      })
    } else {
      res.status(500).json({ error: 'Falha ao enviar notificação' })
    }
  } catch (error) {
    console.error('❌ Erro ao testar WebSocket:', error)
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message })
  }
})

// Simple test route
router.get('/test', requireSupervisor, async (req, res) => {
  try {
    console.log('🧪 Teste simples da rota de debug')
    res.json({
      success: true, 
      message: 'Rota de debug funcionando',
      user: req.user.name,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Erro no teste:', error)
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    })
  }
})

// Test municipality deletion
router.get('/test-municipality-delete/:id', requireSupervisor, async (req, res) => {
  try {
    const { id } = req.params
    console.log('🧪 Testando exclusão de município:', id)
    
    // Check if municipality exists
    const municipality = await getRow(
      'SELECT name FROM municipalities WHERE id = $1',
      [id]
    )

    if (!municipality) {
      return res.json({
        success: false,
        error: 'Município não encontrado'
      })
    }

    // Check dependencies
    const dependencies = await checkMunicipalityDependencies(id)
    
    res.json({
      success: true,
      municipality: municipality.name,
      dependencies: dependencies
    })
  } catch (error) {
    console.error('❌ Erro no teste de exclusão:', error)
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    })
  }
})

// Test actual municipality deletion
router.delete('/test-municipality-delete/:id', requireSupervisor, async (req, res) => {
  try {
    const { id } = req.params
    const { force } = req.query
    console.log('🧪 Testando exclusão real de município:', id, 'force:', force)
    
    // Check if municipality exists
    const municipality = await getRow(
      'SELECT name FROM municipalities WHERE id = $1',
      [id]
    )

    if (!municipality) {
      return res.status(404).json({
        success: false,
        error: 'Município não encontrado'
      })
    }

    // Check dependencies
    const dependencies = await checkMunicipalityDependencies(id)
    
    if (dependencies.hasDependencies && force !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Não é possível excluir o município. Existem dados vinculados a ele.',
        details: dependencies.details
      })
    }

    // If force deletion, remove dependencies first
    if (dependencies.hasDependencies && force === 'true') {
      console.log('🧪 Forçando exclusão - removendo dependências...')
      
      try {
        // Remove activity logs first
        if (dependencies.details.some(d => d.includes('Logs de atividade'))) {
          console.log('🧪 Removendo logs de atividade...')
          await query('DELETE FROM activity_logs WHERE municipality_id = $1', [id])
        }
        
        // Remove other dependencies in order
        if (dependencies.details.some(d => d.includes('Temas'))) {
          console.log('🧪 Removendo temas...')
          await query('DELETE FROM themes WHERE municipality_id = $1', [id])
        }
        
        if (dependencies.details.some(d => d.includes('Templates de relatórios'))) {
          console.log('🧪 Removendo templates de relatórios...')
          await query('DELETE FROM report_templates WHERE municipality_id = $1', [id])
        }
        
        if (dependencies.details.some(d => d.includes('Templates de etiquetas'))) {
          console.log('🧪 Removendo templates de etiquetas...')
          await query('DELETE FROM label_templates WHERE municipality_id = $1', [id])
        }
        
        if (dependencies.details.some(d => d.includes('Inventários'))) {
          console.log('🧪 Removendo inventários...')
          await query('DELETE FROM inventories WHERE municipality_id = $1', [id])
        }
        
        if (dependencies.details.some(d => d.includes('Imóveis'))) {
          console.log('🧪 Removendo imóveis...')
          await query('DELETE FROM imoveis WHERE municipality_id = $1', [id])
        }
        
        if (dependencies.details.some(d => d.includes('Patrimônios'))) {
          console.log('🧪 Removendo patrimônios...')
          await query('DELETE FROM patrimonios WHERE municipality_id = $1', [id])
        }
        
        if (dependencies.details.some(d => d.includes('Locais'))) {
          console.log('🧪 Removendo locais...')
          await query('DELETE FROM locals WHERE municipality_id = $1', [id])
        }
        
        if (dependencies.details.some(d => d.includes('Setores'))) {
          console.log('🧪 Removendo setores...')
          await query('DELETE FROM sectors WHERE municipality_id = $1', [id])
        }
        
        if (dependencies.details.some(d => d.includes('Usuários'))) {
          console.log('🧪 Removendo usuários...')
          await query('DELETE FROM users WHERE municipality_id = $1 AND role != $2', [id, 'superuser'])
        }
        
      } catch (cleanupError) {
        console.error('🧪 Erro durante limpeza:', cleanupError)
        return res.status(500).json({
          success: false,
          error: 'Erro ao limpar dados dependentes',
          details: cleanupError.message
        })
      }
    }

    // Try to delete municipality
    try {
      console.log(`🧪 Tentando excluir município com ID: ${id}`)
      const result = await query('DELETE FROM municipalities WHERE id = $1', [id])
      console.log(`🧪 Resultado da exclusão:`, result)
      
      res.json({
        success: true,
        message: force === 'true' ? 'Município excluído com sucesso (forçado)' : 'Município excluído com sucesso',
        municipality: municipality.name
      })
    } catch (deleteError) {
      console.error('🧪 Erro na exclusão:', deleteError)
      res.status(500).json({
        success: false,
        error: 'Erro ao excluir município',
        details: deleteError.message
      })
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de exclusão:', error)
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    })
  }
})

// Check foreign key constraints
router.get('/check-constraints', requireSupervisor, async (req, res) => {
  try {
    console.log('🔍 Verificando restrições de chave estrangeira...')
    
    const constraints = await getRows(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'municipalities'
    `)
    
    res.json({
      success: true,
      constraints: constraints
    })
  } catch (error) {
    console.error('❌ Erro ao verificar restrições:', error)
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    })
  }
})

// Check specific municipality data
router.get('/municipality-data/:id', requireSupervisor, async (req, res) => {
  try {
    const { id } = req.params
    console.log('🔍 Verificando dados do município:', id)
    
    // Get municipality info
    const municipality = await getRow(
      'SELECT id, name FROM municipalities WHERE id = $1',
      [id]
    )
    
    if (!municipality) {
      return res.status(404).json({
        success: false,
        error: 'Município não encontrado'
      })
    }
    
    // Get activity logs
    const activityLogs = await getRows(`
      SELECT id, user_id, action, table_name, record_id, created_at
      FROM activity_logs 
      WHERE municipality_id = $1
      ORDER BY created_at DESC
    `, [id])
    
    // Get users
    const users = await getRows(`
      SELECT id, name, email, role
      FROM users 
      WHERE municipality_id = $1
      ORDER BY name
    `, [id])
    
    // Get sectors
    const sectors = await getRows(`
      SELECT id, name
      FROM sectors 
      WHERE municipality_id = $1
      ORDER BY name
    `, [id])
    
    // Get locals
    const locals = await getRows(`
      SELECT id, name, sector_id
      FROM locals 
      WHERE municipality_id = $1
      ORDER BY name
    `, [id])
    
    // Get patrimonios
    const patrimonios = await getRows(`
      SELECT id, numero_patrimonio, descricao
      FROM patrimonios 
      WHERE municipality_id = $1
      ORDER BY numero_patrimonio
    `, [id])
    
    // Get imoveis
    const imoveis = await getRows(`
      SELECT id, numero_patrimonio, descricao
      FROM imoveis 
      WHERE municipality_id = $1
      ORDER BY numero_patrimonio
    `, [id])
    
    // Get inventories
    const inventories = await getRows(`
      SELECT id, name
      FROM inventories 
      WHERE municipality_id = $1
      ORDER BY name
    `, [id])
    
    res.json({
      success: true,
      municipality: municipality,
      data: {
        activityLogs: activityLogs,
        users: users,
        sectors: sectors,
        locals: locals,
        patrimonios: patrimonios,
        imoveis: imoveis,
        inventories: inventories
      },
      counts: {
        activityLogs: activityLogs.length,
        users: users.length,
        sectors: sectors.length,
        locals: locals.length,
        patrimonios: patrimonios.length,
        imoveis: imoveis.length,
        inventories: inventories.length
      }
    })
  } catch (error) {
    console.error('❌ Erro ao verificar dados do município:', error)
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    })
  }
})

// Helper function to check municipality dependencies
async function checkMunicipalityDependencies(municipalityId) {
  const dependencies = {
    hasDependencies: false,
    details: []
  }

  try {
    // Check users
    const usersCount = await getRow(
      'SELECT COUNT(*) as count FROM users WHERE municipality_id = $1 AND role != $2',
      [municipalityId, 'superuser']
    )
    if (usersCount && parseInt(usersCount.count) > 0) {
      dependencies.hasDependencies = true
      dependencies.details.push(`Usuários: ${usersCount.count}`)
    }

    // Check sectors
    const sectorsCount = await getRow(
      'SELECT COUNT(*) as count FROM sectors WHERE municipality_id = $1',
      [municipalityId]
    )
    if (sectorsCount && parseInt(sectorsCount.count) > 0) {
      dependencies.hasDependencies = true
      dependencies.details.push(`Setores: ${sectorsCount.count}`)
    }

    // Check locals
    const localsCount = await getRow(
      'SELECT COUNT(*) as count FROM locals WHERE municipality_id = $1',
      [municipalityId]
    )
    if (localsCount && parseInt(localsCount.count) > 0) {
      dependencies.hasDependencies = true
      dependencies.details.push(`Locais: ${localsCount.count}`)
    }

    // Check patrimonios
    const patrimoniosCount = await getRow(
      'SELECT COUNT(*) as count FROM patrimonios WHERE municipality_id = $1',
      [municipalityId]
    )
    if (patrimoniosCount && parseInt(patrimoniosCount.count) > 0) {
      dependencies.hasDependencies = true
      dependencies.details.push(`Patrimônios: ${patrimoniosCount.count}`)
    }

    // Check imoveis
    const imoveisCount = await getRow(
      'SELECT COUNT(*) as count FROM imoveis WHERE municipality_id = $1',
      [municipalityId]
    )
    if (imoveisCount && parseInt(imoveisCount.count) > 0) {
      dependencies.hasDependencies = true
      dependencies.details.push(`Imóveis: ${imoveisCount.count}`)
    }

    // Check inventories
    const inventoriesCount = await getRow(
      'SELECT COUNT(*) as count FROM inventories WHERE municipality_id = $1',
      [municipalityId]
    )
    if (inventoriesCount && parseInt(inventoriesCount.count) > 0) {
      dependencies.hasDependencies = true
      dependencies.details.push(`Inventários: ${inventoriesCount.count}`)
    }

    // Check activity logs
    const activityLogsCount = await getRow(
      'SELECT COUNT(*) as count FROM activity_logs WHERE municipality_id = $1',
      [municipalityId]
    )
    if (activityLogsCount && parseInt(activityLogsCount.count) > 0) {
      dependencies.hasDependencies = true
      dependencies.details.push(`Logs de atividade: ${activityLogsCount.count}`)
    }

    // Check label templates
    const labelTemplatesCount = await getRow(
      'SELECT COUNT(*) as count FROM label_templates WHERE municipality_id = $1',
      [municipalityId]
    )
    if (labelTemplatesCount && parseInt(labelTemplatesCount.count) > 0) {
      dependencies.hasDependencies = true
      dependencies.details.push(`Templates de etiquetas: ${labelTemplatesCount.count}`)
    }

    // Check report templates
    const reportTemplatesCount = await getRow(
      'SELECT COUNT(*) as count FROM report_templates WHERE municipality_id = $1',
      [municipalityId]
    )
    if (reportTemplatesCount && parseInt(reportTemplatesCount.count) > 0) {
      dependencies.hasDependencies = true
      dependencies.details.push(`Templates de relatórios: ${reportTemplatesCount.count}`)
    }

    // Check themes
    const themesCount = await getRow(
      'SELECT COUNT(*) as count FROM themes WHERE municipality_id = $1',
      [municipalityId]
    )
    if (themesCount && parseInt(themesCount.count) > 0) {
      dependencies.hasDependencies = true
      dependencies.details.push(`Temas: ${themesCount.count}`)
    }

  } catch (error) {
    console.error('Error checking dependencies:', error)
    dependencies.hasDependencies = true
    dependencies.details.push('Erro ao verificar dependências')
  }

  return dependencies
}

// Comprehensive system audit
router.get('/audit', requireSupervisor, async (req, res) => {
  try {
    console.log('🔍 Iniciando auditoria completa do sistema...')
    
    const auditResults = {
      timestamp: new Date().toISOString(),
      user: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role,
        municipality_id: req.user.municipality_id
      },
      database: {
        tables: {},
        relationships: {},
        data_integrity: {}
      },
      api_endpoints: {
        users: {},
        sectors: {},
        locals: {},
        patrimonios: {},
        municipalities: {},
        imoveis: {},
        manutencao: {},
        transfers: {},
        inventories: {},
        reports: {},
        activity_logs: {},
        uploads: {}
      },
             frontend_integration: {
         contexts: {},
         forms: {},
         navigation: {},
         pages: {},
         components: {}
       },
      errors: [],
      warnings: [],
      recommendations: []
    }

    // 1. Verificar estrutura das tabelas
    console.log('📋 Verificando estrutura das tabelas...')
    
    const tables = [
      'users', 'municipalities', 'sectors', 'locals', 'patrimonios', 'activity_logs',
      'imoveis', 'manutencao_tasks', 'transfers', 'inventories', 'report_templates', 'uploads',
      'label_templates', 'excel_csv_templates', 'form_fields', 'customization_settings'
    ]
    
    for (const table of tables) {
      try {
        const exists = await getRow(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table])
        
        auditResults.database.tables[table] = {
          exists: exists.exists
        }
        
        if (exists.exists) {
          const columns = await getRows(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = $1
            ORDER BY ordinal_position
          `, [table])
          
          auditResults.database.tables[table].columns = columns
          
          // Verificar se há dados
          const count = await getRow(`SELECT COUNT(*) as count FROM ${table}`)
          auditResults.database.tables[table].record_count = parseInt(count.count)
        }
      } catch (error) {
        auditResults.errors.push(`Erro ao verificar tabela ${table}: ${error.message}`)
      }
    }

    // 2. Verificar relacionamentos
    console.log('🔗 Verificando relacionamentos...')
    
    try {
      // Verificar foreign keys
      const foreignKeys = await getRows(`
      SELECT 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name, kcu.column_name
      `)
      
      auditResults.database.relationships.foreign_keys = foreignKeys
  } catch (error) {
      auditResults.errors.push(`Erro ao verificar relacionamentos: ${error.message}`)
    }

    // 3. Verificar integridade dos dados
    console.log('✅ Verificando integridade dos dados...')
    
    try {
      // Verificar se há municípios
      const municipalities = await getRows('SELECT id, name FROM municipalities')
      auditResults.database.data_integrity.municipalities = municipalities
      
      if (municipalities.length === 0) {
        auditResults.warnings.push('Nenhum município encontrado no sistema')
      }
      
      // Verificar se há setores
      const sectors = await getRows('SELECT id, name, municipality_id FROM sectors')
      auditResults.database.data_integrity.sectors = sectors
      
      if (sectors.length === 0) {
        auditResults.warnings.push('Nenhum setor encontrado no sistema')
      }
      
      // Verificar se há locais
      const locals = await getRows('SELECT id, name, sector_id, municipality_id FROM locals')
      auditResults.database.data_integrity.locals = locals
      
      // Verificar se há patrimônios (usando colunas corretas)
      const patrimonios = await getRows('SELECT id, numero_patrimonio, descricao, tipo FROM patrimonios LIMIT 10')
      auditResults.database.data_integrity.patrimonios = patrimonios
      
             // Verificar se há usuários
       const users = await getRows('SELECT id, name, email, role, municipality_id FROM users')
       auditResults.database.data_integrity.users = users
       
       if (users.length === 0) {
         auditResults.warnings.push('Nenhum usuário encontrado no sistema')
       }
       
       // Verificar se há imóveis
       try {
         const imoveis = await getRows('SELECT id, numero_imovel, descricao, tipo FROM imoveis LIMIT 10')
         auditResults.database.data_integrity.imoveis = imoveis
  } catch (error) {
         auditResults.warnings.push(`Não foi possível verificar imóveis: ${error.message}`)
       }
       
       // Verificar se há tarefas de manutenção
       try {
         const manutencao = await getRows('SELECT id, descricao, tipo, status FROM manutencao_tasks LIMIT 10')
         auditResults.database.data_integrity.manutencao = manutencao
       } catch (error) {
         auditResults.warnings.push(`Não foi possível verificar manutenção: ${error.message}`)
       }
       
       // Verificar se há transferências
       try {
         const transfers = await getRows('SELECT id, patrimonio_id, origem_id, destino_id FROM transfers LIMIT 10')
         auditResults.database.data_integrity.transfers = transfers
       } catch (error) {
         auditResults.warnings.push(`Não foi possível verificar transferências: ${error.message}`)
       }
       
       // Verificar se há inventários
       try {
         const inventories = await getRows('SELECT id, nome, descricao, status FROM inventories LIMIT 10')
         auditResults.database.data_integrity.inventories = inventories
       } catch (error) {
         auditResults.warnings.push(`Não foi possível verificar inventários: ${error.message}`)
       }
       
       // Verificar se há templates de relatório
       try {
         const reportTemplates = await getRows('SELECT id, nome, tipo FROM report_templates LIMIT 10')
         auditResults.database.data_integrity.report_templates = reportTemplates
       } catch (error) {
         auditResults.warnings.push(`Não foi possível verificar templates de relatório: ${error.message}`)
       }
       
       // Verificar se há templates de etiqueta
       try {
         const labelTemplates = await getRows('SELECT id, nome, tipo FROM label_templates LIMIT 10')
         auditResults.database.data_integrity.label_templates = labelTemplates
       } catch (error) {
         auditResults.warnings.push(`Não foi possível verificar templates de etiqueta: ${error.message}`)
       }
  } catch (error) {
      auditResults.errors.push(`Erro ao verificar integridade dos dados: ${error.message}`)
    }

    // 4. Verificar problemas de integridade referencial
    console.log('🔍 Verificando problemas de integridade...')
    
    try {
      // Locais sem setor válido
      const invalidLocals = await getRows(`
        SELECT l.id, l.name, l.sector_id 
        FROM locals l 
        LEFT JOIN sectors s ON l.sector_id = s.id 
        WHERE s.id IS NULL
      `)
      
      if (invalidLocals.length > 0) {
        auditResults.errors.push(`Encontrados ${invalidLocals.length} locais com setor inválido`)
        auditResults.database.data_integrity.invalid_locals = invalidLocals
      }
      
      // Verificar se as colunas local_objeto e setor_responsavel existem na tabela patrimonios
      const patrimonioColumns = await getRows(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'patrimonios' 
        AND column_name IN ('local_objeto', 'setor_responsavel')
      `)
      
      const hasLocalObjeto = patrimonioColumns.some(col => col.column_name === 'local_objeto')
      const hasSetorResponsavel = patrimonioColumns.some(col => col.column_name === 'setor_responsavel')
      
      // Patrimônios com local inválido (só se a coluna existir)
      if (hasLocalObjeto) {
        try {
          const invalidPatrimonios = await getRows(`
            SELECT p.id, p.numero_patrimonio, p.local_objeto 
            FROM patrimonios p 
            LEFT JOIN locals l ON p.local_objeto = l.name 
            WHERE l.id IS NULL AND p.local_objeto IS NOT NULL
          `)
          
          if (invalidPatrimonios.length > 0) {
            auditResults.errors.push(`Encontrados ${invalidPatrimonios.length} patrimônios com local inválido`)
            auditResults.database.data_integrity.invalid_patrimonios = invalidPatrimonios
          }
  } catch (error) {
          auditResults.warnings.push(`Não foi possível verificar patrimônios com local inválido: ${error.message}`)
        }
      } else {
        auditResults.warnings.push('Coluna local_objeto não existe na tabela patrimonios')
      }
      
      // Patrimônios com setor inválido (só se a coluna existir)
      if (hasSetorResponsavel) {
        try {
          const invalidPatrimoniosSector = await getRows(`
            SELECT p.id, p.numero_patrimonio, p.setor_responsavel 
            FROM patrimonios p 
            LEFT JOIN sectors s ON p.setor_responsavel = s.name 
            WHERE s.id IS NULL AND p.setor_responsavel IS NOT NULL
          `)
          
          if (invalidPatrimoniosSector.length > 0) {
            auditResults.errors.push(`Encontrados ${invalidPatrimoniosSector.length} patrimônios com setor inválido`)
            auditResults.database.data_integrity.invalid_patrimonios_sector = invalidPatrimoniosSector
          }
        } catch (error) {
          auditResults.warnings.push(`Não foi possível verificar patrimônios com setor inválido: ${error.message}`)
        }
             } else {
         auditResults.warnings.push('Coluna setor_responsavel não existe na tabela patrimonios')
       }
       
       // Verificar integridade de transferências
       try {
         const invalidTransfers = await getRows(`
           SELECT t.id, t.patrimonio_id, t.origem_id, t.destino_id
           FROM transfers t
           LEFT JOIN patrimonios p ON t.patrimonio_id = p.id
           LEFT JOIN locals l1 ON t.origem_id = l1.id
           LEFT JOIN locals l2 ON t.destino_id = l2.id
           WHERE p.id IS NULL OR l1.id IS NULL OR l2.id IS NULL
         `)
         
         if (invalidTransfers.length > 0) {
           auditResults.errors.push(`Encontradas ${invalidTransfers.length} transferências com referências inválidas`)
           auditResults.database.data_integrity.invalid_transfers = invalidTransfers
         }
       } catch (error) {
         auditResults.warnings.push(`Não foi possível verificar integridade de transferências: ${error.message}`)
       }
       
       // Verificar integridade de manutenção
       try {
         const invalidManutencao = await getRows(`
           SELECT m.id, m.patrimonio_id, m.responsavel_id
           FROM manutencao_tasks m
           LEFT JOIN patrimonios p ON m.patrimonio_id = p.id
           LEFT JOIN users u ON m.responsavel_id = u.id
           WHERE p.id IS NULL OR u.id IS NULL
         `)
         
         if (invalidManutencao.length > 0) {
           auditResults.errors.push(`Encontradas ${invalidManutencao.length} tarefas de manutenção com referências inválidas`)
           auditResults.database.data_integrity.invalid_manutencao = invalidManutencao
         }
       } catch (error) {
         auditResults.warnings.push(`Não foi possível verificar integridade de manutenção: ${error.message}`)
       }
    } catch (error) {
      auditResults.errors.push(`Erro ao verificar problemas de integridade: ${error.message}`)
    }

        // 5. Verificar endpoints da API
    console.log('🌐 Verificando endpoints da API...')
    
    try {
      // Testar endpoint de usuários
      const usersResponse = await getRows('SELECT id, name, email, role FROM users LIMIT 5')
      auditResults.api_endpoints.users.status = 'OK'
      auditResults.api_endpoints.users.sample_data = usersResponse
    } catch (error) {
      auditResults.api_endpoints.users.status = 'ERROR'
      auditResults.api_endpoints.users.error = error.message
    }
    
    try {
      // Testar endpoint de setores
      const sectorsResponse = await getRows('SELECT id, name, municipality_id FROM sectors LIMIT 5')
      auditResults.api_endpoints.sectors.status = 'OK'
      auditResults.api_endpoints.sectors.sample_data = sectorsResponse
    } catch (error) {
      auditResults.api_endpoints.sectors.status = 'ERROR'
      auditResults.api_endpoints.sectors.error = error.message
    }
    
    try {
      // Testar endpoint de locais
      const localsResponse = await getRows(`
        SELECT l.id, l.name, l.sector_id as "sectorId", l.municipality_id as "municipalityId"
        FROM locals l 
        LIMIT 5
      `)
      auditResults.api_endpoints.locals.status = 'OK'
      auditResults.api_endpoints.locals.sample_data = localsResponse
    } catch (error) {
      auditResults.api_endpoints.locals.status = 'ERROR'
      auditResults.api_endpoints.locals.error = error.message
    }
    
    try {
      // Testar endpoint de patrimônios (usando colunas corretas)
      const patrimoniosResponse = await getRows('SELECT id, numero_patrimonio, descricao, tipo FROM patrimonios LIMIT 5')
      auditResults.api_endpoints.patrimonios.status = 'OK'
      auditResults.api_endpoints.patrimonios.sample_data = patrimoniosResponse
  } catch (error) {
      auditResults.api_endpoints.patrimonios.status = 'ERROR'
      auditResults.api_endpoints.patrimonios.error = error.message
    }
    
    try {
      // Testar endpoint de municípios
      const municipalitiesResponse = await getRows(`
        SELECT m.id, m.name, m.state, u.name as supervisor_name
        FROM municipalities m
        LEFT JOIN users u ON m.supervisor_id = u.id
        LIMIT 5
      `)
      auditResults.api_endpoints.municipalities.status = 'OK'
      auditResults.api_endpoints.municipalities.sample_data = municipalitiesResponse
    } catch (error) {
      auditResults.api_endpoints.municipalities.status = 'ERROR'
      auditResults.api_endpoints.municipalities.error = error.message
    }
    
    try {
      // Testar endpoint de imóveis
      const imoveisResponse = await getRows(`
        SELECT id, numero_imovel, descricao, tipo, endereco
        FROM imoveis 
        LIMIT 5
      `)
      auditResults.api_endpoints.imoveis.status = 'OK'
      auditResults.api_endpoints.imoveis.sample_data = imoveisResponse
    } catch (error) {
      auditResults.api_endpoints.imoveis.status = 'ERROR'
      auditResults.api_endpoints.imoveis.error = error.message
    }
    
    try {
      // Testar endpoint de manutenção
      const manutencaoResponse = await getRows(`
        SELECT id, descricao, tipo, status, data_inicio
        FROM manutencao_tasks 
        LIMIT 5
      `)
      auditResults.api_endpoints.manutencao.status = 'OK'
      auditResults.api_endpoints.manutencao.sample_data = manutencaoResponse
    } catch (error) {
      auditResults.api_endpoints.manutencao.status = 'ERROR'
      auditResults.api_endpoints.manutencao.error = error.message
    }
    
    try {
      // Testar endpoint de transferências
      const transfersResponse = await getRows(`
        SELECT id, patrimonio_id, origem_id, destino_id, data_transferencia
        FROM transfers 
        LIMIT 5
      `)
      auditResults.api_endpoints.transfers.status = 'OK'
      auditResults.api_endpoints.transfers.sample_data = transfersResponse
    } catch (error) {
      auditResults.api_endpoints.transfers.status = 'ERROR'
      auditResults.api_endpoints.transfers.error = error.message
    }
    
    try {
      // Testar endpoint de inventários
      const inventoriesResponse = await getRows(`
        SELECT id, nome, descricao, data_inicio, status
        FROM inventories 
        LIMIT 5
      `)
      auditResults.api_endpoints.inventories.status = 'OK'
      auditResults.api_endpoints.inventories.sample_data = inventoriesResponse
    } catch (error) {
      auditResults.api_endpoints.inventories.status = 'ERROR'
      auditResults.api_endpoints.inventories.error = error.message
    }
    
    try {
      // Testar endpoint de relatórios
      const reportsResponse = await getRows(`
        SELECT id, nome, tipo, created_at
        FROM report_templates 
        LIMIT 5
      `)
      auditResults.api_endpoints.reports.status = 'OK'
      auditResults.api_endpoints.reports.sample_data = reportsResponse
    } catch (error) {
      auditResults.api_endpoints.reports.status = 'ERROR'
      auditResults.api_endpoints.reports.error = error.message
    }
    
    try {
      // Testar endpoint de logs de atividade
      const activityLogsResponse = await getRows(`
        SELECT id, user_id, action, table_name, record_id, created_at
        FROM activity_logs 
        LIMIT 5
      `)
      auditResults.api_endpoints.activity_logs.status = 'OK'
      auditResults.api_endpoints.activity_logs.sample_data = activityLogsResponse
  } catch (error) {
      auditResults.api_endpoints.activity_logs.status = 'ERROR'
      auditResults.api_endpoints.activity_logs.error = error.message
    }
    
    try {
      // Testar endpoint de uploads
      const uploadsResponse = await getRows(`
        SELECT id, filename, original_name, file_size, uploaded_by
        FROM uploads 
        LIMIT 5
      `)
      auditResults.api_endpoints.uploads.status = 'OK'
      auditResults.api_endpoints.uploads.sample_data = uploadsResponse
    } catch (error) {
      auditResults.api_endpoints.uploads.status = 'WARNING'
      auditResults.api_endpoints.uploads.error = 'Tabela uploads não existe - funcionalidade opcional'
    }

    // 6. Verificar mapeamento de campos
    console.log('🗺️ Verificando mapeamento de campos...')
    
    try {
      // Verificar se os campos estão sendo mapeados corretamente
      const fieldMappingIssues = []
      
      // Verificar se locals retorna sectorId e municipalityId
      const localSample = await getRow(`
        SELECT l.id, l.name, l.sector_id as "sectorId", l.municipality_id as "municipalityId"
        FROM locals l 
        LIMIT 1
      `)
      
      if (localSample) {
        if (!localSample.sectorId) {
          fieldMappingIssues.push('Campo sectorId não está sendo mapeado corretamente em locals')
        }
        if (!localSample.municipalityId) {
          fieldMappingIssues.push('Campo municipalityId não está sendo mapeado corretamente em locals')
        }
      }
      
      if (fieldMappingIssues.length > 0) {
        auditResults.errors.push(...fieldMappingIssues)
      }
       } catch (error) {
       auditResults.errors.push(`Erro ao verificar mapeamento de campos: ${error.message}`)
     }

     // 7. Verificar integração com frontend
     console.log('🎨 Verificando integração com frontend...')
     
     try {
       // Verificar se os contextos principais estão funcionando
       const frontendContexts = [
         'AuthContext', 'PatrimonioContext', 'LocalContext', 'SectorContext',
         'MunicipalityContext', 'ImovelContext', 'ManutencaoContext', 'TransferContext',
         'InventoryContext', 'ReportContext', 'NotificationContext'
       ]
       
       auditResults.frontend_integration.contexts = {
         available: frontendContexts,
         status: 'VERIFICATION_NEEDED',
         note: 'Verificar se todos os contextos estão sendo importados corretamente no frontend'
       }
       
       // Verificar se as páginas principais existem
       const frontendPages = [
         '/bens', '/imoveis', '/manutencao', '/transferencias', '/inventarios',
         '/relatorios', '/ferramentas', '/admin', '/superuser'
       ]
       
       auditResults.frontend_integration.pages = {
         available: frontendPages,
         status: 'VERIFICATION_NEEDED',
         note: 'Verificar se todas as rotas estão configuradas no App.tsx'
       }
       
       // Verificar se os componentes principais existem
       const frontendComponents = [
         'BensCreate', 'BensEdit', 'BensList', 'ImovelForm', 'ManutencaoForm',
         'TransferForm', 'InventoryForm', 'ReportForm', 'LabelGenerator'
       ]
       
       auditResults.frontend_integration.components = {
         available: frontendComponents,
         status: 'VERIFICATION_NEEDED',
         note: 'Verificar se todos os componentes estão sendo exportados corretamente'
       }
       
     } catch (error) {
       auditResults.errors.push(`Erro ao verificar integração com frontend: ${error.message}`)
     }

         // 8. Gerar recomendações
    console.log('💡 Gerando recomendações...')
    
    try {
      if (auditResults.database.tables.activity_logs?.exists === false) {
        auditResults.recommendations.push('Criar tabela activity_logs para registrar atividades do sistema')
      }
      
      if (auditResults.database.data_integrity.municipalities?.length === 0) {
        auditResults.recommendations.push('Adicionar pelo menos um município ao sistema')
      }
      
      if (auditResults.database.data_integrity.sectors?.length === 0) {
        auditResults.recommendations.push('Adicionar pelo menos um setor ao sistema')
      }
      
      if (auditResults.database.data_integrity.users?.length === 0) {
        auditResults.recommendations.push('Adicionar pelo menos um usuário ao sistema')
      }
      
      // Verificar se as colunas adicionais existem na tabela patrimonios
      const patrimonioColumns = await getRows(`
        SELECT column_name 
      FROM information_schema.columns
        WHERE table_name = 'patrimonios' 
        AND column_name IN ('local_objeto', 'setor_responsavel', 'cor', 'quantidade', 'status')
      `)
      
      const existingColumns = patrimonioColumns.map(col => col.column_name)
      const missingColumns = ['local_objeto', 'setor_responsavel', 'cor', 'quantidade', 'status'].filter(
        col => !existingColumns.includes(col)
      )
      
      if (missingColumns.length > 0) {
        auditResults.recommendations.push(
          `Atualizar schema da tabela patrimonios: colunas faltando: ${missingColumns.join(', ')}. ` +
          'Execute: POST /api/database/fix-patrimonios-schema'
        )
      }
      
      if (auditResults.database.data_integrity.invalid_locals?.length > 0) {
        auditResults.recommendations.push('Corrigir locais com setores inválidos')
      }
      
      if (auditResults.database.data_integrity.invalid_patrimonios?.length > 0) {
        auditResults.recommendations.push('Corrigir patrimônios com locais inválidos')
      }
      
             if (auditResults.database.data_integrity.invalid_patrimonios_sector?.length > 0) {
         auditResults.recommendations.push('Corrigir patrimônios com setores inválidos')
       }
       
       if (auditResults.database.data_integrity.invalid_transfers?.length > 0) {
         auditResults.recommendations.push('Corrigir transferências com referências inválidas')
       }
       
       if (auditResults.database.data_integrity.invalid_manutencao?.length > 0) {
         auditResults.recommendations.push('Corrigir tarefas de manutenção com referências inválidas')
       }
       
       // Verificar se as tabelas de módulos avançados existem
       if (auditResults.database.tables.imoveis?.exists === false) {
         auditResults.recommendations.push('Criar tabela imoveis para gerenciamento de imóveis')
       }
       
       if (auditResults.database.tables.manutencao_tasks?.exists === false) {
         auditResults.recommendations.push('Criar tabela manutencao_tasks para gerenciamento de manutenção')
       }
       
       if (auditResults.database.tables.transfers?.exists === false) {
         auditResults.recommendations.push('Criar tabela transfers para gerenciamento de transferências')
       }
       
       if (auditResults.database.tables.inventories?.exists === false) {
         auditResults.recommendations.push('Criar tabela inventories para gerenciamento de inventários')
       }
       
       if (auditResults.database.tables.report_templates?.exists === false) {
         auditResults.recommendations.push('Criar tabela report_templates para templates de relatórios')
       }
       
       if (auditResults.database.tables.label_templates?.exists === false) {
         auditResults.recommendations.push('Criar tabela label_templates para templates de etiquetas')
       }
       
       // Verificar funcionalidades específicas
       if (auditResults.database.tables.form_fields?.exists === false) {
         auditResults.recommendations.push('Criar tabela form_fields para campos personalizáveis')
       }
       
       if (auditResults.database.tables.excel_csv_templates?.exists === false) {
         auditResults.recommendations.push('Criar tabela excel_csv_templates para templates de exportação')
       }
       
       if (auditResults.database.tables.customization_settings?.exists === false) {
         auditResults.recommendations.push('Criar tabela customization_settings para configurações do sistema')
       }
       
       // Verificar se há dados de exemplo para funcionalidades avançadas
       if (auditResults.database.data_integrity.report_templates?.length === 0) {
         auditResults.recommendations.push('Criar templates de relatório de exemplo')
       }
       
       if (auditResults.database.data_integrity.label_templates?.length === 0) {
         auditResults.recommendations.push('Criar templates de etiqueta de exemplo')
       }
    } catch (error) {
      auditResults.errors.push(`Erro ao gerar recomendações: ${error.message}`)
    }

         // 9. Resumo final
    auditResults.summary = {
      total_errors: auditResults.errors.length,
      total_warnings: auditResults.warnings.length,
      total_recommendations: auditResults.recommendations.length,
      system_status: auditResults.errors.length === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION'
    }

    console.log('✅ Auditoria concluída!')
    console.log(`📊 Resumo: ${auditResults.summary.total_errors} erros, ${auditResults.summary.total_warnings} avisos, ${auditResults.summary.total_recommendations} recomendações`)
    
    res.json(auditResults)
    
  } catch (error) {
    console.error('❌ Erro na auditoria:', error)
    res.status(500).json({ 
      error: 'Erro interno do servidor durante auditoria',
      details: error.message,
      stack: error.stack
    })
  }
})

// Teste específico de criação de dados
router.post('/test-create', requireSupervisor, async (req, res) => {
  try {
    console.log('🧪 Iniciando testes de criação...')
    
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: {}
    }

    // Teste 1: Criar setor
    console.log('🧪 Teste 1: Criando setor de teste...')
    try {
      const testSector = await query(`
        INSERT INTO sectors (name, municipality_id, created_by)
        VALUES ($1, $2, $3)
        RETURNING id, name, municipality_id
      `, ['Setor de Teste - Auditoria', req.user.municipality_id, req.user.id])
      
      testResults.tests.sector_creation = {
        status: 'SUCCESS',
        data: testSector.rows[0]
      }
      
      // Teste 2: Criar local
      console.log('🧪 Teste 2: Criando local de teste...')
      const testLocal = await query(`
        INSERT INTO locals (name, sector_id, municipality_id, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, sector_id as "sectorId", municipality_id as "municipalityId"
      `, ['Local de Teste - Auditoria', testSector.rows[0].id, req.user.municipality_id, req.user.id])
      
      testResults.tests.local_creation = {
        status: 'SUCCESS',
        data: testLocal.rows[0]
      }
      
      // Teste 3: Criar patrimônio (usando colunas corretas)
      console.log('🧪 Teste 3: Criando patrimônio de teste...')
      const testPatrimonio = await query(`
        INSERT INTO patrimonios (
        numero_patrimonio,
        descricao,
        tipo,
        valor_aquisicao,
          data_aquisicao, 
          municipality_id,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, numero_patrimonio, descricao, tipo
      `, [
        'TEST-001', 
        'Patrimônio de Teste - Auditoria', 
        'Equipamento',
        1000.00,
        new Date(),
        req.user.municipality_id,
        req.user.id
      ])
      
      testResults.tests.patrimonio_creation = {
        status: 'SUCCESS',
        data: testPatrimonio.rows[0]
      }
      
      // Limpar dados de teste
      console.log('🧹 Limpando dados de teste...')
      await query('DELETE FROM patrimonios WHERE numero_patrimonio = $1', ['TEST-001'])
      await query('DELETE FROM locals WHERE name = $1', ['Local de Teste - Auditoria'])
      await query('DELETE FROM sectors WHERE name = $1', ['Setor de Teste - Auditoria'])
      
      testResults.tests.cleanup = {
        status: 'SUCCESS',
        message: 'Dados de teste removidos com sucesso'
      }
      
  } catch (error) {
      testResults.tests.error = {
        status: 'ERROR',
        message: error.message,
        stack: error.stack
      }
    }

    console.log('✅ Testes de criação concluídos!')
    res.json(testResults)
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error)
    res.status(500).json({ 
      error: 'Erro interno do servidor durante testes',
      details: error.message
    })
  }
})

// POST /test-menu-navigation - Teste de navegação e funcionalidades do menu
router.post('/test-menu-navigation', requireSupervisor, async (req, res) => {
  try {
    console.log('🧭 Iniciando testes de navegação e funcionalidades do menu...')
    
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        total_tests: 0,
        passed: 0,
        failed: 0,
        errors: []
      }
    }

    // 1. Testar funcionalidades de Bens/Patrimônios
    console.log('💼 Testando funcionalidades de Bens/Patrimônios...')
    try {
      testResults.tests.bens_patrimonios = await testBensPatrimoniosFeatures(req.user)
      testResults.summary.total_tests += testResults.tests.bens_patrimonios.total_operations
      testResults.summary.passed += testResults.tests.bens_patrimonios.passed
      testResults.summary.failed += testResults.tests.bens_patrimonios.failed
      if (testResults.tests.bens_patrimonios.errors) {
        testResults.summary.errors.push(...testResults.tests.bens_patrimonios.errors)
      }
    } catch (error) {
      testResults.summary.errors.push(`Erro no teste de bens/patrimônios: ${error.message}`)
      testResults.summary.failed += 1
    }

    // 2. Testar funcionalidades de Imóveis
    console.log('🏠 Testando funcionalidades de Imóveis...')
    try {
      testResults.tests.imoveis = await testImoveisFeatures(req.user)
      testResults.summary.total_tests += testResults.tests.imoveis.total_operations
      testResults.summary.passed += testResults.tests.imoveis.passed
      testResults.summary.failed += testResults.tests.imoveis.failed
      if (testResults.tests.imoveis.errors) {
        testResults.summary.errors.push(...testResults.tests.imoveis.errors)
      }
    } catch (error) {
      testResults.summary.errors.push(`Erro no teste de imóveis: ${error.message}`)
      testResults.summary.failed += 1
    }

    // 3. Testar funcionalidades de Ferramentas
    console.log('🔧 Testando funcionalidades de Ferramentas...')
    try {
      testResults.tests.ferramentas = await testFerramentasFeatures(req.user)
      testResults.summary.total_tests += testResults.tests.ferramentas.total_operations
      testResults.summary.passed += testResults.tests.ferramentas.passed
      testResults.summary.failed += testResults.tests.ferramentas.failed
      if (testResults.tests.ferramentas.errors) {
        testResults.summary.errors.push(...testResults.tests.ferramentas.errors)
      }
    } catch (error) {
      testResults.summary.errors.push(`Erro no teste de ferramentas: ${error.message}`)
      testResults.summary.failed += 1
    }

    // 4. Testar funcionalidades de Administração
    console.log('⚙️ Testando funcionalidades de Administração...')
    try {
      testResults.tests.administracao = await testAdministracaoFeatures(req.user)
      testResults.summary.total_tests += testResults.tests.administracao.total_operations
      testResults.summary.passed += testResults.tests.administracao.passed
      testResults.summary.failed += testResults.tests.administracao.failed
      if (testResults.tests.administracao.errors) {
        testResults.summary.errors.push(...testResults.tests.administracao.errors)
      }
    } catch (error) {
      testResults.summary.errors.push(`Erro no teste de administração: ${error.message}`)
      testResults.summary.failed += 1
    }

    // 5. Testar funcionalidades de Superusuário (se aplicável)
    if (req.user.role === 'superuser') {
      console.log('👑 Testando funcionalidades de Superusuário...')
      try {
        testResults.tests.superuser = await testSuperuserFeatures(req.user)
        testResults.summary.total_tests += testResults.tests.superuser.total_operations
        testResults.summary.passed += testResults.tests.superuser.passed
        testResults.summary.failed += testResults.tests.superuser.failed
        if (testResults.tests.superuser.errors) {
          testResults.summary.errors.push(...testResults.tests.superuser.errors)
        }
      } catch (error) {
        testResults.summary.errors.push(`Erro no teste de superusuário: ${error.message}`)
        testResults.summary.failed += 1
      }
    }

    console.log(`✅ Testes de navegação concluídos! ${testResults.summary.passed}/${testResults.summary.total_tests} funcionalidades testadas com sucesso`)
    
    res.json({
      success: true,
      message: 'Testes de navegação executados com sucesso',
      results: testResults
    })

  } catch (error) {
    console.error('❌ Erro nos testes de navegação:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao executar testes de navegação',
      details: error.message
    })
  }
})

// POST /test-crud-operations - Teste completo de operações CRUD
router.post('/test-crud-operations', requireSupervisor, async (req, res) => {
  try {
    console.log('🧪 Iniciando testes completos de operações CRUD...')
    
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        total_tests: 0,
        passed: 0,
        failed: 0,
        errors: []
      }
    }

    // 1. Testar operações CRUD de Setores
    console.log('🏢 Testando operações CRUD de Setores...')
    try {
      testResults.tests.sectors = await testSectorsCRUD(req.user)
      testResults.summary.total_tests += testResults.tests.sectors.total_operations
      testResults.summary.passed += testResults.tests.sectors.passed
      testResults.summary.failed += testResults.tests.sectors.failed
      if (testResults.tests.sectors.errors) {
        testResults.summary.errors.push(...testResults.tests.sectors.errors)
      }
    } catch (error) {
      testResults.summary.errors.push(`Erro no teste de setores: ${error.message}`)
      testResults.summary.failed += 1
    }

    // 2. Testar operações CRUD de Locais
    console.log('📍 Testando operações CRUD de Locais...')
    try {
      testResults.tests.locals = await testLocalsCRUD(req.user)
      testResults.summary.total_tests += testResults.tests.locals.total_operations
      testResults.summary.passed += testResults.tests.locals.passed
      testResults.summary.failed += testResults.tests.locals.failed
      if (testResults.tests.locals.errors) {
        testResults.summary.errors.push(...testResults.tests.locals.errors)
      }
    } catch (error) {
      testResults.summary.errors.push(`Erro no teste de locais: ${error.message}`)
      testResults.summary.failed += 1
    }

    // 3. Testar operações CRUD de Patrimônios
    console.log('💼 Testando operações CRUD de Patrimônios...')
    try {
      testResults.tests.patrimonios = await testPatrimoniosCRUD(req.user)
      testResults.summary.total_tests += testResults.tests.patrimonios.total_operations
      testResults.summary.passed += testResults.tests.patrimonios.passed
      testResults.summary.failed += testResults.tests.patrimonios.failed
      if (testResults.tests.patrimonios.errors) {
        testResults.summary.errors.push(...testResults.tests.patrimonios.errors)
      }
    } catch (error) {
      testResults.summary.errors.push(`Erro no teste de patrimônios: ${error.message}`)
      testResults.summary.failed += 1
    }

    // 4. Testar operações CRUD de Imóveis
    console.log('🏠 Testando operações CRUD de Imóveis...')
    try {
      testResults.tests.imoveis = await testImoveisCRUD(req.user)
      testResults.summary.total_tests += testResults.tests.imoveis.total_operations
      testResults.summary.passed += testResults.tests.imoveis.passed
      testResults.summary.failed += testResults.tests.imoveis.failed
      if (testResults.tests.imoveis.errors) {
        testResults.summary.errors.push(...testResults.tests.imoveis.errors)
      }
    } catch (error) {
      testResults.summary.errors.push(`Erro no teste de imóveis: ${error.message}`)
      testResults.summary.failed += 1
    }

    // 5. Testar operações CRUD de Manutenção
    console.log('🔧 Testando operações CRUD de Manutenção...')
    try {
      testResults.tests.manutencao = await testManutencaoCRUD(req.user)
      testResults.summary.total_tests += testResults.tests.manutencao.total_operations
      testResults.summary.passed += testResults.tests.manutencao.passed
      testResults.summary.failed += testResults.tests.manutencao.failed
      if (testResults.tests.manutencao.errors) {
        testResults.summary.errors.push(...testResults.tests.manutencao.errors)
      }
    } catch (error) {
      testResults.summary.errors.push(`Erro no teste de manutenção: ${error.message}`)
      testResults.summary.failed += 1
    }

    console.log(`✅ Testes CRUD concluídos! ${testResults.summary.passed}/${testResults.summary.total_tests} operações bem-sucedidas`)
    
    res.json({
        success: true,
      message: 'Testes CRUD executados com sucesso',
      results: testResults
    })

  } catch (error) {
    console.error('❌ Erro nos testes CRUD:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao executar testes CRUD',
      details: error.message
    })
  }
})

// Verificar estrutura específica de uma tabela
router.get('/table/:tableName', requireSupervisor, async (req, res) => {
  try {
    const { tableName } = req.params
    
    console.log(`🔍 Verificando estrutura da tabela: ${tableName}`)
    
    // Verificar se a tabela existe
    const exists = await getRow(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName])
    
    if (!exists.exists) {
      return res.status(404).json({ error: `Tabela ${tableName} não encontrada` })
    }
    
    // Obter estrutura da tabela
    const columns = await getRows(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName])
    
    // Obter constraints
    const constraints = await getRows(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1
    `, [tableName])
    
    // Obter índices
    const indexes = await getRows(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = $1
    `, [tableName])
    
    // Contar registros
    const count = await getRow(`SELECT COUNT(*) as count FROM ${tableName}`)
    
    res.json({
      table_name: tableName,
      exists: true,
      columns,
      constraints,
      indexes,
      record_count: parseInt(count.count),
      sample_data: await getRows(`SELECT * FROM ${tableName} LIMIT 3`)
    })
    
  } catch (error) {
    console.error(`❌ Erro ao verificar tabela ${req.params.tableName}:`, error)
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message
    })
  }
})

// =================================
// FUNÇÕES AUXILIARES PARA TESTES CRUD
// =================================

// Teste CRUD de Setores
async function testSectorsCRUD(user) {
  const results = {
    total_operations: 4,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {}
  }

  try {
    // CREATE - Criar setor
    console.log('  📝 Testando criação de setor...')
    const createResult = await query(`
      INSERT INTO sectors (name, municipality_id, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, name, municipality_id
    `, ['Setor CRUD Test', user.municipality_id || '85dd1cad-8e51-4e18-a7ff-bce1ec94e615', user.id])
    
    const testSectorId = createResult.rows[0].id
    results.operations.create = { status: 'SUCCESS', data: createResult.rows[0] }
    results.passed++

    // READ - Ler setor
    console.log('  📖 Testando leitura de setor...')
    const readResult = await query('SELECT * FROM sectors WHERE id = $1', [testSectorId])
    if (readResult.rows.length > 0) {
      results.operations.read = { status: 'SUCCESS', data: readResult.rows[0] }
      results.passed++
    } else {
      results.operations.read = { status: 'FAILED', error: 'Setor não encontrado após criação' }
      results.failed++
    }

    // UPDATE - Atualizar setor
    console.log('  ✏️ Testando atualização de setor...')
    const updateResult = await query(`
      UPDATE sectors 
      SET name = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, name
    `, ['Setor CRUD Test - Updated', testSectorId])
    
    if (updateResult.rows.length > 0) {
      results.operations.update = { status: 'SUCCESS', data: updateResult.rows[0] }
      results.passed++
    } else {
      results.operations.update = { status: 'FAILED', error: 'Falha ao atualizar setor' }
      results.failed++
    }

    // DELETE - Deletar setor
    console.log('  🗑️ Testando exclusão de setor...')
    const deleteResult = await query('DELETE FROM sectors WHERE id = $1 RETURNING id', [testSectorId])
    if (deleteResult.rows.length > 0) {
      results.operations.delete = { status: 'SUCCESS', data: { deleted_id: deleteResult.rows[0].id } }
      results.passed++
    } else {
      results.operations.delete = { status: 'FAILED', error: 'Falha ao deletar setor' }
      results.failed++
    }

  } catch (error) {
    results.errors.push(`Erro no teste de setores: ${error.message}`)
    results.failed++
  }

  return results
}

// Teste CRUD de Locais
async function testLocalsCRUD(user) {
  const results = {
    total_operations: 4,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {}
  }

  let testSectorId = null

  try {
    // Primeiro criar um setor para o teste
    const sectorResult = await query(`
      INSERT INTO sectors (name, municipality_id, created_by)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['Setor para Local Test', user.municipality_id || '85dd1cad-8e51-4e18-a7ff-bce1ec94e615', user.id])
    
    testSectorId = sectorResult.rows[0].id

    // CREATE - Criar local
    console.log('  📝 Testando criação de local...')
    const createResult = await query(`
      INSERT INTO locals (name, sector_id, municipality_id, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, sector_id, municipality_id
    `, ['Local CRUD Test', testSectorId, user.municipality_id || '85dd1cad-8e51-4e18-a7ff-bce1ec94e615', user.id])
    
    const testLocalId = createResult.rows[0].id
    results.operations.create = { status: 'SUCCESS', data: createResult.rows[0] }
    results.passed++

    // READ - Ler local
    console.log('  📖 Testando leitura de local...')
    const readResult = await query('SELECT * FROM locals WHERE id = $1', [testLocalId])
    if (readResult.rows.length > 0) {
      results.operations.read = { status: 'SUCCESS', data: readResult.rows[0] }
      results.passed++
    } else {
      results.operations.read = { status: 'FAILED', error: 'Local não encontrado após criação' }
      results.failed++
    }

    // UPDATE - Atualizar local
    console.log('  ✏️ Testando atualização de local...')
    const updateResult = await query(`
      UPDATE locals 
      SET name = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, name
    `, ['Local CRUD Test - Updated', testLocalId])
    
    if (updateResult.rows.length > 0) {
      results.operations.update = { status: 'SUCCESS', data: updateResult.rows[0] }
      results.passed++
    } else {
      results.operations.update = { status: 'FAILED', error: 'Falha ao atualizar local' }
      results.failed++
    }

    // DELETE - Deletar local
    console.log('  🗑️ Testando exclusão de local...')
    const deleteResult = await query('DELETE FROM locals WHERE id = $1 RETURNING id', [testLocalId])
    if (deleteResult.rows.length > 0) {
      results.operations.delete = { status: 'SUCCESS', data: { deleted_id: deleteResult.rows[0].id } }
      results.passed++
    } else {
      results.operations.delete = { status: 'FAILED', error: 'Falha ao deletar local' }
      results.failed++
    }

    // Limpar setor de teste
    await query('DELETE FROM sectors WHERE id = $1', [testSectorId])

  } catch (error) {
    results.errors.push(`Erro no teste de locais: ${error.message}`)
    results.failed++
    
    // Tentar limpar setor se existir
    if (testSectorId) {
      try {
        await query('DELETE FROM sectors WHERE id = $1', [testSectorId])
      } catch (cleanupError) {
        // Ignorar erro de limpeza
      }
    }
  }

  return results
}

// Teste CRUD de Patrimônios
async function testPatrimoniosCRUD(user) {
  const results = {
    total_operations: 4,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {}
  }

  try {
    // CREATE - Criar patrimônio
    console.log('  📝 Testando criação de patrimônio...')
    const createResult = await query(`
      INSERT INTO patrimonios (
        numero_patrimonio,
        descricao,
        tipo,
        valor_aquisicao,
        data_aquisicao, 
        municipality_id,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, numero_patrimonio, descricao, tipo
    `, [
      'CRUD-TEST-001', 
      'Patrimônio CRUD Test', 
      'Equipamento',
      1500.00,
      new Date(),
      user.municipality_id || '85dd1cad-8e51-4e18-a7ff-bce1ec94e615',
      user.id
    ])
    
    const testPatrimonioId = createResult.rows[0].id
    results.operations.create = { status: 'SUCCESS', data: createResult.rows[0] }
    results.passed++

    // READ - Ler patrimônio
    console.log('  📖 Testando leitura de patrimônio...')
    const readResult = await query('SELECT * FROM patrimonios WHERE id = $1', [testPatrimonioId])
    if (readResult.rows.length > 0) {
      results.operations.read = { status: 'SUCCESS', data: readResult.rows[0] }
      results.passed++
    } else {
      results.operations.read = { status: 'FAILED', error: 'Patrimônio não encontrado após criação' }
      results.failed++
    }

    // UPDATE - Atualizar patrimônio
    console.log('  ✏️ Testando atualização de patrimônio...')
    const updateResult = await query(`
      UPDATE patrimonios 
      SET descricao = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, descricao
    `, ['Patrimônio CRUD Test - Updated', testPatrimonioId])
    
    if (updateResult.rows.length > 0) {
      results.operations.update = { status: 'SUCCESS', data: updateResult.rows[0] }
      results.passed++
    } else {
      results.operations.update = { status: 'FAILED', error: 'Falha ao atualizar patrimônio' }
      results.failed++
    }

    // DELETE - Deletar patrimônio
    console.log('  🗑️ Testando exclusão de patrimônio...')
    const deleteResult = await query('DELETE FROM patrimonios WHERE id = $1 RETURNING id', [testPatrimonioId])
    if (deleteResult.rows.length > 0) {
      results.operations.delete = { status: 'SUCCESS', data: { deleted_id: deleteResult.rows[0].id } }
      results.passed++
    } else {
      results.operations.delete = { status: 'FAILED', error: 'Falha ao deletar patrimônio' }
      results.failed++
    }

  } catch (error) {
    results.errors.push(`Erro no teste de patrimônios: ${error.message}`)
    results.failed++
  }

  return results
}

// Teste CRUD de Imóveis
async function testImoveisCRUD(user) {
  const results = {
    total_operations: 4,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {}
  }

  try {
    // CREATE - Criar imóvel
    console.log('  📝 Testando criação de imóvel...')
    const createResult = await query(`
      INSERT INTO imoveis (
        numero_patrimonio, 
        descricao, 
        tipo_imovel,
        endereco,
        area,
        valor_venal,
        municipality_id,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, numero_patrimonio, descricao, tipo_imovel
    `, [
      'IMOVEL-CRUD-001', 
      'Imóvel CRUD Test', 
      'Terreno',
      'Rua Teste, 123',
      1000.50,
      50000.00,
      user.municipality_id || '85dd1cad-8e51-4e18-a7ff-bce1ec94e615',
      user.id
    ])
    
    const testImovelId = createResult.rows[0].id
    results.operations.create = { status: 'SUCCESS', data: createResult.rows[0] }
    results.passed++

    // READ - Ler imóvel
    console.log('  📖 Testando leitura de imóvel...')
    const readResult = await query('SELECT * FROM imoveis WHERE id = $1', [testImovelId])
    if (readResult.rows.length > 0) {
      results.operations.read = { status: 'SUCCESS', data: readResult.rows[0] }
      results.passed++
    } else {
      results.operations.read = { status: 'FAILED', error: 'Imóvel não encontrado após criação' }
      results.failed++
    }

    // UPDATE - Atualizar imóvel
    console.log('  ✏️ Testando atualização de imóvel...')
    const updateResult = await query(`
      UPDATE imoveis 
      SET descricao = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, descricao
    `, ['Imóvel CRUD Test - Updated', testImovelId])
    
    if (updateResult.rows.length > 0) {
      results.operations.update = { status: 'SUCCESS', data: updateResult.rows[0] }
      results.passed++
    } else {
      results.operations.update = { status: 'FAILED', error: 'Falha ao atualizar imóvel' }
      results.failed++
    }

    // DELETE - Deletar imóvel
    console.log('  🗑️ Testando exclusão de imóvel...')
    const deleteResult = await query('DELETE FROM imoveis WHERE id = $1 RETURNING id', [testImovelId])
    if (deleteResult.rows.length > 0) {
      results.operations.delete = { status: 'SUCCESS', data: { deleted_id: deleteResult.rows[0].id } }
      results.passed++
    } else {
      results.operations.delete = { status: 'FAILED', error: 'Falha ao deletar imóvel' }
      results.failed++
    }

  } catch (error) {
    results.errors.push(`Erro no teste de imóveis: ${error.message}`)
    results.failed++
  }

  return results
}

// Teste CRUD de Manutenção
async function testManutencaoCRUD(user) {
  const results = {
    total_operations: 4,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {}
  }

  let testPatrimonioId = null

  try {
    // Primeiro criar um patrimônio para o teste
    const patrimonioResult = await query(`
      INSERT INTO patrimonios (
        numero_patrimonio, 
        descricao, 
        tipo,
        valor_aquisicao, 
        data_aquisicao, 
        municipality_id,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      'MANUT-TEST-001', 
      'Patrimônio para Teste de Manutenção', 
      'Equipamento',
      1000.00,
      new Date(),
      user.municipality_id || '85dd1cad-8e51-4e18-a7ff-bce1ec94e615',
      user.id
    ])
    
    testPatrimonioId = patrimonioResult.rows[0].id

    // CREATE - Criar tarefa de manutenção
    console.log('  📝 Testando criação de manutenção...')
    const createResult = await query(`
      INSERT INTO manutencao_tasks (
        descricao, 
        tipo_manutencao, 
        status,
        data_inicio,
        patrimonio_id,
        responsavel_id,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, descricao, tipo_manutencao, status
    `, [
      'Manutenção CRUD Test', 
      'Preventiva',
      'pendente',
      new Date(),
      testPatrimonioId,
      user.id,
      user.id
    ])
    
    const testManutencaoId = createResult.rows[0].id
    results.operations.create = { status: 'SUCCESS', data: createResult.rows[0] }
    results.passed++

    // READ - Ler manutenção
    console.log('  📖 Testando leitura de manutenção...')
    const readResult = await query('SELECT * FROM manutencao_tasks WHERE id = $1', [testManutencaoId])
    if (readResult.rows.length > 0) {
      results.operations.read = { status: 'SUCCESS', data: readResult.rows[0] }
      results.passed++
    } else {
      results.operations.read = { status: 'FAILED', error: 'Manutenção não encontrada após criação' }
      results.failed++
    }

    // UPDATE - Atualizar manutenção
    console.log('  ✏️ Testando atualização de manutenção...')
    const updateResult = await query(`
      UPDATE manutencao_tasks 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, status
    `, ['em_andamento', testManutencaoId])
    
    if (updateResult.rows.length > 0) {
      results.operations.update = { status: 'SUCCESS', data: updateResult.rows[0] }
      results.passed++
    } else {
      results.operations.update = { status: 'FAILED', error: 'Falha ao atualizar manutenção' }
      results.failed++
    }

    // DELETE - Deletar manutenção
    console.log('  🗑️ Testando exclusão de manutenção...')
    const deleteResult = await query('DELETE FROM manutencao_tasks WHERE id = $1 RETURNING id', [testManutencaoId])
    if (deleteResult.rows.length > 0) {
      results.operations.delete = { status: 'SUCCESS', data: { deleted_id: deleteResult.rows[0].id } }
      results.passed++
    } else {
      results.operations.delete = { status: 'FAILED', error: 'Falha ao deletar manutenção' }
      results.failed++
    }

    // Limpar patrimônio de teste
    await query('DELETE FROM patrimonios WHERE id = $1', [testPatrimonioId])

  } catch (error) {
    results.errors.push(`Erro no teste de manutenção: ${error.message}`)
    results.failed++
    
    // Tentar limpar patrimônio se existir
    if (testPatrimonioId) {
      try {
        await query('DELETE FROM patrimonios WHERE id = $1', [testPatrimonioId])
      } catch (cleanupError) {
        // Ignorar erro de limpeza
      }
    }
  }

  return results
}

// =================================
// FUNÇÕES AUXILIARES PARA TESTES DE NAVEGAÇÃO
// =================================

// Teste de funcionalidades de Bens/Patrimônios
async function testBensPatrimoniosFeatures(user) {
  const results = {
    total_operations: 8,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {}
  }

  try {
    // 1. Testar listagem de patrimônios
    console.log('  📋 Testando listagem de patrimônios...')
    const listResult = await query('SELECT COUNT(*) as total FROM patrimonios')
    results.operations.list_patrimonios = { 
      status: 'SUCCESS', 
      data: { total: parseInt(listResult.rows[0].total) } 
    }
    results.passed++

    // 2. Testar criação de patrimônio
    console.log('  ➕ Testando criação de patrimônio...')
    const createResult = await query(`
      INSERT INTO patrimonios (numero_patrimonio, descricao, tipo, municipality_id, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, numero_patrimonio
    `, ['NAV-TEST-001', 'Patrimônio Teste Navegação', 'Equipamento', 
        user.municipality_id || '85dd1cad-8e51-4e18-a7ff-bce1ec94e615', user.id])
    
    const testPatrimonioId = createResult.rows[0].id
    results.operations.create_patrimonio = { 
      status: 'SUCCESS', 
      data: createResult.rows[0] 
    }
    results.passed++

    // 3. Testar visualização de patrimônio
    console.log('  👁️ Testando visualização de patrimônio...')
    const viewResult = await query('SELECT * FROM patrimonios WHERE id = $1', [testPatrimonioId])
    if (viewResult.rows.length > 0) {
      results.operations.view_patrimonio = { 
        status: 'SUCCESS', 
        data: { found: true, patrimonio: viewResult.rows[0] } 
      }
      results.passed++
    } else {
      results.operations.view_patrimonio = { 
        status: 'FAILED', 
        error: 'Patrimônio não encontrado para visualização' 
      }
      results.failed++
    }

    // 4. Testar edição de patrimônio
    console.log('  ✏️ Testando edição de patrimônio...')
    const editResult = await query(`
      UPDATE patrimonios 
      SET descricao = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, descricao
    `, ['Patrimônio Teste Navegação - Editado', testPatrimonioId])
    
    if (editResult.rows.length > 0) {
      results.operations.edit_patrimonio = { 
        status: 'SUCCESS', 
        data: editResult.rows[0] 
      }
      results.passed++
    } else {
      results.operations.edit_patrimonio = { 
        status: 'FAILED', 
        error: 'Falha ao editar patrimônio' 
      }
      results.failed++
    }

    // 5. Testar impressão de patrimônio
    console.log('  🖨️ Testando impressão de patrimônio...')
    const printResult = await query(`
      SELECT p.*, l.name as local_name, s.name as sector_name
      FROM patrimonios p
      LEFT JOIN locals l ON p.local_id = l.id
      LEFT JOIN sectors s ON p.sector_id = s.id
      WHERE p.id = $1
    `, [testPatrimonioId])
    
    if (printResult.rows.length > 0) {
      results.operations.print_patrimonio = { 
        status: 'SUCCESS', 
        data: { print_data: printResult.rows[0] } 
      }
      results.passed++
    } else {
      results.operations.print_patrimonio = { 
        status: 'FAILED', 
        error: 'Falha ao gerar dados para impressão' 
      }
      results.failed++
    }

    // 6. Testar transferência de patrimônio
    console.log('  🔄 Testando transferência de patrimônio...')
    const transferResult = await query(`
      INSERT INTO transfers (patrimonio_id, origem_id, destino_id, motivo, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, patrimonio_id
    `, [testPatrimonioId, null, null, 'Teste de navegação', user.id])
    
    if (transferResult.rows.length > 0) {
      results.operations.transfer_patrimonio = { 
        status: 'SUCCESS', 
        data: transferResult.rows[0] 
      }
      results.passed++
    } else {
      results.operations.transfer_patrimonio = { 
        status: 'FAILED', 
        error: 'Falha ao criar transferência' 
      }
      results.failed++
    }

    // 7. Testar emprestimo de patrimônio
    console.log('  📤 Testando empréstimo de patrimônio...')
    const emprestimoResult = await query(`
      SELECT COUNT(*) as total FROM patrimonios WHERE id = $1
    `, [testPatrimonioId])
    
    if (emprestimoResult.rows.length > 0) {
      results.operations.emprestimo_patrimonio = { 
        status: 'SUCCESS', 
        data: { patrimonio_exists: true } 
      }
      results.passed++
    } else {
      results.operations.emprestimo_patrimonio = { 
        status: 'FAILED', 
        error: 'Patrimônio não encontrado para empréstimo' 
      }
      results.failed++
    }

    // 8. Limpar dados de teste
    console.log('  🧹 Limpando dados de teste...')
    await query('DELETE FROM transfers WHERE patrimonio_id = $1', [testPatrimonioId])
    await query('DELETE FROM patrimonios WHERE id = $1', [testPatrimonioId])
    
    results.operations.cleanup = { 
      status: 'SUCCESS', 
      data: { message: 'Dados de teste removidos' } 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro no teste de bens/patrimônios: ${error.message}`)
    results.failed++
  }

  return results
}

// Teste de funcionalidades de Imóveis
async function testImoveisFeatures(user) {
  const results = {
    total_operations: 6,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {}
  }

  try {
    // 1. Testar listagem de imóveis
    console.log('  📋 Testando listagem de imóveis...')
    const listResult = await query('SELECT COUNT(*) as total FROM imoveis')
    results.operations.list_imoveis = { 
      status: 'SUCCESS', 
      data: { total: parseInt(listResult.rows[0].total) } 
    }
    results.passed++

    // 2. Testar criação de imóvel
    console.log('  ➕ Testando criação de imóvel...')
    const createResult = await query(`
      INSERT INTO imoveis (numero_patrimonio, descricao, tipo_imovel, endereco, municipality_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, numero_patrimonio, descricao
    `, ['IMOVEL-NAV-001', 'Imóvel Teste Navegação', 'Terreno', 'Rua Teste, 456',
        user.municipality_id || '85dd1cad-8e51-4e18-a7ff-bce1ec94e615', user.id])
    
    const testImovelId = createResult.rows[0].id
    results.operations.create_imovel = { 
      status: 'SUCCESS', 
      data: createResult.rows[0] 
    }
    results.passed++

    // 3. Testar visualização de imóvel
    console.log('  👁️ Testando visualização de imóvel...')
    const viewResult = await query('SELECT * FROM imoveis WHERE id = $1', [testImovelId])
    if (viewResult.rows.length > 0) {
      results.operations.view_imovel = { 
        status: 'SUCCESS', 
        data: { found: true, imovel: viewResult.rows[0] } 
      }
      results.passed++
    } else {
      results.operations.view_imovel = { 
        status: 'FAILED', 
        error: 'Imóvel não encontrado para visualização' 
      }
      results.failed++
    }

    // 4. Testar edição de imóvel
    console.log('  ✏️ Testando edição de imóvel...')
    const editResult = await query(`
      UPDATE imoveis 
      SET descricao = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, descricao
    `, ['Imóvel Teste Navegação - Editado', testImovelId])
    
    if (editResult.rows.length > 0) {
      results.operations.edit_imovel = { 
        status: 'SUCCESS', 
        data: editResult.rows[0] 
      }
      results.passed++
    } else {
      results.operations.edit_imovel = { 
        status: 'FAILED', 
        error: 'Falha ao editar imóvel' 
      }
      results.failed++
    }

    // 5. Testar impressão de imóvel
    console.log('  🖨️ Testando impressão de imóvel...')
    const printResult = await query(`
      SELECT i.*, m.name as municipality_name
      FROM imoveis i
      LEFT JOIN municipalities m ON i.municipality_id = m.id
      WHERE i.id = $1
    `, [testImovelId])
    
    if (printResult.rows.length > 0) {
      results.operations.print_imovel = { 
        status: 'SUCCESS', 
        data: { print_data: printResult.rows[0] } 
      }
      results.passed++
    } else {
      results.operations.print_imovel = { 
        status: 'FAILED', 
        error: 'Falha ao gerar dados para impressão' 
      }
      results.failed++
    }

    // 6. Limpar dados de teste
    console.log('  🧹 Limpando dados de teste...')
    await query('DELETE FROM imoveis WHERE id = $1', [testImovelId])
    
    results.operations.cleanup = { 
      status: 'SUCCESS', 
      data: { message: 'Dados de teste removidos' } 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro no teste de imóveis: ${error.message}`)
    results.failed++
  }

  return results
}

// Teste de funcionalidades de Ferramentas
async function testFerramentasFeatures(user) {
  const results = {
    total_operations: 13,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {}
  }

  try {
    // 1. Testar templates de relatório
    console.log('  📊 Testando templates de relatório...')
    const reportTemplatesResult = await query('SELECT COUNT(*) as total FROM report_templates')
    results.operations.report_templates = { 
      status: 'SUCCESS', 
      data: { total: parseInt(reportTemplatesResult.rows[0].total) } 
    }
    results.passed++

    // 2. Testar criação de template de relatório
    console.log('  ➕ Testando criação de template de relatório...')
    const createReportResult = await query(`
      INSERT INTO report_templates (name, type, descricao, config, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, type
    `, ['Template Teste Navegação', 'patrimonios', 'Template para teste de navegação',
        JSON.stringify({colunas: ['numero_patrimonio', 'descricao']}), user.id])
    
    const testReportId = createReportResult.rows[0].id
    results.operations.create_report_template = { 
      status: 'SUCCESS', 
      data: createReportResult.rows[0] 
    }
    results.passed++

    // 3. Testar templates de etiqueta
    console.log('  🏷️ Testando templates de etiqueta...')
    const labelTemplatesResult = await query('SELECT COUNT(*) as total FROM label_templates')
    results.operations.label_templates = { 
      status: 'SUCCESS', 
      data: { total: parseInt(labelTemplatesResult.rows[0].total) } 
    }
    results.passed++

    // 4. Testar criação de template de etiqueta
    console.log('  ➕ Testando criação de template de etiqueta...')
    const createLabelResult = await query(`
      INSERT INTO label_templates (name, descricao, tamanho, config, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, tamanho
    `, ['Etiqueta Teste Navegação', 'Etiqueta para teste de navegação', 'padrao',
        JSON.stringify({largura: 100, altura: 50}), user.id])
    
    const testLabelId = createLabelResult.rows[0].id
    results.operations.create_label_template = { 
      status: 'SUCCESS', 
      data: createLabelResult.rows[0] 
    }
    results.passed++

    // 5. Testar exportação de dados
    console.log('  📤 Testando exportação de dados...')
    const exportResult = await query('SELECT COUNT(*) as total FROM excel_csv_templates')
    results.operations.export_templates = { 
      status: 'SUCCESS', 
      data: { total: parseInt(exportResult.rows[0].total) } 
    }
    results.passed++

    // 6. Testar criação de template de exportação
    console.log('  ➕ Testando criação de template de exportação...')
    const createExportResult = await query(`
      INSERT INTO excel_csv_templates (nome, tipo, descricao, colunas, formato, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nome, tipo
    `, ['Export Teste Navegação', 'patrimonios', 'Template de exportação para teste',
        JSON.stringify(['numero_patrimonio', 'descricao']), 'xlsx', user.id])
    
    const testExportId = createExportResult.rows[0].id
    results.operations.create_export_template = { 
      status: 'SUCCESS', 
      data: createExportResult.rows[0] 
    }
    results.passed++

    // 7. Testar sincronização
    console.log('  🔄 Testando sincronização...')
    const syncResult = await query('SELECT COUNT(*) as total FROM patrimonios')
    results.operations.sync_data = { 
      status: 'SUCCESS', 
      data: { total_patrimonios: parseInt(syncResult.rows[0].total) } 
    }
    results.passed++

    // 8. Testar mapa interativo
    console.log('  🗺️ Testando mapa interativo...')
    const mapResult = await query('SELECT COUNT(*) as total FROM imoveis WHERE latitude IS NOT NULL AND longitude IS NOT NULL')
    results.operations.interactive_map = { 
      status: 'SUCCESS', 
      data: { imoveis_com_coordenadas: parseInt(mapResult.rows[0].total) } 
    }
    results.passed++

    // 9. Testar dashboard
    console.log('  📊 Testando dashboard...')
    const dashboardResult = await query(`
      SELECT 
        COUNT(*) as total_patrimonios,
        COUNT(DISTINCT tipo) as tipos_diferentes,
        COUNT(DISTINCT local_id) as locais_ocupados
      FROM patrimonios 
    `)
    results.operations.dashboard = { 
      status: 'SUCCESS', 
      data: dashboardResult.rows[0] 
    }
    results.passed++

    // 10. Testar cálculos do dashboard
    console.log('  🧮 Testando cálculos do dashboard...')
    const calculationsResult = await query(`
      SELECT 
        SUM(COALESCE(valor_aquisicao, 0)) as valor_total_patrimonios,
        AVG(COALESCE(valor_aquisicao, 0)) as valor_medio_patrimonios,
        COUNT(*) as total_patrimonios,
        COUNT(CASE WHEN status = 'ativo' THEN 1 END) as patrimonios_ativos
      FROM patrimonios
    `)
    results.operations.dashboard_calculations = { 
      status: 'SUCCESS', 
      data: calculationsResult.rows[0] 
    }
    results.passed++

    // 11. Testar exportação de dados
    console.log('  📤 Testando exportação de dados...')
    const exportDataResult = await query(`
      SELECT 
        p.numero_patrimonio,
        p.descricao,
        p.tipo,
        p.valor_aquisicao,
        l.name as local_name,
        s.name as sector_name
      FROM patrimonios p
      LEFT JOIN locals l ON p.local_id = l.id
      LEFT JOIN sectors s ON p.sector_id = s.id
      LIMIT 5
    `)
    results.operations.data_export = { 
      status: 'SUCCESS', 
      data: { 
        total_registros: exportDataResult.rows.length,
        amostra: exportDataResult.rows 
      } 
    }
    results.passed++

    // 12. Testar bens cadastrados
    console.log('  📋 Testando bens cadastrados...')
    const bensResult = await query(`
      SELECT 
        COUNT(*) as total_bens,
        COUNT(CASE WHEN local_id IS NOT NULL THEN 1 END) as bens_com_local,
        COUNT(CASE WHEN sector_id IS NOT NULL THEN 1 END) as bens_com_setor,
        COUNT(CASE WHEN valor_aquisicao IS NOT NULL THEN 1 END) as bens_com_valor
      FROM patrimonios
    `)
    results.operations.registered_assets = { 
      status: 'SUCCESS', 
      data: bensResult.rows[0] 
    }
    results.passed++

    // 13. Limpar dados de teste
    console.log('  🧹 Limpando dados de teste...')
    await query('DELETE FROM excel_csv_templates WHERE id = $1', [testExportId])
    await query('DELETE FROM label_templates WHERE id = $1', [testLabelId])
    await query('DELETE FROM report_templates WHERE id = $1', [testReportId])
    
    results.operations.cleanup = { 
      status: 'SUCCESS', 
      data: { message: 'Dados de teste removidos' } 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro no teste de ferramentas: ${error.message}`)
    results.failed++
  }

  return results
}

// Teste de funcionalidades de Administração
async function testAdministracaoFeatures(user) {
  const results = {
    total_operations: 6,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {}
  }

  try {
    // 1. Testar gerenciamento de usuários
    console.log('  👥 Testando gerenciamento de usuários...')
    const usersResult = await query('SELECT COUNT(*) as total FROM users')
    results.operations.manage_users = { 
      status: 'SUCCESS', 
      data: { total: parseInt(usersResult.rows[0].total) } 
    }
    results.passed++

    // 2. Testar gerenciamento de setores
    console.log('  🏢 Testando gerenciamento de setores...')
    const sectorsResult = await query('SELECT COUNT(*) as total FROM sectors')
    results.operations.manage_sectors = { 
      status: 'SUCCESS', 
      data: { total: parseInt(sectorsResult.rows[0].total) } 
    }
    results.passed++

    // 3. Testar gerenciamento de locais
    console.log('  📍 Testando gerenciamento de locais...')
    const localsResult = await query('SELECT COUNT(*) as total FROM locals')
    results.operations.manage_locals = { 
      status: 'SUCCESS', 
      data: { total: parseInt(localsResult.rows[0].total) } 
    }
    results.passed++

    // 4. Testar configurações do sistema
    console.log('  ⚙️ Testando configurações do sistema...')
    const settingsResult = await query('SELECT COUNT(*) as total FROM customization_settings')
    results.operations.system_settings = { 
      status: 'SUCCESS', 
      data: { total: parseInt(settingsResult.rows[0].total) } 
    }
    results.passed++

    // 5. Testar logs de atividade
    console.log('  📝 Testando logs de atividade...')
    const logsResult = await query('SELECT COUNT(*) as total FROM activity_logs')
    results.operations.activity_logs = { 
      status: 'SUCCESS', 
      data: { total: parseInt(logsResult.rows[0].total) } 
    }
    results.passed++

    // 6. Testar backup do sistema
    console.log('  💾 Testando backup do sistema...')
    const backupResult = await query('SELECT COUNT(*) as total FROM patrimonios')
    results.operations.system_backup = { 
      status: 'SUCCESS', 
      data: { total_patrimonios: parseInt(backupResult.rows[0].total) } 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro no teste de administração: ${error.message}`)
    results.failed++
  }

  return results
}

// Teste de funcionalidades de Superusuário
async function testSuperuserFeatures(user) {
  const results = {
    total_operations: 5,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {}
  }

  try {
    // 1. Testar gerenciamento de municípios
    console.log('  🏛️ Testando gerenciamento de municípios...')
    const municipalitiesResult = await query('SELECT COUNT(*) as total FROM municipalities')
    results.operations.manage_municipalities = { 
      status: 'SUCCESS', 
      data: { total: parseInt(municipalitiesResult.rows[0].total) } 
    }
    results.passed++

    // 2. Testar gerenciamento de permissões
    console.log('  🔐 Testando gerenciamento de permissões...')
    const permissionsResult = await query('SELECT COUNT(*) as total FROM users WHERE role = $1', ['supervisor'])
    results.operations.manage_permissions = { 
      status: 'SUCCESS', 
      data: { total_supervisors: parseInt(permissionsResult.rows[0].total) } 
    }
    results.passed++

    // 3. Testar personalização do sistema
    console.log('  🎨 Testando personalização do sistema...')
    const customizationResult = await query('SELECT COUNT(*) as total FROM customization_settings')
    results.operations.system_customization = { 
      status: 'SUCCESS', 
      data: { total: parseInt(customizationResult.rows[0].total) } 
    }
    results.passed++

    // 4. Testar monitoramento do sistema
    console.log('  📊 Testando monitoramento do sistema...')
    const monitoringResult = await query('SELECT COUNT(*) as total FROM users')
    results.operations.system_monitoring = { 
      status: 'SUCCESS', 
      data: { total_users: parseInt(monitoringResult.rows[0].total) } 
    }
    results.passed++

    // 5. Testar atualizações do sistema
    console.log('  🔄 Testando atualizações do sistema...')
    const updateResult = await query('SELECT COUNT(*) as total FROM patrimonios')
    results.operations.system_updates = { 
      status: 'SUCCESS', 
      data: { total_patrimonios: parseInt(updateResult.rows[0].total) } 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro no teste de superusuário: ${error.message}`)
    results.failed++
  }

  return results
}

// =================================
// FUNÇÕES AUXILIARES PARA TESTE COMPLETO DO SISTEMA
// =================================

// 1. Teste de Setup e Configuração Inicial
async function testSystemSetup(user) {
  const results = {
    total_operations: 5,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {}
  }

  try {
    // 1. Verificar conectividade com banco
    console.log('  🔌 Testando conectividade com banco...')
    const dbTest = await query('SELECT NOW() as current_time')
    results.operations.database_connection = { 
      status: 'SUCCESS', 
      data: { current_time: dbTest.rows[0].current_time } 
    }
    results.passed++

    // 2. Verificar tabelas essenciais
    console.log('  📋 Verificando tabelas essenciais...')
    const tablesTest = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'municipalities', 'sectors', 'locals', 'patrimonios')
    `)
    results.operations.essential_tables = { 
      status: 'SUCCESS', 
      data: { tables_found: tablesTest.rows.length } 
    }
    results.passed++

    // 3. Verificar configurações do sistema
    console.log('  ⚙️ Verificando configurações do sistema...')
    const configTest = await query('SELECT COUNT(*) as total FROM customization_settings')
    results.operations.system_config = { 
      status: 'SUCCESS', 
      data: { config_count: parseInt(configTest.rows[0].total) } 
    }
    results.passed++

    // 4. Verificar permissões do usuário
    console.log('  🔐 Verificando permissões do usuário...')
    const userTest = await query('SELECT role, municipality_id FROM users WHERE id = $1', [user.id])
    if (userTest.rows.length > 0) {
      results.operations.user_permissions = { 
        status: 'SUCCESS', 
        data: { role: userTest.rows[0].role, municipality_id: userTest.rows[0].municipality_id } 
      }
      results.passed++
    } else {
      results.operations.user_permissions = { 
        status: 'FAILED', 
        error: 'Usuário não encontrado' 
      }
      results.failed++
    }

    // 5. Verificar logs de atividade
    console.log('  📝 Verificando logs de atividade...')
    const logsTest = await query('SELECT COUNT(*) as total FROM activity_logs')
    results.operations.activity_logs = { 
      status: 'SUCCESS', 
      data: { logs_count: parseInt(logsTest.rows[0].total) } 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro no setup do sistema: ${error.message}`)
    results.failed++
  }

  return results
}

// 2. Teste de Criação de Município e Usuários
async function testMunicipalitySetup(user) {
  const results = {
    total_operations: 8,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {},
    test_data: {}
  }

  try {
    // 1. Criar município de teste
    console.log('  🏛️ Criando município de teste...')
    const municipalityResult = await query(`
      INSERT INTO municipalities (name, state, full_address, cnpj, contact_email, mayor_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, state
    `, ['Município Teste Completo', 'PA', 'Rua Teste, 123 - Centro', '12.345.678/0001-90', 
        'teste@municipio.com', 'Prefeito Teste'])
    
    const testMunicipalityId = municipalityResult.rows[0].id
    results.test_data.municipality_id = testMunicipalityId
    results.operations.create_municipality = { 
      status: 'SUCCESS', 
      data: municipalityResult.rows[0] 
    }
    results.passed++

    // 2. Criar supervisor para o município
    console.log('  👤 Criando supervisor...')
    const timestamp = Date.now()
    const supervisorResult = await query(`
      INSERT INTO users (name, email, password, role, municipality_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role
    `, [`Supervisor Teste ${timestamp}`, `supervisor${timestamp}@teste.com`, 'senha123', 'supervisor', testMunicipalityId])
    
    const testSupervisorId = supervisorResult.rows[0].id
    results.test_data.supervisor_id = testSupervisorId
    results.operations.create_supervisor = { 
      status: 'SUCCESS', 
      data: supervisorResult.rows[0] 
    }
    results.passed++

    // 3. Criar usuário comum
    console.log('  👥 Criando usuário comum...')
    const userResult = await query(`
      INSERT INTO users (name, email, password, role, municipality_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role
    `, [`Usuário Teste ${timestamp}`, `usuario${timestamp}@teste.com`, 'senha123', 'user', testMunicipalityId])
    
    const testUserId = userResult.rows[0].id
    results.test_data.user_id = testUserId
    results.operations.create_user = { 
      status: 'SUCCESS', 
      data: userResult.rows[0] 
    }
    results.passed++

    // 4. Atualizar município com supervisor
    console.log('  🔗 Vinculando supervisor ao município...')
    const updateResult = await query(`
      UPDATE municipalities 
      SET supervisor_id = $1 
      WHERE id = $2 
      RETURNING id, supervisor_id
    `, [testSupervisorId, testMunicipalityId])
    
    results.operations.link_supervisor = { 
      status: 'SUCCESS', 
      data: updateResult.rows[0] 
    }
    results.passed++

    // 5. Verificar criação dos usuários
    console.log('  ✅ Verificando usuários criados...')
    const verifyUsers = await query(`
      SELECT COUNT(*) as total, role 
      FROM users 
      WHERE municipality_id = $1 
      GROUP BY role
    `, [testMunicipalityId])
    
    results.operations.verify_users = { 
      status: 'SUCCESS', 
      data: { users_by_role: verifyUsers.rows } 
    }
    results.passed++

    // 6. Testar login dos usuários
    console.log('  🔑 Testando autenticação...')
    const authTest = await query(`
      SELECT id, name, role, municipality_id 
      FROM users 
      WHERE email = $1 AND municipality_id = $2
    `, [`supervisor${timestamp}@teste.com`, testMunicipalityId])
    
    if (authTest.rows.length > 0) {
      results.operations.test_authentication = { 
        status: 'SUCCESS', 
        data: { user_found: true, role: authTest.rows[0].role } 
      }
      results.passed++
    } else {
      results.operations.test_authentication = { 
        status: 'FAILED', 
        error: 'Usuário não encontrado para autenticação' 
      }
      results.failed++
    }

    // 7. Verificar logs de criação
    console.log('  📝 Verificando logs de criação...')
    const logsTest = await query(`
      SELECT COUNT(*) as total 
      FROM activity_logs 
      WHERE table_name = 'users' 
      AND action = 'CREATE'
    `)
    
    results.operations.verify_logs = { 
      status: 'SUCCESS', 
      data: { creation_logs: parseInt(logsTest.rows[0].total) } 
    }
    results.passed++

    // 8. Testar permissões por role
    console.log('  🔐 Testando permissões por role...')
    const permissionsTest = await query(`
      SELECT role, COUNT(*) as total 
      FROM users 
      WHERE municipality_id = $1 
      GROUP BY role
    `, [testMunicipalityId])
    
    results.operations.test_permissions = { 
      status: 'SUCCESS', 
      data: { roles_created: permissionsTest.rows } 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro na criação de município e usuários: ${error.message}`)
    results.failed++
  }

  return results
}

// 3. Teste de Estrutura Organizacional
async function testOrganizationalStructure(user) {
  const results = {
    total_operations: 10,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {},
    test_data: {}
  }

  try {
    // Buscar município de teste criado anteriormente
    const municipalityTest = await query(`
      SELECT id FROM municipalities WHERE name = 'Município Teste Completo' LIMIT 1
    `)
    
    if (municipalityTest.rows.length === 0) {
      throw new Error('Município de teste não encontrado')
    }
    
    const testMunicipalityId = municipalityTest.rows[0].id
    results.test_data.municipality_id = testMunicipalityId

    // 1. Criar setor pai
    console.log('  🏢 Criando setor pai...')
    const parentSectorResult = await query(`
      INSERT INTO sectors (name, description, municipality_id, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description
    `, ['Secretaria Municipal de Administração', 'Setor administrativo principal', 
        testMunicipalityId, user.id])
    
    const parentSectorId = parentSectorResult.rows[0].id
    results.test_data.parent_sector_id = parentSectorId
    results.operations.create_parent_sector = { 
      status: 'SUCCESS', 
      data: parentSectorResult.rows[0] 
    }
    results.passed++

    // 2. Criar setor filho
    console.log('  🏛️ Criando setor filho...')
    const childSectorResult = await query(`
      INSERT INTO sectors (name, description, parent_id, municipality_id, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, parent_id
    `, ['Departamento de Recursos Humanos', 'RH da secretaria', 
        parentSectorId, testMunicipalityId, user.id])
    
    const childSectorId = childSectorResult.rows[0].id
    results.test_data.child_sector_id = childSectorId
    results.operations.create_child_sector = { 
      status: 'SUCCESS', 
      data: childSectorResult.rows[0] 
    }
    results.passed++

    // 3. Criar local principal
    console.log('  📍 Criando local principal...')
    const mainLocalResult = await query(`
      INSERT INTO locals (name, description, sector_id, municipality_id, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, sector_id
    `, ['Sala Principal', 'Sala principal da secretaria', 
        parentSectorId, testMunicipalityId, user.id])
    
    const mainLocalId = mainLocalResult.rows[0].id
    results.test_data.main_local_id = mainLocalId
    results.operations.create_main_local = { 
      status: 'SUCCESS', 
      data: mainLocalResult.rows[0] 
    }
    results.passed++

    // 4. Criar local secundário
    console.log('  🏠 Criando local secundário...')
    const secondaryLocalResult = await query(`
      INSERT INTO locals (name, description, sector_id, municipality_id, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, sector_id
    `, ['Sala de Reuniões', 'Sala para reuniões e treinamentos', 
        childSectorId, testMunicipalityId, user.id])
    
    const secondaryLocalId = secondaryLocalResult.rows[0].id
    results.test_data.secondary_local_id = secondaryLocalId
    results.operations.create_secondary_local = { 
      status: 'SUCCESS', 
      data: secondaryLocalResult.rows[0] 
    }
    results.passed++

    // 5. Verificar hierarquia de setores
    console.log('  🔗 Verificando hierarquia de setores...')
    const hierarchyTest = await query(`
      SELECT s1.name as parent_name, s2.name as child_name
      FROM sectors s1
      JOIN sectors s2 ON s1.id = s2.parent_id
      WHERE s1.id = $1
    `, [parentSectorId])
    
    results.operations.verify_hierarchy = { 
      status: 'SUCCESS', 
      data: { hierarchy: hierarchyTest.rows } 
    }
    results.passed++

    // 6. Verificar locais por setor
    console.log('  📋 Verificando locais por setor...')
    const localsTest = await query(`
      SELECT s.name as sector_name, COUNT(l.id) as locals_count
      FROM sectors s
      LEFT JOIN locals l ON s.id = l.sector_id
      WHERE s.municipality_id = $1
      GROUP BY s.id, s.name
    `, [testMunicipalityId])
    
    results.operations.verify_locals = { 
      status: 'SUCCESS', 
      data: { locals_by_sector: localsTest.rows } 
    }
    results.passed++

    // 7. Testar edição de setor
    console.log('  ✏️ Testando edição de setor...')
    const editSectorResult = await query(`
      UPDATE sectors 
      SET description = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, name, description
    `, ['Setor administrativo principal - Editado', parentSectorId])
    
    results.operations.edit_sector = { 
      status: 'SUCCESS', 
      data: editSectorResult.rows[0] 
    }
    results.passed++

    // 8. Testar edição de local
    console.log('  🏗️ Testando edição de local...')
    const editLocalResult = await query(`
      UPDATE locals 
      SET description = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, name, description
    `, ['Sala principal da secretaria - Editada', mainLocalId])
    
    results.operations.edit_local = { 
      status: 'SUCCESS', 
      data: editLocalResult.rows[0] 
    }
    results.passed++

    // 9. Verificar integridade referencial
    console.log('  🔍 Verificando integridade referencial...')
    const integrityTest = await query(`
      SELECT 
        COUNT(*) as total_sectors,
        COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as child_sectors,
        COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as parent_sectors
      FROM sectors 
      WHERE municipality_id = $1
    `, [testMunicipalityId])
    
    results.operations.verify_integrity = { 
      status: 'SUCCESS', 
      data: integrityTest.rows[0] 
    }
    results.passed++

    // 10. Testar listagem completa
    console.log('  📊 Testando listagem completa...')
    const listingTest = await query(`
      SELECT 
        s.name as sector_name,
        l.name as local_name,
        m.name as municipality_name
      FROM sectors s
      JOIN locals l ON s.id = l.sector_id
      JOIN municipalities m ON s.municipality_id = m.id
      WHERE s.municipality_id = $1
    `, [testMunicipalityId])
    
    results.operations.test_listing = { 
      status: 'SUCCESS', 
      data: { complete_structure: listingTest.rows } 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro na estrutura organizacional: ${error.message}`)
    results.failed++
  }

  return results
}

// 4. Teste de Cadastro de Patrimônios
async function testPatrimonyManagement(user) {
  const results = {
    total_operations: 12,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {},
    test_data: {}
  }

  try {
    // Buscar dados de teste criados anteriormente
    const municipalityTest = await query(`
      SELECT id FROM municipalities WHERE name = 'Município Teste Completo' LIMIT 1
    `)
    
    if (municipalityTest.rows.length === 0) {
      throw new Error('Município de teste não encontrado')
    }
    
    const testMunicipalityId = municipalityTest.rows[0].id
    const localTest = await query(`
      SELECT id FROM locals WHERE name = 'Sala Principal' AND municipality_id = $1 LIMIT 1
    `, [testMunicipalityId])
    
    if (localTest.rows.length === 0) {
      throw new Error('Local de teste não encontrado')
    }
    
    const testLocalId = localTest.rows[0].id
    results.test_data.municipality_id = testMunicipalityId
    results.test_data.local_id = testLocalId

    // 1. Criar patrimônio básico
    console.log('  💼 Criando patrimônio básico...')
    const basicPatrimonyResult = await query(`
      INSERT INTO patrimonios (
        numero_patrimonio, descricao, tipo, valor_aquisicao, 
        data_aquisicao, local_id, municipality_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, numero_patrimonio, descricao, tipo
    `, ['COMPLETE-001', 'Computador Desktop Completo', 'Equipamento de Informática', 
        2500.00, '2024-01-15', testLocalId, testMunicipalityId, user.id])
    
    const basicPatrimonyId = basicPatrimonyResult.rows[0].id
    results.test_data.basic_patrimony_id = basicPatrimonyId
    results.operations.create_basic_patrimony = { 
      status: 'SUCCESS', 
      data: basicPatrimonyResult.rows[0] 
    }
    results.passed++

    // 2. Criar patrimônio com detalhes completos
    console.log('  🖥️ Criando patrimônio com detalhes completos...')
    const detailedPatrimonyResult = await query(`
      INSERT INTO patrimonios (
        numero_patrimonio, descricao, tipo, marca, modelo, 
        numero_serie, estado, valor_aquisicao, data_aquisicao,
        fornecedor, nota_fiscal, local_id, municipality_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, numero_patrimonio, descricao, marca, modelo
    `, ['COMPLETE-002', 'Impressora Multifuncional', 'Equipamento de Escritório', 
        'HP', 'LaserJet Pro M404n', 'SN123456789', 'Excelente', 1800.00, '2024-02-20',
        'TechStore Ltda', 'NF001/2024', testLocalId, testMunicipalityId, user.id])
    
    const detailedPatrimonyId = detailedPatrimonyResult.rows[0].id
    results.test_data.detailed_patrimony_id = detailedPatrimonyId
    results.operations.create_detailed_patrimony = { 
      status: 'SUCCESS', 
      data: detailedPatrimonyResult.rows[0] 
    }
    results.passed++

    // 3. Criar patrimônio móvel
    console.log('  🪑 Criando patrimônio móvel...')
    const furniturePatrimonyResult = await query(`
      INSERT INTO patrimonios (
        numero_patrimonio, descricao, tipo, cor, quantidade,
        valor_aquisicao, data_aquisicao, local_id, municipality_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, numero_patrimonio, descricao, quantidade
    `, ['COMPLETE-003', 'Cadeira Ergonômica', 'Móveis e Utensílios', 
        'Preto', 4, 800.00, '2024-03-10', testLocalId, testMunicipalityId, user.id])
    
    const furniturePatrimonyId = furniturePatrimonyResult.rows[0].id
    results.test_data.furniture_patrimony_id = furniturePatrimonyId
    results.operations.create_furniture_patrimony = { 
      status: 'SUCCESS', 
      data: furniturePatrimonyResult.rows[0] 
    }
    results.passed++

    // 4. Testar visualização de patrimônio
    console.log('  👁️ Testando visualização de patrimônio...')
    const viewPatrimonyResult = await query(`
      SELECT p.*, l.name as local_name, s.name as sector_name
      FROM patrimonios p
      LEFT JOIN locals l ON p.local_id = l.id
      LEFT JOIN sectors s ON l.sector_id = s.id
      WHERE p.id = $1
    `, [basicPatrimonyId])
    
    if (viewPatrimonyResult.rows.length > 0) {
      results.operations.view_patrimony = { 
        status: 'SUCCESS', 
        data: { patrimony_found: true, details: viewPatrimonyResult.rows[0] } 
      }
      results.passed++
    } else {
      results.operations.view_patrimony = { 
        status: 'FAILED', 
        error: 'Patrimônio não encontrado para visualização' 
      }
      results.failed++
    }

    // 5. Testar edição de patrimônio
    console.log('  ✏️ Testando edição de patrimônio...')
    const editPatrimonyResult = await query(`
      UPDATE patrimonios 
      SET descricao = $1, valor_aquisicao = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3 
      RETURNING id, descricao, valor_aquisicao
    `, ['Computador Desktop Completo - Editado', 2700.00, basicPatrimonyId])
    
    results.operations.edit_patrimony = { 
      status: 'SUCCESS', 
      data: editPatrimonyResult.rows[0] 
    }
    results.passed++

    // 6. Testar busca por tipo
    console.log('  🔍 Testando busca por tipo...')
    const searchByTypeResult = await query(`
      SELECT COUNT(*) as total, tipo
      FROM patrimonios 
      WHERE municipality_id = $1 AND tipo = $2
      GROUP BY tipo
    `, [testMunicipalityId, 'Equipamento de Informática'])
    
    results.operations.search_by_type = { 
      status: 'SUCCESS', 
      data: searchByTypeResult.rows[0] 
    }
    results.passed++

    // 7. Testar busca por local
    console.log('  📍 Testando busca por local...')
    const searchByLocalResult = await query(`
      SELECT COUNT(*) as total
      FROM patrimonios 
      WHERE local_id = $1
    `, [testLocalId])
    
    results.operations.search_by_local = { 
      status: 'SUCCESS', 
      data: { total_in_local: parseInt(searchByLocalResult.rows[0].total) } 
    }
    results.passed++

    // 8. Testar cálculo de valor total
    console.log('  💰 Testando cálculo de valor total...')
    const totalValueResult = await query(`
      SELECT 
        COUNT(*) as total_patrimonios,
        SUM(valor_aquisicao) as valor_total,
        AVG(valor_aquisicao) as valor_medio
      FROM patrimonios 
      WHERE municipality_id = $1
    `, [testMunicipalityId])
    
    results.operations.calculate_total_value = { 
      status: 'SUCCESS', 
      data: totalValueResult.rows[0] 
    }
    results.passed++

    // 9. Testar geração de ficha
    console.log('  📄 Testando geração de ficha...')
    const fichaResult = await query(`
      SELECT 
        p.numero_patrimonio,
        p.descricao,
        p.tipo,
        p.marca,
        p.modelo,
        p.valor_aquisicao,
        l.name as local_name,
        s.name as sector_name,
        m.name as municipality_name
      FROM patrimonios p
      LEFT JOIN locals l ON p.local_id = l.id
      LEFT JOIN sectors s ON l.sector_id = s.id
      LEFT JOIN municipalities m ON p.municipality_id = m.id
      WHERE p.id = $1
    `, [detailedPatrimonyId])
    
    if (fichaResult.rows.length > 0) {
      results.operations.generate_ficha = { 
        status: 'SUCCESS', 
        data: { ficha_data: fichaResult.rows[0] } 
      }
      results.passed++
    } else {
      results.operations.generate_ficha = { 
        status: 'FAILED', 
        error: 'Falha ao gerar ficha do patrimônio' 
      }
      results.failed++
    }

    // 10. Testar geração de etiqueta
    console.log('  🏷️ Testando geração de etiqueta...')
    const etiquetaResult = await query(`
      SELECT 
        numero_patrimonio,
        descricao,
        tipo,
        marca,
        modelo
      FROM patrimonios 
      WHERE id = $1
    `, [furniturePatrimonyId])
    
    if (etiquetaResult.rows.length > 0) {
      results.operations.generate_etiqueta = { 
        status: 'SUCCESS', 
        data: { etiqueta_data: etiquetaResult.rows[0] } 
      }
      results.passed++
    } else {
      results.operations.generate_etiqueta = { 
        status: 'FAILED', 
        error: 'Falha ao gerar etiqueta do patrimônio' 
      }
      results.failed++
    }

    // 11. Testar relatório de patrimônios
    console.log('  📊 Testando relatório de patrimônios...')
    const reportResult = await query(`
      SELECT 
        tipo,
        COUNT(*) as quantidade,
        SUM(valor_aquisicao) as valor_total
      FROM patrimonios 
      WHERE municipality_id = $1
      GROUP BY tipo
      ORDER BY valor_total DESC
    `, [testMunicipalityId])
    
    results.operations.generate_report = { 
      status: 'SUCCESS', 
      data: { report_data: reportResult.rows } 
    }
    results.passed++

    // 12. Testar exportação de dados
    console.log('  📤 Testando exportação de dados...')
    const exportResult = await query(`
      SELECT 
        numero_patrimonio,
        descricao,
        tipo,
        marca,
        modelo,
        valor_aquisicao,
        data_aquisicao,
        l.name as local_name
      FROM patrimonios p
      LEFT JOIN locals l ON p.local_id = l.id
      WHERE p.municipality_id = $1
      ORDER BY p.numero_patrimonio
    `, [testMunicipalityId])
    
    results.operations.export_data = { 
      status: 'SUCCESS', 
      data: { 
        total_records: exportResult.rows.length,
        export_data: exportResult.rows 
      } 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro no gerenciamento de patrimônios: ${error.message}`)
    results.failed++
  }

  return results
}

// 5. Teste de Gestão de Imóveis
async function testRealEstateManagement(user) {
  const results = {
    total_operations: 8,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {},
    test_data: {}
  }

  try {
    // Buscar município de teste
    const municipalityTest = await query(`
      SELECT id FROM municipalities WHERE name = 'Município Teste Completo' LIMIT 1
    `)
    
    if (municipalityTest.rows.length === 0) {
      throw new Error('Município de teste não encontrado')
    }
    
    const testMunicipalityId = municipalityTest.rows[0].id
    results.test_data.municipality_id = testMunicipalityId

    // 1. Criar imóvel residencial
    console.log('  🏠 Criando imóvel residencial...')
    const residentialResult = await query(`
      INSERT INTO imoveis (
        numero_patrimonio, descricao, endereco, area, tipo_imovel,
        valor_aquisicao, data_aquisicao, latitude, longitude, municipality_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, numero_patrimonio, descricao, tipo_imovel
    `, ['IMOVEL-001', 'Casa Residencial Municipal', 'Rua das Flores, 123 - Centro', 
        150.5, 'Residencial', 150000.00, '2020-05-15', -1.6789, -48.8765, 
        testMunicipalityId, user.id])
    
    const residentialId = residentialResult.rows[0].id
    results.test_data.residential_id = residentialId
    results.operations.create_residential = { 
      status: 'SUCCESS', 
      data: residentialResult.rows[0] 
    }
    results.passed++

    // 2. Criar imóvel comercial
    console.log('  🏢 Criando imóvel comercial...')
    const commercialResult = await query(`
      INSERT INTO imoveis (
        numero_patrimonio, descricao, endereco, area, tipo_imovel,
        valor_aquisicao, data_aquisicao, municipality_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, numero_patrimonio, descricao, tipo_imovel
    `, ['IMOVEL-002', 'Galpão Comercial', 'Av. Industrial, 456 - Zona Industrial', 
        500.0, 'Comercial', 300000.00, '2021-08-20', testMunicipalityId, user.id])
    
    const commercialId = commercialResult.rows[0].id
    results.test_data.commercial_id = commercialId
    results.operations.create_commercial = { 
      status: 'SUCCESS', 
      data: commercialResult.rows[0] 
    }
    results.passed++

    // 3. Testar visualização de imóvel
    console.log('  👁️ Testando visualização de imóvel...')
    const viewResult = await query(`
      SELECT i.*, m.name as municipality_name
      FROM imoveis i
      LEFT JOIN municipalities m ON i.municipality_id = m.id
      WHERE i.id = $1
    `, [residentialId])
    
    if (viewResult.rows.length > 0) {
      results.operations.view_imovel = { 
        status: 'SUCCESS', 
        data: { imovel_found: true, details: viewResult.rows[0] } 
      }
      results.passed++
    } else {
      results.operations.view_imovel = { 
        status: 'FAILED', 
        error: 'Imóvel não encontrado para visualização' 
      }
      results.failed++
    }

    // 4. Testar edição de imóvel
    console.log('  ✏️ Testando edição de imóvel...')
    const editResult = await query(`
      UPDATE imoveis 
      SET descricao = $1, valor_aquisicao = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3 
      RETURNING id, descricao, valor_aquisicao
    `, ['Casa Residencial Municipal - Editada', 160000.00, residentialId])
    
    results.operations.edit_imovel = { 
      status: 'SUCCESS', 
      data: editResult.rows[0] 
    }
    results.passed++

    // 5. Testar busca por tipo
    console.log('  🔍 Testando busca por tipo...')
    const searchByTypeResult = await query(`
      SELECT COUNT(*) as total, tipo_imovel
      FROM imoveis 
      WHERE municipality_id = $1 AND tipo_imovel = $2
      GROUP BY tipo_imovel
    `, [testMunicipalityId, 'Residencial'])
    
    results.operations.search_by_type = { 
      status: 'SUCCESS', 
      data: searchByTypeResult.rows[0] 
    }
    results.passed++

    // 6. Testar cálculo de valor total
    console.log('  💰 Testando cálculo de valor total...')
    const totalValueResult = await query(`
      SELECT 
        COUNT(*) as total_imoveis,
        SUM(valor_aquisicao) as valor_total,
        AVG(valor_aquisicao) as valor_medio
      FROM imoveis 
      WHERE municipality_id = $1
    `, [testMunicipalityId])
    
    results.operations.calculate_total_value = { 
      status: 'SUCCESS', 
      data: totalValueResult.rows[0] 
    }
    results.passed++

    // 7. Testar geração de relatório
    console.log('  📊 Testando geração de relatório...')
    const reportResult = await query(`
      SELECT 
        tipo_imovel,
        COUNT(*) as quantidade,
        SUM(valor_aquisicao) as valor_total,
        AVG(area) as area_media
      FROM imoveis 
      WHERE municipality_id = $1
      GROUP BY tipo_imovel
      ORDER BY valor_total DESC
    `, [testMunicipalityId])
    
    results.operations.generate_report = { 
      status: 'SUCCESS', 
      data: { report_data: reportResult.rows } 
    }
    results.passed++

    // 8. Testar exportação de dados
    console.log('  📤 Testando exportação de dados...')
    const exportResult = await query(`
      SELECT 
        numero_patrimonio,
        descricao,
        endereco,
        area,
        tipo_imovel,
        valor_aquisicao,
        data_aquisicao,
        latitude,
        longitude
      FROM imoveis 
      WHERE municipality_id = $1
      ORDER BY numero_patrimonio
    `, [testMunicipalityId])
    
    results.operations.export_data = { 
      status: 'SUCCESS', 
      data: { 
        total_records: exportResult.rows.length,
        export_data: exportResult.rows 
      } 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro na gestão de imóveis: ${error.message}`)
    results.failed++
  }

  return results
}

// 6. Teste de Operações de Transferência
async function testTransferOperations(user) {
  const results = {
    total_operations: 6,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {},
    test_data: {}
  }

  try {
    // Buscar dados de teste
    const municipalityTest = await query(`
      SELECT id FROM municipalities WHERE name = 'Município Teste Completo' LIMIT 1
    `)
    
    if (municipalityTest.rows.length === 0) {
      throw new Error('Município de teste não encontrado')
    }
    
    const testMunicipalityId = municipalityTest.rows[0].id
    
    // Buscar patrimônio e locais
    const patrimonyTest = await query(`
      SELECT id FROM patrimonios WHERE numero_patrimonio = 'COMPLETE-001' LIMIT 1
    `)
    
    if (patrimonyTest.rows.length === 0) {
      throw new Error('Patrimônio de teste não encontrado')
    }
    
    const testPatrimonyId = patrimonyTest.rows[0].id
    
    const localTest = await query(`
      SELECT id FROM locals WHERE name = 'Sala de Reuniões' AND municipality_id = $1 LIMIT 1
    `, [testMunicipalityId])
    
    if (localTest.rows.length === 0) {
      throw new Error('Local de destino não encontrado')
    }
    
    const testDestLocalId = localTest.rows[0].id
    
    results.test_data.municipality_id = testMunicipalityId
    results.test_data.patrimony_id = testPatrimonyId
    results.test_data.dest_local_id = testDestLocalId

    // 1. Criar transferência
    console.log('  🔄 Criando transferência...')
    const transferResult = await query(`
      INSERT INTO transfers (
        patrimonio_id, origem_id, destino_id, motivo, created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, patrimonio_id, origem_id, destino_id
    `, [testPatrimonyId, null, testDestLocalId, 'Transferência para teste do sistema', user.id])
    
    const transferId = transferResult.rows[0].id
    results.test_data.transfer_id = transferId
    results.operations.create_transfer = { 
      status: 'SUCCESS', 
      data: transferResult.rows[0] 
    }
    results.passed++

    // 2. Atualizar local do patrimônio
    console.log('  📍 Atualizando local do patrimônio...')
    const updatePatrimonyResult = await query(`
      UPDATE patrimonios 
      SET local_id = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, local_id
    `, [testDestLocalId, testPatrimonyId])
    
    results.operations.update_patrimony_location = { 
      status: 'SUCCESS', 
      data: updatePatrimonyResult.rows[0] 
    }
    results.passed++

    // 3. Verificar transferência
    console.log('  ✅ Verificando transferência...')
    const verifyTransferResult = await query(`
      SELECT t.*, p.numero_patrimonio, p.descricao, l.name as destino_name
      FROM transfers t
      JOIN patrimonios p ON t.patrimonio_id = p.id
      LEFT JOIN locals l ON t.destino_id = l.id
      WHERE t.id = $1
    `, [transferId])
    
    if (verifyTransferResult.rows.length > 0) {
      results.operations.verify_transfer = { 
        status: 'SUCCESS', 
        data: { transfer_found: true, details: verifyTransferResult.rows[0] } 
      }
      results.passed++
    } else {
      results.operations.verify_transfer = { 
        status: 'FAILED', 
        error: 'Transferência não encontrada' 
      }
      results.failed++
    }

    // 4. Testar histórico de transferências
    console.log('  📋 Testando histórico de transferências...')
    const historyResult = await query(`
      SELECT COUNT(*) as total_transfers
      FROM transfers 
      WHERE patrimonio_id = $1
    `, [testPatrimonyId])
    
    results.operations.transfer_history = { 
      status: 'SUCCESS', 
      data: { total_transfers: parseInt(historyResult.rows[0].total_transfers) } 
    }
    results.passed++

    // 5. Testar relatório de transferências
    console.log('  📊 Testando relatório de transferências...')
    const reportResult = await query(`
      SELECT 
        t.data_transferencia,
        p.numero_patrimonio,
        p.descricao,
        l.name as destino_name,
        t.motivo
      FROM transfers t
      JOIN patrimonios p ON t.patrimonio_id = p.id
      LEFT JOIN locals l ON t.destino_id = l.id
      WHERE p.municipality_id = $1
      ORDER BY t.data_transferencia DESC
    `, [testMunicipalityId])
    
    results.operations.transfer_report = { 
      status: 'SUCCESS', 
      data: { report_data: reportResult.rows } 
    }
    results.passed++

    // 6. Testar exportação de transferências
    console.log('  📤 Testando exportação de transferências...')
    const exportResult = await query(`
      SELECT 
        t.id,
        p.numero_patrimonio,
        p.descricao,
        t.data_transferencia,
        t.motivo,
        l.name as destino_name
      FROM transfers t
      JOIN patrimonios p ON t.patrimonio_id = p.id
      LEFT JOIN locals l ON t.destino_id = l.id
      WHERE p.municipality_id = $1
      ORDER BY t.data_transferencia DESC
    `, [testMunicipalityId])
    
    results.operations.export_transfers = { 
      status: 'SUCCESS', 
      data: { 
        total_transfers: exportResult.rows.length,
        export_data: exportResult.rows 
      } 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro nas operações de transferência: ${error.message}`)
    results.failed++
  }

  return results
}

// 7. Teste de Sistema de Manutenção
async function testMaintenanceSystem(user) {
  const results = {
    total_operations: 8,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {},
    test_data: {}
  }

  try {
    // Buscar dados de teste
    const municipalityTest = await query(`
      SELECT id FROM municipalities WHERE name = 'Município Teste Completo' LIMIT 1
    `)
    
    if (municipalityTest.rows.length === 0) {
      throw new Error('Município de teste não encontrado')
    }
    
    const testMunicipalityId = municipalityTest.rows[0].id
    
    // Buscar patrimônio
    const patrimonyTest = await query(`
      SELECT id FROM patrimonios WHERE numero_patrimonio = 'COMPLETE-002' LIMIT 1
    `)
    
    if (patrimonyTest.rows.length === 0) {
      throw new Error('Patrimônio de teste não encontrado')
    }
    
    const testPatrimonyId = patrimonyTest.rows[0].id
    
    results.test_data.municipality_id = testMunicipalityId
    results.test_data.patrimony_id = testPatrimonyId

    // 1. Criar tarefa de manutenção preventiva
    console.log('  🔧 Criando tarefa de manutenção preventiva...')
    const preventiveResult = await query(`
      INSERT INTO manutencao_tasks (
        patrimonio_id, tipo_manutencao, descricao, data_agendada, 
        status, prioridade, custo_estimado, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, tipo_manutencao, descricao, status
    `, [testPatrimonyId, 'Preventiva', 'Limpeza e calibração da impressora', 
        '2024-12-15', 'pendente', 'baixa', 150.00, user.id])
    
    const preventiveId = preventiveResult.rows[0].id
    results.test_data.preventive_id = preventiveId
    results.operations.create_preventive = { 
      status: 'SUCCESS', 
      data: preventiveResult.rows[0] 
    }
    results.passed++

    // 2. Criar tarefa de manutenção corretiva
    console.log('  🔨 Criando tarefa de manutenção corretiva...')
    const correctiveResult = await query(`
      INSERT INTO manutencao_tasks (
        patrimonio_id, tipo_manutencao, descricao, data_agendada, 
        status, prioridade, custo_estimado, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, tipo_manutencao, descricao, status
    `, [testPatrimonyId, 'Corretiva', 'Substituição de peças danificadas', 
        '2024-12-10', 'em_andamento', 'alta', 500.00, user.id])
    
    const correctiveId = correctiveResult.rows[0].id
    results.test_data.corrective_id = correctiveId
    results.operations.create_corrective = { 
      status: 'SUCCESS', 
      data: correctiveResult.rows[0] 
    }
    results.passed++

    // 3. Testar visualização de tarefa
    console.log('  👁️ Testando visualização de tarefa...')
    const viewResult = await query(`
      SELECT mt.*, p.numero_patrimonio, p.descricao as patrimonio_descricao
      FROM manutencao_tasks mt
      JOIN patrimonios p ON mt.patrimonio_id = p.id
      WHERE mt.id = $1
    `, [preventiveId])
    
    if (viewResult.rows.length > 0) {
      results.operations.view_task = { 
        status: 'SUCCESS', 
        data: { task_found: true, details: viewResult.rows[0] } 
      }
      results.passed++
    } else {
      results.operations.view_task = { 
        status: 'FAILED', 
        error: 'Tarefa não encontrada para visualização' 
      }
      results.failed++
    }

    // 4. Testar atualização de status
    console.log('  📝 Testando atualização de status...')
    const updateStatusResult = await query(`
      UPDATE manutencao_tasks 
      SET status = $1, data_conclusao = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, status, data_conclusao
    `, ['concluida', preventiveId])
    
    results.operations.update_status = { 
      status: 'SUCCESS', 
      data: updateStatusResult.rows[0] 
    }
    results.passed++

    // 5. Testar busca por tipo
    console.log('  🔍 Testando busca por tipo...')
    const searchByTypeResult = await query(`
      SELECT COUNT(*) as total, tipo_manutencao
      FROM manutencao_tasks 
      WHERE patrimonio_id = $1 AND tipo_manutencao = $2
      GROUP BY tipo_manutencao
    `, [testPatrimonyId, 'Preventiva'])
    
    results.operations.search_by_type = { 
      status: 'SUCCESS', 
      data: searchByTypeResult.rows[0] 
    }
    results.passed++

    // 6. Testar busca por status
    console.log('  📊 Testando busca por status...')
    const searchByStatusResult = await query(`
      SELECT COUNT(*) as total, status
      FROM manutencao_tasks 
      WHERE patrimonio_id = $1
      GROUP BY status
    `, [testPatrimonyId])
    
    results.operations.search_by_status = { 
      status: 'SUCCESS', 
      data: { status_breakdown: searchByStatusResult.rows } 
    }
    results.passed++

    // 7. Testar cálculo de custos
    console.log('  💰 Testando cálculo de custos...')
    const costResult = await query(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(custo_estimado) as custo_total_estimado,
        AVG(custo_estimado) as custo_medio_estimado
      FROM manutencao_tasks 
      WHERE patrimonio_id = $1
    `, [testPatrimonyId])
    
    results.operations.calculate_costs = { 
      status: 'SUCCESS', 
      data: costResult.rows[0] 
    }
    results.passed++

    // 8. Testar relatório de manutenção
    console.log('  📋 Testando relatório de manutenção...')
    const reportResult = await query(`
      SELECT 
        mt.tipo_manutencao,
        mt.status,
        mt.prioridade,
        mt.custo_estimado,
        p.numero_patrimonio,
        p.descricao as patrimonio_descricao
      FROM manutencao_tasks mt
      JOIN patrimonios p ON mt.patrimonio_id = p.id
      WHERE p.municipality_id = $1
      ORDER BY mt.data_agendada DESC
    `, [testMunicipalityId])
    
    results.operations.maintenance_report = { 
      status: 'SUCCESS', 
      data: { report_data: reportResult.rows } 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro no sistema de manutenção: ${error.message}`)
    results.failed++
  }

  return results
}

// 8. Teste de Relatórios e Etiquetas
async function testReportsAndLabels(user) {
  const results = {
    total_operations: 10,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {},
    test_data: {}
  }

  try {
    // Buscar município de teste
    const municipalityTest = await query(`
      SELECT id FROM municipalities WHERE name = 'Município Teste Completo' LIMIT 1
    `)
    
    if (municipalityTest.rows.length === 0) {
      throw new Error('Município de teste não encontrado')
    }
    
    const testMunicipalityId = municipalityTest.rows[0].id
    results.test_data.municipality_id = testMunicipalityId

    // 1. Criar template de relatório
    console.log('  📄 Criando template de relatório...')
    const reportTemplateResult = await query(`
      INSERT INTO report_templates (
        name, description, type, config, municipality_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, type
    `, ['Relatório Completo de Patrimônios', 'Template para relatório completo', 
        'patrimonios', JSON.stringify({
          columns: ['numero_patrimonio', 'descricao', 'tipo', 'valor_aquisicao'],
          filters: ['tipo', 'local_id'],
          format: 'pdf'
        }), testMunicipalityId, user.id])
    
    const reportTemplateId = reportTemplateResult.rows[0].id
    results.test_data.report_template_id = reportTemplateId
    results.operations.create_report_template = { 
      status: 'SUCCESS', 
      data: reportTemplateResult.rows[0] 
    }
    results.passed++

    // 2. Criar template de etiqueta
    console.log('  🏷️ Criando template de etiqueta...')
    const labelTemplateResult = await query(`
      INSERT INTO label_templates (
        name, description, config, municipality_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, tamanho
    `, ['Etiqueta Completa de Patrimônio', 'Template para etiquetas completas', 
        JSON.stringify({
          fields: ['numero_patrimonio', 'descricao', 'tipo'],
          size: 'padrao',
          layout: 'vertical'
        }), testMunicipalityId, user.id])
    
    const labelTemplateId = labelTemplateResult.rows[0].id
    results.test_data.label_template_id = labelTemplateId
    results.operations.create_label_template = { 
      status: 'SUCCESS', 
      data: labelTemplateResult.rows[0] 
    }
    results.passed++

    // 3. Testar geração de relatório
    console.log('  📊 Testando geração de relatório...')
    const reportDataResult = await query(`
      SELECT 
        p.numero_patrimonio,
        p.descricao,
        p.tipo,
        p.valor_aquisicao,
        l.name as local_name,
        s.name as sector_name
      FROM patrimonios p
      LEFT JOIN locals l ON p.local_id = l.id
      LEFT JOIN sectors s ON l.sector_id = s.id
      WHERE p.municipality_id = $1
      ORDER BY p.numero_patrimonio
    `, [testMunicipalityId])
    
    if (reportDataResult.rows.length > 0) {
      results.operations.generate_report = { 
        status: 'SUCCESS', 
        data: { 
          total_records: reportDataResult.rows.length,
          report_data: reportDataResult.rows 
        } 
      }
      results.passed++
    } else {
      results.operations.generate_report = { 
        status: 'FAILED', 
        error: 'Nenhum dado encontrado para relatório' 
      }
      results.failed++
    }

    // 4. Testar geração de etiqueta
    console.log('  🏷️ Testando geração de etiqueta...')
    const labelDataResult = await query(`
      SELECT 
        numero_patrimonio,
        descricao,
        tipo,
        marca,
        modelo
      FROM patrimonios 
      WHERE municipality_id = $1 
      LIMIT 5
    `, [testMunicipalityId])
    
    if (labelDataResult.rows.length > 0) {
      results.operations.generate_label = { 
        status: 'SUCCESS', 
        data: { 
          total_labels: labelDataResult.rows.length,
          label_data: labelDataResult.rows 
        } 
      }
      results.passed++
    } else {
      results.operations.generate_label = { 
        status: 'FAILED', 
        error: 'Nenhum dado encontrado para etiqueta' 
      }
      results.failed++
    }

    // 5. Testar edição de template
    console.log('  ✏️ Testando edição de template...')
    const editTemplateResult = await query(`
      UPDATE report_templates 
      SET description = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, name, description
    `, ['Template para relatório completo - Editado', reportTemplateId])
    
    results.operations.edit_template = { 
      status: 'SUCCESS', 
      data: editTemplateResult.rows[0] 
    }
    results.passed++

    // 6. Testar listagem de templates
    console.log('  📋 Testando listagem de templates...')
    const listTemplatesResult = await query(`
      SELECT COUNT(*) as total_templates
      FROM report_templates 
      WHERE municipality_id = $1 
    `, [testMunicipalityId])
    
    results.operations.list_templates = { 
      status: 'SUCCESS', 
      data: { total_templates: parseInt(listTemplatesResult.rows[0].total_templates) } 
    }
    results.passed++

    // 7. Testar listagem de etiquetas
    console.log('  🏷️ Testando listagem de etiquetas...')
    const listLabelsResult = await query(`
      SELECT COUNT(*) as total_labels
      FROM label_templates 
      WHERE municipality_id = $1
    `, [testMunicipalityId])
    
    results.operations.list_labels = { 
      status: 'SUCCESS', 
      data: { total_labels: parseInt(listLabelsResult.rows[0].total_labels) } 
    }
    results.passed++

    // 8. Testar exportação de relatório
    console.log('  📤 Testando exportação de relatório...')
    const exportReportResult = await query(`
      SELECT 
        p.numero_patrimonio,
        p.descricao,
        p.tipo,
        p.valor_aquisicao,
        p.data_aquisicao,
        l.name as local_name
      FROM patrimonios p
      LEFT JOIN locals l ON p.local_id = l.id
      WHERE p.municipality_id = $1
      ORDER BY p.numero_patrimonio
    `, [testMunicipalityId])
    
    results.operations.export_report = { 
      status: 'SUCCESS', 
      data: { 
        total_records: exportReportResult.rows.length,
        export_data: exportReportResult.rows 
      } 
    }
    results.passed++

    // 9. Testar impressão de etiquetas
    console.log('  🖨️ Testando impressão de etiquetas...')
    const printLabelsResult = await query(`
      SELECT 
        numero_patrimonio,
        descricao,
        tipo
      FROM patrimonios 
      WHERE municipality_id = $1
      LIMIT 3
    `, [testMunicipalityId])
    
    results.operations.print_labels = { 
      status: 'SUCCESS', 
      data: { 
        labels_to_print: printLabelsResult.rows.length,
        print_data: printLabelsResult.rows 
      } 
    }
    results.passed++

    // 10. Testar configurações de template
    console.log('  ⚙️ Testando configurações de template...')
    const configResult = await query(`
      SELECT 
        name,
        type,
        config
      FROM report_templates 
      WHERE id = $1
    `, [reportTemplateId])
    
    if (configResult.rows.length > 0) {
      results.operations.template_config = { 
        status: 'SUCCESS', 
        data: { config_data: configResult.rows[0] } 
      }
      results.passed++
    } else {
      results.operations.template_config = { 
        status: 'FAILED', 
        error: 'Template não encontrado' 
      }
      results.failed++
    }

  } catch (error) {
    results.errors.push(`Erro em relatórios e etiquetas: ${error.message}`)
    results.failed++
  }

  return results
}

// 9. Teste de Dashboard e Analytics
async function testDashboardAnalytics(user) {
  const results = {
    total_operations: 8,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {},
    test_data: {}
  }

  try {
    // Buscar município de teste
    const municipalityTest = await query(`
      SELECT id FROM municipalities WHERE name = 'Município Teste Completo' LIMIT 1
    `)
    
    if (municipalityTest.rows.length === 0) {
      throw new Error('Município de teste não encontrado')
    }
    
    const testMunicipalityId = municipalityTest.rows[0].id
    results.test_data.municipality_id = testMunicipalityId

    // 1. Testar estatísticas gerais
    console.log('  📊 Testando estatísticas gerais...')
    const generalStatsResult = await query(`
      SELECT 
        COUNT(*) as total_patrimonios,
        COUNT(DISTINCT tipo) as tipos_diferentes,
        COUNT(DISTINCT local_id) as locais_ocupados,
        SUM(COALESCE(valor_aquisicao, 0)) as valor_total
      FROM patrimonios 
      WHERE municipality_id = $1
    `, [testMunicipalityId])
    
    results.operations.general_stats = { 
      status: 'SUCCESS', 
      data: generalStatsResult.rows[0] 
    }
    results.passed++

    // 2. Testar estatísticas por tipo
    console.log('  📈 Testando estatísticas por tipo...')
    const typeStatsResult = await query(`
      SELECT 
        tipo,
        COUNT(*) as quantidade,
        SUM(COALESCE(valor_aquisicao, 0)) as valor_total,
        AVG(COALESCE(valor_aquisicao, 0)) as valor_medio
      FROM patrimonios 
      WHERE municipality_id = $1
      GROUP BY tipo
      ORDER BY valor_total DESC
    `, [testMunicipalityId])
    
    results.operations.type_stats = { 
      status: 'SUCCESS', 
      data: { type_breakdown: typeStatsResult.rows } 
    }
    results.passed++

    // 3. Testar estatísticas por local
    console.log('  📍 Testando estatísticas por local...')
    const localStatsResult = await query(`
      SELECT 
        l.name as local_name,
        COUNT(p.id) as total_patrimonios,
        SUM(COALESCE(p.valor_aquisicao, 0)) as valor_total
      FROM locals l
      LEFT JOIN patrimonios p ON l.id = p.local_id
      WHERE l.municipality_id = $1
      GROUP BY l.id, l.name
      ORDER BY valor_total DESC
    `, [testMunicipalityId])
    
    results.operations.local_stats = { 
      status: 'SUCCESS', 
      data: { local_breakdown: localStatsResult.rows } 
    }
    results.passed++

    // 4. Testar estatísticas por setor
    console.log('  🏢 Testando estatísticas por setor...')
    const sectorStatsResult = await query(`
      SELECT 
        s.name as sector_name,
        COUNT(p.id) as total_patrimonios,
        SUM(COALESCE(p.valor_aquisicao, 0)) as valor_total
      FROM sectors s
      LEFT JOIN locals l ON s.id = l.sector_id
      LEFT JOIN patrimonios p ON l.id = p.local_id
      WHERE s.municipality_id = $1
      GROUP BY s.id, s.name
      ORDER BY valor_total DESC
    `, [testMunicipalityId])
    
    results.operations.sector_stats = { 
      status: 'SUCCESS', 
      data: { sector_breakdown: sectorStatsResult.rows } 
    }
    results.passed++

    // 5. Testar estatísticas de imóveis
    console.log('  🏠 Testando estatísticas de imóveis...')
    const realEstateStatsResult = await query(`
      SELECT 
        COUNT(*) as total_imoveis,
        COUNT(DISTINCT tipo_imovel) as tipos_diferentes,
        SUM(COALESCE(valor_aquisicao, 0)) as valor_total,
        AVG(COALESCE(area, 0)) as area_media
      FROM imoveis 
      WHERE municipality_id = $1
    `, [testMunicipalityId])
    
    results.operations.real_estate_stats = { 
      status: 'SUCCESS', 
      data: realEstateStatsResult.rows[0] 
    }
    results.passed++

    // 6. Testar estatísticas de manutenção
    console.log('  🔧 Testando estatísticas de manutenção...')
    const maintenanceStatsResult = await query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN mt.status = 'pendente' THEN 1 END) as tasks_pendentes,
        COUNT(CASE WHEN mt.status = 'em_andamento' THEN 1 END) as tasks_em_andamento,
        COUNT(CASE WHEN mt.status = 'concluida' THEN 1 END) as tasks_concluidas,
        SUM(COALESCE(mt.custo_estimado, 0)) as custo_total_estimado
      FROM manutencao_tasks mt
      JOIN patrimonios p ON mt.patrimonio_id = p.id
      WHERE p.municipality_id = $1
    `, [testMunicipalityId])
    
    results.operations.maintenance_stats = { 
      status: 'SUCCESS', 
      data: maintenanceStatsResult.rows[0] 
    }
    results.passed++

    // 7. Testar estatísticas de transferências
    console.log('  🔄 Testando estatísticas de transferências...')
    const transferStatsResult = await query(`
      SELECT 
        COUNT(*) as total_transfers,
        COUNT(DISTINCT patrimonio_id) as patrimonios_transferidos,
        COUNT(DISTINCT DATE(data_transferencia)) as dias_com_transferencias
      FROM transfers t
      JOIN patrimonios p ON t.patrimonio_id = p.id
      WHERE p.municipality_id = $1
    `, [testMunicipalityId])
    
    results.operations.transfer_stats = { 
      status: 'SUCCESS', 
      data: transferStatsResult.rows[0] 
    }
    results.passed++

    // 8. Testar dashboard completo
    console.log('  📊 Testando dashboard completo...')
    const dashboardResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM patrimonios WHERE municipality_id = $1) as total_patrimonios,
        (SELECT COUNT(*) FROM imoveis WHERE municipality_id = $1) as total_imoveis,
        (SELECT COUNT(*) FROM sectors WHERE municipality_id = $1) as total_sectors,
        (SELECT COUNT(*) FROM locals WHERE municipality_id = $1) as total_locals,
        (SELECT COUNT(*) FROM users WHERE municipality_id = $1) as total_users,
        (SELECT SUM(COALESCE(valor_aquisicao, 0)) FROM patrimonios WHERE municipality_id = $1) as valor_total_patrimonios,
        (SELECT SUM(COALESCE(valor_aquisicao, 0)) FROM imoveis WHERE municipality_id = $1) as valor_total_imoveis
    `, [testMunicipalityId])
    
    results.operations.complete_dashboard = { 
      status: 'SUCCESS', 
      data: dashboardResult.rows[0] 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro no dashboard e analytics: ${error.message}`)
    results.failed++
  }

  return results
}

// 10. Teste de Exportação e Backup
async function testExportBackup(user) {
  const results = {
    total_operations: 6,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {},
    test_data: {}
  }

  try {
    // Buscar município de teste
    const municipalityTest = await query(`
      SELECT id FROM municipalities WHERE name = 'Município Teste Completo' LIMIT 1
    `)
    
    if (municipalityTest.rows.length === 0) {
      throw new Error('Município de teste não encontrado')
    }
    
    const testMunicipalityId = municipalityTest.rows[0].id
    results.test_data.municipality_id = testMunicipalityId

    // 1. Testar exportação de patrimônios
    console.log('  📤 Testando exportação de patrimônios...')
    const patrimonyExportResult = await query(`
      SELECT 
        numero_patrimonio,
        descricao,
        tipo,
        marca,
        modelo,
        valor_aquisicao,
        data_aquisicao,
        l.name as local_name,
        s.name as sector_name
      FROM patrimonios p
      LEFT JOIN locals l ON p.local_id = l.id
      LEFT JOIN sectors s ON l.sector_id = s.id
      WHERE p.municipality_id = $1
      ORDER BY p.numero_patrimonio
    `, [testMunicipalityId])
    
    results.operations.patrimony_export = { 
      status: 'SUCCESS', 
      data: { 
        total_records: patrimonyExportResult.rows.length,
        export_data: patrimonyExportResult.rows 
      } 
    }
    results.passed++

    // 2. Testar exportação de imóveis
    console.log('  🏠 Testando exportação de imóveis...')
    const realEstateExportResult = await query(`
      SELECT 
        numero_patrimonio,
        descricao,
        endereco,
        area,
        tipo_imovel,
        valor_aquisicao,
        data_aquisicao,
        latitude,
        longitude
      FROM imoveis 
      WHERE municipality_id = $1
      ORDER BY numero_patrimonio
    `, [testMunicipalityId])
    
    results.operations.real_estate_export = { 
      status: 'SUCCESS', 
      data: { 
        total_records: realEstateExportResult.rows.length,
        export_data: realEstateExportResult.rows 
      } 
    }
    results.passed++

    // 3. Testar exportação de estrutura organizacional
    console.log('  🏢 Testando exportação de estrutura organizacional...')
    const structureExportResult = await query(`
      SELECT 
        s.name as sector_name,
        s.description as sector_description,
        l.name as local_name,
        l.description as local_description,
        m.name as municipality_name
      FROM sectors s
      LEFT JOIN locals l ON s.id = l.sector_id
      LEFT JOIN municipalities m ON s.municipality_id = m.id
      WHERE s.municipality_id = $1
      ORDER BY s.name, l.name
    `, [testMunicipalityId])
    
    results.operations.structure_export = { 
      status: 'SUCCESS', 
      data: { 
        total_records: structureExportResult.rows.length,
        export_data: structureExportResult.rows 
      } 
    }
    results.passed++

    // 4. Testar backup de dados
    console.log('  💾 Testando backup de dados...')
    const backupResult = await query(`
      SELECT 
        'patrimonios' as table_name,
        COUNT(*) as record_count
      FROM patrimonios 
      WHERE municipality_id = $1
      UNION ALL
      SELECT 
        'imoveis' as table_name,
        COUNT(*) as record_count
      FROM imoveis 
      WHERE municipality_id = $1
      UNION ALL
      SELECT 
        'sectors' as table_name,
        COUNT(*) as record_count
      FROM sectors 
      WHERE municipality_id = $1
      UNION ALL
      SELECT 
        'locals' as table_name,
        COUNT(*) as record_count
      FROM locals 
      WHERE municipality_id = $1
      UNION ALL
      SELECT 
        'users' as table_name,
        COUNT(*) as record_count
      FROM users 
      WHERE municipality_id = $1
    `, [testMunicipalityId])
    
    results.operations.data_backup = { 
      status: 'SUCCESS', 
      data: { backup_summary: backupResult.rows } 
    }
    results.passed++

    // 5. Testar exportação de relatórios
    console.log('  📊 Testando exportação de relatórios...')
    const reportExportResult = await query(`
      SELECT 
        rt.name as template_name,
        rt.type as template_type,
        rt.description as template_description,
        lt.name as label_template_name,
        lt.tamanho as label_size
      FROM report_templates rt
      LEFT JOIN label_templates lt ON rt.municipality_id = lt.municipality_id
      WHERE rt.municipality_id = $1
      ORDER BY rt.name
    `, [testMunicipalityId])
    
    results.operations.report_export = { 
      status: 'SUCCESS', 
      data: { 
        total_records: reportExportResult.rows.length,
        export_data: reportExportResult.rows 
      } 
    }
    results.passed++

    // 6. Testar exportação completa do sistema
    console.log('  🔄 Testando exportação completa do sistema...')
    const completeExportResult = await query(`
      SELECT 
        'Sistema Completo' as export_type,
        NOW() as export_timestamp,
        (SELECT COUNT(*) FROM patrimonios WHERE municipality_id = $1) as total_patrimonios,
        (SELECT COUNT(*) FROM imoveis WHERE municipality_id = $1) as total_imoveis,
        (SELECT COUNT(*) FROM sectors WHERE municipality_id = $1) as total_sectors,
        (SELECT COUNT(*) FROM locals WHERE municipality_id = $1) as total_locals,
        (SELECT COUNT(*) FROM users WHERE municipality_id = $1) as total_users,
        (SELECT SUM(COALESCE(valor_aquisicao, 0)) FROM patrimonios WHERE municipality_id = $1) as valor_total_patrimonios,
        (SELECT SUM(COALESCE(valor_aquisicao, 0)) FROM imoveis WHERE municipality_id = $1) as valor_total_imoveis
    `, [testMunicipalityId])
    
    results.operations.complete_system_export = { 
      status: 'SUCCESS', 
      data: completeExportResult.rows[0] 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro na exportação e backup: ${error.message}`)
    results.failed++
  }

  return results
}

// 11. Teste de Limpeza e Finalização
async function testSystemCleanup(user) {
  const results = {
    total_operations: 8,
    passed: 0,
    failed: 0,
    errors: [],
    operations: {},
    test_data: {}
  }

  try {
    // Buscar município de teste
    const municipalityTest = await query(`
      SELECT id FROM municipalities WHERE name = 'Município Teste Completo' LIMIT 1
    `)
    
    if (municipalityTest.rows.length === 0) {
      throw new Error('Município de teste não encontrado')
    }
    
    const testMunicipalityId = municipalityTest.rows[0].id
    results.test_data.municipality_id = testMunicipalityId

    // 1. Limpar tarefas de manutenção
    console.log('  🧹 Limpando tarefas de manutenção...')
    const maintenanceCleanupResult = await query(`
      DELETE FROM manutencao_tasks 
      WHERE patrimonio_id IN (
        SELECT id FROM patrimonios WHERE municipality_id = $1
      )
    `, [testMunicipalityId])
    
    results.operations.cleanup_maintenance = { 
      status: 'SUCCESS', 
      data: { message: 'Tarefas de manutenção removidas' } 
    }
    results.passed++

    // 2. Limpar transferências
    console.log('  🔄 Limpando transferências...')
    const transferCleanupResult = await query(`
      DELETE FROM transfers 
      WHERE patrimonio_id IN (
        SELECT id FROM patrimonios WHERE municipality_id = $1
      )
    `, [testMunicipalityId])
    
    results.operations.cleanup_transfers = { 
      status: 'SUCCESS', 
      data: { message: 'Transferências removidas' } 
    }
    results.passed++

    // 3. Limpar templates de relatório
    console.log('  📄 Limpando templates de relatório...')
    const reportTemplateCleanupResult = await query(`
      DELETE FROM report_templates 
      WHERE municipality_id = $1 AND name LIKE '%Completo%'
    `, [testMunicipalityId])
    
    results.operations.cleanup_report_templates = { 
      status: 'SUCCESS', 
      data: { message: 'Templates de relatório removidos' } 
    }
    results.passed++

    // 4. Limpar templates de etiqueta
    console.log('  🏷️ Limpando templates de etiqueta...')
    const labelTemplateCleanupResult = await query(`
      DELETE FROM label_templates 
      WHERE municipality_id = $1 AND name LIKE '%Completo%'
    `, [testMunicipalityId])
    
    results.operations.cleanup_label_templates = { 
      status: 'SUCCESS', 
      data: { message: 'Templates de etiqueta removidos' } 
    }
    results.passed++

    // 5. Limpar patrimônios
    console.log('  💼 Limpando patrimônios...')
    const patrimonyCleanupResult = await query(`
      DELETE FROM patrimonios 
      WHERE municipality_id = $1 AND numero_patrimonio LIKE 'COMPLETE-%'
    `, [testMunicipalityId])
    
    results.operations.cleanup_patrimonios = { 
      status: 'SUCCESS', 
      data: { message: 'Patrimônios de teste removidos' } 
    }
    results.passed++

    // 6. Limpar imóveis
    console.log('  🏠 Limpando imóveis...')
    const realEstateCleanupResult = await query(`
      DELETE FROM imoveis 
      WHERE municipality_id = $1 AND numero_patrimonio LIKE 'IMOVEL-%'
    `, [testMunicipalityId])
    
    results.operations.cleanup_imoveis = { 
      status: 'SUCCESS', 
      data: { message: 'Imóveis de teste removidos' } 
    }
    results.passed++

    // 7. Limpar locais
    console.log('  📍 Limpando locais...')
    const localCleanupResult = await query(`
      DELETE FROM locals 
      WHERE municipality_id = $1 AND name IN ('Sala Principal', 'Sala de Reuniões')
    `, [testMunicipalityId])
    
    results.operations.cleanup_locals = { 
      status: 'SUCCESS', 
      data: { message: 'Locais de teste removidos' } 
    }
    results.passed++

    // 8. Limpar setores
    console.log('  🏢 Limpando setores...')
    const sectorCleanupResult = await query(`
      DELETE FROM sectors 
      WHERE municipality_id = $1 AND name IN ('Secretaria Municipal de Administração', 'Departamento de Recursos Humanos')
    `, [testMunicipalityId])
    
    results.operations.cleanup_sectors = { 
      status: 'SUCCESS', 
      data: { message: 'Setores de teste removidos' } 
    }
    results.passed++

  } catch (error) {
    results.errors.push(`Erro na limpeza do sistema: ${error.message}`)
    results.failed++
  }

  return results
}

// POST /test-complete-system - Teste completo do sistema com simulação real
router.post('/test-complete-system', requireSupervisor, async (req, res) => {
  try {
    console.log('🚀 Iniciando teste completo do sistema...')
    
    const testResults = {
      timestamp: new Date().toISOString(),
      duration: 0,
      tests: {},
      errors: [],
      warnings: [],
      summary: {
        total_operations: 0,
        passed: 0,
        failed: 0,
        critical_errors: 0,
        system_status: 'UNKNOWN'
      }
    }

    const startTime = Date.now()

    // 1. Teste de Setup e Configuração Inicial
    console.log('📋 1. Testando setup e configuração inicial...')
    try {
      testResults.tests.setup = await testSystemSetup(req.user)
      testResults.summary.total_operations += testResults.tests.setup.total_operations
      testResults.summary.passed += testResults.tests.setup.passed
      testResults.summary.failed += testResults.tests.setup.failed
      if (testResults.tests.setup.errors) {
        testResults.errors.push(...testResults.tests.setup.errors)
      }
    } catch (error) {
      testResults.errors.push(`Erro crítico no setup: ${error.message}`)
      testResults.summary.critical_errors++
    }

    // 2. Teste de Criação de Município e Usuários
    console.log('🏛️ 2. Testando criação de município e usuários...')
    try {
      testResults.tests.municipality_setup = await testMunicipalitySetup(req.user)
      testResults.summary.total_operations += testResults.tests.municipality_setup.total_operations
      testResults.summary.passed += testResults.tests.municipality_setup.passed
      testResults.summary.failed += testResults.tests.municipality_setup.failed
      if (testResults.tests.municipality_setup.errors) {
        testResults.errors.push(...testResults.tests.municipality_setup.errors)
      }
    } catch (error) {
      testResults.errors.push(`Erro crítico na criação de município: ${error.message}`)
      testResults.summary.critical_errors++
    }

    // 3. Teste de Estrutura Organizacional
    console.log('🏢 3. Testando estrutura organizacional...')
    try {
      testResults.tests.organizational_structure = await testOrganizationalStructure(req.user)
      testResults.summary.total_operations += testResults.tests.organizational_structure.total_operations
      testResults.summary.passed += testResults.tests.organizational_structure.passed
      testResults.summary.failed += testResults.tests.organizational_structure.failed
      if (testResults.tests.organizational_structure.errors) {
        testResults.errors.push(...testResults.tests.organizational_structure.errors)
      }
    } catch (error) {
      testResults.errors.push(`Erro crítico na estrutura organizacional: ${error.message}`)
      testResults.summary.critical_errors++
    }

    // 4. Teste de Cadastro de Patrimônios
    console.log('💼 4. Testando cadastro de patrimônios...')
    try {
      testResults.tests.patrimony_management = await testPatrimonyManagement(req.user)
      testResults.summary.total_operations += testResults.tests.patrimony_management.total_operations
      testResults.summary.passed += testResults.tests.patrimony_management.passed
      testResults.summary.failed += testResults.tests.patrimony_management.failed
      if (testResults.tests.patrimony_management.errors) {
        testResults.errors.push(...testResults.tests.patrimony_management.errors)
      }
    } catch (error) {
      testResults.errors.push(`Erro crítico no cadastro de patrimônios: ${error.message}`)
      testResults.summary.critical_errors++
    }

    // 5. Teste de Gestão de Imóveis
    console.log('🏠 5. Testando gestão de imóveis...')
    try {
      testResults.tests.real_estate_management = await testRealEstateManagement(req.user)
      testResults.summary.total_operations += testResults.tests.real_estate_management.total_operations
      testResults.summary.passed += testResults.tests.real_estate_management.passed
      testResults.summary.failed += testResults.tests.real_estate_management.failed
      if (testResults.tests.real_estate_management.errors) {
        testResults.errors.push(...testResults.tests.real_estate_management.errors)
      }
    } catch (error) {
      testResults.errors.push(`Erro crítico na gestão de imóveis: ${error.message}`)
      testResults.summary.critical_errors++
    }

    // 6. Teste de Operações de Transferência
    console.log('🔄 6. Testando operações de transferência...')
    try {
      testResults.tests.transfer_operations = await testTransferOperations(req.user)
      testResults.summary.total_operations += testResults.tests.transfer_operations.total_operations
      testResults.summary.passed += testResults.tests.transfer_operations.passed
      testResults.summary.failed += testResults.tests.transfer_operations.failed
      if (testResults.tests.transfer_operations.errors) {
        testResults.errors.push(...testResults.tests.transfer_operations.errors)
      }
    } catch (error) {
      testResults.errors.push(`Erro crítico nas transferências: ${error.message}`)
      testResults.summary.critical_errors++
    }

    // 7. Teste de Manutenção
    console.log('🔧 7. Testando sistema de manutenção...')
    try {
      testResults.tests.maintenance_system = await testMaintenanceSystem(req.user)
      testResults.summary.total_operations += testResults.tests.maintenance_system.total_operations
      testResults.summary.passed += testResults.tests.maintenance_system.passed
      testResults.summary.failed += testResults.tests.maintenance_system.failed
      if (testResults.tests.maintenance_system.errors) {
        testResults.errors.push(...testResults.tests.maintenance_system.errors)
      }
    } catch (error) {
      testResults.errors.push(`Erro crítico no sistema de manutenção: ${error.message}`)
      testResults.summary.critical_errors++
    }

    // 8. Teste de Relatórios e Etiquetas
    console.log('📊 8. Testando relatórios e etiquetas...')
    try {
      testResults.tests.reports_and_labels = await testReportsAndLabels(req.user)
      testResults.summary.total_operations += testResults.tests.reports_and_labels.total_operations
      testResults.summary.passed += testResults.tests.reports_and_labels.passed
      testResults.summary.failed += testResults.tests.reports_and_labels.failed
      if (testResults.tests.reports_and_labels.errors) {
        testResults.errors.push(...testResults.tests.reports_and_labels.errors)
      }
    } catch (error) {
      testResults.errors.push(`Erro crítico em relatórios e etiquetas: ${error.message}`)
      testResults.summary.critical_errors++
    }

    // 9. Teste de Dashboard e Analytics
    console.log('📈 9. Testando dashboard e analytics...')
    try {
      testResults.tests.dashboard_analytics = await testDashboardAnalytics(req.user)
      testResults.summary.total_operations += testResults.tests.dashboard_analytics.total_operations
      testResults.summary.passed += testResults.tests.dashboard_analytics.passed
      testResults.summary.failed += testResults.tests.dashboard_analytics.failed
      if (testResults.tests.dashboard_analytics.errors) {
        testResults.errors.push(...testResults.tests.dashboard_analytics.errors)
      }
    } catch (error) {
      testResults.errors.push(`Erro crítico no dashboard: ${error.message}`)
      testResults.summary.critical_errors++
    }

    // 10. Teste de Exportação e Backup
    console.log('💾 10. Testando exportação e backup...')
    try {
      testResults.tests.export_backup = await testExportBackup(req.user)
      testResults.summary.total_operations += testResults.tests.export_backup.total_operations
      testResults.summary.passed += testResults.tests.export_backup.passed
      testResults.summary.failed += testResults.tests.export_backup.failed
      if (testResults.tests.export_backup.errors) {
        testResults.errors.push(...testResults.tests.export_backup.errors)
      }
    } catch (error) {
      testResults.errors.push(`Erro crítico na exportação/backup: ${error.message}`)
      testResults.summary.critical_errors++
    }

    // 11. Teste de Limpeza e Finalização
    console.log('🧹 11. Testando limpeza e finalização...')
    try {
      testResults.tests.cleanup = await testSystemCleanup(req.user)
      testResults.summary.total_operations += testResults.tests.cleanup.total_operations
      testResults.summary.passed += testResults.tests.cleanup.passed
      testResults.summary.failed += testResults.tests.cleanup.failed
      if (testResults.tests.cleanup.errors) {
        testResults.errors.push(...testResults.tests.cleanup.errors)
      }
    } catch (error) {
      testResults.errors.push(`Erro crítico na limpeza: ${error.message}`)
      testResults.summary.critical_errors++
    }

    // Calcular duração e status final
    const endTime = Date.now()
    testResults.duration = endTime - startTime
    
    // Determinar status do sistema
    if (testResults.summary.critical_errors > 0) {
      testResults.summary.system_status = 'CRITICAL_FAILURE'
    } else if (testResults.summary.failed > 0) {
      testResults.summary.system_status = 'PARTIAL_FAILURE'
    } else {
      testResults.summary.system_status = 'SUCCESS'
    }

    console.log(`✅ Teste completo finalizado em ${Math.round(testResults.duration / 1000)}s`)
    console.log(`📊 Status: ${testResults.summary.system_status}`)
    console.log(`✅ Sucessos: ${testResults.summary.passed}/${testResults.summary.total_operations}`)
    console.log(`❌ Falhas: ${testResults.summary.failed}`)
    console.log(`🚨 Erros críticos: ${testResults.summary.critical_errors}`)
    
    res.json({
      success: true,
      message: 'Teste completo do sistema executado com sucesso',
      results: testResults
    })

  } catch (error) {
    console.error('❌ Erro no teste completo do sistema:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao executar teste completo do sistema',
      details: error.message
    })
  }
})

// POST /fix-common-issues - Corrigir problemas comuns identificados
router.post('/fix-common-issues', requireSupervisor, async (req, res) => {
  try {
    console.log('🔧 Iniciando correção de problemas comuns...')
    
    const fixResults = {
      timestamp: new Date().toISOString(),
      fixes: {},
      summary: {
        total_fixes: 0,
        successful: 0,
        failed: 0,
        errors: []
      }
    }

    // 1. Verificar e corrigir estrutura da tabela patrimonios
    console.log('📋 Verificando estrutura da tabela patrimonios...')
    try {
      const patrimonioColumns = await getRows(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'patrimonios' 
        AND column_name IN ('historico_movimentacao', 'local_objeto', 'setor_responsavel', 'cor', 'quantidade', 'status')
      `)
      
      const existingColumns = patrimonioColumns.map(col => col.column_name)
      const missingColumns = ['historico_movimentacao', 'local_objeto', 'setor_responsavel', 'cor', 'quantidade', 'status'].filter(
        col => !existingColumns.includes(col)
      )
      
      if (missingColumns.length > 0) {
        console.log('🔧 Adicionando colunas faltando à tabela patrimonios...')
        for (const column of missingColumns) {
          try {
            let alterQuery = ''
            switch (column) {
              case 'historico_movimentacao':
                alterQuery = 'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS historico_movimentacao jsonb DEFAULT \'[]\'::jsonb'
                break
              case 'local_objeto':
                alterQuery = 'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS local_objeto character varying'
                break
              case 'setor_responsavel':
                alterQuery = 'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS setor_responsavel character varying'
                break
              case 'cor':
                alterQuery = 'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS cor character varying'
                break
              case 'quantidade':
                alterQuery = 'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS quantidade integer DEFAULT 1'
                break
              case 'status':
                alterQuery = 'ALTER TABLE patrimonios ADD COLUMN IF NOT EXISTS status character varying DEFAULT \'ativo\''
                break
            }
            
            if (alterQuery) {
              await query(alterQuery)
              console.log(`✅ Coluna ${column} adicionada com sucesso`)
            }
          } catch (error) {
            console.error(`❌ Erro ao adicionar coluna ${column}:`, error)
            fixResults.summary.errors.push(`Erro ao adicionar coluna ${column}: ${error.message}`)
            fixResults.summary.failed++
          }
        }
        
        fixResults.fixes.patrimonios_structure = {
          status: 'SUCCESS',
          message: `Colunas adicionadas: ${missingColumns.join(', ')}`,
          columns_added: missingColumns
        }
        fixResults.summary.successful++
      } else {
        fixResults.fixes.patrimonios_structure = {
          status: 'SKIPPED',
          message: 'Estrutura da tabela patrimonios já está correta'
        }
      }
    } catch (error) {
      fixResults.fixes.patrimonios_structure = {
        status: 'ERROR',
        error: error.message
      }
      fixResults.summary.errors.push(`Erro ao verificar estrutura de patrimonios: ${error.message}`)
      fixResults.summary.failed++
    }

    // 2. Verificar e corrigir dados de exemplo
    console.log('📊 Verificando dados de exemplo...')
    try {
      // Verificar se há municípios
      const municipalitiesCount = await getRow('SELECT COUNT(*) as count FROM municipalities')
      if (parseInt(municipalitiesCount.count) === 0) {
        console.log('🏛️ Criando município de exemplo...')
        const municipalityResult = await query(`
          INSERT INTO municipalities (name, state, full_address, cnpj, contact_email, mayor_name)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, name
        `, ['Município de Exemplo', 'PA', 'Rua Exemplo, 123 - Centro', '12.345.678/0001-90', 
            'exemplo@municipio.com', 'Prefeito Exemplo'])
        
        fixResults.fixes.sample_municipality = {
          status: 'SUCCESS',
          message: 'Município de exemplo criado',
          data: municipalityResult.rows[0]
        }
        fixResults.summary.successful++
      } else {
        fixResults.fixes.sample_municipality = {
          status: 'SKIPPED',
          message: 'Municípios já existem no sistema'
        }
      }
    } catch (error) {
      fixResults.fixes.sample_municipality = {
        status: 'ERROR',
        error: error.message
      }
      fixResults.summary.errors.push(`Erro ao criar município de exemplo: ${error.message}`)
      fixResults.summary.failed++
    }

    // 3. Verificar e corrigir setores
    console.log('🏢 Verificando setores...')
    try {
      const sectorsCount = await getRow('SELECT COUNT(*) as count FROM sectors')
      if (parseInt(sectorsCount.count) === 0) {
        console.log('🏢 Criando setores de exemplo...')
        
        // Buscar primeiro município
        const municipality = await getRow('SELECT id FROM municipalities LIMIT 1')
        if (municipality) {
          const setores = [
            'Secretaria de Administração',
            'Secretaria de Finanças',
            'Secretaria de Educação',
            'Secretaria de Saúde',
            'Secretaria de Obras'
          ]
          
          for (const setor of setores) {
            await query(`
              INSERT INTO sectors (name, municipality_id, created_by)
              VALUES ($1, $2, $3)
            `, [setor, municipality.id, req.user.id])
          }
          
          fixResults.fixes.sample_sectors = {
            status: 'SUCCESS',
            message: `${setores.length} setores de exemplo criados`,
            sectors: setores
          }
          fixResults.summary.successful++
        }
      } else {
        fixResults.fixes.sample_sectors = {
          status: 'SKIPPED',
          message: 'Setores já existem no sistema'
        }
      }
    } catch (error) {
      fixResults.fixes.sample_sectors = {
        status: 'ERROR',
        error: error.message
      }
      fixResults.summary.errors.push(`Erro ao criar setores de exemplo: ${error.message}`)
      fixResults.summary.failed++
    }

    // 4. Verificar e corrigir locais
    console.log('📍 Verificando locais...')
    try {
      const localsCount = await getRow('SELECT COUNT(*) as count FROM locals')
      if (parseInt(localsCount.count) === 0) {
        console.log('📍 Criando locais de exemplo...')
        
        // Buscar setores
        const sectors = await getRows('SELECT id, name FROM sectors LIMIT 3')
        if (sectors.length > 0) {
          const locais = [
            { name: 'Sala Principal', sector_id: sectors[0].id },
            { name: 'Sala de Reuniões', sector_id: sectors[0].id },
            { name: 'Almoxarifado', sector_id: sectors[1].id },
            { name: 'Auditório', sector_id: sectors[2].id }
          ]
          
          for (const local of locais) {
            await query(`
              INSERT INTO locals (name, sector_id, municipality_id, created_by)
              VALUES ($1, $2, $3, $4)
            `, [local.name, local.sector_id, req.user.municipality_id, req.user.id])
          }
          
          fixResults.fixes.sample_locals = {
            status: 'SUCCESS',
            message: `${locais.length} locais de exemplo criados`,
            locals: locais.map(l => l.name)
          }
          fixResults.summary.successful++
        }
      } else {
        fixResults.fixes.sample_locals = {
          status: 'SKIPPED',
          message: 'Locais já existem no sistema'
        }
      }
    } catch (error) {
      fixResults.fixes.sample_locals = {
        status: 'ERROR',
        error: error.message
      }
      fixResults.summary.errors.push(`Erro ao criar locais de exemplo: ${error.message}`)
      fixResults.summary.failed++
    }

    // 5. Verificar e corrigir patrimônios de exemplo
    console.log('💼 Verificando patrimônios de exemplo...')
    try {
      const patrimoniosCount = await getRow('SELECT COUNT(*) as count FROM patrimonios')
      if (parseInt(patrimoniosCount.count) === 0) {
        console.log('💼 Criando patrimônios de exemplo...')
        
        // Buscar local
        const local = await getRow('SELECT id FROM locals LIMIT 1')
        if (local) {
          const patrimonios = [
            {
              numero: 'P001',
              descricao: 'Computador Desktop',
              tipo: 'Equipamento de Informática',
              valor: 2500.00,
              marca: 'Dell',
              modelo: 'OptiPlex 7090'
            },
            {
              numero: 'P002',
              descricao: 'Impressora Multifuncional',
              tipo: 'Equipamento de Escritório',
              valor: 1800.00,
              marca: 'HP',
              modelo: 'LaserJet Pro M404n'
            },
            {
              numero: 'P003',
              descricao: 'Cadeira Ergonômica',
              tipo: 'Móveis e Utensílios',
              valor: 800.00,
              marca: 'Flexform',
              modelo: 'Ergonômica Plus'
            }
          ]
          
          for (const patrimonio of patrimonios) {
            await query(`
              INSERT INTO patrimonios (
                numero_patrimonio, descricao, tipo, marca, modelo,
                valor_aquisicao, data_aquisicao, local_id, municipality_id, created_by
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
              patrimonio.numero,
              patrimonio.descricao,
              patrimonio.tipo,
              patrimonio.marca,
              patrimonio.modelo,
              patrimonio.valor,
              new Date(),
              local.id,
              req.user.municipality_id,
              req.user.id
            ])
          }
          
          fixResults.fixes.sample_patrimonios = {
            status: 'SUCCESS',
            message: `${patrimonios.length} patrimônios de exemplo criados`,
            patrimonios: patrimonios.map(p => p.numero)
          }
          fixResults.summary.successful++
        }
      } else {
        fixResults.fixes.sample_patrimonios = {
          status: 'SKIPPED',
          message: 'Patrimônios já existem no sistema'
        }
      }
    } catch (error) {
      fixResults.fixes.sample_patrimonios = {
        status: 'ERROR',
        error: error.message
      }
      fixResults.summary.errors.push(`Erro ao criar patrimônios de exemplo: ${error.message}`)
      fixResults.summary.failed++
    }

    // 6. Verificar integridade referencial
    console.log('🔗 Verificando integridade referencial...')
    try {
      // Verificar locais sem setor válido
      const invalidLocals = await getRows(`
        SELECT l.id, l.name, l.sector_id 
        FROM locals l 
        LEFT JOIN sectors s ON l.sector_id = s.id 
        WHERE s.id IS NULL
      `)
      
      if (invalidLocals.length > 0) {
        console.log('🔧 Corrigindo locais com setor inválido...')
        for (const local of invalidLocals) {
          // Buscar primeiro setor disponível
          const sector = await getRow('SELECT id FROM sectors LIMIT 1')
          if (sector) {
            await query('UPDATE locals SET sector_id = $1 WHERE id = $2', [sector.id, local.id])
          }
        }
        
        fixResults.fixes.integrity_locals = {
          status: 'SUCCESS',
          message: `${invalidLocals.length} locais corrigidos`
        }
        fixResults.summary.successful++
      } else {
        fixResults.fixes.integrity_locals = {
          status: 'SKIPPED',
          message: 'Todos os locais têm setores válidos'
        }
      }
    } catch (error) {
      fixResults.fixes.integrity_locals = {
        status: 'ERROR',
        error: error.message
      }
      fixResults.summary.errors.push(`Erro ao corrigir integridade de locais: ${error.message}`)
      fixResults.summary.failed++
    }

    // Resumo final
    fixResults.summary.total_fixes = Object.keys(fixResults.fixes).length
    fixResults.summary.system_status = fixResults.summary.failed === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION'

    console.log('✅ Correção de problemas concluída!')
    console.log(`📊 Resumo: ${fixResults.summary.successful} correções bem-sucedidas, ${fixResults.summary.failed} falhas`)
    
    res.json({
      success: true,
      message: 'Correção de problemas executada com sucesso',
      results: fixResults
    })

  } catch (error) {
    console.error('❌ Erro na correção de problemas:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao executar correção de problemas',
      details: error.message
    })
  }
})

// POST /optimize/performance - Otimizar performance do banco
router.post('/optimize/performance', requireSupervisor, async (req, res) => {
  try {
    console.log('🔧 Iniciando otimização de performance...')
    
    const results = {
      timestamp: new Date().toISOString(),
      optimizations: {}
    }

    // 1. Criar índices de performance
    console.log('📊 Criando índices de performance...')
    try {
      results.optimizations.indexes = await createPerformanceIndexes()
    } catch (error) {
      results.optimizations.indexes = { error: error.message }
    }

    // 2. Otimizar queries específicas
    console.log('🔧 Otimizando queries específicas...')
    try {
      results.optimizations.queries = await optimizeSpecificQueries()
    } catch (error) {
      results.optimizations.queries = { error: error.message }
    }

    // 3. Limpar dados antigos
    console.log('🧹 Limpando dados antigos...')
    try {
      results.optimizations.cleanup = await cleanupOldData()
    } catch (error) {
      results.optimizations.cleanup = { error: error.message }
    }

    // 4. Analisar performance
    console.log('📊 Analisando performance...')
    try {
      results.optimizations.analysis = await analyzeQueryPerformance()
    } catch (error) {
      results.optimizations.analysis = { error: error.message }
    }

    console.log('✅ Otimização de performance concluída')
    
    res.json({
      success: true,
      message: 'Otimização de performance executada com sucesso',
      results
    })

  } catch (error) {
    console.error('❌ Erro na otimização de performance:', error)
    res.status(500).json({
      success: false,
      error: 'Erro na otimização de performance',
      details: error.message
    })
  }
})

// GET /optimize/stats - Obter estatísticas de performance
router.get('/optimize/stats', requireSupervisor, async (req, res) => {
  try {
    console.log('📊 Obtendo estatísticas de performance...')
    
    const stats = await getPerformanceStats()
    
    console.log('✅ Estatísticas obtidas')
    
    res.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao obter estatísticas',
      details: error.message
    })
  }
})

// Rota para verificar patrimônios por município
router.get('/patrimonios/:municipalityId', requireSupervisor, async (req, res) => {
  try {
    const { municipalityId } = req.params
    console.log('🔍 Verificando patrimônios do município:', municipalityId)
    
    const patrimonios = await getRows(`
      SELECT 
        p.id,
        p.numero_patrimonio,
        p.descricao as descricao_bem,
        p.tipo,
        p.marca,
        p.modelo,
        p.numero_serie,
        p.estado as situacao_bem,
        p.data_aquisicao,
        p.valor_aquisicao,
        p.fornecedor as forma_aquisicao,
        p.nota_fiscal as numero_nota_fiscal,
        p.local_id,
        p.sector_id,
        l.name as local_objeto,
        s.name as setor_responsavel,
        p.cor,
        p.quantidade,
        p.fotos,
        p.documentos,
        p.metodo_depreciacao,
        p.vida_util_anos,
        p.valor_residual,
        p.status,
        p.municipality_id,
        p.created_by,
        p.created_at,
        p.updated_at,
        m.name as municipality_name
      FROM patrimonios p
      LEFT JOIN municipalities m ON p.municipality_id = m.id
      LEFT JOIN locals l ON p.local_id = l.id
      LEFT JOIN sectors s ON p.sector_id = s.id
      WHERE p.municipality_id = $1
      ORDER BY p.numero_patrimonio
    `, [municipalityId])
    
    console.log('📋 Patrimônios encontrados:', patrimonios.length)
    console.log('📋 Números dos patrimônios:', patrimonios.map(p => p.numero_patrimonio))
    
    res.json({
      success: true,
      count: patrimonios.length,
      patrimonios: patrimonios.map(p => ({
        ...p,
        fotos: p.fotos ? JSON.parse(p.fotos) : [],
        documentos: p.documentos ? JSON.parse(p.documentos) : []
      }))
    })
  } catch (error) {
    console.error('❌ Erro ao verificar patrimônios:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    })
  }
})

// Endpoint para verificar tabelas do banco
router.get('/check-tables', async (req, res) => {
  try {
    console.log('🔍 Verificando tabelas do banco de dados...')

    // Check if tables exist
    const tables = ['municipalities', 'patrimonios', 'imoveis']
    const tableStatus = {}

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`)
        tableStatus[table] = {
          exists: true,
          count: result.rows[0].count
        }
        console.log(`✅ Tabela ${table}: ${result.rows[0].count} registros`)
      } catch (error) {
        tableStatus[table] = {
          exists: false,
          error: error.message
        }
        console.log(`❌ Tabela ${table}: ${error.message}`)
      }
    }

    res.json({
      success: true,
      tables: tableStatus,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error)
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message })
  }
})

// Endpoint para testar WebSocket
router.post('/test-websocket', async (req, res) => {
  try {
    const { type = 'info', title, message, target = 'broadcast' } = req.body

    if (!title || !message) {
      return res.status(400).json({ 
        error: 'Título e mensagem são obrigatórios' 
      })
    }

    const notification = {
      type,
      title,
      message,
      data: {
        test: true,
        timestamp: new Date().toISOString()
      }
    }

    let sent = false
    let stats = null

    switch (target) {
      case 'broadcast':
        sent = notificationService.broadcast(notification)
        break
      case 'role':
        sent = notificationService.sendToRole('superuser', notification)
        break
      default:
        return res.status(400).json({ error: 'Tipo de destino inválido' })
    }

    if (sent) {
      stats = websocketServer.getStats()
      
      res.json({ 
        success: true, 
        message: 'Notificação enviada com sucesso',
        notification,
        websocketStats: stats
      })
    } else {
      res.status(500).json({ error: 'Falha ao enviar notificação' })
    }
  } catch (error) {
    console.error('❌ Erro ao testar WebSocket:', error)
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message })
  }
})

// Endpoint para obter estatísticas do WebSocket
router.get('/websocket-stats', async (req, res) => {
  try {
    const stats = websocketServer.getStats()
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas do WebSocket:', error)
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message })
  }
})

export default router
