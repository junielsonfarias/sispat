# Script PowerShell para preparar scripts para VPS
# Este script prepara os arquivos para serem enviados para um servidor Linux

Write-Host "🚀 Preparando scripts para VPS..." -ForegroundColor Green

# Criar diretório de distribuição
$distDir = "vps-scripts"
if (Test-Path $distDir) {
    Remove-Item $distDir -Recurse -Force
}
New-Item -ItemType Directory -Path $distDir

# Copiar scripts para VPS
$scripts = @(
    "install-vps.sh",
    "setup-environment.sh", 
    "deploy-vps.sh",
    "maintenance-vps.sh",
    "monitor-memory-linux.js",
    "cleanup-memory-linux.js",
    "README-VPS.md"
)

foreach ($script in $scripts) {
    if (Test-Path "scripts/$script") {
        Copy-Item "scripts/$script" "$distDir/"
        Write-Host "✅ Copiado: $script" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Não encontrado: $script" -ForegroundColor Yellow
    }
}

# Criar script de instalação rápida
$quickInstall = @"
#!/bin/bash
# Script de instalação rápida do SISPAT em VPS

set -e

echo "🚀 Iniciando instalação do SISPAT..."

# Tornar scripts executáveis
chmod +x *.sh

# Executar instalação
./install-vps.sh

echo "✅ Instalação concluída!"
echo "Próximos passos:"
echo "1. Execute: ./setup-environment.sh"
echo "2. Execute: ./deploy-vps.sh"
"@

$quickInstall | Out-File -FilePath "$distDir/quick-install.sh" -Encoding UTF8

# Criar arquivo de instruções
$instructions = @"
# 🚀 SISPAT - Scripts para VPS

## Instalação Rápida

1. Faça upload dos arquivos para seu VPS
2. Execute: chmod +x *.sh
3. Execute: ./quick-install.sh

## Scripts Disponíveis

- **install-vps.sh**: Instalação inicial do sistema
- **setup-environment.sh**: Configuração do ambiente
- **deploy-vps.sh**: Deploy da aplicação
- **maintenance-vps.sh**: Manutenção e monitoramento
- **monitor-memory-linux.js**: Monitoramento de memória
- **cleanup-memory-linux.js**: Limpeza de memória

## Ordem de Execução

1. ./install-vps.sh
2. ./setup-environment.sh
3. ./deploy-vps.sh

## Manutenção

- ./maintenance-vps.sh (manutenção completa)
- ./maintenance-vps.sh cleanup (limpeza rápida)
- ./maintenance-vps.sh health (verificação de saúde)

## Monitoramento

- node monitor-memory-linux.js
- node cleanup-memory-linux.js
"@

$instructions | Out-File -FilePath "$distDir/INSTRUCTIONS.md" -Encoding UTF8

Write-Host "✅ Scripts preparados para VPS em: $distDir" -ForegroundColor Green
Write-Host "📁 Arquivos criados:" -ForegroundColor Blue
Get-ChildItem $distDir | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor Cyan }

Write-Host ""
Write-Host "🚀 Para usar em VPS:" -ForegroundColor Yellow
Write-Host "1. Faça upload da pasta '$distDir' para seu VPS" -ForegroundColor White
Write-Host "2. Execute: chmod +x *.sh" -ForegroundColor White
Write-Host "3. Execute: ./quick-install.sh" -ForegroundColor White