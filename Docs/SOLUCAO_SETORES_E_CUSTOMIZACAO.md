# 🔧 SOLUÇÃO: Setores funcionam + Correção Customizations

**Data:** 09/10/2025  
**Status:** ✅ Setores funcionando, ❌ Tabela customizations faltando

---

## 🔍 ANÁLISE DOS LOGS

### **✅ Setores funcionando perfeitamente:**
```
[DEV] ✅ Setor criado: {
  id: '6872c625-b929-4e13-a2c0-bbe8a97f6767',
  name: 'SECRETARIA MUNICIPAL DE SAUDE',
  sigla: 'SMS',
  codigo: '03',
  ...
}
```

**Conclusão:** Os setores ESTÃO sendo salvos no banco!

### **❌ Problema identificado:**
```
Raw query failed. Code: `42P01`. Message: `relation "customizations" does not exist`
```

**Conclusão:** Tabela `customizations` não existe no banco.

---

## 🎯 SOLUÇÕES

### **SOLUÇÃO 1: Verificar setores no banco (AGORA)**

```bash
cd /var/www/sispat/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.sector.findMany().then(sectors => {
  console.log('📊 Total de setores:', sectors.length);
  sectors.forEach(s => console.log('- ' + s.name + ' (' + s.codigo + ')'));
  prisma.\$disconnect();
});
"
```

### **SOLUÇÃO 2: Criar tabela customizations**

```bash
cd /var/www/sispat/backend

# Criar tabela customizations
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createCustomizationsTable() {
  try {
    await prisma.\$executeRaw\`
      CREATE TABLE IF NOT EXISTS customizations (
        id SERIAL PRIMARY KEY,
        municipality_id VARCHAR(255) NOT NULL,
        logo_url TEXT,
        primary_color VARCHAR(7),
        secondary_color VARCHAR(7),
        municipality_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`;
    console.log('✅ Tabela customizations criada!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

createCustomizationsTable();
"
```

### **SOLUÇÃO 3: Executar migrações do Prisma**

```bash
cd /var/www/sispat/backend

# Verificar status das migrações
npx prisma migrate status

# Aplicar migrações pendentes
npx prisma migrate deploy

# Regenerar cliente Prisma
npx prisma generate
```

### **SOLUÇÃO 4: Reiniciar backend após correções**

```bash
cd /var/www/sispat/backend
pm2 restart sispat-backend
sleep 3
curl http://localhost:3000/api/health
```

---

## 🧪 TESTE COMPLETO

### **Execute este script completo:**

```bash
#!/bin/bash
echo "🔧 CORREÇÃO COMPLETA SISPAT"
echo "=========================="

cd /var/www/sispat/backend

# 1. Verificar setores
echo "1. Verificando setores no banco..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.sector.findMany().then(sectors => {
  console.log('📊 Total de setores:', sectors.length);
  sectors.forEach(s => console.log('- ' + s.name + ' (' + s.codigo + ')'));
  prisma.\$disconnect();
});
"

# 2. Criar tabela customizations
echo -e "\n2. Criando tabela customizations..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createCustomizationsTable() {
  try {
    await prisma.\$executeRaw\`
      CREATE TABLE IF NOT EXISTS customizations (
        id SERIAL PRIMARY KEY,
        municipality_id VARCHAR(255) NOT NULL,
        logo_url TEXT,
        primary_color VARCHAR(7),
        secondary_color VARCHAR(7),
        municipality_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`;
    console.log('✅ Tabela customizations criada!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

createCustomizationsTable();
"

# 3. Aplicar migrações
echo -e "\n3. Aplicando migrações..."
npx prisma migrate deploy

# 4. Regenerar cliente
echo -e "\n4. Regenerando cliente Prisma..."
npx prisma generate

# 5. Reiniciar backend
echo -e "\n5. Reiniciando backend..."
pm2 restart sispat-backend
sleep 3

# 6. Testar health
echo -e "\n6. Testando API..."
curl http://localhost:3000/api/health

echo -e "\n✅ Correção completa!"
```

---

## 🎯 RESULTADO ESPERADO

### **Após correção:**

1. **Setores funcionando:** ✅ Já funcionando
2. **Customizations funcionando:** ✅ Após criar tabela
3. **Logs limpos:** ✅ Sem erros de tabela não encontrada
4. **Frontend funcionando:** ✅ Setores carregam nos formulários

---

## 📋 VERIFICAÇÃO FINAL

### **Teste no navegador:**

1. **Ir em:** Administração → Usuários → Adicionar Usuário
2. **Perfil:** Usuário
3. **Setores de Acesso:** Deve mostrar todos os setores criados
4. **Console (F12):** Sem erros de customizations

### **Logs do backend:**

```bash
pm2 logs sispat-backend --lines 20
```

**Deve mostrar:**
- ✅ Sem erros de "relation does not exist"
- ✅ Setores carregando corretamente
- ✅ API funcionando normalmente

---

## 🚀 EXECUÇÃO RÁPIDA

**Execute este comando único:**

```bash
cd /var/www/sispat/backend && node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.sector.findMany().then(sectors => { console.log('Setores:', sectors.length); sectors.forEach(s => console.log('- ' + s.name)); prisma.\$disconnect(); });" && node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$executeRaw\`CREATE TABLE IF NOT EXISTS customizations (id SERIAL PRIMARY KEY, municipality_id VARCHAR(255) NOT NULL, logo_url TEXT, primary_color VARCHAR(7), secondary_color VARCHAR(7), municipality_name VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)\`.then(() => { console.log('Tabela customizations criada!'); prisma.\$disconnect(); });" && pm2 restart sispat-backend
```

---

**Execute o comando acima e teste novamente! Os setores devem aparecer nos formulários! 🎉**
