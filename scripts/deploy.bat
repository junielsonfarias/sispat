@echo off
REM ===========================================
REM SISPAT 2.0 - SCRIPT DE DEPLOY PARA WINDOWS
REM ===========================================

setlocal enabledelayedexpansion

REM Configurações
set PROJECT_NAME=sispat
set BACKUP_DIR=.\backups
set LOG_FILE=.\deploy.log

REM Função para logging
:log
echo [%date% %time%] %~1 | tee -a "%LOG_FILE%"
goto :eof

:error
echo [ERROR] %~1 | tee -a "%LOG_FILE%"
exit /b 1

:success
echo [SUCCESS] %~1 | tee -a "%LOG_FILE%"
goto :eof

:warning
echo [WARNING] %~1 | tee -a "%LOG_FILE%"
goto :eof

REM Função para verificar dependências
:check_dependencies
call :log "Verificando dependências..."

where docker >nul 2>&1
if %errorlevel% neq 0 (
    call :error "Docker não encontrado"
)

where docker-compose >nul 2>&1
if %errorlevel% neq 0 (
    call :error "Docker Compose não encontrado"
)

call :success "Todas as dependências estão instaladas"
goto :eof

REM Função para backup
:backup_database
call :log "Criando backup do banco de dados..."

if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
)

set BACKUP_FILE=%BACKUP_DIR%\sispat_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set BACKUP_FILE=%BACKUP_FILE: =0%

docker exec sispat-postgres pg_dump -U sispat_user -d sispat_prod > "%BACKUP_FILE%"

if %errorlevel% equ 0 (
    call :success "Backup criado: %BACKUP_FILE%"
) else (
    call :error "Falha ao criar backup"
)
goto :eof

REM Função para build
:build_application
call :log "Fazendo build da aplicação..."

call :log "Build do frontend..."
pnpm install --frozen-lockfile
if %errorlevel% neq 0 call :error "Falha no pnpm install"
pnpm run build:prod
if %errorlevel% neq 0 call :error "Falha no build do frontend"

call :log "Build do backend..."
cd backend
npm install --production
if %errorlevel% neq 0 call :error "Falha no npm install do backend"
npm run build:prod
if %errorlevel% neq 0 call :error "Falha no build do backend"
cd ..

call :success "Build concluído com sucesso"
goto :eof

REM Função para deploy com Docker
:deploy_docker
call :log "Iniciando deploy com Docker..."

call :log "Parando containers existentes..."
docker-compose -f docker-compose.prod.yml down

call :log "Fazendo build da imagem Docker..."
docker-compose -f docker-compose.prod.yml build --no-cache
if %errorlevel% neq 0 call :error "Falha no build da imagem Docker"

call :log "Iniciando serviços..."
docker-compose -f docker-compose.prod.yml up -d
if %errorlevel% neq 0 call :error "Falha ao iniciar serviços"

call :log "Aguardando serviços ficarem prontos..."
timeout /t 30 /nobreak >nul

call :check_services_health
if %errorlevel% neq 0 call :error "Serviços não ficaram saudáveis"

call :success "Deploy com Docker concluído"
goto :eof

REM Função para verificar saúde dos serviços
:check_services_health
call :log "Verificando saúde dos serviços..."

set /a max_attempts=30
set /a attempt=1

:health_loop
curl -f http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    call :success "Serviços estão saudáveis"
    goto :eof
)

if %attempt% geq %max_attempts% (
    call :error "Serviços não ficaram saudáveis após %max_attempts% tentativas"
)

call :log "Tentativa %attempt%/%max_attempts% - Aguardando serviços..."
timeout /t 10 /nobreak >nul
set /a attempt+=1
goto :health_loop

REM Função para rollback
:rollback
call :log "Iniciando rollback..."

docker-compose -f docker-compose.prod.yml down

for /f "delims=" %%i in ('dir /b /o-d "%BACKUP_DIR%\sispat_backup_*.sql" 2^>nul') do (
    set LATEST_BACKUP=%%i
    goto :restore_backup
)

call :error "Nenhum backup encontrado para rollback"

:restore_backup
call :log "Restaurando backup: %LATEST_BACKUP%"
docker exec -i sispat-postgres psql -U sispat_user -d sispat_prod < "%BACKUP_DIR%\%LATEST_BACKUP%"
if %errorlevel% equ 0 (
    call :success "Rollback concluído"
) else (
    call :error "Falha no rollback"
)
goto :eof

REM Função para limpeza
:cleanup
call :log "Limpando recursos..."

docker image prune -f
docker volume prune -f

forfiles /p logs /m *.log /d -7 /c "cmd /c del @path" 2>nul

call :success "Limpeza concluída"
goto :eof

REM Função principal
:main
call :log "=== SISPAT 2.0 DEPLOY SCRIPT ==="

if "%1"=="deploy" goto :deploy_main
if "%1"=="deploy-native" goto :deploy_native_main
if "%1"=="rollback" goto :rollback
if "%1"=="backup" goto :backup_database
if "%1"=="health" goto :check_services_health
if "%1"=="cleanup" goto :cleanup
if "%1"=="" goto :deploy_main

echo Uso: %0 {deploy^|deploy-native^|rollback^|backup^|health^|cleanup}
echo.
echo Comandos:
echo   deploy        - Deploy completo com Docker (padrão)
echo   deploy-native - Deploy nativo sem Docker
echo   rollback      - Rollback para versão anterior
echo   backup        - Criar backup do banco
echo   health        - Verificar saúde dos serviços
echo   cleanup       - Limpar recursos não utilizados
exit /b 1

:deploy_main
call :check_dependencies
call :backup_database
call :build_application
call :deploy_docker
call :cleanup
goto :end

:deploy_native_main
call :check_dependencies
call :backup_database
call :build_application
call :deploy_docker
goto :end

:end
call :success "Script executado com sucesso!"
exit /b 0
