# Configuração de Produção - SISPAT

## Arquivo .env para Produção

Crie um arquivo `.env` na pasta raiz com as seguintes configurações:

```bash
# ========================================
# CONFIGURAÇÕES DO BANCO DE DADOS
# ========================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_producao
DB_USER=sispat_user
DB_PASSWORD=senha_super_segura_aqui

# ========================================
# CONFIGURAÇÕES DE SEGURANÇA
# ========================================
JWT_SECRET=chave_jwt_super_segura_minimo_32_caracteres
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# ========================================
# CONFIGURAÇÕES DA API
# ========================================
NODE_ENV=production
PORT=3001
API_URL=https://seu-dominio.com
FRONTEND_URL=https://seu-dominio.com

# ========================================
# CONFIGURAÇÕES DE CORS
# ========================================
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com

# ========================================
# CONFIGURAÇÕES DE RATE LIMITING
# ========================================
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ========================================
# CONFIGURAÇÕES DE LOGS
# ========================================
LOG_LEVEL=info
LOG_FILE=logs/production.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# ========================================
# CONFIGURAÇÕES DE SSL/HTTPS
# ========================================
SSL_ENABLED=true
SSL_CERT_PATH=/path/to/certificate.pem
SSL_KEY_PATH=/path/to/private-key.pem

# ========================================
# CONFIGURAÇÕES DE EMAIL (OPCIONAL)
# ========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app
SMTP_FROM=noreply@seu-dominio.com

# ========================================
# CONFIGURAÇÕES DE MONITORAMENTO
# ========================================
SENTRY_DSN=https://sua-dsn-sentry@sentry.io/projeto
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ERROR_TRACKING=true

# ========================================
# CONFIGURAÇÕES DE BACKUP
# ========================================
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=sispat-backups
AWS_ACCESS_KEY_ID=sua-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
AWS_REGION=us-east-1

# ========================================
# CONFIGURAÇÕES DE CACHE
# ========================================
CACHE_ENABLED=true
CACHE_TTL=300
MEMORY_CACHE_SIZE=100

# ========================================
# CONFIGURAÇÕES DE UPLOADS
# ========================================
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp,application/pdf
UPLOAD_PATH=uploads/

# ========================================
# CONFIGURAÇÕES DE COMPRESSÃO
# ========================================
COMPRESSION_ENABLED=true
COMPRESSION_LEVEL=6

# ========================================
# CONFIGURAÇÕES DE ANALYTICS
# ========================================
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
ENABLE_ANALYTICS=true

# ========================================
# CONFIGURAÇÕES DE WEBHOOK
# ========================================
WEBHOOK_SECRET=sua-chave-webhook-secreta
WEBHOOK_ENABLED=false

# ========================================
# CONFIGURAÇÕES DE MANUTENÇÃO
# ========================================
MAINTENANCE_MODE=false
MAINTENANCE_MESSAGE=Sistema em manutenção. Voltaremos em breve.

# ========================================
# CONFIGURAÇÕES DE DESENVOLVIMENTO
# ========================================
# Estas devem ser false em produção
DEBUG=false
ENABLE_SWAGGER=false
ENABLE_CORS_ALL=false
ENABLE_SQL_LOGGING=false
```

## Instruções de Configuração

1. **Copie o arquivo de exemplo**:

   ```bash
   cp docs1/ENV_PRODUCTION_EXAMPLE.md .env
   ```

2. **Edite as variáveis**:
   - Substitua `seu-dominio.com` pelo seu domínio real
   - Configure credenciais do banco de dados
   - Gere uma JWT_SECRET segura (mínimo 32 caracteres)
   - Configure caminhos SSL corretos

3. **Variáveis Críticas**:
   - `JWT_SECRET`: Use um gerador de senhas para criar uma chave forte
   - `DB_PASSWORD`: Senha forte para o banco de dados
   - `ALLOWED_ORIGINS`: Apenas domínios autorizados
   - `SSL_CERT_PATH` e `SSL_KEY_PATH`: Caminhos corretos para certificados

4. **Segurança**:
   - Nunca commite o arquivo `.env` no Git
   - Use diferentes senhas para cada ambiente
   - Mantenha as chaves de API em segurança
   - Configure firewall para proteger as portas

## Validação da Configuração

Antes de colocar em produção, valide:

```bash
# Testar conexão com banco
npm run db:test

# Verificar configurações
npm run config:validate

# Testar build
npm run build

# Verificar certificados SSL
openssl x509 -in /path/to/certificate.pem -text -noout
```
