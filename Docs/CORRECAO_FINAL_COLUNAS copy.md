# ✅ CORREÇÃO FINAL - COLUNAS FALTANTES

**Problema:** Column "backgroundType" does not exist  
**Solução:** Adicionar todas as colunas necessárias

---

## 🚀 EXECUTE ESTES COMANDOS EM SEQUÊNCIA:

### **1. Adicionar colunas de background:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addBackgroundColumns() {
  try {
    console.log('🔧 Adicionando colunas de background...');
    
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"backgroundType\" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS \"backgroundImageUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"backgroundVideoUrl\" TEXT
    \`;
    
    console.log('✅ Colunas de background adicionadas!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

addBackgroundColumns();
"
```

### **2. Adicionar colunas de vídeo:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addVideoColumns() {
  try {
    console.log('🔧 Adicionando colunas de vídeo...');
    
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"videoLoop\" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS \"videoMuted\" BOOLEAN DEFAULT true
    \`;
    
    console.log('✅ Colunas de vídeo adicionadas!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

addVideoColumns();
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
      ADD COLUMN IF NOT EXISTS \"layout\" VARCHAR(50) DEFAULT 'center',
      ADD COLUMN IF NOT EXISTS \"welcomeTitle\" TEXT,
      ADD COLUMN IF NOT EXISTS \"welcomeSubtitle\" TEXT,
      ADD COLUMN IF NOT EXISTS \"fontFamily\" VARCHAR(255)
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

### **5. Adicionar colunas do município:**
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

### **6. Verificar todas as colunas:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyColumns() {
  try {
    console.log('🔍 Verificando todas as colunas...');
    
    const columns = await prisma.\$queryRaw\`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customizations'
      ORDER BY column_name
    \`;
    
    console.log('📋 Colunas existentes (' + columns.length + '):');
    columns.forEach(col => console.log('- ' + col.column_name));
    
    // Verificar se backgroundType existe
    const hasBackgroundType = columns.some(c => c.column_name === 'backgroundType');
    console.log('');
    console.log('✅ backgroundType existe:', hasBackgroundType);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

verifyColumns();
"
```

### **7. Reiniciar backend:**
```bash
cd /var/www/sispat/backend
pm2 restart sispat-backend
```

### **8. Testar API:**
```bash
sleep 3
curl http://localhost:3000/api/customization/public
```

---

## 📋 EXECUTE EM SEQUÊNCIA

Execute os comandos **1 a 8** em ordem. 

Após isso, tente salvar a logo novamente no sistema.

---

**Vamos resolver isso definitivamente! 🚀**
