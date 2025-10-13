# ⚡ EXECUÇÃO RÁPIDA - CORREÇÃO LOGO

**Execute estes comandos NO SERVIDOR em sequência:**

---

## 📋 COMANDO ÚNICO (COPIE E COLE)

```bash
cd /var/www/sispat/backend && node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function fix() { try { console.log('🔧 Adicionando colunas...'); await prisma.\$executeRaw\`ALTER TABLE customizations ADD COLUMN IF NOT EXISTS \"activeLogoUrl\" TEXT, ADD COLUMN IF NOT EXISTS \"secondaryLogoUrl\" TEXT, ADD COLUMN IF NOT EXISTS \"municipalityId\" VARCHAR(255), ADD COLUMN IF NOT EXISTS \"primaryColor\" VARCHAR(7), ADD COLUMN IF NOT EXISTS \"backgroundColor\" VARCHAR(7), ADD COLUMN IF NOT EXISTS \"backgroundType\" VARCHAR(50), ADD COLUMN IF NOT EXISTS \"backgroundImageUrl\" TEXT, ADD COLUMN IF NOT EXISTS \"backgroundVideoUrl\" TEXT, ADD COLUMN IF NOT EXISTS \"videoLoop\" BOOLEAN DEFAULT true, ADD COLUMN IF NOT EXISTS \"videoMuted\" BOOLEAN DEFAULT true, ADD COLUMN IF NOT EXISTS \"layout\" VARCHAR(50) DEFAULT 'center', ADD COLUMN IF NOT EXISTS \"welcomeTitle\" TEXT, ADD COLUMN IF NOT EXISTS \"welcomeSubtitle\" TEXT, ADD COLUMN IF NOT EXISTS \"buttonTextColor\" VARCHAR(7), ADD COLUMN IF NOT EXISTS \"fontFamily\" VARCHAR(255), ADD COLUMN IF NOT EXISTS \"browserTitle\" VARCHAR(255), ADD COLUMN IF NOT EXISTS \"faviconUrl\" TEXT, ADD COLUMN IF NOT EXISTS \"loginFooterText\" TEXT, ADD COLUMN IF NOT EXISTS \"systemFooterText\" TEXT, ADD COLUMN IF NOT EXISTS \"superUserFooterText\" TEXT, ADD COLUMN IF NOT EXISTS \"prefeituraName\" VARCHAR(255), ADD COLUMN IF NOT EXISTS \"secretariaResponsavel\" VARCHAR(255), ADD COLUMN IF NOT EXISTS \"departamentoResponsavel\" VARCHAR(255)\`; console.log('✅ Colunas adicionadas'); console.log('🔄 Copiando dados...'); await prisma.\$executeRaw\`UPDATE customizations SET \"municipalityId\" = municipality_id WHERE \"municipalityId\" IS NULL\`; await prisma.\$executeRaw\`UPDATE customizations SET \"activeLogoUrl\" = logo_url WHERE \"activeLogoUrl\" IS NULL AND logo_url IS NOT NULL\`; await prisma.\$executeRaw\`UPDATE customizations SET \"primaryColor\" = primary_color WHERE \"primaryColor\" IS NULL AND primary_color IS NOT NULL\`; console.log('✅ Dados copiados'); const result = await prisma.\$queryRaw\`SELECT \"municipalityId\", \"activeLogoUrl\", \"primaryColor\" FROM customizations LIMIT 1\`; console.log('📊 Resultado:', result[0]); } catch (error) { console.error('❌ Erro:', error.message); } finally { await prisma.\$disconnect(); } } fix();" && cd /var/www/sispat/backend && pm2 restart sispat-backend && sleep 3 && curl -s http://localhost:3000/api/customization/public | head -30
```

---

## 📋 OU EXECUTE PASSO A PASSO:

### **1. Adicionar colunas e copiar dados:**
```bash
cd /var/www/sispat/backend

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  try {
    console.log('🔧 Adicionando colunas...');
    
    await prisma.\$executeRaw\`
      ALTER TABLE customizations 
      ADD COLUMN IF NOT EXISTS \"activeLogoUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"secondaryLogoUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"municipalityId\" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS \"primaryColor\" VARCHAR(7),
      ADD COLUMN IF NOT EXISTS \"backgroundColor\" VARCHAR(7),
      ADD COLUMN IF NOT EXISTS \"backgroundType\" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS \"backgroundImageUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"backgroundVideoUrl\" TEXT,
      ADD COLUMN IF NOT EXISTS \"videoLoop\" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS \"videoMuted\" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS \"layout\" VARCHAR(50) DEFAULT 'center',
      ADD COLUMN IF NOT EXISTS \"welcomeTitle\" TEXT,
      ADD COLUMN IF NOT EXISTS \"welcomeSubtitle\" TEXT,
      ADD COLUMN IF NOT EXISTS \"buttonTextColor\" VARCHAR(7),
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
    console.log('✅ Colunas adicionadas');
    
    console.log('🔄 Copiando dados...');
    
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"municipalityId\" = municipality_id 
      WHERE \"municipalityId\" IS NULL
    \`;
    
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"activeLogoUrl\" = logo_url 
      WHERE \"activeLogoUrl\" IS NULL AND logo_url IS NOT NULL
    \`;
    
    await prisma.\$executeRaw\`
      UPDATE customizations 
      SET \"primaryColor\" = primary_color 
      WHERE \"primaryColor\" IS NULL AND primary_color IS NOT NULL
    \`;
    
    console.log('✅ Dados copiados');
    
    const result = await prisma.\$queryRaw\`
      SELECT \"municipalityId\", \"activeLogoUrl\", \"primaryColor\" 
      FROM customizations LIMIT 1
    \`;
    console.log('📊 Resultado:', result[0]);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

fix();
"
```

### **2. Reiniciar backend:**
```bash
cd /var/www/sispat/backend
pm2 restart sispat-backend
```

### **3. Aguardar e testar:**
```bash
sleep 3
curl http://localhost:3000/api/customization/public
```

---

## ✅ RESULTADO ESPERADO

Você deve ver uma resposta JSON com a estrutura:

```json
{
  "customization": {
    "id": "...",
    "municipalityId": "municipality-1",
    "activeLogoUrl": null,
    "primaryColor": "#1e40af",
    "prefeituraName": "Prefeitura Municipal",
    ...
  }
}
```

---

## 🎯 APÓS EXECUTAR

1. Acesse o sistema no navegador
2. Vá em **Personalização > Gerenciar Logos**
3. Faça upload de uma logo
4. Clique em **Salvar**
5. Abra outro navegador
6. Acesse o sistema
7. ✅ **A logo deve aparecer!**

---

**EXECUTE AGORA NO SERVIDOR! 🚀**

