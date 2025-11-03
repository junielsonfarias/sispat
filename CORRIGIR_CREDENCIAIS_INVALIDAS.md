# 🔧 Corrigir Erro "Credenciais Inválidas"

## 📋 Problema

O login funcionou por um momento e depois começou a dar erro de "credenciais inválidas". Isso pode indicar:

1. **Rate Limiting** bloqueando após várias tentativas
2. **Senha incorreta** no banco de dados
3. **Hash da senha** não corresponde
4. **Usuário inativo** (`isActive=false`)
5. **Problema com CORS/cookies** impedindo autenticação

---

## ✅ DIAGNÓSTICO RÁPIDO

Execute no servidor:

```bash
cd /var/www/sispat
bash DIAGNOSTICAR_LOGIN.sh
```

Este script vai:
- ✅ Verificar se o usuário existe no banco
- ✅ Testar o endpoint de login diretamente
- ✅ Verificar logs do backend
- ✅ Identificar a causa do problema

---

## 🔍 VERIFICAÇÃO MANUAL

### 1. Verificar Rate Limiting

O rate limiting pode estar bloqueando após várias tentativas:

```bash
# Verificar logs do backend
pm2 logs sispat-backend --lines 100 | grep -i "rate\|limit\|429"

# Verificar configuração do rate limit
cd /var/www/sispat/backend
grep -A 10 "authLimiter" src/routes/authRoutes.ts
```

**Se encontrar "429 Too Many Requests"**: Aguarde alguns minutos antes de tentar novamente.

### 2. Verificar Usuário no Banco

```bash
cd /var/www/sispat/backend

# Carregar variáveis
source <(grep -v '^#' .env | sed 's/^/export /')

# Verificar usuário
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const user = await prisma.user.findUnique({ 
    where: { email: '$SUPERUSER_EMAIL' },
    select: { email: true, name: true, role: true, isActive: true }
  });
  console.log(JSON.stringify(user, null, 2));
  await prisma.\$disconnect();
})();
"
```

**Verifique**:
- ✅ `isActive: true` (se for `false`, o usuário está desativado)
- ✅ Email está correto
- ✅ Role está correto (`superuser`)

### 3. Testar Login Diretamente

```bash
cd /var/www/sispat/backend

# Carregar variáveis
source <(grep -v '^#' .env | sed 's/^/export /')

# Testar login
curl -X POST https://sispat.vps-kinghost.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SUPERUSER_EMAIL\",\"password\":\"$SUPERUSER_PASSWORD\"}"
```

**Se retornar `401`**: Senha incorreta ou hash não corresponde.
**Se retornar `200`**: Login funciona, problema pode ser no frontend.

### 4. Verificar Hash da Senha

Se a senha não funciona, pode ser que o hash no banco não corresponde:

```bash
cd /var/www/sispat/backend

# Gerar novo hash da senha atual
node -e "
const bcrypt = require('bcryptjs');
const password = process.env.SUPERUSER_PASSWORD || 'admin123';
bcrypt.hash(password, 12).then(hash => {
  console.log('Senha:', password);
  console.log('Hash:', hash);
});
"
```

---

## 🚀 SOLUÇÕES

### **Solução 1: Recriar Usuário com Senha Correta**

Se o hash da senha não corresponde:

```bash
cd /var/www/sispat/backend

# 1. Carregar variáveis
source <(grep -v '^#' .env | sed 's/^/export /')

# 2. Executar seed novamente (vai atualizar o usuário)
npm run prisma:seed:prod

# 3. Verificar credenciais
echo "Email: $SUPERUSER_EMAIL"
echo "Senha: $SUPERUSER_PASSWORD"
```

### **Solução 2: Resetar Rate Limiting**

Se rate limiting está bloqueando:

```bash
# Reiniciar backend (limpa rate limit em memória)
pm2 restart sispat-backend

# Aguardar 5 minutos antes de tentar login novamente
```

**OU** reduzir rate limit temporariamente:

