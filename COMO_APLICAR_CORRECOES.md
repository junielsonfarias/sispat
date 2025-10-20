# 🚀 Como Aplicar as Correções no Servidor

## ⚡ Solução Rápida (Recomendado)

Se você já tem o sistema parcialmente instalado e com problemas, execute:

### No Servidor VPS:

```bash
# 1. Baixar script de correção atualizado
cd ~
wget https://raw.githubusercontent.com/SEU_USUARIO/sispat/main/fix-build-error.sh
chmod +x fix-build-error.sh

# 2. Executar
sudo bash fix-build-error.sh
```

Este script vai:
- ✅ Recompilar frontend e backend
- ✅ Criar tabela ficha_templates com coluna type
- ✅ Conceder todas as permissões ao banco
- ✅ Executar seed completo
- ✅ Configurar Nginx corretamente
- ✅ Iniciar a aplicação

**Tempo estimado:** 5-10 minutos

---

## 🆕 Instalação Nova (Do Zero)

Se você ainda não instalou ou quer começar do zero:

```bash
# 1. Baixar script atualizado
cd ~
wget https://raw.githubusercontent.com/SEU_USUARIO/sispat/main/install.sh
chmod +x install.sh

# 2. Executar instalação
sudo bash install.sh
```

O script atualizado já inclui todas as correções!

---

## 🔧 Correção Manual (Se Preferir)

### Passo 1: Corrigir Tabela ficha_templates

```bash
sudo -u postgres psql -d sispat_prod << 'EOF'
-- Criar tabela com todas as colunas
CREATE TABLE IF NOT EXISTS "ficha_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "layout" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "municipality_id" TEXT NOT NULL,
    CONSTRAINT "ficha_templates_pkey" PRIMARY KEY ("id")
);

-- Criar índices
CREATE INDEX IF NOT EXISTS "ficha_templates_municipality_id_idx" ON "ficha_templates"("municipality_id");
CREATE INDEX IF NOT EXISTS "ficha_templates_is_default_idx" ON "ficha_templates"("is_default");
CREATE INDEX IF NOT EXISTS "ficha_templates_type_idx" ON "ficha_templates"("type");

-- Foreign key
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ficha_templates_municipality_id_fkey'
    ) THEN
        ALTER TABLE "ficha_templates" ADD CONSTRAINT "ficha_templates_municipality_id_fkey" 
            FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Permissões
GRANT ALL PRIVILEGES ON SCHEMA public TO sispat_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sispat_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sispat_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sispat_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sispat_user;
EOF
```

### Passo 2: Executar Seed

```bash
cd /var/www/sispat/backend
npm run prisma:seed
```

### Passo 3: Corrigir Nginx

```bash
# Remover configuração padrão
sudo rm -f /etc/nginx/sites-enabled/default

# Criar configuração do SISPAT (se não existir)
sudo tee /etc/nginx/sites-available/sispat > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name SEU_DOMINIO_AQUI;
    
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /uploads/ {
        alias /var/www/sispat/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    location /health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }
}
EOF

# Ativar site
sudo ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/

# Testar e recarregar
sudo nginx -t
sudo systemctl reload nginx
```

**⚠️ IMPORTANTE:** Substitua `SEU_DOMINIO_AQUI` pelo seu domínio real!

### Passo 4: Reiniciar Aplicação

```bash
cd /var/www/sispat/backend
pm2 restart sispat-backend
```

---

## ✅ Validação

Após aplicar as correções, valide:

```bash
# 1. API funcionando?
curl http://localhost:3000/api/health
# Esperado: {"status":"ok"...}

# 2. Frontend correto?
curl http://localhost | head -10
# Esperado: HTML do SISPAT (NÃO "Welcome to nginx!")

# 3. PM2 online?
pm2 status
# Esperado: sispat-backend - online

# 4. Nginx configurado?
ls -la /etc/nginx/sites-enabled/
# Esperado: link para sispat (NÃO default)

# 5. Tabela existe?
sudo -u postgres psql -d sispat_prod -c "SELECT COUNT(*) FROM ficha_templates;"
# Esperado: Retorna número (pode ser 0)

# 6. Permissões OK?
sudo -u postgres psql -d sispat_prod -c "\dp ficha_templates"
# Esperado: sispat_user com permissões
```

---

## 🌐 Acessar o Sistema

Após validação bem-sucedida, acesse:

**URL:** `http://seu-dominio.com`

**Credenciais Padrão:**
- **Email:** `admin@sistema.com`
- **Senha:** `Tiko6273@` (ou a senha que você configurou)

**⚠️ IMPORTANTE:** Altere a senha após o primeiro acesso!

---

## 🐛 Se Ainda Houver Problemas

### Problema: Nginx ainda mostra página padrão

```bash
# Verificar qual configuração está ativa
ls -la /etc/nginx/sites-enabled/

# Se ainda tiver 'default', remover:
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Problema: API não responde

```bash
# Ver logs do PM2
pm2 logs sispat-backend --lines 50

# Reiniciar
pm2 restart sispat-backend

# Ver status
pm2 status
```

### Problema: Erro no seed

```bash
# Verificar permissões
sudo -u postgres psql -d sispat_prod -c "\dp"

# Ver se tabela existe
sudo -u postgres psql -d sispat_prod -c "\dt"

# Verificar colunas da tabela
sudo -u postgres psql -d sispat_prod -c "\d ficha_templates"
```

### Problema: Frontend não carrega

```bash
# Verificar se dist existe
ls -la /var/www/sispat/dist/

# Se não existir, recompilar:
cd /var/www/sispat
npm run build

# Verificar permissões
sudo chown -R www-data:www-data /var/www/sispat/dist
```

---

## 📞 Suporte Adicional

Se nada funcionar:

1. Reúna informações de diagnóstico:
```bash
# Salvar logs
pm2 logs sispat-backend --lines 200 > ~/sispat-pm2.log
sudo nginx -T > ~/sispat-nginx.log
sudo -u postgres psql -d sispat_prod -c "\dt" > ~/sispat-tables.log
ls -laR /var/www/sispat/dist/ > ~/sispat-dist.log
```

2. Verifique:
   - `/tmp/build-*.log`
   - `/var/log/nginx/error.log`
   - `pm2 logs sispat-backend`

3. Abra issue no GitHub com:
   - Descrição do problema
   - Logs coletados
   - Output dos comandos de validação

---

## 🎯 Resumo dos Comandos

### Solução Mais Rápida (Tudo de Uma Vez):

```bash
# No servidor
wget https://raw.githubusercontent.com/SEU_USUARIO/sispat/main/fix-build-error.sh
chmod +x fix-build-error.sh
sudo bash fix-build-error.sh
```

### Validação Rápida:

```bash
curl http://localhost:3000/api/health && \
curl http://localhost | head -1 && \
pm2 status && \
echo "Tudo OK!" || echo "Há problemas!"
```

---

**Última Atualização:** 13/10/2025  
**Versão dos Scripts:** 2.0.2  
**Status:** ✅ Testado e Aprovado

