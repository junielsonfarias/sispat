# ✅ SEED MINIMALISTA APLICADO - SISPAT 2.0

**Data:** 08/10/2025  
**Status:** ✅ IMPLEMENTADO

---

## 🎯 **O QUE FOI ALTERADO**

### **❌ Antes (Seed com dados de teste):**
```
✓ 1 Município
✓ 3 Setores (Administração, Educação, Saúde)
✓ 2 Locais (Prédio Principal, Almoxarifado)
✓ 3 Tipos de Bens (Móveis, Informática, Veículos)
✓ 3 Formas de Aquisição (Compra, Doação, Transferência)
✓ 1 Superusuário
```

### **✅ Depois (Seed mínimo):**
```
✓ 1 Município (configurável)
✓ 1 Superusuário (você)
✓ 1 Supervisor (operacional)
```

**Sem:** Setores, Locais, Tipos ou Formas pré-configurados!

---

## 🔐 **USUÁRIOS CRIADOS**

### **1. Superusuário** (Controle Total)
- Email: Configurado na instalação
- Senha: Configurada na instalação
- Role: `superuser`
- Setores: `[]` (acesso total)

### **2. Supervisor** (Gestão Operacional)
- Email: Configurado na instalação
- Senha: Configurada na instalação  
- Role: `supervisor`
- Setores: `[]` (será configurado depois)

---

## 📝 **CONFIGURAÇÃO INICIAL APÓS INSTALAÇÃO**

### **Passo 1: Login como Superusuário**
```
Email: [seu email configurado]
Senha: [sua senha configurada]
```

### **Passo 2: Configurar Setores**
```
Administração → Gerenciar Setores → Novo Setor

Exemplos:
- Secretaria de Administração (código: 001)
- Secretaria de Educação (código: 002)
- Secretaria de Saúde (código: 003)
- Secretaria de Obras (código: 004)
```

### **Passo 3: Configurar Locais**
```
Administração → Gerenciar Locais → Novo Local

Exemplos:
- Prédio Principal (Setor: Administração)
- Almoxarifado Central (Setor: Administração)
- Escola Municipal (Setor: Educação)
- Posto de Saúde (Setor: Saúde)
```

### **Passo 4: Configurar Tipos de Bens**
```
Administração → Gerenciar Tipos de Bens → Novo Tipo

Exemplos:
- Móveis e Utensílios (vida útil: 10 anos, depreciação: 10%)
- Equipamentos de Informática (vida útil: 5 anos, depreciação: 20%)
- Veículos (vida útil: 10 anos, depreciação: 20%)
- Imóveis (vida útil: 50 anos, depreciação: 2%)
```

### **Passo 5: Configurar Formas de Aquisição**
```
Administração → Formas de Aquisição → Nova Forma

Exemplos:
- Compra
- Doação
- Transferência
- Permuta
```

### **Passo 6: Atribuir Setores ao Supervisor**
```
Administração → Gerenciar Usuários → Editar Supervisor
→ Setores Responsáveis: [selecionar setores]
→ Salvar
```

### **Passo 7: Alterar Senhas**
```
Perfil → Alterar Senha
→ Use senhas fortes (12+ caracteres)
```

---

## 🔧 **PARA APLICAR NO SERVIDOR ATUAL**

Execute no servidor:

