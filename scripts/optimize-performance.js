#!/usr/bin/env node

/**
 * Script de Otimização de Performance para SISPAT
 * Este script otimiza a aplicação para melhor performance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: msg => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: msg => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: msg => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: msg => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  header: msg =>
    console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
};

class PerformanceOptimizer {
  constructor() {
    this.optimizations = [];
    this.errors = [];
  }

  // Ler arquivo
  readFile(filePath) {
    try {
      return fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
    } catch (error) {
      return null;
    }
  }

  // Escrever arquivo
  writeFile(filePath, content) {
    try {
      fs.writeFileSync(path.join(projectRoot, filePath), content, 'utf8');
      return true;
    } catch (error) {
      this.errors.push(
        `Erro ao escrever arquivo ${filePath}: ${error.message}`
      );
      return false;
    }
  }

  // Otimizar configuração do Vite
  optimizeViteConfig() {
    log.header('⚡ Otimizando configuração do Vite');

    const viteConfigPath = 'vite.config.ts';
    const viteConfig = this.readFile(viteConfigPath);

    if (!viteConfig) {
      this.errors.push('vite.config.ts não encontrado');
      return;
    }

    // Verificar se já tem otimizações
    if (viteConfig.includes('reportCompressedSize: false')) {
      log.info('Configuração do Vite já otimizada');
      return;
    }

    // Adicionar otimizações de performance
    const optimizedConfig = viteConfig.replace(
      /build: \{[\s\S]*?\}/,
      `build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      cssCodeSplit: true,
      rollupOptions: {
        external: [],
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // React e dependências principais
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react';
              }
              // Radix UI Components
              if (id.includes('@radix-ui')) {
                return 'vendor-radix';
              }
              // Chart libraries
              if (id.includes('recharts') || id.includes('chart')) {
                return 'vendor-charts';
              }
              // Utility libraries
              if (id.includes('axios') || id.includes('zod') || id.includes('date-fns') || id.includes('lodash')) {
                return 'vendor-utils';
              }
              // PDF and document libraries
              if (id.includes('jspdf') || id.includes('xlsx') || id.includes('qrcode')) {
                return 'vendor-documents';
              }
              // Resto das dependências
              return 'vendor-misc';
            }
            return null;
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      minify: mode === 'production' ? 'esbuild' : false,
      chunkSizeWarningLimit: 1000,
      target: 'es2015',
      reportCompressedSize: false,
      emptyOutDir: true,
    }`
    );

    if (this.writeFile(viteConfigPath, optimizedConfig)) {
      this.optimizations.push(
        'Configuração do Vite otimizada para melhor performance'
      );
    }
  }

  // Otimizar configuração do TypeScript
  optimizeTypeScriptConfig() {
    log.header('🔧 Otimizando configuração do TypeScript');

    const tsConfigPath = 'tsconfig.json';
    const tsConfig = this.readFile(tsConfigPath);

    if (!tsConfig) {
      this.errors.push('tsconfig.json não encontrado');
      return;
    }

    try {
      const tsConfigObj = JSON.parse(tsConfig);

      // Adicionar otimizações de compilação
      if (!tsConfigObj.compilerOptions) {
        tsConfigObj.compilerOptions = {};
      }

      const optimizations = {
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        incremental: true,
        tsBuildInfoFile: '.tsbuildinfo',
        isolatedModules: true,
        verbatimModuleSyntax: true,
      };

      let hasChanges = false;
      Object.entries(optimizations).forEach(([key, value]) => {
        if (tsConfigObj.compilerOptions[key] !== value) {
          tsConfigObj.compilerOptions[key] = value;
          hasChanges = true;
        }
      });

      if (hasChanges) {
        const optimizedConfig = JSON.stringify(tsConfigObj, null, 2);
        if (this.writeFile(tsConfigPath, optimizedConfig)) {
          this.optimizations.push('Configuração do TypeScript otimizada');
        }
      } else {
        log.info('Configuração do TypeScript já otimizada');
      }
    } catch (error) {
      this.errors.push(`Erro ao otimizar tsconfig.json: ${error.message}`);
    }
  }

  // Criar arquivo de configuração de cache
  createCacheConfig() {
    log.header('💾 Criando configuração de cache');

    const cacheConfig = `/**
 * Configuração de Cache para SISPAT
 */

export const cacheConfig = {
  // Cache de consultas do banco de dados
  database: {
    enabled: true,
    ttl: 300, // 5 minutos
    maxSize: 1000,
    keyPrefix: 'db:',
  },

  // Cache de sessões
  session: {
    enabled: true,
    ttl: 8 * 60 * 60, // 8 horas
    maxSize: 10000,
    keyPrefix: 'session:',
  },

  // Cache de arquivos estáticos
  static: {
    enabled: true,
    ttl: 24 * 60 * 60, // 24 horas
    maxSize: 100,
    keyPrefix: 'static:',
  },

  // Cache de relatórios
  reports: {
    enabled: true,
    ttl: 60 * 60, // 1 hora
    maxSize: 100,
    keyPrefix: 'report:',
  },

  // Configurações do Redis (se disponível)
  redis: {
    enabled: process.env.REDIS_HOST ? true : false,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },
};

