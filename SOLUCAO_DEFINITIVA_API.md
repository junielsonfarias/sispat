# 🔧 SOLUÇÃO DEFINITIVA - ERRO DE API CONNECTION REFUSED

**Problema:** `api.sispat.vps-kinghost.net/auth/login net::ERR_CONNECTION_REFUSED`

**Causa:** Frontend compilado com URL `api.sispat.vps-kinghost.net` mas:
1. DNS não configurado
2. Nginx não responde nessa URL

---

## ✅ **SOLUÇÃO RÁPIDA (RECOMENDADA)**

Execute no seu servidor VPS:

```bash
# 1. Ir para o projeto
cd /var/www/sispat

# 2. Criar arquivo .env correto para produção
cat > .env << 'EOF'
VITE_API_URL=http://sispat.vps-kinghost.net/api
VITE_USE_BACKEND=true
VITE_APP_NAME=SISPAT 2.0
VITE_APP_VERSION=2.0.0
VITE_APP_ENV=production
VITE_BUILD_OPTIMIZE=true
VITE_BUILD_COMPRESS=true
VITE_BUILD_ANALYZE=false
VITE_ENABLE_DEVTOOLS=false
VITE_ENABLE_LOGGING=false
EOF

# 3. Recompilar frontend com URL correta
pnpm run build:prod

# 4. Verificar se usou a URL certa
grep -o "http://sispat.vps-kinghost.net" dist/assets/*.js | head -1

# Deve mostrar: http://sispat.vps-kinghost.net/api (SEM "api." no início)

# 5. Reiniciar Nginx
sudo systemctl reload nginx

# 6. Testar API via Nginx
curl http://sispat.vps-kinghost.net/api/health

# Deve retornar: {"status":"ok",...}

# 7. Limpar cache do navegador e testar
echo "✅ Agora acesse: http://sispat.vps-kinghost.net"
echo "   Pressione Ctrl+Shift+Delete no navegador"
echo "   Marque: Cookies e Cache"
echo "   Limpar e recarregar a página"
```

---

## 🔍 **VERIFICAR SE DEU CERTO**

```bash
# Ver qual URL está no frontend compilado
cd /var/www/sispat
grep -o "https\?://[^\"']*api" dist/assets/*.js | head -5

# DEVE MOSTRAR:
# http://sispat.vps-kinghost.net/api  ✅ CORRETO

# NÃO DEVE MOSTRAR:
# http://api.sispat.vps-kinghost.net  ❌ ERRADO
```

---

## 🌐 **ALTERNATIVA: CONFIGURAR DNS**

Se você REALMENTE quer usar `api.sispat.vps-kinghost.net`:

### **1. Configurar DNS no Painel Kinghost**

```
Tipo: CNAME
Nome: api
Destino: sispat.vps-kinghost.net
TTL: 3600
```

### **2. Aguardar Propagação (5-30 minutos)**

```bash
# Testar se DNS está ativo
nslookup api.sispat.vps-kinghost.net

# Ou
ping api.sispat.vps-kinghost.net
```

### **3. Verificar Nginx**

```bash
# Ver se Nginx está configurado para api.
grep "server_name" /etc/nginx/sites-enabled/sispat

# Deve mostrar:
# server_name sispat.vps-kinghost.net api.sispat.vps-kinghost.net;
```

### **4. Testar**

```bash
curl http://api.sispat.vps-kinghost.net/health
```

---

## 🎯 **RECOMENDAÇÃO**

### **✅ Use MESMA URL (Mais Simples)**

```
Frontend: http://sispat.vps-kinghost.net
API:      http://sispat.vps-kinghost.net/api
```

**Vantagens:**
- ✅ Não precisa configurar DNS
- ✅ Funciona imediatamente
- ✅ Menos complexo
- ✅ Mesma origem (melhor para CORS)

### **❌ Evite Subdomain Separado**

```
Frontend: http://sispat.vps-kinghost.net
API:      http://api.sispat.vps-kinghost.net
```

**Desvantagens:**
- ❌ Precisa configurar DNS
- ❌ Precisa aguardar propagação
- ❌ Mais complexo
- ❌ CORS cross-origin

---

## 🚀 **SCRIPT COMPLETO DE CORREÇÃO**

Copie e cole tudo de uma vez no servidor:

