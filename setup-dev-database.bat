@echo off
echo ========================================
echo   SETUP BANCO DE DADOS - DESENVOLVIMENTO
echo ========================================
echo.

cd backend

echo [1/5] Resetando banco de dados...
call npx prisma migrate reset --force --skip-seed
if errorlevel 1 (
    echo ERRO ao resetar banco!
    pause
    exit /b 1
)

echo.
echo [2/5] Aplicando migrations...
call npx prisma migrate dev --name init
if errorlevel 1 (
    echo ERRO ao aplicar migrations!
    pause
    exit /b 1
)

echo.
echo [3/5] Gerando Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo ERRO ao gerar Prisma Client!
    pause
    exit /b 1
)

echo.
echo [4/5] Criando tabela customizations...
psql -U postgres -d sispat_dev -c "CREATE TABLE IF NOT EXISTS customizations (id TEXT PRIMARY KEY, municipalityId TEXT, activeLogoUrl TEXT, secondaryLogoUrl TEXT, backgroundType TEXT DEFAULT 'color', backgroundColor TEXT DEFAULT '#f1f5f9', backgroundImageUrl TEXT, backgroundVideoUrl TEXT, videoLoop BOOLEAN DEFAULT true, videoMuted BOOLEAN DEFAULT true, layout TEXT DEFAULT 'center', welcomeTitle TEXT DEFAULT 'Bem-vindo ao SISPAT', welcomeSubtitle TEXT DEFAULT 'Sistema de Gestão de Patrimônio', primaryColor TEXT DEFAULT '#2563eb', buttonTextColor TEXT DEFAULT '#ffffff', fontFamily TEXT DEFAULT 'Inter var, sans-serif', browserTitle TEXT DEFAULT 'SISPAT', faviconUrl TEXT, loginFooterText TEXT, systemFooterText TEXT, superUserFooterText TEXT, prefeituraName TEXT, secretariaResponsavel TEXT, departamentoResponsavel TEXT, createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"

echo.
echo [5/5] Executando seed...
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
if errorlevel 1 (
    echo ERRO ao executar seed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SUCESSO! Banco configurado!
echo ========================================
echo.
echo Credenciais criadas:
echo.
echo ADMIN:
echo   Email: admin@dev.com
echo   Senha: Admin@123!Dev
echo.
echo SUPERVISOR:
echo   Email: supervisor@dev.com
echo   Senha: Supervisor@123!
echo.
echo ========================================
echo.
echo Próximos passos:
echo   1. cd backend
echo   2. npm run dev
echo.
echo Em outro terminal:
echo   3. npm run dev
echo.
echo Acesse: http://localhost:8080
echo ========================================
pause

