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
  const baseUrl = isProduction 
    ? process.env.VITE_BACKEND_URL || process.env.VITE_DOMAIN || 'https://yourdomain.com' 
    : 'http://localhost:3001';
  const apiUrl = isProduction 
    ? process.env.VITE_API_URL || `${process.env.VITE_DOMAIN || 'https://yourdomain.com'}/api` 
    : 'http://localhost:3001/api';
  
  return {
    // Configuração base para resolver problemas de roteamento
    base: '/',
    
    plugins: [react()],
    
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
    },
    
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'react-router-dom'
      ],
      exclude: [
        '@vite/client', 
        '@vite/env',
        'speakeasy' // Excluir módulo Node que não deve estar no frontend
      ],
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