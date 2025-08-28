/**
 * Registro central de todas as rotas da API
 */

import activityLogRoutes from './activityLog.js'
import analyticsDashboardRoutes from './analytics-dashboard.js'
import asyncReportsRoutes from './async-reports.js'
import authRoutes from './auth.js'
import backupEnhancedRoutes from './backup-enhanced.js'
import cacheAdminRoutes from './cache-admin.js'
import databaseOptimizationRoutes from './database-optimization.js'
import debugRoutes from './debug.js'
import imovelRoutes from './imoveis.js'
import inventoryRoutes from './inventories.js'
import localRoutes from './locals.js'
import lockoutAdminRoutes from './lockout-admin.js'
import municipalityRoutes from './municipalities.js'
import notificationRoutes from './notifications.js'
import patrimonioRoutes from './patrimonios.js'
import queryOptimizerRoutes from './query-optimizer.js'
import rateLimitAdminRoutes from './rate-limit-admin.js'
import reportRoutes from './reports.js'
import sectorRoutes from './sectors.js'
import transferRoutes from './transfers.js'
import uploadRoutes from './uploads.js'
import userRoutes from './users.js'

/**
 * Registrar todas as rotas da API
 */
export function registerRoutes(app) {
  // Rotas de autenticação
  app.use('/api/auth', authRoutes)
  
  // Rotas principais
  app.use('/api/activity-log', activityLogRoutes)
  app.use('/api/patrimonios', patrimonioRoutes)
  app.use('/api/sectors', sectorRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/municipalities', municipalityRoutes)
  app.use('/api/imoveis', imovelRoutes)
  app.use('/api/locals', localRoutes)
  app.use('/api/inventories', inventoryRoutes)
  app.use('/api/transfers', transferRoutes)
  app.use('/api/reports', reportRoutes)
  app.use('/api/uploads', uploadRoutes)
  
  // Rotas administrativas
  app.use('/api/rate-limit-admin', rateLimitAdminRoutes)
  app.use('/api/lockout-admin', lockoutAdminRoutes)
  app.use('/api/cache-admin', cacheAdminRoutes)
  app.use('/api/database', databaseOptimizationRoutes)
  app.use('/api/backup-enhanced', backupEnhancedRoutes)
  app.use('/api/query-optimizer', queryOptimizerRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/async-reports', asyncReportsRoutes)
  app.use('/api/analytics', analyticsDashboardRoutes)
  
  // Rotas de debug (apenas em desenvolvimento)
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/debug', debugRoutes)
  }
}

export default registerRoutes
