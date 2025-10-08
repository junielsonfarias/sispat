@echo off
echo ========================================
echo   CORRIGINDO BACKEND - SISPAT 2.0
echo ========================================
echo.

echo [1/4] Parando processos Node existentes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo [2/4] Reinstalando ts-node...
call npm install -D ts-node typescript @types/node

echo [3/4] Regenerando Prisma Client...
call npx prisma generate

echo [4/4] Iniciando backend...
call npm run dev

pause
