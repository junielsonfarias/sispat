# 🚨 DIAGNÓSTICO URGENTE - Erro Vite Recorrente

## ⚠️ Problema

O erro "vite: not found" continua ocorrendo mesmo após as correções.

---

## 🔍 Execute Isso AGORA no Servidor

```bash
# 1. Ver o que realmente aconteceu
cat /tmp/build-frontend-deps.log

# 2. Verificar se npm install executou
ls -la /var/www/sispat/node_modules/.bin/ | grep vite

# 3. Verificar package.json
cat /var/www/sispat/package.json | grep -A5 -B5 vite

# 4. Tentar instalar manualmente
cd /var/www/sispat
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps 2>&1 | tee /tmp/manual-install.log

# 5. Verificar novamente
ls -la node_modules/.bin/ | grep vite

# 6. Se AINDA não tiver vite, instalar diretamente:
npm install vite@latest --save-dev

# 7. Verificar
node_modules/.bin/vite --version
```

---

## 💡 Possíveis Causas

### Causa #1: package.json Corrompido ou Incompleto

Verifique se o arquivo `package.json` no GitHub tem o vite listado:

```bash
cat /var/www/sispat/package.json | grep -i vite
```

**Esperado:**
```json
"devDependencies": {
  "vite": "^5.x.x",
  ...
}
```

### Causa #2: Cache do NPM Corrompido

```bash
npm cache clean --force
npm cache verify
```

### Causa #3: Problema de Rede/Registry

```bash
# Testar conexão com registry
curl -I https://registry.npmjs.org/vite

# Configurar registry se necessário
npm config set registry https://registry.npmjs.org/
```

### Causa #4: Versão do Node.js

```bash
node -v
# Deve ser v18.x.x

npm -v  
# Deve ser v10.x.x
```

---

## 🔧 SOLUÇÃO DEFINITIVA

Execute este script no servidor:

```bash
cat > /tmp/fix-vite-definitivo.sh << 'SCRIPT'
#!/bin/bash

set -e

echo "🔧 CORREÇÃO DEFINITIVA DO VITE"
echo ""

cd /var/www/sispat

# 1. Limpar TUDO
echo "[1/6] Limpando completamente..."
rm -rf node_modules package-lock.json
npm cache clean --force
rm -rf ~/.npm

# 2. Verificar package.json
echo "[2/6] Verificando package.json..."
if ! grep -q "vite" package.json; then
    echo "❌ ERRO: Vite não está no package.json!"
    echo "Adicionando manualmente..."
    
    # Adicionar vite ao package.json
    npm install vite@^5.4.0 --save-dev --package-lock-only
fi

# 3. Configurar registry
echo "[3/6] Configurando npm registry..."
npm config set registry https://registry.npmjs.org/

# 4. Aumentar timeout
echo "[4/6] Configurando timeouts..."
npm config set fetch-timeout 300000
npm config set fetch-retries 5

# 5. Instalar dependências
echo "[5/6] Instalando dependências (pode demorar)..."
npm install --legacy-peer-deps --verbose 2>&1 | tee /tmp/npm-install-verbose.log

# 6. Verificar Vite
echo "[6/6] Verificando instalação..."
if [ -f "node_modules/.bin/vite" ]; then
    echo "✅ VITE INSTALADO COM SUCESSO!"
    echo "Versão: $(node_modules/.bin/vite --version)"
    
    # Fazer build
    echo ""
    echo "Iniciando build do frontend..."
    npm run build
    
    if [ -f "dist/index.html" ]; then
        echo "✅ BUILD DO FRONTEND COMPLETO!"
    else
        echo "❌ Build falhou"
        tail -20 /tmp/build-frontend.log
    fi
else
    echo "❌ VITE AINDA NÃO ESTÁ INSTALADO!"
    echo ""
    echo "Tentando instalação direta..."
    npm install vite --save-dev --force
    
    if [ -f "node_modules/.bin/vite" ]; then
        echo "✅ Vite instalado na segunda tentativa"
        npm run build
    else
        echo "❌ FALHA TOTAL"
        echo "Ver logs em:"
        echo "  /tmp/npm-install-verbose.log"
        echo "  /tmp/build-frontend-deps.log"
        exit 1
    fi
fi
SCRIPT

chmod +x /tmp/fix-vite-definitivo.sh
bash /tmp/fix-vite-definitivo.sh
```

---

## 📊 Diagnóstico Detalhado

Execute e me envie a saída:

```bash
# Ver o log completo
cat /tmp/build-frontend-deps.log

# Ver se package.json tem vite
grep -i vite /var/www/sispat/package.json

# Ver estrutura de node_modules
ls -la /var/www/sispat/node_modules/.bin/ 2>/dev/null | head -20

# Ver erros do npm
grep -i error /tmp/build-frontend-deps.log

# Ver memória disponível durante instalação
free -h
```

---

## 🎯 Solução Alternativa (Build Local)

Se o problema persistir, faça o build **na sua máquina local** e envie apenas os arquivos compilados:

```bash
# Na sua máquina local (Windows)
cd "D:\novo ambiente\sispat - Copia"

# Build frontend
npm install
npm run build

# Build backend
cd backend
npm install
npm run build
cd ..

# Compactar arquivos compilados
tar -czf sispat-build.tar.gz dist/ backend/dist/

# Enviar para servidor
scp sispat-build.tar.gz root@SEU_IP:~/

# No servidor, extrair:
cd /var/www/sispat
tar -xzf ~/sispat-build.tar.gz
chown -R www-data:www-data dist/ backend/dist/
```

---

## ⚡ Solução Mais Rápida (RECOMENDADA)

Execute direto no servidor:

```bash
cd /var/www/sispat

# Remover tudo
rm -rf node_modules package-lock.json

# Instalar sem spinner, ver output
npm install --legacy-peer-deps 2>&1 | tee /tmp/install-output.log

# Se falhar, ver o erro:
tail -100 /tmp/install-output.log

# Se vite não instalar, força instalação
npm install vite@5.4.20 --save-dev --force

# Verificar
ls -la node_modules/.bin/vite

# Build
npm run build
```

---

Execute os comandos acima e me envie:
1. ✅ Saída de `cat /tmp/build-frontend-deps.log`
2. ✅ Saída de `grep vite /var/www/sispat/package.json`
3. ✅ Saída de `free -h`

Com isso posso identificar a causa raiz! 🔍

