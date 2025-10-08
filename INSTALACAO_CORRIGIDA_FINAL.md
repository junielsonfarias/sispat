# ✅ INSTALAÇÃO CORRIGIDA - VERSÃO FINAL

**Data:** 08/10/2025  
**Status:** ✅ PRONTO PARA USO  
**Versão do Script:** Corrigida e Testada

---

## 🎯 **PROBLEMAS CORRIGIDOS**

### **1. API Subdomain Removido** ✅

**Antes (ERRADO):**
```
Frontend: http://sispat.vps-kinghost.net
API:      https://api.sispat.vps-kinghost.net  ← DNS não existe!
```

**Depois (CORRETO):**
```
Frontend: http://sispat.vps-kinghost.net
API:      http://sispat.vps-kinghost.net/api  ← Mesmo domínio!
```

**Benefícios:**
- ✅ Não precisa configurar DNS
- ✅ Funciona imediatamente
- ✅ Sem `ERR_CONNECTION_REFUSED`
- ✅ Mais simples e confiável

---

### **2. HTTPS Padrão Removido** ✅

**Antes (ERRADO):**
```
VITE_API_URL=https://api.domain  ← HTTPS sem SSL!
```

**Depois (CORRETO):**
```
VITE_API_URL=http://domain/api   ← HTTP (ou HTTPS se SSL configurado)
```

**Lógica:**
- Se `CONFIGURE_SSL=no` → usa `http://`
- Se `CONFIGURE_SSL=yes` → usa `https://`

---

### **3. Configurações de Segurança Aplicadas** ✅

- ✅ `BCRYPT_ROUNDS=12` (antes era 10)
- ✅ `RATE_LIMIT_MAX=5` (antes era 100)
- ✅ `MAX_REQUEST_SIZE=10mb` (antes era 50mb)
- ✅ `LOG_LEVEL=error` (antes era info)

---

## 🚀 **COMO USAR O SCRIPT CORRIGIDO**

### **Opção 1: Nova Instalação**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash
```

**Durante a instalação:**
1. Informe o domínio: `sispat.vps-kinghost.net`
2. Informe seu email: `junielsonfarias@gmail.com`
3. Crie uma senha FORTE (12+ caracteres): `Sispat@2025!Admin`
4. Configure SSL? `no` (pode configurar depois)

**Resultado:**
- ✅ Frontend compilado com `http://sispat.vps-kinghost.net/api`
- ✅ Backend configurado com `http://sispat.vps-kinghost.net`
- ✅ Funciona sem DNS adicional
- ✅ Login funcional imediatamente

---

### **Opção 2: Corrigir Instalação Existente**

Execute no servidor:

```bash
cd /var/www/sispat

# 1. Criar .env correto
cat > .env << 'EOF'
VITE_API_URL=http://sispat.vps-kinghost.net/api
VITE_USE_BACKEND=true
VITE_APP_NAME=SISPAT 2.0
VITE_APP_VERSION=2.0.0
VITE_APP_ENV=production
VITE_BUILD_OPTIMIZE=true
VITE_BUILD_COMPRESS=true
VITE_ENABLE_DEVTOOLS=false
VITE_ENABLE_LOGGING=false
EOF

# 2. Limpar e recompilar frontend
rm -rf dist/
pnpm run build:prod

# 3. Atualizar backend/.env
sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=http://sispat.vps-kinghost.net|' backend/.env
sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=http://sispat.vps-kinghost.net|' backend/.env
sed -i 's|BCRYPT_ROUNDS=.*|BCRYPT_ROUNDS=12|' backend/.env
sed -i 's|RATE_LIMIT_MAX=.*|RATE_LIMIT_MAX=5|' backend/.env

# 4. Atualizar Nginx
sudo sed -i 's/server_name .*/server_name sispat.vps-kinghost.net;/' /etc/nginx/sites-available/sispat

# 5. Testar Nginx
sudo nginx -t

# 6. Recarregar Nginx
sudo systemctl reload nginx

# 7. Reiniciar backend
cd backend
pm2 restart sispat-backend

# 8. Criar usuário com senha forte
sudo -u postgres psql -d sispat_prod -c "DELETE FROM users;"

export SUPERUSER_EMAIL="junielsonfarias@gmail.com"
export SUPERUSER_PASSWORD="Sispat@2025!Admin"
export SUPERUSER_NAME="Junielson Farias"
export BCRYPT_ROUNDS="12"

npm run prisma:seed

# 9. Verificar
curl http://sispat.vps-kinghost.net/api/health
pm2 status

echo ""
echo "✅ CORREÇÃO CONCLUÍDA!"
echo ""
echo "Acesse: http://sispat.vps-kinghost.net"
echo "Email: junielsonfarias@gmail.com"
echo "Senha: Sispat@2025!Admin"
echo ""
echo "⚠️  Limpe o cache do navegador (Ctrl+Shift+Delete)"
```

---

## 📊 **VERIFICAÇÃO PÓS-INSTALAÇÃO**

Execute no servidor:

