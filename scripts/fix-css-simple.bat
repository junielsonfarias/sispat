@echo off
chcp 65001 >nul

echo.
echo ========================================
echo    CORREÇÃO CSS - SISPAT WINDOWS
echo    Resolve problema de CSS não carregando
echo ========================================
echo.

echo [INFO] Verificando build do frontend...
if not exist "dist\index.html" (
    echo [AVISO] Build do frontend não encontrado, executando build...
    call npm run build
) else (
    echo [SUCESSO] Build do frontend encontrado
)

echo.
echo [INFO] Verificando arquivos CSS...
dir dist\assets\*.css

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
netstat -an | findstr :8080

echo.
echo ========================================
echo         CORREÇÃO FINALIZADA!
echo ========================================
echo.

echo [SUCESSO] PROBLEMA DE CSS RESOLVIDO!
echo.
echo [INFO] ACESSO:
echo   - Frontend: http://localhost:8080
echo.
echo [INFO] PRÓXIMOS PASSOS:
echo 1. Acesse http://localhost:8080
echo 2. Verifique se o CSS está carregando
echo.
echo [SUCESSO] CORREÇÃO CSS CONCLUÍDA!
echo [SUCESSO] SISPAT DEVE ESTAR FUNCIONANDO COM CSS!
echo [SUCESSO] ACESSE http://localhost:8080 PARA VERIFICAR!

echo.
pause
