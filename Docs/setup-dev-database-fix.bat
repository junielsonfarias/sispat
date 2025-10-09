@echo off
echo ========================================
echo   SETUP BANCO DE DADOS - DESENVOLVIMENTO
echo   (Versao com Fix de Permissoes)
echo ========================================
echo.

cd backend

echo [PASSO EXTRA] Parando processos Node que podem travar...
echo Fechando Node.js...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo Limpando cache do Prisma...
if exist "node_modules\.prisma" (
    rd /s /q "node_modules\.prisma" 2>nul
)
if exist "..\node_modules\.prisma" (
    rd /s /q "..\node_modules\.prisma" 2>nul
)

echo.
echo [1/5] Resetando banco de dados...
call npx prisma migrate reset --force --skip-seed --skip-generate
if errorlevel 1 (
    echo ERRO ao resetar banco!
    echo.
    echo Tente fechar TODOS os terminais Node.js e execute novamente.
    pause
    exit /b 1
)

echo.
echo [2/5] Aplicando migrations...
call npx prisma migrate deploy
if errorlevel 1 (
    echo AVISO: Erro ao aplicar migrations, tentando migrate dev...
    call npx prisma migrate dev --name init --skip-generate
)

echo.
echo [3/5] Gerando Prisma Client (tentativa 1)...
call npx prisma generate 2>nul
if errorlevel 1 (
    echo Primeira tentativa falhou, limpando e tentando novamente...
    timeout /t 2 >nul
    
    echo Removendo arquivos temporarios...
    del /f /q "node_modules\.prisma\client\*.tmp*" 2>nul
    
    echo Tentando gerar novamente...
    call npx prisma generate
    if errorlevel 1 (
        echo.
        echo ERRO PERSISTENTE ao gerar Prisma Client!
        echo.
        echo SOLUCAO:
        echo 1. Feche TODOS os terminais e VS Code
        echo 2. Abra um novo terminal como Administrador
        echo 3. Execute: cd backend
        echo 4. Execute: npx prisma generate
        echo 5. Execute este script novamente
        echo.
        pause
        exit /b 1
    )
)

echo.
echo [4/5] Criando tabela customizations (se nao existir)...
psql -U postgres -d sispat_db -c "CREATE TABLE IF NOT EXISTS customizations (id TEXT PRIMARY KEY, \"municipalityId\" TEXT, \"activeLogoUrl\" TEXT, \"secondaryLogoUrl\" TEXT, \"backgroundType\" TEXT DEFAULT 'color', \"backgroundColor\" TEXT DEFAULT '#f1f5f9', \"backgroundImageUrl\" TEXT, \"backgroundVideoUrl\" TEXT, \"videoLoop\" BOOLEAN DEFAULT true, \"videoMuted\" BOOLEAN DEFAULT true, layout TEXT DEFAULT 'center', \"welcomeTitle\" TEXT DEFAULT 'Bem-vindo ao SISPAT', \"welcomeSubtitle\" TEXT DEFAULT 'Sistema de Gestão de Patrimônio', \"primaryColor\" TEXT DEFAULT '#2563eb', \"buttonTextColor\" TEXT DEFAULT '#ffffff', \"fontFamily\" TEXT DEFAULT 'Inter var, sans-serif', \"browserTitle\" TEXT DEFAULT 'SISPAT', \"faviconUrl\" TEXT, \"loginFooterText\" TEXT, \"systemFooterText\" TEXT, \"superUserFooterText\" TEXT, \"prefeituraName\" TEXT, \"secretariaResponsavel\" TEXT, \"departamentoResponsavel\" TEXT, \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \"updatedAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" 2>nul

if errorlevel 1 (
    echo Tabela pode nao ter sido criada, mas continuando...
)

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
    echo Verifique se o banco de dados esta rodando.
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
echo Proximos passos:
echo.
echo Terminal 1:
echo   cd backend
echo   npm run dev
echo.
echo Terminal 2 (novo terminal):
echo   npm run dev
echo.
echo Acesse: http://localhost:8080
echo ========================================
pause

