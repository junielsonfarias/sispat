# 🔧 CORREÇÃO RÁPIDA - Customization

**Data:** 09/10/2025  
**Problema:** Tabela customizations sem constraint única

---

## 🚀 EXECUTE ESTES COMANDOS NO SERVIDOR

### **1. Recriar tabela customizations:**

```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCustomizations() {
  try {
    // Dropar tabela se existir
    await prisma.\$executeRaw\`DROP TABLE IF EXISTS customizations\`;
    console.log('✅ Tabela antiga removida');
    
    // Criar tabela com constraint única
    await prisma.\$executeRaw\`
      CREATE TABLE customizations (
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
    console.log('✅ Tabela recriada com constraint única');
    
    // Inserir dados padrão
    await prisma.\$executeRaw\`
      INSERT INTO customizations (municipality_id, municipality_name, logo_url, primary_color, secondary_color)
      VALUES ('municipality-1', 'Prefeitura Municipal', null, '#1e40af', '#3b82f6')
    \`;
    console.log('✅ Dados padrão inseridos');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

fixCustomizations();
"
```

### **2. Verificar se funcionou:**

```bash
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
```

### **3. Corrigir logo:**

```bash
cd /var/www/sispat

# Verificar se logo existe
ls -la src/assets/images/logo-government.svg

# Copiar logo para public
cp src/assets/images/logo-government.svg public/

# Verificar se foi copiado
ls -la public/logo-government.svg
```

### **4. Rebuild frontend:**

```bash
npm run build
```

### **5. Reiniciar backend:**

```bash
cd backend
pm2 restart sispat-backend
sleep 3
curl http://localhost:3000/api/health
```

### **6. Testar API customization:**

```bash
curl http://localhost:3000/api/customization/public
```

---

## 🎯 RESULTADO ESPERADO

Após executar todos os comandos:

- ✅ **Tabela customizations** criada corretamente
- ✅ **API customization funciona** (sem erro 500)
- ✅ **Dashboard carrega** todas as estatísticas
- ✅ **Logo aparece** (sem erro 404)

---

## 🔍 VERIFICAÇÃO FINAL

### **Teste no navegador:**

1. **Fazer login como supervisor**
2. **Ir no Dashboard**
3. **Verificar Console (F12):**
   - ✅ Sem erro 500
   - ✅ Sem erro 404
   - ✅ Dados carregando

---

**Execute os comandos um por um e me confirme o resultado! 🚀**
