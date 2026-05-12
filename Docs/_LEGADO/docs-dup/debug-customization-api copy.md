# 🔍 DEBUG API CUSTOMIZATION 500

**Data:** 09/10/2025  
**Problema:** API /api/customization ainda retorna 500

---

## 🔍 DIAGNÓSTICO URGENTE

### **Execute estes comandos no servidor:**

### **1. Verificar logs do backend:**

```bash
cd /var/www/sispat
pm2 logs sispat-backend --lines 50 | grep -E "(customization|Customization|500|error|Error)"
```

### **2. Testar API customization diretamente:**

```bash
cd /var/www/sispat/backend

# Testar API pública (sem autenticação)
curl -v http://localhost:3000/api/customization/public

# Testar API protegida (deve falhar sem token)
curl -v http://localhost:3000/api/customization
```

### **3. Verificar se tabela foi criada corretamente:**

```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCustomizations() {
  try {
    // Verificar se tabela existe
    const tables = await prisma.\$queryRaw\`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'customizations'
    \`;
    console.log('📊 Tabelas encontradas:', tables.length);
    
    if (tables.length > 0) {
      // Verificar estrutura da tabela
      const columns = await prisma.\$queryRaw\`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'customizations'
      \`;
      console.log('📋 Colunas da tabela:');
      columns.forEach(col => console.log('- ' + col.column_name + ' (' + col.data_type + ')'));
      
      // Verificar dados
      const data = await prisma.\$queryRaw\`SELECT * FROM customizations\`;
      console.log('📊 Dados na tabela:', data.length);
      if (data.length > 0) {
        console.log('Primeiro registro:', JSON.stringify(data[0], null, 2));
      }
    } else {
      console.log('❌ Tabela customizations não existe!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

debugCustomizations();
"
```

### **4. Verificar controller de customization:**

```bash
cd /var/www/sispat/backend
cat src/controllers/customizationController.ts | head -50
```

### **5. Verificar rotas de customization:**

```bash
cd /var/www/sispat/backend
cat src/routes/customizationRoutes.ts
```

---

## 🚨 CORREÇÕES POSSÍVEIS

### **Se tabela não existe:**

```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTable() {
  try {
    await prisma.\$executeRaw\`
      CREATE TABLE IF NOT EXISTS customizations (
        id SERIAL PRIMARY KEY,
        municipality_id VARCHAR(255) NOT NULL UNIQUE,
        logo_url TEXT,
        primary_color VARCHAR(7),
        secondary_color VARCHAR(7),
        municipality_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`;
    console.log('✅ Tabela criada');
    
    await prisma.\$executeRaw\`
      INSERT INTO customizations (municipality_id, municipality_name, logo_url, primary_color, secondary_color)
      VALUES ('municipality-1', 'Prefeitura Municipal', null, '#1e40af', '#3b82f6')
      ON CONFLICT (municipality_id) DO NOTHING
    \`;
    console.log('✅ Dados inseridos');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

createTable();
"
```

### **Se controller tem erro:**

```bash
cd /var/www/sispat/backend

# Verificar se arquivo existe
ls -la src/controllers/customizationController.ts

# Verificar sintaxe
node -c src/controllers/customizationController.ts
```

---

## 📋 ME ENVIE ESTAS INFORMAÇÕES

Para resolver rapidamente, preciso de:

1. **Resultado do comando 1** (logs do backend)
2. **Resultado do comando 2** (teste da API)
3. **Resultado do comando 3** (verificação da tabela)
4. **Resultado do comando 4** (controller)
5. **Resultado do comando 5** (rotas)

---

**Execute os comandos e me envie os resultados! Com essas informações, posso resolver rapidamente! 🔍**
