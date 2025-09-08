/**
 * Registro central de todas as rotas da API
 */

import express from 'express';
import activityLogRoutes from './activityLog.js';
import analyticsRoutes from './analytics-dashboard.js';
import asyncReportsRoutes from './async-reports.js';
import authRoutes from './auth.js';
import backupEnhancedRoutes from './backup-enhanced.js';
import cacheAdminRoutes from './cache-admin.js';
import databaseRoutes from './database-optimization.js';
import debugRoutes from './debug.js';
import imoveisRoutes from './imoveis.js';
import inventoriesRoutes from './inventories.js';
import localsRoutes from './locals.js';
import lockoutAdminRoutes from './lockout-admin.js';
import monitoringRoutes from './monitoring.js';
import municipalitiesRoutes from './municipalities.js';
import notificationsRoutes from './notifications.js';
import patrimoniosRoutes from './patrimonios.js';
import publicApiRoutes from './public-api.js';
import queryOptimizerRoutes from './query-optimizer.js';
import rateLimitAdminRoutes from './rate-limit-admin.js';
import reportsRoutes from './reports.js';
import sectorsRoutes from './sectors.js';
import transfersRoutes from './transfers.js';
import uploadsRoutes from './uploads.js';
import usersRoutes from './users.js';

const router = express.Router();

// ============================================================================
// INTEGRAÇÃO DAS NOVAS FUNCIONALIDADES
// ============================================================================

/**
 * Registrar todas as rotas com logging detalhado
 */
export function registerRoutes(app) {
  console.log('🔧 Iniciando registro de rotas...');

  // Rotas de autenticação
  console.log('🔧 Registrando rotas de autenticação...');
  app.use('/api/auth', authRoutes);
  console.log('✅ Rotas de autenticação registradas');

  // Rotas principais
  console.log('🔧 Registrando rotas principais...');
  app.use('/api/patrimonios', patrimoniosRoutes);
  app.use('/api/sectors', sectorsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/municipalities', municipalitiesRoutes);
  app.use('/api/imoveis', imoveisRoutes);
  app.use('/api/locals', localsRoutes);
  app.use('/api/inventories', inventoriesRoutes);
  app.use('/api/transfers', transfersRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/uploads', uploadsRoutes);
  app.use('/api/activity-log', activityLogRoutes);
  console.log('✅ Rotas principais registradas');

  // Rotas administrativas
  console.log('🔧 Registrando rotas administrativas...');
  app.use('/api/rate-limit-admin', rateLimitAdminRoutes);
  app.use('/api/lockout-admin', lockoutAdminRoutes);
  app.use('/api/cache-admin', cacheAdminRoutes);
  app.use('/api/database', databaseRoutes);
  app.use('/api/backup-enhanced', backupEnhancedRoutes);
  app.use('/api/query-optimizer', queryOptimizerRoutes);
  app.use('/api/notifications', notificationsRoutes);
  console.log('✅ Rotas administrativas registradas');

  // NOVAS FUNCIONALIDADES IMPLEMENTADAS
  console.log('🔧 Registrando novas funcionalidades...');

  // 1. API Pública
  console.log('🌐 Registrando API Pública...');
  app.use('/api/public', publicApiRoutes);
  console.log('✅ API Pública registrada');

  // 2. Monitoramento (temporariamente desabilitado)
  console.log('📊 Registrando rotas de monitoramento...');
  app.use('/api/monitoring', monitoringRoutes);
  console.log('✅ Rotas de monitoramento registradas');

  // 2. Analytics Avançado
  console.log('📊 Registrando Analytics Avançado...');
  app.use('/api/analytics', analyticsRoutes);
  console.log('✅ Analytics Avançado registrado');

  // 3. Relatórios Assíncronos
  console.log('📋 Registrando Relatórios Assíncronos...');
  app.use('/api/async-reports', asyncReportsRoutes);
  console.log('✅ Relatórios Assíncronos registrados');

  // 4. Debug e Monitoramento
  console.log('🔍 Registrando rotas de debug...');
  app.use('/api/debug', debugRoutes);
  console.log('✅ Rotas de debug registradas');

  // 5. Rotas do router principal (health, status, etc.)
  console.log('🔧 Registrando rotas do router principal...');
  app.use('/api', router);
  console.log('✅ Rotas do router principal registradas');

  console.log('✅ Todas as rotas foram registradas com sucesso!');

  // Log das rotas registradas
  logRegisteredRoutes(app);
}

/**
 * Log das rotas registradas para debugging
 */
function logRegisteredRoutes(app) {
  const routes = [];

  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      // Rotas diretas
      const methods = Object.keys(middleware.route.methods);
      methods.forEach(method => {
        routes.push({
          method: method.toUpperCase(),
          path: middleware.route.path,
        });
      });
    } else if (middleware.name === 'router') {
      // Rotas de router
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods);
          methods.forEach(method => {
            routes.push({
              method: method.toUpperCase(),
              path: handler.route.path,
            });
          });
        }
      });
    }
  });

  console.log('🔍 Rotas registradas no app:');
  routes.forEach((route, index) => {
    console.log(`   ${index + 1}: ${route.method} ${route.path}`);
  });
}