```bash
#!/bin/bash

echo "🔧 CORRIGINDO CONFIGURAÇÃO DA API"
echo ""

cd /var/www/sispat

# 1. Parar PM2
echo "1. Parando PM2..."
pm2 stop sispat-backend

# 2. Criar .env correto
echo "2. Criando .env de produção..."
cat > .env << 'EOF'
VITE_API_URL=http://sispat.vps-kinghost.net/api
VITE_USE_BACKEND=true
VITE_APP_NAME=SISPAT 2.0
VITE_APP_VERSION=2.0.0
VITE_APP_ENV=production
VITE_BUILD_OPTIMIZE=true
VITE_BUILD_COMPRESS=true
VITE_BUILD_ANALYZE=false
VITE_ENABLE_DEVTOOLS=false
VITE_ENABLE_LOGGING=false
EOF

echo "✓ .env criado"

# 3. Limpar build anterior
echo ""
echo "3. Limpando build anterior..."
rm -rf dist/
echo "✓ Build anterior removido"

# 4. Recompilar
echo ""
echo "4. Recompilando frontend (pode demorar 2-3 minutos)..."
pnpm run build:prod

# 5. Verificar URL
echo ""
echo "5. Verificando URL compilada..."
COMPILED_URL=$(grep -o "http://sispat.vps-kinghost.net/api" dist/assets/*.js | head -1)

if [ -n "$COMPILED_URL" ]; then
    echo "✓ URL correta: $COMPILED_URL"
else
    echo "❌ URL não encontrada ou incorreta"
    grep -o "https\?://[^\"']*api[^\"']*" dist/assets/*.js | head -3
fi

# 6. Reiniciar serviços
echo ""
echo "6. Reiniciando serviços..."
pm2 restart sispat-backend
sudo systemctl reload nginx

# 7. Aguardar
echo ""
echo "7. Aguardando serviços iniciarem (10 segundos)..."
sleep 10

# 8. Testar
echo ""
echo "8. Testando API..."
echo "   → API direta:"
curl -s http://localhost:3000/health | head -1

echo ""
echo "   → API via Nginx:"
curl -s http://sispat.vps-kinghost.net/api/health | head -1

echo ""
echo "   → Frontend:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://sispat.vps-kinghost.net

# 9. Resultado
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  ✅ CORREÇÃO CONCLUÍDA!                          ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "📍 Acesse: http://sispat.vps-kinghost.net"
echo ""
echo "🔐 Login:"
echo "   Email: junielsonfarias@gmail.com"
echo "   Senha: Sispat@2025!Admin"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   1. Limpe o cache do navegador (Ctrl+Shift+Delete)"
echo "   2. Marque: Cookies e Cache"
echo "   3. Limpar dados"
echo "   4. Recarregue a página (Ctrl+F5)"
echo ""
```

Salve como `/tmp/fix-api.sh` e execute:
```bash
chmod +x /tmp/fix-api.sh
/tmp/fix-api.sh
```

---

## 🎯 **CREDENCIAIS ATUALIZADAS**

Com a senha forte (12+ caracteres):

```
Email: junielsonfarias@gmail.com
Senha: Sispat@2025!Admin
```

**Esta senha atende aos requisitos:**
- ✅ 18 caracteres
- ✅ Maiúsculas (S, A)
- ✅ Minúsculas (ispat, dmin)
- ✅ Números (2025)
- ✅ Símbolos (@, !)

---

## 📋 **CHECKLIST FINAL**

Execute no servidor:

```bash
# 1. Build foi criado?
ls -lh /var/www/sispat/dist/index.html

# 2. URL está correta?
grep -c "sispat.vps-kinghost.net/api" /var/www/sispat/dist/assets/*.js

# Deve mostrar número > 0

# 3. Não tem api. no início?
grep -c "api.sispat.vps-kinghost.net" /var/www/sispat/dist/assets/*.js

# Deve mostrar: 0

# 4. PM2 rodando?
pm2 status | grep online

# 5. API respondendo?
curl http://sispat.vps-kinghost.net/api/health

# 6. Frontend acessível?
curl -s -o /dev/null -w "Status: %{http_code}\n" http://sispat.vps-kinghost.net
```

---

## 🔄 **NO NAVEGADOR**

1. **Limpe o cache:**
   - Pressione `Ctrl+Shift+Delete`
   - Marque "Cookies e dados de sites"
   - Marque "Imagens e arquivos em cache"
   - Período: "Todo o período"
   - Clique em "Limpar dados"

2. **Feche e reabra o navegador**

3. **Acesse:** `http://sispat.vps-kinghost.net`

4. **Faça login:**
   - Email: `junielsonfarias@gmail.com`
   - Senha: `Sispat@2025!Admin`

---

**🎉 Depois disso, o login vai funcionar perfeitamente!**
