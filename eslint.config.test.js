/* ESLint config for tests: https://eslint.org/docs/latest/use/configure/ */
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  { ignores: ['dist', '**/*.d.ts', 'coverage/**/*', 'node_modules/**/*'] },

  // Configuração base para todos os arquivos
  js.configs.recommended,

  // Configuração específica para arquivos de teste
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.jest,
        ...globals.node,
        ...globals.browser,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
      },
      parser: tsparser,
      parserOptions: {
        project: ['./tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'no-undef': 'off', // Desabilitar no-undef para TypeScript
      'no-console': 'off', // Permitir console em testes
      'no-debugger': 'off', // Permitir debugger em testes
      'no-alert': 'off', // Permitir alert em testes
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'off', // Permitir script URLs em testes
      'no-var': 'warn',
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn',
      'template-curly-spacing': 'warn',
      'object-shorthand': 'warn',
      'prefer-destructuring': 'warn',
      'no-empty': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
    },
  },
];