export default cacheConfig;
`;

    if (this.writeFile('src/config/cache.config.ts', cacheConfig)) {
      this.optimizations.push('Configuração de cache criada');
    }
  }

  // Criar arquivo de otimização de imagens
  createImageOptimization() {
    log.header('🖼️ Criando configuração de otimização de imagens');

    const imageOptimization = `/**
 * Configuração de Otimização de Imagens para SISPAT
 */

export const imageOptimization = {
  // Configurações de compressão
  compression: {
    quality: 85,
    progressive: true,
    mozjpeg: true,
  },

  // Formatos suportados
  formats: {
    input: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
    output: ['jpeg', 'png', 'webp'],
  },

  // Tamanhos de thumbnail
  thumbnails: {
    small: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 600, height: 600 },
  },

  // Configurações de cache
  cache: {
    enabled: true,
    ttl: 7 * 24 * 60 * 60, // 7 dias
    maxSize: 1000,
  },

  // Configurações de lazy loading
  lazyLoading: {
    enabled: true,
    placeholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4=',
    threshold: 0.1,
  },
};

export default imageOptimization;
`;

    if (
      this.writeFile(
        'src/config/image-optimization.config.ts',
        imageOptimization
      )
    ) {
      this.optimizations.push('Configuração de otimização de imagens criada');
    }
  }

  // Criar arquivo de configuração de performance
  createPerformanceConfig() {
    log.header('⚡ Criando configuração de performance');

    const performanceConfig = `/**
 * Configuração de Performance para SISPAT
 */

export const performanceConfig = {
  // Configurações de debounce e throttle
  timing: {
    debounce: 300,
    throttle: 100,
    searchDelay: 500,
  },

  // Configurações de paginação
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
    pageSizeOptions: [10, 20, 50, 100],
  },

  // Configurações de virtualização
  virtualization: {
    enabled: true,
    itemHeight: 50,
    overscan: 5,
  },

  // Configurações de lazy loading
  lazyLoading: {
    enabled: true,
    threshold: 0.1,
    rootMargin: '50px',
  },

  // Configurações de preload
  preload: {
    enabled: true,
    criticalRoutes: ['/dashboard', '/bens-cadastrados', '/imoveis'],
    preloadDelay: 1000,
  },

  // Configurações de service worker
  serviceWorker: {
    enabled: process.env.NODE_ENV === 'production',
    cacheStrategy: 'staleWhileRevalidate',
    cacheName: 'sispat-cache-v1',
  },

  // Configurações de bundle splitting
  bundleSplitting: {
    enabled: true,
    vendorChunks: ['react', 'radix', 'utils', 'charts', 'documents'],
    routeChunks: true,
  },

  // Configurações de compressão
  compression: {
    enabled: true,
    level: 6,
    threshold: 1024,
  },
};

export default performanceConfig;
`;

    if (this.writeFile('src/config/performance.config.ts', performanceConfig)) {
      this.optimizations.push('Configuração de performance criada');
    }
  }

  // Executar todas as otimizações
  async run() {
    log.header('🚀 Iniciando otimização de performance do SISPAT');

    this.optimizeViteConfig();
    this.optimizeTypeScriptConfig();
    this.createCacheConfig();
    this.createImageOptimization();
    this.createPerformanceConfig();

    // Relatório final
    log.header('📊 Relatório de Otimização');

    if (this.optimizations.length > 0) {
      log.success('Otimizações aplicadas:');
      this.optimizations.forEach(optimization =>
        log.info(`  • ${optimization}`)
      );
    }

    if (this.errors.length > 0) {
      log.error('Erros encontrados:');
      this.errors.forEach(error => log.info(`  • ${error}`));
    }

    if (this.errors.length === 0) {
      log.success('✅ Otimização de performance concluída com sucesso!');
      log.info('\n💡 Próximos passos:');
      log.info('  1. Execute: npm run build');
      log.info('  2. Teste a aplicação em modo de produção');
      log.info('  3. Monitore a performance com as ferramentas do navegador');
    } else {
      log.error('❌ Otimização falhou! Corrija os erros antes de continuar.');
      process.exit(1);
    }
  }
}

// Executar otimização
const optimizer = new PerformanceOptimizer();
optimizer.run().catch(error => {
  log.error(`Erro durante a otimização: ${error.message}`);
  process.exit(1);
});
