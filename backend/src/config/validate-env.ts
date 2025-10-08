/**
 * Validação de variáveis de ambiente obrigatórias
 * Executado na inicialização do servidor
 */

export function validateEnvironment(): void {
  console.log('🔍 Validando variáveis de ambiente...\n');

  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NODE_ENV'
  ];

  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ ERRO CRÍTICO: Variáveis de ambiente faltando:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nConfigure essas variáveis antes de iniciar o servidor.');
    process.exit(1);
  }

  // Validar NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV || '')) {
    console.error(`❌ NODE_ENV inválido: "${process.env.NODE_ENV}"`);
    console.error(`   Valores válidos: ${validEnvs.join(', ')}`);
    process.exit(1);
  }

  // Validações específicas para produção
  if (process.env.NODE_ENV === 'production') {
    console.log('🔒 Validações de segurança para produção...\n');

    // Validar JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET || '';
    if (jwtSecret.length < 32) {
      console.error('❌ JWT_SECRET muito curto para produção!');
      console.error('   Mínimo: 32 caracteres (256 bits)');
      console.error('   Atual:', jwtSecret.length, 'caracteres');
      process.exit(1);
    }

    if (jwtSecret.includes('dev') || jwtSecret.includes('test') || jwtSecret.includes('example')) {
      console.error('❌ JWT_SECRET contém palavras inseguras!');
      console.error('   Palavras proibidas: dev, test, example');
      process.exit(1);
    }

    // Validar DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('CHANGE_THIS') || dbUrl.includes('password') || dbUrl.includes('123')) {
      console.warn('⚠️  ATENÇÃO: DATABASE_URL parece conter senha padrão!');
      console.warn('   Recomenda-se usar senha forte e única.');
    }

    // Validar FRONTEND_URL
    if (!process.env.FRONTEND_URL) {
      console.warn('⚠️  FRONTEND_URL não configurado. Usando valor padrão.');
      console.warn('   Configure para produção: https://seudominio.com');
    }

    // Validar BCRYPT_ROUNDS
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    if (bcryptRounds < 12) {
      console.warn('⚠️  BCRYPT_ROUNDS baixo para produção!');
      console.warn(`   Valor atual: ${bcryptRounds}`);
      console.warn('   Recomendado: 12 ou superior');
    }

    console.log('✅ Validações de segurança concluídas\n');
  }

  console.log('✅ Todas as variáveis de ambiente estão configuradas\n');
}

/**
 * Exibir configuração atual (sem expor dados sensíveis)
 */
export function showEnvironmentInfo(): void {
  console.log('📋 Configuração do ambiente:');
  console.log('   NODE_ENV:', process.env.NODE_ENV);
  console.log('   PORT:', process.env.PORT || 3000);
  console.log('   DATABASE:', process.env.DATABASE_URL ? '✅ Configurado' : '❌ Não configurado');
  console.log('   JWT_SECRET:', process.env.JWT_SECRET ? `✅ ${process.env.JWT_SECRET.length} caracteres` : '❌ Não configurado');
  console.log('   FRONTEND_URL:', process.env.FRONTEND_URL || '⚠️  Padrão');
  console.log('   BCRYPT_ROUNDS:', process.env.BCRYPT_ROUNDS || '12 (padrão)');
  console.log('');
}

