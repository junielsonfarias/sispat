# Script de instalação das melhorias de arquitetura
Write-Host "🚀 Instalando dependências para melhorias de arquitetura..." -ForegroundColor Cyan

# React Query (TanStack Query)
Write-Host "`n📦 Instalando React Query..." -ForegroundColor Yellow
npm install @tanstack/react-query@latest @tanstack/react-query-devtools@latest

# Vitest plugins e coverage
Write-Host "`n🧪 Instalando dependências de teste..." -ForegroundColor Yellow
npm install -D @vitest/ui@latest @vitest/coverage-v8@latest

# Testing Library para React
Write-Host "`n🧪 Instalando Testing Library..." -ForegroundColor Yellow
npm install -D @testing-library/jest-dom@latest @testing-library/user-event@latest

# Sentry para error tracking
Write-Host "`n🔍 Instalando Sentry..." -ForegroundColor Yellow
npm install @sentry/react@latest @sentry/vite-plugin@latest

Write-Host "`n✅ Todas as dependências instaladas com sucesso!" -ForegroundColor Green
Write-Host "`n📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Configurar Sentry DSN no .env" -ForegroundColor White
Write-Host "  2. Rodar testes: npm run test" -ForegroundColor White
Write-Host "  3. Ver coverage: npm run test:coverage" -ForegroundColor White
Write-Host "  4. Aplicar migrations: cd backend && npx prisma migrate dev" -ForegroundColor White

