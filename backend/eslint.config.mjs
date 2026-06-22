import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * ESLint config para o backend (Node + Express + TypeScript).
 *
 * Filosofia inicial:
 * - regras pragmáticas (warn em vez de error onde houver muito legado)
 * - `no-console` é warn pois ainda há 85+ ocorrências para limpar (vide PLANO_CORRECOES.md)
 * - quando reduzir, promover a error
 */
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'prisma/migrations', 'scripts', '**/*.js'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2022 },
      parserOptions: {
        project: false,
      },
    },
    rules: {
      // Permissivo onde há legado, ajustar gradualmente
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-require-imports': 'off',

      // Higiene básica
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart'],

      // Específicos do backend
      'no-process-exit': 'off', // process.exit é legítimo em scripts e shutdown
      // Augmentação do Express Request usa `declare global { namespace Express }`
      // (padrão idiomático) — permitir namespaces declarados.
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    },
  },
  {
    // Testes: regras mais frouxas
    files: ['src/**/*.{test,spec}.ts', 'src/__tests__/**/*.ts', 'src/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    // Scripts CLI (seed) — output operacional é intencional
    files: ['src/prisma/seed.ts', 'src/scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
