/**
 * Serviço de aquecimento de cache
 */

import { getRows } from '../database/connection.js'
import { logError, logInfo, logPerformance } from '../utils/logger.js'
import { cache, cacheManager } from './cache-manager.js'

/**
 * Aquecer cache com dados essenciais
 */
export async function warmUpCache(municipalityId = null) {
  const startTime = Date.now()
  let itemsWarmed = 0
  
  try {
    logInfo('Iniciando aquecimento de cache', { municipalityId })
    
    // 1. Aquecer cache de municípios
    await warmUpMunicipalities()
    itemsWarmed++
    
    if (municipalityId) {
      // 2. Aquecer cache de setores
      await warmUpSectors(municipalityId)
      itemsWarmed++
      
      // 3. Aquecer cache de usuários
      await warmUpUsers(municipalityId)
      itemsWarmed++
      
      // 4. Aquecer cache de patrimônios (limitado)
      await warmUpPatrimonios(municipalityId)
      itemsWarmed++
      
      // 5. Aquecer cache de imóveis (limitado)
      await warmUpImoveis(municipalityId)
      itemsWarmed++
      
      // 6. Aquecer cache de configurações
      await warmUpSettings(municipalityId)
      itemsWarmed++
    } else {
      // Aquecer para todos os municípios (limitado)
      const municipalities = await getMunicipalities()
      for (const municipality of municipalities.slice(0, 5)) { // Limitar a 5
        await warmUpSectors(municipality.id)
        await warmUpUsers(municipality.id)
        itemsWarmed += 2
      }
    }
    
    const duration = Date.now() - startTime
    logPerformance('Cache aquecimento concluído', duration, { 
      itemsWarmed,
      municipalityId 
    })
    
    return { itemsWarmed, duration }
    
  } catch (error) {
    logError('Erro durante aquecimento de cache', error)
    throw error
  }
}

/**
 * Aquecer cache de municípios
 */
async function warmUpMunicipalities() {
  try {
    const municipalities = await getMunicipalities()
    const key = cacheManager.generateKey('municipalities', 'all')
    await cacheManager.set(key, municipalities, 'municipalities')
    
    logInfo('Cache aquecido: municipalities', { count: municipalities.length })
  } catch (error) {
    logError('Erro ao aquecer cache de municipalities', error)
  }
}

/**
 * Aquecer cache de setores
 */
async function warmUpSectors(municipalityId) {
  try {
    const sectors = await getSectorsByMunicipality(municipalityId)
    await cache.setSectors(sectors, municipalityId)
    
    logInfo('Cache aquecido: sectors', { municipalityId, count: sectors.length })
  } catch (error) {
    logError('Erro ao aquecer cache de sectors', error)
  }
}

/**
 * Aquecer cache de usuários
 */
async function warmUpUsers(municipalityId) {
  try {
    const users = await getUsersByMunicipality(municipalityId)
    const key = cacheManager.generateKey('users', 'all', null, municipalityId)
    await cacheManager.set(key, users, 'users')
    
    logInfo('Cache aquecido: users', { municipalityId, count: users.length })
  } catch (error) {
    logError('Erro ao aquecer cache de users', error)
  }
}

/**
 * Aquecer cache de patrimônios (limitado aos mais recentes)
 */
async function warmUpPatrimonios(municipalityId) {
  try {
    const patrimonios = await getRecentPatrimonios(municipalityId, 100) // Limitar a 100
    await cache.setPatrimonios(patrimonios, municipalityId, { recent: true })
    
    logInfo('Cache aquecido: patrimonios (recent)', { municipalityId, count: patrimonios.length })
  } catch (error) {
    logError('Erro ao aquecer cache de patrimonios', error)
  }
}

/**
 * Aquecer cache de imóveis (limitado aos mais recentes)
 */