```bash
cd /var/www/sispat/backend

# Editar arquivo de rotas
nano src/routes/authRoutes.ts

# Encontrar authLimiter e aumentar max:
# max: 100,  // Aumentar de 5 para 100 temporariamente

# Recompilar
npm run build:prod

# Reiniciar
pm2 restart sispat-backend
```

### **Solução 3: Ativar Usuário**

Se o usuário está inativo:

```bash
cd /var/www/sispat/backend

# Carregar variáveis
source <(grep -v '^#' .env | sed 's/^/export /')

# Ativar usuário
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  await prisma.user.update({
    where: { email: '$SUPERUSER_EMAIL' },
    data: { isActive: true }
  });
  console.log('✅ Usuário ativado');
  await prisma.\$disconnect();
})();
"
```

### **Solução 4: Verificar CORS**

Se o problema é CORS impedindo cookies/tokens:

```bash
cd /var/www/sispat/backend

# Verificar configuração de CORS
grep -A 5 "corsOptions" src/index.ts

# Deve mostrar:
# origin: process.env.FRONTEND_URL || 'http://localhost:8080'
# credentials: true

# Verificar variável FRONTEND_URL no .env
grep FRONTEND_URL .env

# Se não existir, adicionar:
echo "FRONTEND_URL=https://sispat.vps-kinghost.net" >> .env

# Reiniciar backend
pm2 restart sispat-backend
```

### **Solução 5: Limpar Cache do Navegador**

Se o login funciona via curl mas não no navegador:

1. **Limpar cookies e cache**:
   - Chrome: `Ctrl+Shift+Delete` → Cookies e dados de sites
   - Firefox: `Ctrl+Shift+Delete` → Cookies e dados de sites

2. **Tentar em modo anônimo/privado**

3. **Verificar console do navegador (F12)**:
   - Verificar erros de CORS
   - Verificar se token está sendo salvo
   - Verificar requisições de rede

---

## 🔧 CORREÇÃO DEFINITIVA: Recriar Usuário

Se nada funcionar, recrie o usuário completamente:

```bash
cd /var/www/sispat/backend

# 1. Carregar variáveis
source <(grep -v '^#' .env | sed 's/^/export /')

# 2. Deletar usuário existente (se necessário)
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    await prisma.user.delete({ where: { email: '$SUPERUSER_EMAIL' } });
    console.log('✅ Usuário deletado');
  } catch (e) {
    console.log('Usuário não existe ou erro:', e.message);
  }
  await prisma.\$disconnect();
})();
"

# 3. Executar seed novamente
npm run prisma:seed:prod

# 4. Verificar credenciais
echo ""
echo "=== CREDENCIAIS ==="
echo "Email: $SUPERUSER_EMAIL"
echo "Senha: $SUPERUSER_PASSWORD"
echo ""
echo "Tente fazer login novamente!"
```

---

## ✅ VERIFICAÇÃO FINAL

Após aplicar as correções:

```bash
# 1. Testar login via curl
cd /var/www/sispat/backend
source <(grep -v '^#' .env | sed 's/^/export /')

curl -X POST https://sispat.vps-kinghost.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SUPERUSER_EMAIL\",\"password\":\"$SUPERUSER_PASSWORD\"}"

# Deve retornar 200 com token

# 2. Verificar logs do backend
pm2 logs sispat-backend --lines 20

# 3. Tentar login no navegador
# Acesse: https://sispat.vps-kinghost.net
```

---

## 🐛 TROUBLESHOOTING

### Erro: "Rate limit exceeded"

**Solução**: Aguarde 15 minutos ou reinicie o backend.

### Erro: "Credenciais inválidas" mesmo com senha correta

**Causa**: Hash da senha não corresponde.

**Solução**: Execute `npm run prisma:seed:prod` novamente.

### Erro: Login funciona via curl mas não no navegador

**Causa**: Problema com CORS ou cookies.

**Solução**: 
1. Verificar `FRONTEND_URL` no `.env`
2. Limpar cache do navegador
3. Verificar console do navegador (F12)

---

**Data**: 2025-11-03  
**Status**: ✅ Script de diagnóstico criado

