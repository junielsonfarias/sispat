#!/usr/bin/env node

/**
 * Script de Validação e Correção Automática do SISPAT
 * Este script verifica e corrige problemas comuns na configuração
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: msg => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: msg => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: msg => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: msg => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  header: msg =>
    console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
};

class SispValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }

  // Verificar se arquivo existe
  fileExists(filePath) {
    return fs.existsSync(path.join(projectRoot, filePath));
  }

  // Ler arquivo
  readFile(filePath) {
    try {
      return fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
    } catch (error) {
      return null;
    }
  }

  // Escrever arquivo
  writeFile(filePath, content) {
    try {
      fs.writeFileSync(path.join(projectRoot, filePath), content, 'utf8');
      return true;
    } catch (error) {
      this.errors.push(
        `Erro ao escrever arquivo ${filePath}: ${error.message}`
      );
      return false;
    }
  }

  // Gerar JWT secret seguro
  generateSecureJWTSecret() {
    return crypto.randomBytes(64).toString('base64');
  }

  // Validar arquivo .env
  validateEnvFile() {
    log.header('🔍 Validando arquivo .env');

    const envPath = '.env';
    const envExamplePath = 'env.example';

    if (!this.fileExists(envPath)) {
      this.warnings.push('Arquivo .env não encontrado');

      if (this.fileExists(envExamplePath)) {
        log.info('Copiando env.example para .env');
        const envExample = this.readFile(envExamplePath);
        if (envExample) {
          this.writeFile(envPath, envExample);
          this.fixes.push('Arquivo .env criado a partir do env.example');
        }
      }
    }

    const envContent = this.readFile(envPath);
    if (!envContent) {
      this.errors.push('Não foi possível ler o arquivo .env');
      return;
    }

    // Verificar JWT_SECRET
    if (envContent.includes('your_secure_jwt_secret_here')) {
      this.warnings.push('JWT_SECRET não foi configurado com valor seguro');
      const secureSecret = this.generateSecureJWTSecret();
      const updatedContent = envContent.replace(
        'JWT_SECRET=your_secure_jwt_secret_here_use_openssl_to_generate_minimum_32_chars',
        `JWT_SECRET=${secureSecret}`
      );
      this.writeFile(envPath, updatedContent);
      this.fixes.push('JWT_SECRET atualizado com valor seguro');
    }

    // Verificar senha do banco
    if (envContent.includes('DB_PASSWORD=6273')) {
      this.warnings.push('Senha do banco de dados está usando valor padrão');
      this.fixes.push(
        'Considere alterar DB_PASSWORD para um valor mais seguro'
      );
    }

    // Verificar configurações de produção
    if (envContent.includes('NODE_ENV=development')) {
      log.info('Ambiente configurado para desenvolvimento');
    }
  }

  // Validar package.json
  validatePackageJson() {
    log.header('📦 Validando package.json');

    const packageJsonPath = 'package.json';
    const packageContent = this.readFile(packageJsonPath);

    if (!packageContent) {
      this.errors.push('Não foi possível ler package.json');
      return;
    }

    try {
      const packageJson = JSON.parse(packageContent);

      // Verificar scripts essenciais
      const requiredScripts = ['dev', 'build', 'start', 'test'];
      const missingScripts = requiredScripts.filter(
        script => !packageJson.scripts[script]
      );

      if (missingScripts.length > 0) {
        this.warnings.push(`Scripts ausentes: ${missingScripts.join(', ')}`);
      }

      // Verificar dependências críticas
      const criticalDeps = ['react', 'express', 'pg', 'jsonwebtoken'];
      const missingDeps = criticalDeps.filter(
        dep => !packageJson.dependencies[dep]
      );

      if (missingDeps.length > 0) {
        this.errors.push(
          `Dependências críticas ausentes: ${missingDeps.join(', ')}`
        );
      }

      // Verificar versões de Node.js
      if (packageJson.engines?.node) {
        const nodeVersion = process.version;
        log.info(`Versão do Node.js: ${nodeVersion}`);
      }
    } catch (error) {
      this.errors.push(`Erro ao analisar package.json: ${error.message}`);
    }
  }

  // Validar configurações do TypeScript
  validateTypeScript() {
    log.header('🔧 Validando configurações TypeScript');

    const tsConfigPath = 'tsconfig.json';
    const tsConfigContent = this.readFile(tsConfigPath);

    if (!tsConfigContent) {
      this.warnings.push('tsconfig.json não encontrado');
      return;
    }

    try {
      const tsConfig = JSON.parse(tsConfigContent);

      // Verificar configurações de segurança
      if (!tsConfig.compilerOptions?.strict) {
        this.warnings.push('TypeScript strict mode não está habilitado');
      }

      if (!tsConfig.compilerOptions?.noImplicitAny) {
        this.warnings.push('noImplicitAny não está habilitado');
      }
    } catch (error) {
      this.errors.push(`Erro ao analisar tsconfig.json: ${error.message}`);
    }
  }

  // Validar estrutura de diretórios
  validateDirectoryStructure() {
    log.header('📁 Validando estrutura de diretórios');

    const requiredDirs = [
      'src',
      'server',
      'public',
      'dist',
      'uploads',
      'logs',
      'backups',
    ];

    const missingDirs = requiredDirs.filter(dir => !this.fileExists(dir));

    if (missingDirs.length > 0) {
      this.warnings.push(`Diretórios ausentes: ${missingDirs.join(', ')}`);

      // Criar diretórios ausentes
      missingDirs.forEach(dir => {
        try {
          fs.mkdirSync(path.join(projectRoot, dir), { recursive: true });
          this.fixes.push(`Diretório ${dir} criado`);
        } catch (error) {
          this.errors.push(`Erro ao criar diretório ${dir}: ${error.message}`);
        }
      });
    }
  }

  // Validar configurações de segurança
  validateSecurity() {
    log.header('🔒 Validando configurações de segurança');

    // Verificar se arquivos sensíveis estão no .gitignore
    const gitignorePath = '.gitignore';
    const gitignoreContent = this.readFile(gitignorePath);

    if (gitignoreContent) {
      const sensitiveFiles = [
        '.env',
        'uploads/',
        'logs/',
        'backups/',
        'node_modules/',
      ];
      const missingInGitignore = sensitiveFiles.filter(
        file => !gitignoreContent.includes(file)
      );

      if (missingInGitignore.length > 0) {
        this.warnings.push(
          `Arquivos sensíveis não estão no .gitignore: ${missingInGitignore.join(', ')}`
        );
      }
    }

    // Verificar permissões de arquivos
    const sensitiveFiles = ['.env', 'env.production'];
    sensitiveFiles.forEach(file => {
      if (this.fileExists(file)) {
        try {
          const stats = fs.statSync(path.join(projectRoot, file));
          const mode = stats.mode & parseInt('777', 8);
          if (mode > parseInt('600', 8)) {
            this.warnings.push(
              `Arquivo ${file} tem permissões muito abertas (${mode.toString(8)})`
            );
          }
        } catch (error) {
          // Ignorar erro de permissão
        }
      }
    });
  }

  // Executar todas as validações
  async run() {
    log.header('🚀 Iniciando validação e correção do SISPAT');

    this.validateEnvFile();
    this.validatePackageJson();
    this.validateTypeScript();
    this.validateDirectoryStructure();
    this.validateSecurity();

    // Relatório final
    log.header('📊 Relatório de Validação');

    if (this.fixes.length > 0) {
      log.success('Correções aplicadas:');
      this.fixes.forEach(fix => log.info(`  • ${fix}`));
    }

    if (this.warnings.length > 0) {
      log.warning('Avisos encontrados:');
      this.warnings.forEach(warning => log.info(`  • ${warning}`));
    }

    if (this.errors.length > 0) {
      log.error('Erros encontrados:');
      this.errors.forEach(error => log.info(`  • ${error}`));
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      log.success(
        '✅ Todas as validações passaram! O projeto está configurado corretamente.'
      );
    } else if (this.errors.length === 0) {
      log.success(
        '✅ Validação concluída com sucesso! Apenas avisos menores encontrados.'
      );
    } else {
      log.error('❌ Validação falhou! Corrija os erros antes de continuar.');
      process.exit(1);
    }

    log.info('\n💡 Próximos passos:');
    log.info('  1. Configure o banco de dados PostgreSQL');
    log.info('  2. Execute: npm install');
    log.info('  3. Execute: npm run dev');
    log.info('  4. Acesse: http://localhost:8080');
  }
}

// Executar validação
const validator = new SispValidator();
validator.run().catch(error => {
  log.error(`Erro durante a validação: ${error.message}`);
  process.exit(1);
});
