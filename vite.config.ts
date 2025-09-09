/* Vite config for building the frontend react app: https://vite.dev/config/ */
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import path from 'path';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Configuração base para resolver problemas de roteamento
  base: '/',
  
  plugins: [react({
    jsxRuntime: 'automatic',
    babel: {
      plugins: []
    }
  })],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  server: {
    host: '0.0.0.0', // Permite acesso externo
    port: parseInt(process.env.VITE_PORT || '8080'),
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // React e React DOM - chunk separado
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            // React Router - chunk separado
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Radix UI Components - chunk separado
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            // TanStack Query - chunk separado
            if (id.includes('@tanstack')) {
              return 'vendor-tanstack';
            }
            // Charts (Recharts) - chunk separado com configuração mais específica
            if (id.includes('recharts') || id.includes('d3-') || id.includes('d3')) {
              return 'vendor-charts';
            }
            // Form libraries - chunk separado
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'vendor-forms';
            }
            // Date libraries - chunk separado
            if (id.includes('date-fns') || id.includes('dayjs')) {
              return 'vendor-dates';
            }
            // UI Libraries - chunk separado
            if (id.includes('lucide-react') || id.includes('clsx') || id.includes('class-variance-authority')) {
              return 'vendor-ui';
            }
            // Bibliotecas grandes separadas
            if (id.includes('lodash') || id.includes('moment') || id.includes('axios')) {
              return 'vendor-utils';
            }
            // Bibliotecas de validação
            if (id.includes('zod') || id.includes('yup') || id.includes('joi')) {
              return 'vendor-validation';
            }
            // Resto das dependências menores
            return 'vendor-misc';
          }
          
          // Chunks para páginas grandes
          if (id.includes('/src/pages/')) {
            if (id.includes('/bens/')) {
              return 'pages-bens';
            }
            if (id.includes('/dashboards/')) {
              return 'pages-dashboards';
            }
            if (id.includes('/admin/')) {
              return 'pages-admin';
            }
            if (id.includes('/imoveis/')) {
              return 'pages-imoveis';
            }
            if (id.includes('/relatorios/')) {
              return 'pages-relatorios';
            }
          }
        },
        // Configurações adicionais para evitar erros de inicialização
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/[name]-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    minify: mode === 'production' ? 'esbuild' : false,
    chunkSizeWarningLimit: 1000, // Aumentar limite para evitar warnings desnecessários
    target: 'es2015', // Definir target específico para melhor compatibilidade
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  
  css: {
    devSourcemap: mode === 'development',
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  
  preview: {
    port: 4173,
    host: true,
  },
  
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
  
  // Configuração para resolver process is not defined
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || '1.0.0'),
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3001/api'),
    'process.env.VITE_APP_NAME': JSON.stringify(process.env.VITE_APP_NAME || 'SISPAT'),
    'process.env.VITE_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION || '1.0.0'),
    // Definir process globalmente para o navegador
    'process': JSON.stringify({
      env: {
        NODE_ENV: mode,
        VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:3001/api',
        VITE_APP_NAME: process.env.VITE_APP_NAME || 'SISPAT',
        VITE_APP_VERSION: process.env.VITE_APP_VERSION || '1.0.0',
      }
    }),
    // Fallback para process global
    'global': 'globalThis',
  },
  
  // Configurações de assets
  assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.fbx', '**/*.obj'],
  
  // Configurações de worker
  worker: {
    format: 'es',
  },
}))
