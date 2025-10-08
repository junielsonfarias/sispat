# 🔧 CORRIGIR URL DO FRONTEND EM PRODUÇÃO

**Problema:** Frontend usa `http://localhost:3000/api` em vez de `http://sispat.vps-kinghost.net/api`

**Causa:** Frontend foi compilado sem o arquivo `.env` correto

---

## ✅ **SOLUÇÃO DEFINITIVA**

Execute no servidor:

```bash
cd /var/www/sispat

# 1. Verificar .env atual
echo "1. Arquivo .env atual:"
cat .env

# Se não existir ou estiver errado, criar:
cat > .env << 'EOF'
VITE_API_URL=http://sispat.vps-kinghost.net/api
VITE_USE_BACKEND=true
VITE_APP_NAME=SISPAT 2.0
VITE_APP_VERSION=2.0.0
VITE_APP_ENV=production
VITE_BUILD_OPTIMIZE=true
VITE_BUILD_COMPRESS=true
VITE_ENABLE_DEVTOOLS=false
VITE_ENABLE_LOGGING=false
EOF

echo "✓ .env criado"

# 2. Limpar completamente
echo ""
echo "2. Limpando builds anteriores..."
rm -rf dist/
rm -rf node_modules/.vite
echo "✓ Limpo"

# 3. Recompilar (vai ler o .env)
echo ""
echo "3. Recompilando frontend (2-3 minutos)..."
pnpm run build:prod

# 4. Verificar se compilou com URL correta
echo ""
echo "4. Verificando URL compilada..."
COMPILED_URL=$(grep -o "http://sispat.vps-kinghost.net/api" dist/assets/*.js | head -1)

if [ -n "$COMPILED_URL" ]; then
    echo "✅ URL CORRETA: $COMPILED_URL"
else
    echo "❌ URL INCORRETA ou não encontrada!"
    echo "URLs encontradas:"
    grep -o "https\?://[^\"']*api[^\"']*" dist/assets/*.js | head -5
    exit 1
fi

# 5. Não deve ter localhost
echo ""
echo "5. Verificando se tem localhost..."
if grep -q "localhost:3000" dist/assets/*.js; then
    echo "❌ AINDA TEM LOCALHOST!"
    grep -n "localhost:3000" dist/assets/*.js | head -5
    exit 1
else
    echo "✅ Sem localhost"
fi

# 6. Verificar se logo existe
echo ""
echo "6. Verificando assets..."
if [ -f "dist/assets/images/logo-government.svg" ]; then
    echo "✅ Logo encontrado"
else
    echo "⚠️  Logo não encontrado em dist/assets/images/"
    ls -lh dist/assets/ 2>/dev/null || echo "Pasta assets não existe"
fi

# 7. Recarregar Nginx
echo ""
echo "7. Recarregando Nginx..."
sudo systemctl reload nginx
echo "✓ Nginx recarregado"

# 8. Testar frontend
echo ""
echo "8. Testando frontend..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://sispat.vps-kinghost.net

# Resultado
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  ✅ FRONTEND RECOMPILADO COM URL CORRETA!        ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "📝 NO NAVEGADOR:"
echo ""
echo "1. Pressione Ctrl+Shift+Delete"
echo "2. Marque: Cookies, Cache, Dados de sites"
echo "3. Período: Todo o período"
echo "4. Limpar dados"
echo "5. FECHE o navegador completamente"
echo "6. Reabra e acesse: http://sispat.vps-kinghost.net"
echo ""
echo "✅ Agora deve funcionar sem localhost!"
```

---

## 🔍 **VERIFICAÇÃO**

### **No navegador, após limpar cache:**

Abra DevTools (F12) → Network → Recarregue (Ctrl+F5)

**Deve mostrar:**
```
GET http://sispat.vps-kinghost.net/api/customization  ✅
GET http://sispat.vps-kinghost.net/api/users/...     ✅
GET http://sispat.vps-kinghost.net/api/patrimonios   ✅
```

**NÃO deve mostrar:**
```
GET http://localhost:3000/api/customization  ❌
```

---

## 📊 **CAUSA RAIZ**

O Vite **não estava lendo o arquivo `.env`** durante o build, então usava valores padrão (localhost).

### **Solução:**
1. ✅ Criar `.env` com valores corretos
2. ✅ Limpar cache do Vite (`node_modules/.vite`)
3. ✅ Recompilar (`pnpm run build:prod`)
4. ✅ Vite lê `.env` e compila com URLs corretas

---

## 🎯 **COMMIT REALIZADO**

- **e72c4ce** - Add automated customization fix script

---

**🚀 Execute o script acima e depois LIMPE O CACHE DO NAVEGADOR completamente!**
