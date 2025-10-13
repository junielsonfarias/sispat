# 🔍 DEBUG - COMANDO NÃO FUNCIONOU

**Problema:** Comando executou mas não mostrou saída

---

## 🚨 EXECUTE ESTES COMANDOS PARA DIAGNOSTICAR:

### **1. Verificar se o comando foi executado:**
```bash
cd /var/www/sispat/backend
echo "Testando conexão com Prisma..."
node -e "console.log('✅ Node.js funcionando'); const { PrismaClient } = require('@prisma/client'); console.log('✅ Prisma carregado'); const prisma = new PrismaClient(); console.log('✅ Prisma client criado'); prisma.\$disconnect().then(() => console.log('✅ Conexão OK'));"
```

### **2. Testar comando mais simples:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('🔍 Testando conexão...');
    
    const result = await prisma.\$queryRaw\`SELECT COUNT(*) as total FROM customizations\`;
    console.log('📊 Total de registros:', result[0].total);
    
    const columns = await prisma.\$queryRaw\`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customizations'
      ORDER BY ordinal_position
    \`;
    console.log('📋 Colunas atuais:');
    columns.forEach(col => console.log('- ' + col.column_name));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.\$disconnect();
  }
}

test();
"
```

### **3. Se o comando anterior funcionou, tentar adicionar uma coluna:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addOneColumn() {
  try {
    console.log('🔧 Tentando adicionar coluna activeLogoUrl...');
    
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"activeLogoUrl\" TEXT
    \`;
    
    console.log('✅ Coluna activeLogoUrl adicionada com sucesso!');
    
    // Verificar se foi adicionada
    const columns = await prisma.\$queryRaw\`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customizations' 
      AND column_name = 'activeLogoUrl'
    \`;
    
    if (columns.length > 0) {
      console.log('✅ Coluna confirmada no banco de dados');
    } else {
      console.log('❌ Coluna não foi encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error.message);
    console.error('Código do erro:', error.code);
  } finally {
    await prisma.\$disconnect();
  }
}

addOneColumn();
"
```

### **4. Verificar logs do PM2:**
```bash
cd /var/www/sispat
pm2 logs sispat-backend --lines 20
```

### **5. Verificar se o banco está acessível:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Verificando banco de dados...');
    
    // Testar query simples
    const result = await prisma.\$queryRaw\`SELECT 1 as test\`;
    console.log('✅ Banco acessível:', result[0].test);
    
    // Verificar se tabela existe
    const tables = await prisma.\$queryRaw\`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'customizations'
    \`;
    
    if (tables.length > 0) {
      console.log('✅ Tabela customizations existe');
    } else {
      console.log('❌ Tabela customizations não existe');
    }
    
  } catch (error) {
    console.error('❌ Erro no banco:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

checkDatabase();
"
```

---

## 📋 ME ENVIE OS RESULTADOS

Execute os comandos acima **um por um** e me envie os resultados de cada um.

Isso vai ajudar a identificar onde está o problema:

1. **Comando 1** - Teste básico do Node.js/Prisma
2. **Comando 2** - Verificar dados atuais
3. **Comando 3** - Tentar adicionar uma coluna
4. **Comando 4** - Logs do backend
5. **Comando 5** - Verificar banco de dados

---

**Execute e me envie os resultados! 🔍**
