# Script para otimizar altura das páginas - reduzir elementos grandes desnecessários
Write-Host "🔧 Otimizando altura das páginas..." -ForegroundColor Blue

# Lista de arquivos para otimizar
$files = @(
    "src/pages/ferramentas/Exportacao.tsx",
    "src/pages/analise/AnaliseSetor.tsx", 
    "src/pages/ferramentas/Relatorios.tsx",
    "src/pages/superuser/Documentation.tsx",
    "src/pages/admin/SystemAudit.tsx",
    "src/pages/dashboards/ViewerDashboard.tsx",
    "src/pages/dashboards/SupervisorDashboard.tsx",
    "src/pages/dashboards/UserDashboard.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "📝 Otimizando: $file" -ForegroundColor Yellow
        
        $content = Get-Content $file -Raw
        
        # Reduzir padding dos headers principais
        $content = $content -replace 'p-6 mb-8', 'p-4 mb-6'
        $content = $content -replace 'rounded-xl shadow-lg', 'rounded-lg shadow-md'
        
        # Reduzir tamanho dos ícones nos headers
        $content = $content -replace 'h-8 w-8', 'h-6 w-6'
        $content = $content -replace 'w-12 h-12', 'w-10 h-10'
        $content = $content -replace 'p-3', 'p-2'
        
        # Reduzir tamanho dos títulos
        $content = $content -replace 'text-4xl', 'text-2xl'
        $content = $content -replace 'text-3xl', 'text-2xl'
        
        # Reduzir padding dos cards internos
        $content = $content -replace 'p-6', 'p-4'
        $content = $content -replace 'px-4 py-3', 'px-3 py-2'
        $content = $content -replace 'mb-4', 'mb-3'
        
        # Reduzir altura dos cards de estatísticas
        $content = $content -replace 'pb-3', 'pb-2'
        
        # Reduzir espaçamento entre elementos
        $content = $content -replace 'gap-4', 'gap-3'
        $content = $content -replace 'gap-6', 'gap-4'
        
        # Reduzir altura dos gráficos
        $content = $content -replace 'h-\[400px\]', 'h-[300px]'
        $content = $content -replace 'h-\[350px\]', 'h-[280px]'
        
        Set-Content $file $content -Encoding UTF8
        Write-Host "✅ Otimizado: $file" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Arquivo não encontrado: $file" -ForegroundColor Red
    }
}

Write-Host "🎉 Otimização de altura das páginas concluída!" -ForegroundColor Green