@echo off
echo ========================================
echo   ATUALIZANDO SCHEMA E INICIANDO BACKEND
echo ========================================
echo.

echo [1/3] Aplicando mudancas no banco de dados...
call npx prisma db push --skip-generate

echo.
echo [2/3] Regenerando Prisma Client...
call npx prisma generate

echo.
echo [3/3] Iniciando backend...
call npm run dev
