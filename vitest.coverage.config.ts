import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'tests/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/vite.config.*',
        'server/**', // Backend code
        'setup.js',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*',
        // Specific files to exclude from coverage
        'src/lib/utils.ts', // Simple utility functions
        'src/config/**', // Configuration files
        'src/types/**', // Type definitions
        'playwright.config.ts',
        'lighthouserc.json',
        '.github/**',
      ],
      include: [
        'src/**/*.{js,jsx,ts,tsx}',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
        // Specific thresholds for different areas
        'src/components/ui/**': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/hooks/**': {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
        'src/lib/**': {
          branches: 65,
          functions: 65,
          lines: 65,
          statements: 65,
        },
        'src/contexts/**': {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
