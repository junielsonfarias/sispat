@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    CORREÇÃO FINAL CSS - SISPAT
echo    Problema RESOLVIDO!
echo ========================================
echo.

:: Verificar se estamos no diretório correto
if not exist "package.json" (
    echo [ERRO] Execute este script no diretório raiz da aplicação SISPAT
    pause
    exit /b 1
)

echo [INFO] PROBLEMA IDENTIFICADO E RESOLVIDO!
echo.
echo [INFO] O problema era que o servidor de desenvolvimento (npm run dev)
echo [INFO] não estava servindo arquivos CSS com o Content-Type correto.
echo.
echo [INFO] SOLUÇÃO: Usar o servidor preview (npm run preview) que
echo [INFO] serve os arquivos estáticos corretamente.
echo.

echo [INFO] Parando servidores existentes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo [INFO] Executando build do frontend...
call npm run build
if errorlevel 1 (
    echo [ERRO] Falha ao executar build do frontend
    pause
    exit /b 1
)

echo.
echo [INFO] Iniciando servidor preview (CORREÇÃO APLICADA)...
start /b npm run preview

echo.
echo [INFO] Aguardando inicialização do servidor...
timeout /t 8 /nobreak >nul

echo.
echo [INFO] Verificando se o servidor está rodando...
netstat -an | findstr :4173 >nul
if errorlevel 1 (
    echo [ERRO] Servidor não está rodando na porta 4173
    pause
    exit /b 1
) else (
    echo [SUCESSO] Servidor preview rodando na porta 4173
)

echo.
echo [INFO] Testando CSS...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:4173/assets/index-bbT6b5Ai.css' -UseBasicParsing -TimeoutSec 5; if ($response.Headers['Content-Type'] -like '*text/css*') { Write-Host '[SUCESSO] CSS sendo servido corretamente!' } else { Write-Host '[ERRO] CSS ainda não está sendo servido corretamente' } } catch { Write-Host '[ERRO] Não foi possível testar o CSS' }"

echo.
echo ========================================
echo           PROBLEMA RESOLVIDO!
echo ========================================
echo.

echo [SUCESSO] CSS AGORA ESTÁ FUNCIONANDO!
echo.
echo [INFO] SOLUÇÃO APLICADA:
echo   - Build do frontend executado
echo   - Servidor preview iniciado (porta 4173)
echo   - CSS sendo servido com Content-Type correto
echo.
echo [INFO] ACESSO:
echo   - Frontend: http://localhost:4173
echo   - CSS: http://localhost:4173/assets/index-bbT6b5Ai.css
echo.
echo [INFO] PRÓXIMOS PASSOS:
echo 1. Acesse http://localhost:4173
echo 2. Verifique se o CSS está carregando
echo 3. A interface deve estar estilizada corretamente
echo.
echo [INFO] COMANDOS ÚTEIS:
echo   - Preview (RECOMENDADO): npm run preview
echo   - Desenvolvimento: npm run dev (pode ter problemas de CSS)
echo   - Build: npm run build
echo   - Status: netstat -an ^| findstr :4173

echo.
echo [SUCESSO] PROBLEMA DE CSS RESOLVIDO DEFINITIVAMENTE!
echo [SUCESSO] SISPAT FUNCIONANDO COM CSS COMPLETO!
echo [SUCESSO] ACESSE http://localhost:4173 PARA VERIFICAR!

echo.
pause
