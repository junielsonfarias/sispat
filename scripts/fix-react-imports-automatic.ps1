# Script para corrigir automaticamente as importações React
# Uso: .\scripts\fix-react-imports-automatic.ps1

Write-Host "🔧 Corrigindo importações React automaticamente..." -ForegroundColor Blue

# Lista de arquivos de contexto que precisam ser corrigidos
$contextFiles = @(
    "src/contexts/ActivityLogContext.tsx",
    "src/contexts/AuthContext.tsx", 
    "src/contexts/PatrimonioContext.tsx",
    "src/contexts/NotificationContext.tsx",
    "src/contexts/SearchContext.tsx",
    "src/contexts/DocumentContext.tsx",
    "src/contexts/DashboardContext.tsx",
    "src/contexts/PublicSearchContext.tsx",
    "src/contexts/MunicipalityContext.tsx"
)

foreach ($file in $contextFiles) {
    if (Test-Path $file) {
        Write-Host "📝 Corrigindo: $file" -ForegroundColor Yellow
        
        # Ler o conteúdo do arquivo
        $content = Get-Content $file -Raw
        
        # Verificar se já tem import React
        if ($content -match "^import React") {
            Write-Host "✅ $file já tem import React" -ForegroundColor Green
            continue
        }
        
        # Verificar se tem imports do React sem o React
        if ($content -match "import\s*\{\s*ReactNode") {
            # Substituir o import sem React pelo import com React
            $content = $content -replace "import\s*\{\s*ReactNode", "import React, {`n    ReactNode"
            $content = $content -replace "import\s*\{\s*createContext", "import React, {`n    createContext"
            $content = $content -replace "import\s*\{\s*useCallback", "import React, {`n    useCallback"
            $content = $content -replace "import\s*\{\s*useContext", "import React, {`n    useContext"
            $content = $content -replace "import\s*\{\s*useEffect", "import React, {`n    useEffect"
            $content = $content -replace "import\s*\{\s*useState", "import React, {`n    useState"
            $content = $content -replace "import\s*\{\s*useMemo", "import React, {`n    useMemo"
            
            # Salvar o arquivo
            Set-Content $file $content -Encoding UTF8
            Write-Host "✅ $file corrigido com sucesso" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️ $file não precisa de correção" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "❌ Arquivo não encontrado: $file" -ForegroundColor Red
    }
}

Write-Host "🎉 Correção automática concluída!" -ForegroundColor Green
Write-Host "📋 Execute 'pnpm run build' para testar" -ForegroundColor Blue
