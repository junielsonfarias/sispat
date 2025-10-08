#!/bin/bash

# Script para corrigir problema de API subdomain

echo "🔧 CORRIGINDO CONFIGURAÇÃO DA API NO NGINX"
echo ""

# Backup da configuração atual
echo "1. Fazendo backup da configuração..."
sudo cp /etc/nginx/sites-available/sispat /etc/nginx/sites-available/sispat.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ Backup criado"

# Adicionar api. no server_name se não existir
echo ""
echo "2. Atualizando server_name..."
sudo sed -i 's/server_name sispat\.vps-kinghost\.net;/server_name sispat.vps-kinghost.net api.sispat.vps-kinghost.net;/g' /etc/nginx/sites-available/sispat
echo "✓ Server_name atualizado"

# Testar configuração
echo ""
echo "3. Testando configuração do Nginx..."
if sudo nginx -t; then
    echo "✓ Configuração válida!"
    
    # Recarregar Nginx
    echo ""
    echo "4. Recarregando Nginx..."
    sudo systemctl reload nginx
    echo "✓ Nginx recarregado"
    
    # Testar API
    echo ""
    echo "5. Testando API..."
    echo "   → http://localhost:3000/health"
    curl -s http://localhost:3000/health | head -1
    echo ""
    echo "   → http://sispat.vps-kinghost.net/api/health"
    curl -s http://sispat.vps-kinghost.net/api/health | head -1
    echo ""
    
    echo "✅ CORREÇÃO CONCLUÍDA!"
    echo ""
    echo "📝 PRÓXIMOS PASSOS:"
    echo ""
    echo "1. Configure o DNS no painel da Kinghost:"
    echo "   Tipo: CNAME"
    echo "   Nome: api"
    echo "   Valor: sispat.vps-kinghost.net"
    echo ""
    echo "2. Aguarde propagação do DNS (5-30 minutos)"
    echo ""
    echo "3. Teste o acesso:"
    echo "   curl http://api.sispat.vps-kinghost.net/health"
    echo ""
    echo "4. Acesse o sistema:"
    echo "   http://sispat.vps-kinghost.net"
    echo ""
else
    echo "❌ Erro na configuração do Nginx!"
    echo ""
    echo "Restaurando backup..."
    sudo cp /etc/nginx/sites-available/sispat.backup.* /etc/nginx/sites-available/sispat
    echo "✓ Backup restaurado"
fi

