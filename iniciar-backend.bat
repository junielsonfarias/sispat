@echo off
echo ========================================
echo  SISPAT 2.0 - Iniciar Backend
echo ========================================
echo.

cd backend

echo [1/4] Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias...
    call pnpm install
)

echo.
echo [2/4] Gerando Prisma Client...
call pnpm exec prisma generate

echo.
echo [3/4] Verificando banco de dados...
call pnpm exec prisma migrate deploy

echo.
echo [4/4] Iniciando servidor...
echo.
echo Backend rodando em: http://localhost:3000
echo Health Check: http://localhost:3000/api/health
echo.
echo Pressione Ctrl+C para parar
echo.

call pnpm dev

