/* Vite config for building the frontend react app: https://vite.dev/config/ */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['@/lib/utils', '@/lib/validations'],
        },
      },
    },
    // Otimizações para produção
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    } : undefined,
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
  },
  // Configurações de server para produção
  ...(mode === 'production' && {
    server: {
      host: '0.0.0.0',
      port: 8080,
    },
  }),
}))
