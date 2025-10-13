# 🔍 DEBUG - ERRO 500 AO SALVAR CUSTOMIZAÇÃO

**Problema:** PUT /api/customization retorna 500 Internal Server Error

---

## 🚨 EXECUTE ESTES COMANDOS PARA DIAGNOSTICAR:

### **1. Verificar logs do backend em tempo real:**
```bash
cd /var/www/sispat
pm2 logs sispat-backend --lines 50 | grep -E "(customization|Customization|PUT|500|error|Error|saveCustomization)"
```

### **2. Testar endpoint PUT diretamente:**
```bash
cd /var/www/sispat/backend

# Testar com dados mínimos
curl -X PUT http://localhost:3000/api/customization \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "activeLogoUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "primaryColor": "#1e40af"
  }'
```

### **3. Verificar se todas as colunas necessárias existem:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllColumns() {
  try {
    console.log('🔍 Verificando todas as colunas...');
    
    const columns = await prisma.\$queryRaw\`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customizations'
      ORDER BY column_name
    \`;
    
    console.log('📋 Colunas existentes:');
    columns.forEach(col => console.log('- ' + col.column_name));
    
    // Verificar colunas específicas que o controller usa
    const requiredColumns = [
      'activeLogoUrl', 'secondaryLogoUrl', 'backgroundType', 'backgroundColor',
      'backgroundImageUrl', 'backgroundVideoUrl', 'videoLoop', 'videoMuted',
      'layout', 'welcomeTitle', 'welcomeSubtitle', 'primaryColor', 'buttonTextColor',
      'fontFamily', 'browserTitle', 'faviconUrl', 'loginFooterText', 
      'systemFooterText', 'superUserFooterText', 'prefeituraName', 
      'secretariaResponsavel', 'departamentoResponsavel'
    ];
    
    console.log('');
    console.log('🔍 Verificando colunas necessárias:');
    
    for (const col of requiredColumns) {
      const exists = columns.some(c => c.column_name === col);
      console.log('- ' + col + ': ' + (exists ? '✅' : '❌'));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

checkAllColumns();
"
```

### **4. Adicionar colunas que faltam:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMissingColumns() {
  try {
    console.log('🔧 Adicionando colunas que faltam...');
    
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"backgroundType\" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS \"backgroundImageUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"backgroundVideoUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"videoLoop\" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS \"videoMuted\" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS \"layout\" VARCHAR(50) DEFAULT 'center',
      ADD COLUMN IF NOT EXISTS \"welcomeTitle\" TEXT,
      ADD COLUMN IF NOT EXISTS \"welcomeSubtitle\" TEXT,
      ADD COLUMN IF NOT EXISTS \"fontFamily\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"browserTitle\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"faviconUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"loginFooterText\" TEXT,
      ADD COLUMN IF NOT EXISTS \"systemFooterText\" TEXT,
      ADD COLUMN IF NOT EXISTS \"superUserFooterText\" TEXT,
      ADD COLUMN IF NOT EXISTS \"prefeituraName\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"secretariaResponsavel\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"departamentoResponsavel\" VARCHAR(255)
    \`;
    
    console.log('✅ Todas as colunas adicionadas!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

addMissingColumns();
"
```

### **5. Verificar controller de customization:**
```bash
cd /var/www/sispat/backend
head -50 src/controllers/customizationController.ts
```

### **6. Testar inserção manual:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInsert() {
  try {
    console.log('🧪 Testando inserção manual...');
    
    const testData = {
      activeLogoUrl: 'data:image/png;base64,test123',
      primaryColor: '#1e40af',
      municipalityId: 'municipality-1'
    };
    
    const result = await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"activeLogoUrl\" = \${testData.activeLogoUrl},
          \"primaryColor\" = \${testData.primaryColor},
          \"updated_at\" = CURRENT_TIMESTAMP
      WHERE \"municipalityId\" = \${testData.municipalityId}
      RETURNING *
    \`;
    
    console.log('✅ Teste de inserção bem-sucedido!');
    console.log('Resultado:', result);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.\$disconnect();
  }
}

testInsert();
"
```

---

## 📋 ME ENVIE OS RESULTADOS

Execute os comandos acima e me envie os resultados:

1. **Comando 1** - Logs do backend
2. **Comando 2** - Teste do endpoint PUT
3. **Comando 3** - Verificação de colunas
4. **Comando 4** - Adicionar colunas faltantes
5. **Comando 5** - Controller de customization
6. **Comando 6** - Teste de inserção manual

---

**Com essas informações, posso identificar exatamente onde está o erro! 🔍**
