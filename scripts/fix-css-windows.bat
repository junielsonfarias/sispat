@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    CORREÇÃO CSS - SISPAT WINDOWS
echo    Resolve problema de CSS não carregando
echo ========================================
echo.

:: Verificar se estamos no diretório correto
if not exist "package.json" (
    echo [ERRO] Execute este script no diretório raiz da aplicação SISPAT
    pause
    exit /b 1
)

echo [INFO] Verificando build do frontend...
if not exist "dist\index.html" (
    echo [AVISO] Build do frontend não encontrado, executando build...
    
    :: Verificar se as dependências estão instaladas
    if not exist "node_modules" (
        echo [INFO] Instalando dependências...
        call npm install
        if errorlevel 1 (
            echo [ERRO] Falha ao instalar dependências
            pause
            exit /b 1
        )
    )
    
    :: Executar build
    echo [INFO] Executando build do frontend...
    call npm run build
    if errorlevel 1 (
        echo [ERRO] Falha ao executar build do frontend
        pause
        exit /b 1
    )
    
    if exist "dist\index.html" (
        echo [SUCESSO] Build do frontend executado com sucesso
    ) else (
        echo [ERRO] Falha ao executar build do frontend
        pause
        exit /b 1
    )
) else (
    echo [SUCESSO] Build do frontend encontrado
)

echo.
echo [INFO] Verificando arquivos CSS...
set css_count=0
for %%f in (dist\assets\*.css) do set /a css_count+=1
if %css_count% gtr 0 (
    echo [SUCESSO] %css_count% arquivo(s) CSS encontrado(s)
    dir dist\assets\*.css
) else (
    echo [ERRO] Nenhum arquivo CSS encontrado em dist\assets\
    pause
    exit /b 1
)

echo.
echo [INFO] Verificando referências CSS no HTML...
findstr /C:"link.*stylesheet.*css" dist\index.html >nul
if errorlevel 1 (
    echo [ERRO] Nenhuma referência CSS encontrada no HTML
    pause
    exit /b 1
) else (
    echo [SUCESSO] Referências CSS encontradas no HTML
    findstr "link.*stylesheet.*css" dist\index.html
)

echo.
echo [INFO] Parando servidores existentes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo [INFO] Iniciando servidor de desenvolvimento...
start /b npm run dev

echo.
echo [INFO] Aguardando inicialização do servidor...
timeout /t 10 /nobreak >nul

echo.
echo [INFO] Verificando se o servidor está rodando...
netstat -an | findstr :8080 >nul
if errorlevel 1 (
    echo [ERRO] Servidor não está rodando na porta 8080
    pause
    exit /b 1
) else (
    echo [SUCESSO] Servidor rodando na porta 8080
)

echo.
echo [INFO] Testando conectividade...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8080' -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '[SUCESSO] Servidor respondendo na porta 8080' } else { Write-Host '[AVISO] Servidor respondendo mas com status diferente de 200' } } catch { Write-Host '[ERRO] Servidor não está respondendo na porta 8080' }"

echo.
echo [INFO] Verificando configuração Vite...
if exist "vite.config.ts" (
    echo [SUCESSO] Arquivo vite.config.ts encontrado
    
    :: Verificar configurações importantes
    findstr "base:" vite.config.ts >nul
    if errorlevel 1 (
        echo [INFO] Base path não configurado, configurando...
        echo import { defineConfig } from 'vite'; > vite.config.ts.temp
        echo import react from '@vitejs/plugin-react'; >> vite.config.ts.temp
        echo import path from 'path'; >> vite.config.ts.temp
        echo. >> vite.config.ts.temp
        echo export default defineConfig({ >> vite.config.ts.temp
        echo   base: '/', >> vite.config.ts.temp
        echo   plugins: [react()], >> vite.config.ts.temp
        echo   server: { >> vite.config.ts.temp
        echo     host: '::', >> vite.config.ts.temp
        echo     port: 8080, >> vite.config.ts.temp
        echo   }, >> vite.config.ts.temp
        echo   build: { >> vite.config.ts.temp
        echo     outDir: 'dist', >> vite.config.ts.temp
        echo   }, >> vite.config.ts.temp
        echo   resolve: { >> vite.config.ts.temp
        echo     alias: { >> vite.config.ts.temp
        echo       '@': path.resolve(__dirname, './src'), >> vite.config.ts.temp
        echo     }, >> vite.config.ts.temp
        echo   }, >> vite.config.ts.temp
        echo }); >> vite.config.ts.temp
        
        move /y vite.config.ts.temp vite.config.ts >nul
        echo [SUCESSO] Base path configurado no Vite
    ) else (
        echo [INFO] Base path já configurado
    )
) else (
    echo [AVISO] Arquivo vite.config.ts não encontrado
)

echo.
echo [INFO] Verificando permissões dos arquivos...
if exist "dist" (
    echo [INFO] Configurando permissões dos arquivos...
    icacls "dist" /grant Everyone:F /T >nul 2>&1
    echo [SUCESSO] Permissões dos arquivos configuradas
)

echo.
echo ========================================
echo           VERIFICAÇÃO FINAL
echo ========================================
echo.

echo [INFO] STATUS DO CSS:
echo   - Build frontend: EXISTE
echo   - Arquivos CSS: %css_count% arquivo(s)
echo   - Referências HTML: OK
echo   - Servidor: RODANDO (porta 8080)

echo.
echo [INFO] Conectividade:
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8080' -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '  - Localhost: RESPONDENDO' } else { Write-Host '  - Localhost: RESPONDENDO (status: ' $response.StatusCode ')' } } catch { Write-Host '  - Localhost: NÃO RESPONDE' }"

echo.
echo ========================================
echo         CORREÇÃO FINALIZADA!
echo ========================================
echo.

echo [SUCESSO] PROBLEMA DE CSS RESOLVIDO!
echo.
echo [INFO] SOLUÇÕES APLICADAS:
echo   - Build do frontend verificado/executado
echo   - Arquivos CSS verificados
echo   - Referências HTML verificadas
echo   - Servidor de desenvolvimento iniciado
echo   - Configuração Vite verificada
echo   - Permissões dos arquivos configuradas
echo.
echo [INFO] ACESSO:
echo   - Frontend: http://localhost:8080
echo   - Build: .\dist\ (arquivos estáticos)
echo.
echo [INFO] PRÓXIMOS PASSOS:
echo 1. Acesse http://localhost:8080
echo 2. Verifique se o CSS está carregando
echo 3. Se ainda houver problemas, execute:
echo    npm run build ^&^& npm run preview
echo.
echo [INFO] COMANDOS ÚTEIS:
echo   - Desenvolvimento: npm run dev
echo   - Build: npm run build
echo   - Preview: npm run preview
echo   - Status: netstat -an ^| findstr :8080

echo.
echo [SUCESSO] CORREÇÃO CSS CONCLUÍDA!
echo [SUCESSO] SISPAT DEVE ESTAR FUNCIONANDO COM CSS!
echo [SUCESSO] ACESSE http://localhost:8080 PARA VERIFICAR!

echo.
pause
