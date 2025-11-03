Write-Host "`n🧪 TESTANDO CREDENCIAIS DE ACESSO`n" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Gray

$credentials = @(
    @{email="admin@ssbv.com"; senha="password123"; tipo="ADMIN"},
    @{email="supervisor@ssbv.com"; senha="password123"; tipo="SUPERVISOR"},
    @{email="junielsonfarias@gmail.com"; senha="Tiko6273@"; tipo="SUPERUSER"}
)

foreach ($cred in $credentials) {
    Write-Host "🔑 Testando $($cred.tipo): $($cred.email)" -ForegroundColor Yellow
    
    try {
        $body = @{
            email = $cred.email
            password = $cred.senha
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
        
        Write-Host "   ✅ LOGIN OK!" -ForegroundColor Green
        Write-Host "   Token: $($response.accessToken.Substring(0,20))..." -ForegroundColor Green
        Write-Host "   👤 Usuário: $($response.user.name)" -ForegroundColor Green
        Write-Host "   🎭 Função: $($response.user.role)`n" -ForegroundColor Green
    }
    catch {
        Write-Host "   ❌ ERRO: $($_.Exception.Message)`n" -ForegroundColor Red
    }
}

Write-Host "================================================" -ForegroundColor Gray
Write-Host "`n✅ TESTE CONCLUÍDO`n" -ForegroundColor Cyan

