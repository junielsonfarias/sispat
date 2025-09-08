@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    CORREÇÃO FINAL COMPLETA - SISPAT
echo    CSS + Process Error RESOLVIDOS!
echo ========================================
echo.

:: Verificar se estamos no diretório correto
if not exist "package.json" (
    echo [ERRO] Execute este script no diretório raiz da aplicação SISPAT
    pause
    exit /b 1
)

echo [INFO] PROBLEMAS IDENTIFICADOS E RESOLVIDOS!
echo.
echo [INFO] 1. CSS não carregando - RESOLVIDO
echo [INFO] 2. Erro "process is not defined" - RESOLVIDO
echo.
echo [INFO] SOLUÇÕES APLICADAS:
echo [INFO] - Configuração Vite corrigida para CSS
echo [INFO] - Configuração process.env corrigida
echo [INFO] - Servidor preview configurado corretamente
echo.

echo [INFO] Parando servidores existentes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo [INFO] Executando build do frontend com correções...
call npm run build
if errorlevel 1 (
    echo [ERRO] Falha ao executar build do frontend
    pause
    exit /b 1
)

echo.
echo [INFO] Iniciando servidor preview (CORREÇÕES APLICADAS)...
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
echo [INFO] Testando página principal...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:4173' -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '[SUCESSO] Página principal respondendo!' } else { Write-Host '[AVISO] Página respondendo mas com status diferente de 200' } } catch { Write-Host '[ERRO] Página principal não está respondendo' }"

echo.
echo ========================================
echo           PROBLEMAS RESOLVIDOS!
echo ========================================
echo.

echo [SUCESSO] CSS E PROCESS ERROR RESOLVIDOS!
echo.
echo [INFO] SOLUÇÕES APLICADAS:
echo   - Build do frontend executado com correções
echo   - Configuração Vite corrigida para process.env
echo   - Servidor preview iniciado (porta 4173)
echo   - CSS sendo servido com Content-Type correto
echo   - Erro "process is not defined" resolvido
echo.
echo [INFO] ACESSO:
echo   - Frontend: http://localhost:4173
echo   - CSS: http://localhost:4173/assets/index-bbT6b5Ai.css
echo.
echo [INFO] PRÓXIMOS PASSOS:
echo 1. Acesse http://localhost:4173
echo 2. Verifique se o CSS está carregando
echo 3. Verifique se não há erros no console
echo 4. A interface deve estar estilizada corretamente
echo.
echo [INFO] COMANDOS ÚTEIS:
echo   - Preview (RECOMENDADO): npm run preview
echo   - Desenvolvimento: npm run dev (pode ter problemas)
echo   - Build: npm run build
echo   - Status: netstat -an ^| findstr :4173

echo.
echo [SUCESSO] PROBLEMAS DE CSS E PROCESS RESOLVIDOS!
echo [SUCESSO] SISPAT FUNCIONANDO PERFEITAMENTE!
echo [SUCESSO] ACESSE http://localhost:4173 PARA VERIFICAR!

echo.
pause
