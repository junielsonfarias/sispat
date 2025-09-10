/* Vite config for building the frontend react app: https://vite.dev/config/ */
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import path from 'path';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Determinar URLs baseado no ambiente
  const isProduction = mode === 'production';
  const baseUrl = isProduction ? process.env.VITE_BACKEND_URL || process.env.VITE_DOMAIN || 'https://CHANGE_ME_DOMAIN.com' : 'http://localhost:3001';
  const apiUrl = isProduction ? process.env.VITE_API_URL || `${process.env.VITE_DOMAIN || 'https://CHANGE_ME_DOMAIN.com'}/api` : 'http://localhost:3001/api';
  
  return {
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
      host: '0.0.0.0',
      port: parseInt(process.env.VITE_PORT || '8080'),
      proxy: {
        '/api': {
          target: isProduction ? baseUrl : 'http://localhost:3001',
          changeOrigin: true,
          secure: isProduction,
        },
      },
    },
    
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      cssCodeSplit: true,
      rollupOptions: {
        external: [],
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // CONFIGURAÇÃO DEFINITIVA - REACT SEMPRE NO VENDOR-MISC
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-misc';
              }
              // Radix UI Components
              if (id.includes('@radix-ui')) {
                return 'vendor-radix';
              }
              // TanStack Query
              if (id.includes('@tanstack')) {
                return 'vendor-tanstack';
              }
              // Form libraries
              if (id.includes('react-hook-form') || id.includes('@hookform')) {
                return 'vendor-forms';
              }
              // Date libraries
              if (id.includes('date-fns') || id.includes('dayjs')) {
                return 'vendor-dates';
              }
              // UI Libraries
              if (id.includes('lucide-react') || id.includes('clsx') || id.includes('class-variance-authority')) {
                return 'vendor-ui';
              }
              // Bibliotecas grandes
              if (id.includes('lodash') || id.includes('moment') || id.includes('axios')) {
                return 'vendor-utils';
              }
              // Bibliotecas de validação
              if (id.includes('zod') || id.includes('yup') || id.includes('joi')) {
                return 'vendor-validation';
              }
              // Resto das dependências (incluindo charts e React)
              return 'vendor-misc';
            }
            
            // Chunks para páginas grandes
            if (id.includes('/src/pages/')) {
              if (id.includes('/admin/')) {
                return 'pages-admin';
              }
              if (id.includes('/bens/')) {
                return 'pages-bens';
              }
              if (id.includes('/dashboards/')) {
                return 'pages-dashboards';
              }
              if (id.includes('/imoveis/')) {
                return 'pages-imoveis';
              }
              return 'pages-misc';
            }
            
            return null;
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `assets/[name]-[hash].js`;
          },
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          format: 'es',
        },
      },
      minify: mode === 'production' ? 'esbuild' : false,
      chunkSizeWarningLimit: 10000,
      target: 'es2015',
    },
    
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'react-router-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime'
      ],
      exclude: [
        '@vite/client', 
        '@vite/env', 
        'recharts',
        'd3-scale',
        'd3-array',
        'd3-time',
        'd3-time-format',
        'd3-shape',
        'd3-path',
        'd3-color',
        'd3-interpolate',
        'd3-ease',
        'd3-selection',
        'd3-transition',
        'd3-zoom',
        'd3-brush',
        'd3-drag',
        'd3-force',
        'd3-hierarchy',
        'd3-quadtree',
        'd3-timer',
        'd3-dispatch'
      ],
      force: true,
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
    
    define: {
      global: 'globalThis',
      'process.env.VITE_BACKEND_URL': JSON.stringify(baseUrl),
      'process.env.VITE_API_URL': JSON.stringify(apiUrl),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    
    esbuild: {
      target: 'es2015',
      jsx: 'automatic',
    },
  };
});