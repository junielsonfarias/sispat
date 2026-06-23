/**
 * Validação de variáveis de ambiente obrigatórias
 * Executado na inicialização do servidor
 */

import { logInfo, logError, logWarn } from './logger';

export function validateEnvironment(): void {
  logInfo('🔍 Validando variáveis de ambiente...\n');

  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NODE_ENV'
  ];

  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logError('❌ ERRO CRÍTICO: Variáveis de ambiente faltando', undefined, {
      missing: missing
    });
    missing.forEach(key => logError(`   - ${key}`));
    logError('\nConfigure essas variáveis antes de iniciar o servidor.');
    process.exit(1);
  }

  // Validar NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV || '')) {
    logError(`❌ NODE_ENV inválido: "${process.env.NODE_ENV}"`, undefined, {
      validEnvs: validEnvs
    });
    process.exit(1);
  }

  // Validações específicas para produção
  if (process.env.NODE_ENV === 'production') {
    logInfo('🔒 Validações de segurança para produção...\n');

    // Validar JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      logError('❌ JWT_SECRET muito curto para produção!', undefined, {
        minimum: '32 caracteres (256 bits)',
        current: jwtSecret ? `${jwtSecret.length} caracteres` : 'não configurado'
      });
      process.exit(1);
    }

    if (jwtSecret.includes('dev') || jwtSecret.includes('test') || jwtSecret.includes('example') || 
        jwtSecret.includes('CHANGE_THIS') || jwtSecret.includes('default') || jwtSecret.includes('secret')) {
      logError('❌ JWT_SECRET contém palavras inseguras!', undefined, {
        forbiddenWords: ['dev', 'test', 'example', 'CHANGE_THIS', 'default', 'secret']
      });
      process.exit(1);
    }

    // Validar DATABASE_URL — senha padrão/insegura é fatal em produção
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('CHANGE_THIS') || /:(password|postgres|123456?)@/i.test(dbUrl)) {
      logError('❌ DATABASE_URL contém senha padrão/insegura em produção!', undefined, {
        recommendation: 'Use uma senha forte e única (sem "password"/"postgres"/"CHANGE_THIS").'
      });
      process.exit(1);
    }

    // SSL no banco: fatal se o host for REMOTO (banco interno em docker/loopback
    // não exige TLS). Detecta host pelo trecho após @.
    const dbHost = (dbUrl.match(/@([^:/?]+)/)?.[1] || '').toLowerCase();
    const isLocalDb = ['localhost', '127.0.0.1', '::1', 'postgres', 'db'].includes(dbHost);
    const hasSsl = dbUrl.includes('sslmode=require') || dbUrl.includes('sslmode=prefer');
    if (dbUrl && !hasSsl && !isLocalDb) {
      logError('❌ DATABASE_URL remoto sem SSL em produção!', undefined, {
        host: dbHost,
        recommendation: 'Adicione ?sslmode=require à URL do banco.'
      });
      process.exit(1);
    } else if (dbUrl && !hasSsl) {
      logWarn('ℹ️  Banco local/interno sem SSL (aceitável em rede privada).', { host: dbHost });
    }

    // Validar FRONTEND_URL
    if (!process.env.FRONTEND_URL) {
      logWarn('⚠️  FRONTEND_URL não configurado. Usando valor padrão.', {
        recommendation: 'Configure para produção: https://seudominio.com'
      });
    } else if (!process.env.FRONTEND_URL.startsWith('https://')) {
      logWarn('⚠️  FRONTEND_URL não usa HTTPS!', {
        recommendation: 'Use HTTPS em produção: https://seudominio.com'
      });
    }

    // Validar BCRYPT_ROUNDS — fatal em produção (custo de hash é controle de segurança)
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    if (bcryptRounds < 12) {
      logError('❌ BCRYPT_ROUNDS baixo demais para produção!', undefined, {
        current: bcryptRounds,
        minimum: 12
      });
      process.exit(1);
    }

    // Validar PORT
    const port = parseInt(process.env.PORT || '3000');
    if (port < 1024 || port > 65535) {
      logError('❌ PORT inválido!', undefined, {
        current: port,
        validRange: '1024-65535'
      });
      process.exit(1);
    }

    // Validar CORS_ORIGIN
    if (!process.env.CORS_ORIGIN) {
      logWarn('⚠️  CORS_ORIGIN não configurado!', {
        recommendation: 'Configure CORS_ORIGIN para produção'
      });
    }

    logInfo('✅ Validações de segurança concluídas\n');
  }

  logInfo('✅ Todas as variáveis de ambiente estão configuradas\n');
}

/**
 * Exibir configuração atual (sem expor dados sensíveis)
 */
export function showEnvironmentInfo(): void {
  logInfo('📋 Configuração do ambiente:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT || 3000,
    DATABASE: process.env.DATABASE_URL ? '✅ Configurado' : '❌ Não configurado',
    JWT_SECRET: process.env.JWT_SECRET ? `✅ ${process.env.JWT_SECRET.length} caracteres` : '❌ Não configurado',
    FRONTEND_URL: process.env.FRONTEND_URL || '⚠️  Padrão',
    BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS || '12 (padrão)'
  });
}