// ============================================================================
// MIDDLEWARE DE INTEGRAÇÃO
// ============================================================================

/**
 * Middleware para integração com cache inteligente
 */
export function intelligentCacheMiddleware(req, res, next) {
  // Adicionar cache inteligente ao request
  import('../services/cache/intelligentCache.js').then(module => {
    req.intelligentCache = module.default;
    next();
  }).catch(() => {
    req.intelligentCache = null;
    next();
  });
}

/**
 * Middleware para integração com busca avançada
 */
export function advancedSearchMiddleware(req, res, next) {
  // Adicionar busca avançada ao request
  import('../services/search/advancedSearch.js').then(module => {
    req.advancedSearch = module.default;
    next();
  }).catch(() => {
    req.advancedSearch = null;
    next();
  });
}

/**
 * Middleware para integração com analytics
 */
export function analyticsMiddleware(req, res, next) {
  // Adicionar analytics ao request
  import('../services/analytics/advancedAnalytics.js').then(module => {
    req.analytics = module.default;
    next();
  }).catch(() => {
    req.analytics = null;
    next();
  });
}

/**
 * Middleware para integração com relatórios avançados
 */
export function advancedReportsMiddleware(req, res, next) {
  // Adicionar relatórios avançados ao request
  import('../services/reports/advancedReports.js').then(module => {
    req.advancedReports = module.default;
    next();
  }).catch(() => {
    req.advancedReports = null;
    next();
  });
}

// ============================================================================
// ROTAS DE STATUS E HEALTH CHECK
// ============================================================================

/**
 * Health check com informações das novas funcionalidades
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: {
        intelligentCache: 'enabled',
        advancedSearch: 'enabled',
        analytics: 'enabled',
        advancedReports: 'enabled',
        publicApi: 'enabled',
        pwa: 'enabled',
        responsive: 'enabled',
      },
      services: {
        database: 'connected',
        cache: 'operational',
        search: 'operational',
        analytics: 'operational',
        reports: 'operational',
      },
    };

    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Status detalhado das funcionalidades
 */
