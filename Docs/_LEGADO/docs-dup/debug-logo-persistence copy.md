# 🔍 DEBUG LOGO PERSISTENCE

**Data:** 09/10/2025  
**Problema:** Logo salva no navegador atual mas não persiste em outros navegadores

---

## 🔍 DIAGNÓSTICO DO PROBLEMA

### **Causa Identificada:**
A logo está sendo salva como **Data URL** (base64) no localStorage, que é **específico do navegador**.

### **Problemas Encontrados:**

1. **❌ Logo salva como Data URL** (base64) - não persiste entre navegadores
2. **❌ Coluna `municipalityId` vs `municipality_id`** - inconsistência no banco
3. **❌ Falta upload de arquivo real** - apenas conversão para base64

---

## 🚨 EXECUTE ESTES COMANDOS NO SERVIDOR:

### **1. Verificar estrutura da tabela customizations:**

```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTableStructure() {
  try {
    const columns = await prisma.\$queryRaw\`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'customizations'
      ORDER BY ordinal_position
    \`;
    console.log('📋 Estrutura da tabela customizations:');
    columns.forEach(col => console.log('- ' + col.column_name + ' (' + col.data_type + ', nullable: ' + col.is_nullable + ')'));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

checkTableStructure();
"
```

### **2. Verificar dados atuais na tabela:**

```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrentData() {
  try {
    const data = await prisma.\$queryRaw\`SELECT * FROM customizations\`;
    console.log('📊 Dados atuais na tabela:', data.length);
    
    if (data.length > 0) {
      const record = data[0];
      console.log('📋 Primeiro registro:');
      console.log('- id:', record.id);
      console.log('- municipality_id:', record.municipality_id);
      console.log('- municipalityId:', record.municipalityId);
      console.log('- activeLogoUrl (primeiros 50 chars):', record.activeLogoUrl ? record.activeLogoUrl.substring(0, 50) + '...' : 'null');
      console.log('- primary_color:', record.primary_color);
      console.log('- municipality_name:', record.municipality_name);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

checkCurrentData();
"
```

### **3. Verificar logs do backend quando salva logo:**

```bash
cd /var/www/sispat
pm2 logs sispat-backend --lines 100 | grep -E "(customization|logo|Logo|activeLogoUrl)"
```

---

## 🔧 CORREÇÕES NECESSÁRIAS

### **Problema 1: Inconsistência de colunas**

Se a tabela tem `municipality_id` mas o código usa `municipalityId`, execute:

```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixColumnNames() {
  try {
    // Renomear coluna municipality_id para municipalityId
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      RENAME COLUMN municipality_id TO municipalityId
    \`;
    console.log('✅ Coluna municipality_id renomeada para municipalityId');
    
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('ℹ️ Coluna municipality_id não existe, tentando municipalityId...');
      
      // Verificar se já existe municipalityId
      const columns = await prisma.\$queryRaw\`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'customizations' 
        AND column_name IN ('municipalityId', 'municipality_id')
      \`;
      console.log('📋 Colunas encontradas:', columns);
    } else {
      console.error('❌ Erro:', error.message);
    }
  } finally {
    await prisma.\$disconnect();
  }
}

fixColumnNames();
"
```

### **Problema 2: Logo como Data URL**

Para resolver o problema da logo, precisamos implementar upload real de arquivo. Mas primeiro, vamos verificar se o problema é apenas a coluna:

---

## 📋 ME ENVIE OS RESULTADOS

Para resolver rapidamente, preciso de:

1. **Resultado do comando 1** (estrutura da tabela)
2. **Resultado do comando 2** (dados atuais)
3. **Resultado do comando 3** (logs do backend)

---

**Execute os comandos e me envie os resultados! Com essas informações, posso resolver o problema da logo! 🔍🚀**