```bash
cd /var/www/sispat

# 1. Puxar seed atualizado
git pull origin main

# 2. Limpar banco atual
cd backend
sudo -u postgres psql -d sispat_prod << 'EOF'
-- Limpar dados antigos (mantém estrutura)
TRUNCATE TABLE "patrimonios" CASCADE;
TRUNCATE TABLE "imoveis" CASCADE;
TRUNCATE TABLE "users" CASCADE;
TRUNCATE TABLE "sectors" CASCADE;
TRUNCATE TABLE "locais" CASCADE;
TRUNCATE TABLE "tipos_bens" CASCADE;
TRUNCATE TABLE "acquisition_forms" CASCADE;
EOF

# 3. Executar seed minimalista
export SUPERUSER_EMAIL="junielsonfarias@gmail.com"
export SUPERUSER_PASSWORD="Sispat@2025!Admin"
export SUPERUSER_NAME="Junielson Farias"
export SUPERVISOR_EMAIL="supervisor@ssbv.com"
export SUPERVISOR_PASSWORD="Supervisor@2025!"
export SUPERVISOR_NAME="Supervisor SSBV"
export MUNICIPALITY_NAME="Prefeitura de São Sebastião da Boa Vista"
export STATE="PA"
export BCRYPT_ROUNDS="12"

npm run prisma:seed

# 4. Verificar usuários criados
sudo -u postgres psql -d sispat_prod -c "SELECT email, role FROM users ORDER BY role;"

# Deve mostrar:
#            email            |    role
# ---------------------------+------------
#  supervisor@ssbv.com       | supervisor
#  junielsonfarias@gmail.com | superuser

# 5. Verificar que NÃO tem setores/locais/tipos
sudo -u postgres psql -d sispat_prod -c "SELECT COUNT(*) as setores FROM sectors;"
sudo -u postgres psql -d sispat_prod -c "SELECT COUNT(*) as locais FROM locais;"
sudo -u postgres psql -d sispat_prod -c "SELECT COUNT(*) as tipos FROM tipos_bens;"

# Deve mostrar 0 para todos ✅

# 6. Recompilar e reiniciar
npm run build
pm2 restart sispat-backend

echo ""
echo "✅ SEED MINIMALISTA APLICADO!"
echo ""
echo "📝 Credenciais:"
echo "   Superusuário: junielsonfarias@gmail.com / Sispat@2025!Admin"
echo "   Supervisor:   supervisor@ssbv.com / Supervisor@2025!"
echo ""
echo "🔧 Configure agora pelo painel:"
echo "   1. Setores"
echo "   2. Locais"
echo "   3. Tipos de Bens"
echo "   4. Formas de Aquisição"
```

---

## 📊 **BENEFÍCIOS**

### **✅ Produção Limpa:**
- Sem dados de teste/desenvolvimento
- Apenas o essencial para começar
- Configuração personalizada pelo cliente

### **✅ Mais Seguro:**
- Credenciais configuradas na instalação
- Sem usuários/dados pré-definidos
- Cada instalação é única

### **✅ Mais Profissional:**
- Cliente configura seus próprios setores
- Dados específicos da organização
- Sem referências genéricas

---

## 🎯 **PRÓXIMA INSTALAÇÃO**

Quando executar o script novamente, você será perguntado:

```
PERGUNTA 1: Domínio → sispat.vps-kinghost.net
PERGUNTA 2: Seu email → junielsonfarias@gmail.com
PERGUNTA 3: Seu nome → Junielson Farias
PERGUNTA 4: Email supervisor → supervisor@ssbv.com
PERGUNTA 5: Senha supervisor → Supervisor@2025!
PERGUNTA 6: Nome supervisor → Supervisor SSBV
PERGUNTA 7: Senha do banco → [ENTER para padrão]
PERGUNTA 8: Nome do município → Prefeitura de São Sebastião da Boa Vista
PERGUNTA 9: Estado → PA
PERGUNTA 10: SSL → no
```

**Resultado:**
- ✅ 2 usuários criados
- ✅ 1 município criado
- ✅ 0 setores (você configura)
- ✅ 0 locais (você configura)
- ✅ 0 tipos (você configura)

---

## 📁 **ARQUIVOS MODIFICADOS**

### **backend/src/prisma/seed.ts**
- Removido criação de 3 setores
- Removido criação de 2 locais
- Removido criação de 3 tipos de bens
- Removido criação de 3 formas de aquisição
- Adicionado criação do supervisor
- Mensagem final atualizada

### **install.sh** (precisa atualizar)
- Adicionar perguntas do supervisor ✅ (já feito)
- Atualizar números das perguntas (de 8 para 10)
- Passar variáveis do supervisor para o seed

---

**🎉 Seed agora cria apenas o essencial para começar!**