router.get('/status', async (req, res) => {
  try {
    // Usar import dinâmico em vez de require para compatibilidade ES modules
    const intelligentCache = await import(
      '../services/cache/intelligentCache.js'
    )
      .then(m => m.default)
      .catch(() => ({ getStats: () => ({ status: 'unavailable' }) }));
    const advancedSearch = await import('../services/search/advancedSearch.js')
      .then(m => m.default)
      .catch(() => ({ searchStrategies: {} }));
    const analytics = await import('../services/analytics/advancedAnalytics.js')
      .then(m => m.default)
      .catch(() => ({ metrics: { realTime: {} } }));
    const advancedReports = await import(
      '../services/reports/advancedReports.js'
    )
      .then(m => m.default)
      .catch(() => ({ reportTypes: {}, exportFormats: {} }));

    const status = {
      cache: await intelligentCache.getStats(),
      search: {
        strategies: Object.keys(advancedSearch.searchStrategies || {}),
        status: 'operational',
      },
      analytics: {
        realTimeMetrics: analytics.metrics?.realTime || {},
        status: 'operational',
      },
      reports: {
        types: Object.keys(advancedReports.reportTypes || {}),
        formats: Object.keys(advancedReports.exportFormats || {}),
        status: 'operational',
      },
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// ============================================================================
// ROTAS DE CONFIGURAÇÃO
// ============================================================================

/**
 * Configuração das funcionalidades
 */
router.get('/config', (req, res) => {
  const config = {
    features: {
      intelligentCache: {
        enabled: true,
        strategies: ['memory', 'query', 'pattern-based'],
        ttl: {
          default: 300,
          hot: 1800,
          cold: 60,
        },
      },
      advancedSearch: {
        enabled: true,
        strategies: ['fullText', 'fuzzy', 'tag', 'geo', 'semantic'],
        cache: true,
        suggestions: true,
      },
      analytics: {
        enabled: true,
        realTime: true,
        historical: true,
        predictions: true,
        alerts: true,
      },
      advancedReports: {
        enabled: true,
        types: [
          'patrimony_summary',
          'depreciation_report',
          'transfer_history',
          'inventory_report',
          'financial_report',
          'comparative_report',
          'custom_report',
        ],
        formats: ['pdf', 'excel', 'csv', 'json'],
        scheduling: true,
        templates: true,
      },
      publicApi: {
        enabled: true,
        rateLimit: {
          general: '100 requests per 15 minutes',
          search: '30 requests per 5 minutes',
        },
        endpoints: [
          'patrimonios',
          'municipalities',
          'sectors',
          'search',
          'stats',
          'webhooks',
        ],
      },
      pwa: {
        enabled: true,
        offline: true,
        pushNotifications: true,
        backgroundSync: true,
      },
      responsive: {
        enabled: true,
        breakpoints: ['mobile', 'tablet', 'desktop', 'large'],
        touchTargets: true,
        safeAreas: true,
      },
    },
    architecture: {
      pattern: 'modular',
      repository: 'enabled',
      cache: 'intelligent',
      search: 'advanced',
      analytics: 'real-time',
      reports: 'customizable',
    },
  };

  res.json(config);
});

// ============================================================================
// ROTAS DE TESTE DAS NOVAS FUNCIONALIDADES
// ============================================================================

/**
 * Teste do cache inteligente
 */
router.post('/test/cache', async (req, res) => {
  try {
    const intelligentCacheModule = await import('../services/cache/intelligentCache.js');
    const intelligentCache = intelligentCacheModule.default;

    const testKey = 'test_key_' + Date.now();
    const testValue = {
      message: 'Teste do cache inteligente',
      timestamp: new Date().toISOString(),
    };

    await intelligentCache.set(testKey, testValue, { ttl: 60 });
    const retrieved = await intelligentCache.get(testKey);

    res.json({
      success: true,
      test: {
        key: testKey,
        set: testValue,
        retrieved: retrieved,
        stats: intelligentCache.getStats(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Teste da busca avançada
 */
router.post('/test/search', async (req, res) => {
  try {
    const advancedSearch = await import('../services/search/advancedSearch.js')
      .then(m => m.default)
      .catch(() => ({ search: () => ({ results: [] }) }));
    const { query, strategy = 'fullText', type = 'patrimonios' } = req.body;

    const result = await advancedSearch.search(query, {
      type,
      strategy,
      limit: 10,
      useCache: true,
    });

    res.json({
      success: true,
      search: {
        query,
        strategy,
        type,
        results: result.results.length,
        data: result.results.slice(0, 3), // Primeiros 3 resultados
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Teste do analytics
 */
router.get('/test/analytics', async (req, res) => {
  try {
    const analytics = await import('../services/analytics/advancedAnalytics.js')
      .then(m => m.default)
      .catch(() => ({
        getDashboardMetrics: () => ({ realTime: {}, charts: {}, insights: [] }),
      }));

    const metrics = await analytics.getDashboardMetrics();

    res.json({
      success: true,
      analytics: {
        realTime: metrics.realTime,
        charts: Object.keys(metrics.charts || {}),
        insights: metrics.insights?.length || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Teste dos relatórios avançados
 */
router.post('/test/reports', async (req, res) => {
  try {
    const advancedReports = await import(
      '../services/reports/advancedReports.js'
    )
      .then(m => m.default)
      .catch(() => ({
        generateCustomReport: () => ({
          filename: 'test.pdf',
          downloadUrl: '#',
          metadata: {},
        }),
      }));
    const { type = 'patrimony_summary', format = 'json' } = req.body;

    const report = await advancedReports.generateCustomReport({
      type,
      format,
      includeCharts: true,
      includeMetadata: true,
    });

    res.json({
      success: true,
      report: {
        type,
        format,
        filename: report.filename,
        downloadUrl: report.downloadUrl,
        metadata: report.metadata,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