async function warmUpImoveis(municipalityId) {
  try {
    const imoveis = await getRecentImoveis(municipalityId, 50) // Limitar a 50
    const key = cacheManager.generateKey('imoveis', 'recent', null, municipalityId)
    await cacheManager.set(key, imoveis, 'imoveis')
    
    logInfo('Cache aquecido: imoveis (recent)', { municipalityId, count: imoveis.length })
  } catch (error) {
    logError('Erro ao aquecer cache de imoveis', error)
  }
}

/**
 * Aquecer cache de configurações
 */
async function warmUpSettings(municipalityId) {
  try {
    const settings = await getSettings(municipalityId)
    const key = cacheManager.generateKey('settings', 'all', null, municipalityId)
    await cacheManager.set(key, settings, 'settings')
    
    logInfo('Cache aquecido: settings', { municipalityId })
  } catch (error) {
    logError('Erro ao aquecer cache de settings', error)
  }
}

/**
 * Funções de consulta ao banco de dados
 */

async function getMunicipalities() {
  return await getRows(`
    SELECT id, name, created_at, updated_at
    FROM municipalities
    ORDER BY name
  `)
}

async function getSectorsByMunicipality(municipalityId) {
  return await getRows(`
    SELECT 
      s.*,
      p.name as parent_name
    FROM sectors s
    LEFT JOIN sectors p ON s.parent_id = p.id
    WHERE s.municipality_id = $1
    ORDER BY s.name
  `, [municipalityId])
}

async function getUsersByMunicipality(municipalityId) {
  return await getRows(`
    SELECT 
      u.id, u.name, u.email, u.role, 
      u.municipality_id, u.created_at, u.updated_at,
      m.name as municipality_name
    FROM users u
    LEFT JOIN municipalities m ON u.municipality_id = m.id
    WHERE u.municipality_id = $1
    ORDER BY u.name
  `, [municipalityId])
}

async function getRecentPatrimonios(municipalityId, limit = 100) {
  return await getRows(`
    SELECT 
      p.*,
      s.name as setor_name,
      l.name as local_name
    FROM patrimonios p
    LEFT JOIN sectors s ON p.setor_responsavel = s.name 
      AND s.municipality_id = p.municipality_id
    LEFT JOIN locals l ON p.local_objeto = l.name 
      AND l.municipality_id = p.municipality_id
    WHERE p.municipality_id = $1
    ORDER BY p.created_at DESC
    LIMIT $2
  `, [municipalityId, limit])
}

async function getRecentImoveis(municipalityId, limit = 50) {
  return await getRows(`
    SELECT *
    FROM imoveis
    WHERE municipality_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [municipalityId, limit])
}

async function getSettings(municipalityId) {
  // Simular configurações - adaptar conforme sua estrutura
  return {
    municipalityId,
    theme: 'default',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    features: {
      patrimonios: true,
      imoveis: true,
      reports: true,
      analytics: true
    },
    limits: {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxUsers: 100,
      maxPatrimonios: 10000
    },
    cachedAt: new Date().toISOString()
  }
}

/**
 * Aquecer cache baseado em padrões de uso
 */
export async function warmUpByUsagePatterns(municipalityId) {
  try {
    // Esta função pode ser expandida para analisar logs de acesso
    // e pré-carregar os dados mais acessados
    
    logInfo('Aquecimento baseado em padrões de uso', { municipalityId })
    
    // Por enquanto, usar o aquecimento padrão
    return await warmUpCache(municipalityId)
    
  } catch (error) {
    logError('Erro no aquecimento baseado em padrões', error)
    throw error
  }
}

/**
 * Aquecer cache em horários de baixo uso
 */
export function scheduleWarmUp() {
  // Aquecer cache todos os dias às 6:00 AM
  const schedule = '0 6 * * *' // Cron: 6:00 AM todos os dias
  
  // Esta função pode ser integrada com node-cron se necessário
  logInfo('Agendamento de aquecimento de cache configurado', { schedule })
}

export default {
  warmUpCache,
  warmUpByUsagePatterns,
  scheduleWarmUp
}
