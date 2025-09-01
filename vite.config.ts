/* Vite config for building the frontend react app: https://vite.dev/config/ */
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
            console.log('Headers being sent:', proxyReq.getHeaders());
            
            // Ensure Authorization header is preserved
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
          });
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            if (id.includes('@tanstack')) {
              return 'vendor-tanstack';
            }
            return 'vendor';
          }
          // Utils chunks
          if (id.includes('@/lib/utils') || id.includes('@/lib/validations')) {
            return 'utils';
          }
        },
      },
    },
    // Otimizações para produção - usar esbuild como padrão
    minify: mode === 'production' ? 'esbuild' : false,
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  // Otimizações de performance
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@/lib/utils'],
  },
  // Configurações de CSS
  css: {
    devSourcemap: mode === 'development',
    postcss: {
      plugins: [
        // Adicionar plugins PostCSS se necessário
      ],
    },
  },
  // Configurações de preview
  preview: {
    port: 4173,
    host: true,
  },
  // Configurações de teste
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
  // Configurações de PWA (se implementado)
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    // Resolver erro "process is not defined" no React
    'process.env': {},
    // Definir variáveis de ambiente para o frontend
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3001/api'),
    'process.env.VITE_APP_NAME': JSON.stringify(process.env.VITE_APP_NAME || 'SISPAT'),
    'process.env.VITE_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION || '1.0.0'),
  },
  // Configurações de assets
  assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.fbx', '**/*.obj'],
  // Configurações de worker
  worker: {
    format: 'es',
  },
  // Configurações de esbuild
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    // Resolver problemas de process.env
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
  },
  // Configurações de server para produção
  ...(mode === 'production' && {
    server: {
      host: '0.0.0.0',
      port: 8080,
    },
    // Configurações específicas para produção
    build: {
      // Garantir que o build seja otimizado para produção
      minify: 'esbuild',
      // Adicionar source maps para debugging em produção
      sourcemap: false,
      // Otimizar chunks
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('@radix-ui')) {
                return 'vendor-radix';
              }
              if (id.includes('@tanstack')) {
                return 'vendor-tanstack';
              }
              return 'vendor';
            }
            // Utils chunks
            if (id.includes('@/lib/utils') || id.includes('@/lib/validations')) {
              return 'utils';
            }
          },
        },
      },
    },
  }),
}))