```bash
# 1. Ver .env do frontend
cat /var/www/sispat/.env | grep VITE_API_URL

# Deve mostrar:
# VITE_API_URL=http://sispat.vps-kinghost.net/api  ✅

# NÃO deve mostrar:
# VITE_API_URL=https://api.sispat.vps-kinghost.net  ❌

# 2. Ver se frontend compilou com URL correta
grep -o "http://sispat.vps-kinghost.net/api" /var/www/sispat/dist/assets/*.js | head -1

# Deve retornar alguma linha ✅

# 3. Verificar Nginx
grep "server_name" /etc/nginx/sites-enabled/sispat

# Deve mostrar:
# server_name sispat.vps-kinghost.net;  ✅

# NÃO deve mostrar:
# server_name sispat.vps-kinghost.net api.sispat.vps-kinghost.net;  ❌

# 4. Testar API
curl http://sispat.vps-kinghost.net/api/health

# Deve retornar:
# {"status":"ok","timestamp":"..."}  ✅

# 5. Testar frontend
curl -s -o /dev/null -w "Status: %{http_code}\n" http://sispat.vps-kinghost.net

# Deve retornar:
# Status: 200  ✅

# 6. Ver usuários
sudo -u postgres psql -d sispat_prod -c "SELECT email, role FROM users;"

# Deve mostrar:
#            email            |    role
# ---------------------------+------------
#  junielsonfarias@gmail.com | superuser
```

---

## 🎯 **CREDENCIAIS DE ACESSO**

```
URL:   http://sispat.vps-kinghost.net
Email: junielsonfarias@gmail.com
Senha: Sispat@2025!Admin
```

**Requisitos da senha (agora obrigatórios):**
- ✅ Mínimo 12 caracteres
- ✅ Pelo menos 1 maiúscula
- ✅ Pelo menos 1 minúscula
- ✅ Pelo menos 1 número
- ✅ Pelo menos 1 símbolo (@$!%*?&)

---

## 📝 **LOGS DA INSTALAÇÃO CORRETA**

### **Durante `configure_environment`:**
```
[HH:MM:SS] Configurando variáveis de ambiente...
  → Protocolo: http
  → URL Frontend: http://sispat.vps-kinghost.net
  → URL API: http://sispat.vps-kinghost.net/api
✓ Variáveis de ambiente configuradas
     Frontend API: http://sispat.vps-kinghost.net/api
     Backend CORS: http://sispat.vps-kinghost.net
```

### **Durante `configure_nginx`:**
```
[HH:MM:SS] Configurando Nginx...
  → Domínio: sispat.vps-kinghost.net
  → API: sispat.vps-kinghost.net/api
✓ Nginx configurado: sispat.vps-kinghost.net
```

### **Durante `setup_database`:**
```
🌱 Iniciando seed do banco de dados...
📍 Criando município...
✅ Município criado: [Nome do Município]
🏢 Criando setores...
✅ 3 setores criados
👥 Criando superusuário...
   Email: junielsonfarias@gmail.com
✅ Superusuário criado com sucesso!
```

### **Mensagem Final:**
```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║                  🔐 SUAS CREDENCIAIS DE ACESSO                    ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

👤 SUPERUSUÁRIO (Controle Total do Sistema):

     📧 Email: junielsonfarias@gmail.com
     🔑 Senha: Sispat@2025!Admin
     👤 Nome:  Junielson Farias
```

---

## 🔍 **TROUBLESHOOTING**

### **Se ainda der `ERR_CONNECTION_REFUSED`:**

```bash
# 1. Ver qual URL o frontend está usando
cd /var/www/sispat
grep -o "https\?://[^\"']*api[^\"']*" dist/assets/*.js | head -3

# Se mostrar api.sispat... (errado):
# - Recompile com comando acima (Opção 2)

# Se mostrar sispat.../api (correto):
# - Limpe cache do navegador
# - Teste novamente
```

### **Se login der "Credenciais inválidas":**

```bash
# Ver usuários no banco
sudo -u postgres psql -d sispat_prod -c "SELECT email, role FROM users;"

# Se não tiver usuário:
cd /var/www/sispat/backend
export SUPERUSER_EMAIL="junielsonfarias@gmail.com"
export SUPERUSER_PASSWORD="Sispat@2025!Admin"
export SUPERUSER_NAME="Junielson Farias"
npm run prisma:seed
```

---

## 📁 **COMMITS REALIZADOS**

1. **2787589** - Fix install script to use same domain for API
   - Removido API_DOMAIN
   - URL corrigida para http://domain/api
   - BCRYPT_ROUNDS = 12
   - RATE_LIMIT_MAX = 5
   - Sem necessidade de DNS adicional

2. **f8f5fb1** - Apply all production security fixes
   - Console.log desabilitado
   - JWT_SECRET validado
   - Senhas fortes obrigatórias

3. **723548c** - Improve user creation
   - Apenas 1 superusuário
   - Credenciais do install script

---

## ✅ **CHECKLIST FINAL**

- [x] Script atualizado no GitHub
- [x] API usa mesmo domínio (/api)
- [x] HTTP por padrão (HTTPS se SSL)
- [x] Nginx simplificado (1 domínio)
- [x] Sem necessidade de DNS adicional
- [x] Senha forte obrigatória (12+ chars)
- [x] Bcrypt rounds = 12
- [x] Rate limiting = 5/15min
- [x] Upload limit = 10mb
- [x] Console.log desabilitado em produção
- [x] JWT_SECRET validado

---

## 🚀 **PRÓXIMO PASSO**

Execute no servidor:

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash
```

Quando perguntar:
- Domínio: `sispat.vps-kinghost.net`
- Email: `junielsonfarias@gmail.com`
- Senha: `Sispat@2025!Admin` (ou outra senha forte)
- SSL: `no` (pode configurar depois)

---

**🎉 Agora vai funcionar perfeitamente sem precisar configurar DNS!**
