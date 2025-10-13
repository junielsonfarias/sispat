# ✅ SOLUÇÃO LOGO - EXECUÇÃO PASSO A PASSO

**Status:** Conexão com banco OK ✅  
**Próximo:** Adicionar colunas em partes menores

---

## 🚀 EXECUTE ESTES COMANDOS EM SEQUÊNCIA:

### **1. Adicionar colunas principais (logo):**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addLogoColumns() {
  try {
    console.log('🔧 Adicionando colunas de logo...');
    
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"activeLogoUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"secondaryLogoUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"municipalityId\" VARCHAR(255)
    \`;
    
    console.log('✅ Colunas de logo adicionadas!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

addLogoColumns();
"
```

### **2. Adicionar colunas de cores:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColorColumns() {
  try {
    console.log('🔧 Adicionando colunas de cores...');
    
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"primaryColor\" VARCHAR(7),
      ADD COLUMN IF NOT EXISTS \"backgroundColor\" VARCHAR(7),
      ADD COLUMN IF NOT EXISTS \"buttonTextColor\" VARCHAR(7)
    \`;
    
    console.log('✅ Colunas de cores adicionadas!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

addColorColumns();
"
```

### **3. Adicionar colunas de layout:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addLayoutColumns() {
  try {
    console.log('🔧 Adicionando colunas de layout...');
    
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"backgroundType\" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS \"layout\" VARCHAR(50) DEFAULT 'center',
      ADD COLUMN IF NOT EXISTS \"welcomeTitle\" TEXT,
      ADD COLUMN IF NOT EXISTS \"welcomeSubtitle\" TEXT
    \`;
    
    console.log('✅ Colunas de layout adicionadas!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

addLayoutColumns();
"
```

### **4. Adicionar colunas de branding:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addBrandingColumns() {
  try {
    console.log('🔧 Adicionando colunas de branding...');
    
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"browserTitle\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"faviconUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"fontFamily\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"loginFooterText\" TEXT,
      ADD COLUMN IF NOT EXISTS \"systemFooterText\" TEXT,
      ADD COLUMN IF NOT EXISTS \"superUserFooterText\" TEXT
    \`;
    
    console.log('✅ Colunas de branding adicionadas!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

addBrandingColumns();
"
```

### **5. Adicionar colunas de informações do município:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMunicipalityColumns() {
  try {
    console.log('🔧 Adicionando colunas do município...');
    
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"prefeituraName\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"secretariaResponsavel\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"departamentoResponsavel\" VARCHAR(255)
    \`;
    
    console.log('✅ Colunas do município adicionadas!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

addMunicipalityColumns();
"
```

### **6. Copiar dados existentes:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function copyData() {
  try {
    console.log('🔄 Copiando dados existentes...');
    
    // Copiar municipality_id para municipalityId
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"municipalityId\" = municipality_id 
      WHERE \"municipalityId\" IS NULL
    \`;
    console.log('✅ municipality_id copiado para municipalityId');
    
    // Copiar logo_url para activeLogoUrl
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"activeLogoUrl\" = logo_url 
      WHERE \"activeLogoUrl\" IS NULL AND logo_url IS NOT NULL
    \`;
    console.log('✅ logo_url copiado para activeLogoUrl');
    
    // Copiar primary_color para primaryColor
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"primaryColor\" = primary_color 
      WHERE \"primaryColor\" IS NULL AND primary_color IS NOT NULL
    \`;
    console.log('✅ primary_color copiado para primaryColor');
    
    console.log('🎉 Todos os dados copiados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

copyData();
"
```

### **7. Verificar resultado:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkResult() {
  try {
    console.log('🔍 Verificando resultado...');
    
    const result = await prisma.\$queryRaw\`
      SELECT \"municipalityId\", \"activeLogoUrl\", \"primaryColor\", \"prefeituraName\" 
      FROM customizations LIMIT 1
    \`;
    
    console.log('📊 Dados após correção:');
    console.log('- municipalityId:', result[0].municipalityId);
    console.log('- activeLogoUrl:', result[0].activeLogoUrl || 'null');
    console.log('- primaryColor:', result[0].primaryColor || 'null');
    console.log('- prefeituraName:', result[0].prefeituraName || 'null');
    
    console.log('');
    console.log('✅ Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

checkResult();
"
```

### **8. Reiniciar backend:**
```bash
cd /var/www/sispat/backend
pm2 restart sispat-backend
```

### **9. Testar API:**
```bash
sleep 3
curl http://localhost:3000/api/customization/public
```

---

## 📋 EXECUTE OS COMANDOS EM SEQUÊNCIA

Execute os comandos **1 a 9** em ordem, um por vez.

Se algum comando der erro, me envie o resultado e continuamos a partir dele.

---

**Vamos resolver isso passo a passo! 🚀**
