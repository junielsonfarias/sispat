# Criar .env de produção para o backend
$envContent = @"
# ===========================================
# SISPAT v2.1.0 - PRODUÇÃO
# Gerado automaticamente em $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ===========================================

# Environment
NODE_ENV=production
PORT=3000

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sispat"

# JWT Configuration (MUDAR EM PRODUÇÃO REAL!)
JWT_SECRET="sispat-production-key-v2-1-0-change-in-real-production-256-bits-1234567890"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# Frontend URL
FRONTEND_URL="http://localhost:8080"

# Redis Configuration (opcional - deixar vazio se não tiver Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Security
MAX_REQUEST_SIZE=10mb
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Uploads
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=info
LOG_DIR=logs
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

Write-Host "✅ Arquivo .env criado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Em produção REAL, altere:" -ForegroundColor Yellow
Write-Host "   - JWT_SECRET (usar chave de 256+ bits)" -ForegroundColor Yellow
Write-Host "   - DATABASE_URL (credenciais reais)" -ForegroundColor Yellow
Write-Host "   - REDIS_PASSWORD (se usar Redis)" -ForegroundColor Yellow
Write-Host ""

