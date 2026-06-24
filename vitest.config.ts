import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // O vitest cobre APENAS os testes do frontend (src/). O backend tem sua
    // própria suíte Jest (backend/) — rodá-la aqui carrega módulos que chamam
    // process.exit() na validação de env e derruba os workers do vitest. e2e é
    // Playwright (pnpm test:e2e), não vitest.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'backend/**',
      'shared/**',
      'e2e/**',
      'tests/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
      ],
      lines: 50,
      functions: 50,
      branches: 50,
      statements: 50,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

