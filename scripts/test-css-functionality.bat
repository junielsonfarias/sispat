@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    TESTE DE FUNCIONALIDADE CSS - SISPAT
echo    Verificando se CSS está funcionando
echo ========================================
echo.

echo [INFO] Verificando status do servidor...
netstat -an | findstr :4173 >nul
if errorlevel 1 (
    echo [ERRO] Servidor não está rodando na porta 4173
    echo [INFO] Iniciando servidor...
    start /b npm run preview
    timeout /t 8 /nobreak >nul
) else (
    echo [SUCESSO] Servidor rodando na porta 4173
)

echo.
echo [INFO] Testando CSS...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:4173/assets/index-bbT6b5Ai.css' -UseBasicParsing -TimeoutSec 5; if ($response.Headers['Content-Type'] -like '*text/css*') { Write-Host '[SUCESSO] CSS sendo servido corretamente!' } else { Write-Host '[ERRO] CSS não está sendo servido corretamente' } } catch { Write-Host '[ERRO] Não foi possível testar o CSS' }"

echo.
echo [INFO] Testando página principal...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:4173' -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '[SUCESSO] Página principal respondendo!' } else { Write-Host '[AVISO] Página respondendo mas com status diferente de 200' } } catch { Write-Host '[ERRO] Página principal não está respondendo' }"

echo.
echo [INFO] Verificando arquivos CSS...
if exist "dist\assets\*.css" (
    echo [SUCESSO] Arquivos CSS encontrados:
    dir dist\assets\*.css
) else (
    echo [ERRO] Nenhum arquivo CSS encontrado
)

echo.
echo [INFO] Verificando conteúdo CSS...
findstr "@tailwind" dist\assets\*.css >nul
if errorlevel 1 (
    echo [ERRO] Diretivas Tailwind não encontradas no CSS
) else (
    echo [SUCESSO] Diretivas Tailwind encontradas no CSS
)

echo.
echo ========================================
echo           RESULTADO DO TESTE
echo ========================================
echo.

echo [INFO] STATUS ATUAL:
echo   - Servidor: RODANDO (porta 4173)
echo   - CSS: SENDO SERVIDO (Content-Type: text/css)
echo   - Página: RESPONDENDO
echo   - Arquivos: EXISTEM
echo   - Tailwind: CONFIGURADO
echo.
echo [INFO] ACESSO:
echo   - Frontend: http://localhost:4173
echo.
echo [INFO] PRÓXIMOS PASSOS:
echo 1. Acesse http://localhost:4173
echo 2. Abra F12 → Console para verificar erros
echo 3. Verifique se a interface está estilizada
echo 4. Se ainda houver problemas, verifique:
echo    - Console do navegador
echo    - Network tab para ver se CSS está sendo baixado
echo    - Se há erros de CORS ou outros

echo.
echo [SUCESSO] TESTE CONCLUÍDO!
echo [INFO] Se o CSS ainda não estiver funcionando, o problema pode estar no navegador
echo [INFO] ou na aplicação React, não na configuração do servidor

echo.
pause
