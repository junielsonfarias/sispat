#!/bin/bash
# Script para diagnosticar problemas de HTTPS

echo "=== DIAGNÓSTICO HTTPS ==="
echo ""

# 1. Verificar se Nginx está escutando na porta 443
echo "1. Verificando se Nginx está escutando na porta 443..."
if ss -tlnp | grep -q ":443" || netstat -tlnp 2>/dev/null | grep -q ":443"; then
    echo "✅ Nginx está escutando na porta 443"
    ss -tlnp | grep ":443" || netstat -tlnp 2>/dev/null | grep ":443"
else
    echo "❌ Nginx NÃO está escutando na porta 443"
    echo "   Isso significa que HTTPS não está configurado!"
fi
echo ""

# 2. Verificar configuração do Nginx
echo "2. Verificando configuração do Nginx..."
if [ -f /etc/nginx/sites-available/sispat ]; then
    echo "✅ Arquivo de configuração existe"
    
    # Verificar se há configuração HTTPS
    if grep -q "listen 443" /etc/nginx/sites-available/sispat; then
        echo "✅ Configuração HTTPS encontrada"
    else
        echo "❌ Configuração HTTPS NÃO encontrada"
    fi
    
    # Verificar certificado SSL
    if grep -q "ssl_certificate" /etc/nginx/sites-available/sispat; then
        CERT_PATH=$(grep "ssl_certificate" /etc/nginx/sites-available/sispat | head -1 | awk '{print $2}' | tr -d ';')
        echo "✅ Certificado SSL configurado: $CERT_PATH"
        
        if [ -f "$CERT_PATH" ]; then
            echo "✅ Arquivo de certificado existe"
        else
            echo "❌ Arquivo de certificado NÃO existe: $CERT_PATH"
        fi
    else
        echo "❌ Certificado SSL NÃO configurado"
    fi
else
    echo "❌ Arquivo de configuração não existe"
fi
echo ""

# 3. Verificar status do Nginx
echo "3. Verificando status do Nginx..."
systemctl status nginx --no-pager -l | head -10
echo ""

# 4. Verificar logs do Nginx
echo "4. Últimos erros do Nginx..."
tail -20 /var/log/nginx/error.log | grep -i "error\|failed\|ssl" || echo "Nenhum erro relacionado a SSL encontrado"
echo ""

# 5. Testar conectividade HTTPS local
echo "5. Testando HTTPS localmente..."
if curl -k -s https://localhost/api/health 2>&1 | grep -q "ok"; then
    echo "✅ HTTPS funcionando localmente"
else
    echo "❌ HTTPS NÃO funciona localmente"
    curl -k -v https://localhost/api/health 2>&1 | head -10
fi
echo ""

# 6. Verificar se Certbot foi executado
echo "6. Verificando certificados Let's Encrypt..."
if [ -d /etc/letsencrypt/live ]; then
    echo "✅ Diretório de certificados existe"
    ls -la /etc/letsencrypt/live/ 2>/dev/null | head -5
else
    echo "❌ Certificados Let's Encrypt NÃO encontrados"
fi
echo ""

# 7. Verificar firewall
echo "7. Verificando firewall..."
if command -v ufw >/dev/null 2>&1; then
    ufw status | grep -E "443|Status"
elif command -v firewall-cmd >/dev/null 2>&1; then
    firewall-cmd --list-ports | grep -q "443" && echo "✅ Porta 443 aberta" || echo "❌ Porta 443 pode estar fechada"
else
    echo "⚠️  Firewall não encontrado ou não configurado"
fi
echo ""

# 8. Resumo e recomendações
echo "=== RESUMO ==="
if ss -tlnp | grep -q ":443" || netstat -tlnp 2>/dev/null | grep -q ":443"; then
    if [ -f /etc/letsencrypt/live/*/fullchain.pem ] 2>/dev/null; then
        echo "✅ HTTPS parece estar configurado corretamente"
        echo ""
        echo "Se ainda houver ERR_CONNECTION_REFUSED:"
        echo "  1. Verifique se o domínio está apontando para este servidor"
        echo "  2. Verifique logs: tail -f /var/log/nginx/error.log"
        echo "  3. Teste: curl -v https://sispat.vps-kinghost.net/api/health"
    else
        echo "⚠️  Nginx está escutando na 443, mas certificado pode estar faltando"
        echo ""
        echo "SOLUÇÃO:"
        echo "  sudo certbot --nginx -d sispat.vps-kinghost.net"
    fi
else
    echo "❌ HTTPS NÃO está configurado"
    echo ""
    echo "SOLUÇÃO:"
    echo "  1. Se você escolheu 'N' para SSL durante instalação, configure agora:"
    echo "     sudo certbot --nginx -d sispat.vps-kinghost.net"
    echo ""
    echo "  2. Ou temporariamente use HTTP (não recomendado):"
    echo "     Acesse: http://sispat.vps-kinghost.net"
fi

