@echo off
echo ========================================
echo  SISPAT 2.0 - Reiniciar Backend
echo ========================================
echo.

echo [1/3] Parando processos Node...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Processos finalizados com sucesso
) else (
    echo Nenhum processo Node rodando
)

echo.
echo [2/3] Aguardando 2 segundos...
timeout /t 2 /nobreak >nul

echo.
echo [3/3] Iniciando backend...
echo.
echo Backend sera iniciado em: http://localhost:3000
echo Health Check: http://localhost:3000/api/health
echo.
echo Pressione Ctrl+C para parar
echo.

cd backend
pnpm dev

