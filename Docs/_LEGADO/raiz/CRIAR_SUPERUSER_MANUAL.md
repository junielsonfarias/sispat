# 🔧 Criar Superuser Manualmente

## 📋 Problema

O seed pode não ter sido executado durante a instalação, resultando em erro de "credenciais inválidas" ao tentar fazer login.

---

## ✅ SOLUÇÃO RÁPIDA

Execute no servidor:

```bash
cd /var/www/sispat/backend
bash VERIFICAR_E_CRIAR_SUPERUSER.sh
```

---

## 🔍 VERIFICAÇÃO MANUAL

Se preferir verificar manualmente:

### 1. Verificar se superuser existe

```bash
cd /var/www/sispat/backend

# Carregar variáveis do .env
source <(grep -v '^#' .env | sed 's/^/export /')

# Verificar email do superuser
echo "Email configurado: $SUPERUSER_EMAIL"

# Verificar no banco (requer acesso direto ao PostgreSQL)
# Ou usar Prisma Studio
npx prisma studio
```

### 2. Executar seed manualmente

```bash
cd /var/www/sispat/backend

# Carregar variáveis
export MUNICIPALITY_NAME="${MUNICIPALITY_NAME:-Município Exemplo}"
export STATE="${STATE:-SP}"
export SUPERUSER_EMAIL="${SUPERUSER_EMAIL:-admin@sispat.local}"
export SUPERUSER_PASSWORD="${SUPERUSER_PASSWORD:-admin123}"
export SUPERUSER_NAME="${SUPERUSER_NAME:-Administrador}"
export BCRYPT_ROUNDS="${BCRYPT_ROUNDS:-10}"

# Executar seed
npm run prisma:seed:prod
```

### 3. Verificar credenciais no .env

```bash
cd /var/www/sispat/backend
grep SUPERUSER .env
```

---

## 📝 CRIAR SUPERUSER VIA PRISMA STUDIO

### Opção 1: Via Interface Gráfica

```bash
cd /var/www/sispat/backend
npx prisma studio
```

Acesse `http://localhost:5555` (ou seu IP:5555) e:
1. Vá para a tabela `users`
2. Clique em "Add record"
3. Preencha os campos:
   - `email`: email do superuser
   - `password`: senha hash (use `bcrypt` para gerar)
   - `name`: nome do usuário
   - `role`: `superuser`
   - `municipalityId`: ID do município (ver na tabela `municipalities`)

### Opção 2: Via SQL Direto

```bash
cd /var/www/sispat/backend

# Conectar ao banco
psql $DATABASE_URL

# Ou usar Prisma para executar SQL
npx prisma db execute --stdin << EOF
INSERT INTO users (id, email, password, name, role, "municipalityId", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@sispat.local',
  '\$2b\$10\$...', -- Use bcrypt para gerar hash da senha
  'Administrador',
  'superuser',
  (SELECT id FROM municipalities LIMIT 1),
  NOW(),
  NOW()
);
EOF
```

---

## 🔐 GERAR HASH DA SENHA

Para criar um hash bcrypt da senha:

```bash
# Usando Node.js
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('sua_senha_aqui', 10).then(hash => console.log(hash));"
```

Ou usando o Prisma seed diretamente (ele já faz isso automaticamente).

---

## ✅ VERIFICAÇÃO FINAL

Após criar o superuser:

```bash
# Verificar se usuário foi criado
cd /var/www/sispat/backend
npx prisma studio
# Ou
npx prisma db execute --stdin <<< "SELECT email, role FROM users WHERE role = 'superuser';"
```

---

## 🚀 TESTAR LOGIN

1. Acesse: `http://sispat.vps-kinghost.net`
2. Use as credenciais:
   - **Email**: (valor de `SUPERUSER_EMAIL` no `.env`)
   - **Senha**: (valor de `SUPERUSER_PASSWORD` no `.env`)

---

**Data**: 2025-11-03  
**Status**: ✅ Script de verificação criado

