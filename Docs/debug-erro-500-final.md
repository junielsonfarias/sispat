# 🔍 DEBUG - ERRO 500 FINAL

**Problema:** PUT /api/customization ainda retorna 500

---

## 🚨 EXECUTE ESTES COMANDOS PARA DIAGNOSTICAR:

### **1. Verificar logs do backend:**
```bash
cd /var/www/sispat
pm2 logs sispat-backend --lines 30 | grep -E "(customization|Customization|PUT|500|error|Error|saveCustomization)"
```

### **2. Verificar se todas as colunas foram criadas:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const columns = await prisma.\$queryRaw\`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customizations'
      ORDER BY column_name
    \`;
    
    console.log('📋 Total de colunas:', columns.length);
    console.log('📋 Colunas:');
    columns.forEach(col => console.log('- ' + col.column_name));
    
    // Verificar colunas específicas
    const required = ['backgroundType', 'activeLogoUrl', 'municipalityId'];
    console.log('');
    console.log('🔍 Verificando colunas críticas:');
    required.forEach(col => {
      const exists = columns.some(c => c.column_name === col);
      console.log('- ' + col + ': ' + (exists ? '✅' : '❌'));
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

checkColumns();
"
```

### **3. Testar inserção manual simples:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSimpleInsert() {
  try {
    console.log('🧪 Testando inserção simples...');
    
    // Testar apenas com campos que sabemos que existem
    const result = await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"activeLogoUrl\" = 'data:image/png;base64,test123',
          \"primaryColor\" = '#1e40af',
          \"updated_at\" = CURRENT_TIMESTAMP
      WHERE \"municipalityId\" = 'municipality-1'
      RETURNING id, \"activeLogoUrl\", \"primaryColor\"
    \`;
    
    console.log('✅ Teste de inserção bem-sucedido!');
    console.log('Resultado:', result);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('Código:', error.code);
  } finally {
    await prisma.\$disconnect();
  }
}

testSimpleInsert();
"
```

### **4. Verificar controller de customization:**
```bash
cd /var/www/sispat/backend
echo "=== LINHA 175 DO CONTROLLER ==="
sed -n '170,180p' src/controllers/customizationController.ts
```

### **5. Testar com dados mínimos via curl:**
```bash
cd /var/www/sispat/backend

# Primeiro, obter um token válido
echo "🔑 Testando com token de autenticação..."

# Testar endpoint público primeiro
curl -v http://localhost:3000/api/customization/public
```

### **6. Verificar se o problema é no mapeamento de campos:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFieldMapping() {
  try {
    console.log('🔍 Testando mapeamento de campos...');
    
    // Verificar se conseguimos ler os dados atuais
    const current = await prisma.\$queryRaw\`
      SELECT * FROM customizations LIMIT 1
    \`;
    
    console.log('📊 Dados atuais:');
    console.log(JSON.stringify(current[0], null, 2));
    
    // Testar UPDATE com campos específicos
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"activeLogoUrl\" = 'test-logo-url'
      WHERE id = 1
    \`;
    
    console.log('✅ UPDATE com activeLogoUrl funcionou!');
    
    // Verificar se foi salvo
    const updated = await prisma.\$queryRaw\`
      SELECT \"activeLogoUrl\" FROM customizations WHERE id = 1
    \`;
    
    console.log('📊 Logo salva:', updated[0].activeLogoUrl);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.\$disconnect();
  }
}

testFieldMapping();
"
```

---

## 📋 ME ENVIE OS RESULTADOS

Execute os comandos acima e me envie os resultados:

1. **Comando 1** - Logs do backend
2. **Comando 2** - Verificação de colunas
3. **Comando 3** - Teste de inserção simples
4. **Comando 4** - Controller de customization
5. **Comando 5** - Teste de endpoint público
6. **Comando 6** - Teste de mapeamento de campos

---

**Com essas informações, posso identificar exatamente onde está o problema! 🔍**
