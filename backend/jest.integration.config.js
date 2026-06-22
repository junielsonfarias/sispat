/**
 * Configuração para TESTES DE INTEGRAÇÃO (src/tests/).
 *
 * Estes testes sobem a aplicação real e exigem Postgres + Redis acessíveis
 * (DATABASE_URL / REDIS_HOST configurados). NÃO rodam no `npm test` padrão.
 *
 * Uso:  npm run test:integration
 * Pré-requisito: banco de teste migrado e Redis no ar.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000,
  verbose: true,
}
