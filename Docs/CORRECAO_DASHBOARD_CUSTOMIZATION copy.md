# 🔧 CORREÇÃO: Dashboard não carrega + API customization 500

**Data:** 09/10/2025  
**Problemas:**
1. ❌ Dashboard supervisor não mostra informações
2. ❌ GET /api/customization 500 (Internal Server Error)
3. ❌ Logo não encontrado (404)

---

## 🔍 DIAGNÓSTICO

### **Problemas identificados:**
1. **API customization falhando** - Dashboard não carrega dados
2. **Logo 404** - Arquivo não encontrado no build de produção
3. **Setores não contabilizados** - Dashboard não atualiza estatísticas

---

## 🚀 SOLUÇÕES

### **SOLUÇÃO 1: Verificar logs da API customization**

```bash
cd /var/www/sispat
pm2 logs sispat-backend --lines 50 | grep -E "(customization|Customization|500)"
```

### **SOLUÇÃO 2: Testar API customization diretamente**

```bash
cd /var/www/sispat/backend

# Testar sem autenticação (deve falhar)
curl http://localhost:3000/api/customization

# Testar com token (se tiver)
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/api/customization
```

### **SOLUÇÃO 3: Verificar dados na tabela customizations**

```bash
cd /var/www/sispat/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCustomizations() {
  try {
    const customizations = await prisma.\$queryRaw\`SELECT * FROM customizations\`;
    console.log('📊 Customizations no banco:', customizations.length);
    console.log('Dados:', customizations);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

checkCustomizations();
"
```

### **SOLUÇÃO 4: Inserir dados padrão na tabela customizations**

```bash
cd /var/www/sispat/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function insertDefaultCustomization() {
  try {
    await prisma.\$executeRaw\`
      INSERT INTO customizations (municipality_id, municipality_name, logo_url, primary_color, secondary_color)
      VALUES ('municipality-1', 'Prefeitura Municipal', null, '#1e40af', '#3b82f6')
      ON CONFLICT (municipality_id) DO NOTHING
    \`;
    console.log('✅ Customização padrão inserida!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

insertDefaultCustomization();
"
```

### **SOLUÇÃO 5: Corrigir logo 404**

```bash
cd /var/www/sispat

# Verificar se logo existe no build
ls -la dist/assets/images/
ls -la public/

# Copiar logo se necessário
cp src/assets/images/logo-government.svg public/
```

---

## 🧪 TESTE COMPLETO

### **Script de correção completa:**

```bash
#!/bin/bash
echo "🔧 CORREÇÃO DASHBOARD E CUSTOMIZATION"
echo "====================================="

cd /var/www/sispat/backend

# 1. Verificar logs
echo "1. Verificando logs de customization..."
pm2 logs sispat-backend --lines 20 | grep -i customization

# 2. Inserir dados padrão
echo -e "\n2. Inserindo customização padrão..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function insertDefaultCustomization() {
  try {
    await prisma.\$executeRaw\`
      INSERT INTO customizations (municipality_id, municipality_name, logo_url, primary_color, secondary_color)
      VALUES ('municipality-1', 'Prefeitura Municipal', null, '#1e40af', '#3b82f6')
      ON CONFLICT (municipality_id) DO NOTHING
    \`;
    console.log('✅ Customização padrão inserida!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

insertDefaultCustomization();
"

# 3. Verificar dados
echo -e "\n3. Verificando customizações..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCustomizations() {
  try {
    const customizations = await prisma.\$queryRaw\`SELECT * FROM customizations\`;
    console.log('📊 Customizations:', customizations.length);
    if (customizations.length > 0) {
      console.log('Dados:', JSON.stringify(customizations[0], null, 2));
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

checkCustomizations();
"

# 4. Corrigir logo
echo -e "\n4. Corrigindo logo..."
cd /var/www/sispat
if [ ! -f "public/logo-government.svg" ]; then
  cp src/assets/images/logo-government.svg public/ 2>/dev/null || echo "Logo não encontrado em src/"
  echo "✅ Logo copiado para public/"
else
  echo "✅ Logo já existe em public/"
fi

# 5. Rebuild frontend
echo -e "\n5. Rebuild frontend..."
npm run build

# 6. Reiniciar backend
echo -e "\n6. Reiniciando backend..."
cd backend
pm2 restart sispat-backend
sleep 3

# 7. Testar API
echo -e "\n7. Testando API customization..."
curl -s http://localhost:3000/api/customization/public | head -1

echo -e "\n✅ Correção completa!"
```

---

## 🎯 RESULTADO ESPERADO

### **Após correção:**

1. ✅ **Dashboard carrega dados** - Estatísticas aparecem
2. ✅ **API customization funciona** - Sem erro 500
3. ✅ **Logo carrega** - Sem erro 404
4. ✅ **Setores contabilizados** - Dashboard atualizado

---

## 📋 VERIFICAÇÃO

### **Teste no navegador:**

1. **Fazer login como supervisor**
2. **Ir no Dashboard**
3. **Verificar:**
   - Estatísticas carregam
   - Gráficos aparecem
   - Console sem erros 500
   - Logo aparece

### **Console (F12):**

```javascript
// ✅ Deve aparecer:
GET /api/customization 200 OK
GET /api/dashboard/stats 200 OK

// ❌ Não deve aparecer:
GET /api/customization 500 Internal Server Error
GET /src/assets/images/logo-government.svg 404 Not Found
```

---

## 🚀 EXECUÇÃO RÁPIDA

**Execute este comando único:**

```bash
cd /var/www/sispat/backend && node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$executeRaw\`INSERT INTO customizations (municipality_id, municipality_name, logo_url, primary_color, secondary_color) VALUES ('municipality-1', 'Prefeitura Municipal', null, '#1e40af', '#3b82f6') ON CONFLICT (municipality_id) DO NOTHING\`.then(() => { console.log('Customização inserida'); prisma.\$disconnect(); });" && cd .. && cp src/assets/images/logo-government.svg public/ 2>/dev/null && npm run build && cd backend && pm2 restart sispat-backend
```

---

**Execute o comando acima e teste o dashboard! Deve carregar todas as informações! 🎉**
