@echo off
REM ========================================
REM   EXECUTAR COMO ADMINISTRADOR!
REM ========================================

echo Verificando privilegios de administrador...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ============================================
    echo   ERRO: Execute como Administrador!
    echo ============================================
    echo.
    echo Clique com botao direito neste arquivo e escolha:
    echo "Executar como administrador"
    echo.
    pause
    exit /b 1
)

echo OK - Executando como Administrador
echo.
echo ========================================
echo   SETUP BANCO DE DADOS - DESENVOLVIMENTO
echo ========================================
echo.

cd backend

echo [LIMPEZA] Fechando processos Node.js...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 >nul

echo [LIMPEZA] Removendo cache Prisma...
rd /s /q "node_modules\.prisma" 2>nul
rd /s /q "..\node_modules\.prisma" 2>nul
timeout /t 2 >nul

echo.
echo [1/4] Resetando banco de dados...
call npx prisma migrate reset --force --skip-seed --skip-generate
timeout /t 2 >nul

echo.
echo [2/4] Gerando Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo ERRO! Tentando novamente...
    timeout /t 3 >nul
    del /f /q "node_modules\.prisma\client\*.tmp*" 2>nul
    call npx prisma generate
)

echo.
echo [3/4] Aplicando migrations...
call npx prisma migrate deploy

echo.
echo [4/4] Executando seed...
set SUPERUSER_EMAIL=admin@dev.com
set SUPERUSER_PASSWORD=Admin@123!Dev
set SUPERUSER_NAME=Admin Desenvolvimento
set SUPERVISOR_EMAIL=supervisor@dev.com
set SUPERVISOR_PASSWORD=Supervisor@123!
set SUPERVISOR_NAME=Supervisor Dev
set MUNICIPALITY_NAME=Município de Teste
set STATE=PA
set BCRYPT_ROUNDS=10

call npm run prisma:seed

echo.
echo ========================================
echo   CONCLUIDO!
echo ========================================
echo.
echo Login: admin@dev.com / Admin@123!Dev
echo.
echo Inicie:
echo   1. cd backend ^&^& npm run dev
echo   2. npm run dev (outro terminal)
echo   3. Acesse http://localhost:8080
echo.
pause

