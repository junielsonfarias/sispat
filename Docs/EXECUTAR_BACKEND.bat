@echo off
echo ========================================
echo   INICIANDO BACKEND - SISPAT 2.0
echo ========================================
echo.

cd backend

echo [1/2] Matando processos Node antigos...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/2] Iniciando backend...
echo.
echo ========================================
echo   Backend iniciando na porta 3000
echo   Aguarde a mensagem de sucesso...
echo ========================================
echo.

npm run dev
