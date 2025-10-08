# 🚀 INSTALADOR AUTOMÁTICO SISPAT 2.0

**Instalação completa em VPS Linux com UM ÚNICO COMANDO!**

---

## ⚡ **INSTALAÇÃO RÁPIDA**

### **Comando Único:**
```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash
```

**Isso é TUDO que você precisa fazer!** 🎉

---

## 📋 **AS 8 PERGUNTAS QUE O INSTALADOR FAZ**

O instalador é **super simples** e faz perguntas claras. Veja exemplos de respostas:

### **1️⃣ Domínio do Sistema**
```
Qual o domínio do sistema?
Digite aqui (ou pressione ENTER para usar: sispat.exemplo.com.br):

RESPONDA: sispat.prefeitura.com.br
```

**Formatos aceitos:**
- ✅ `sispat.prefeitura.com.br`
- ✅ `patrimonio.municipio.pb.gov.br`
- ✅ `sispat.vps-kinghost.net`
- ✅ `sispat.hostinger.com`
- ✅ `sistema.exemplo.com`
- ✅ Qualquer domínio/subdomínio válido

### **2️⃣ Seu Email**
```
Qual seu email?
Digite aqui (ou pressione ENTER para usar: admin@sispat.prefeitura.com.br):

RESPONDA: seu.email@gmail.com
```

### **3️⃣ Seu Nome**
```
Qual seu nome completo?
Digite aqui (ou pressione ENTER para usar: Administrador SISPAT):

RESPONDA: João da Silva
```

### **4️⃣ Senha do Banco de Dados**
```
Senha do PostgreSQL
(Pressione ENTER para usar senha padrão ou digite sua própria senha)
Digite a senha:

RECOMENDADO: Apenas pressione ENTER
```

### **5️⃣ Sua Senha de Login**
```
Sua senha de login
(Pressione ENTER para usar senha padrão ou digite sua própria senha)
Digite a senha:

RECOMENDADO: Apenas pressione ENTER (usa: Tiko6273@)
```

### **6️⃣ Senha para Outros Usuários**
```
Senha padrão para outros usuários
(Pressione ENTER para usar senha padrão ou digite sua própria senha)
Digite a senha:

RECOMENDADO: Apenas pressione ENTER (usa: password123)
```

### **7️⃣ Nome do Município**
```
Nome do município/órgão
Digite aqui (ou pressione ENTER para usar: Prefeitura Municipal):

RESPONDA: Prefeitura Municipal de Vista Serrana
```

### **8️⃣ Estado (UF)**
```
Sigla do estado (UF)
Digite aqui (ou pressione ENTER para usar: XX):

RESPONDA: PB
```

### **➕ SSL/HTTPS (Opcional)**
```
Deseja configurar SSL/HTTPS automaticamente agora?
(Digite S para Sim ou N para Não) [Sim]:

RESPONDA: S   (ou apenas pressione ENTER)
```

### **✅ Confirmação**
```
Tudo certo? Posso começar a instalação?
(Digite S para Sim ou N para Não) [Sim]:

RESPONDA: S   (ou apenas pressione ENTER)
```

---

## 💡 **DICAS PARA RESPOSTAS**

### **✅ Respostas Aceitas para SIM:**
- `S`
- `s`
- `Sim`
- `sim`
- `SIM`
- `Y`
- `y`
- `Yes`
- `yes`
- Apenas **ENTER** (quando [Sim] estiver em verde)

### **✅ Respostas Aceitas para NÃO:**
- `N`
- `n`
- `Não`
- `não`
- `NÃO`
- `Nao`
- `nao`

### **✅ Para Usar Valor Padrão:**
- Apenas pressione **ENTER**
- O valor entre colchetes verdes será usado

---

## ⏱️ **O QUE ACONTECE DURANTE A INSTALAÇÃO**

### **Fase 1: Instalação de Dependências** (5-10 min)
```
[██████████░░░░░░░░░░░░░░] 40%
✓ Atualizando sistema...
✓ Instalando Node.js 18...
✓ Instalando PostgreSQL 15...
✓ Instalando Nginx...
✓ Instalando Certbot (SSL)...
```

### **Fase 2: Configuração** (3-5 min)
```
[████████████████░░░░░░░░] 65%
✓ Configurando banco de dados...
✓ Baixando código do GitHub...
✓ Configurando variáveis de ambiente...
```

### **Fase 3: Build** (5-10 min)
```
[████████████████████░░░░] 85%
→ Compilando frontend...
→ Compilando backend...
→ Criando usuários...
```

### **Fase 4: Finalização** (2-5 min)
```
[████████████████████████] 100%
✓ Configurando Nginx...
✓ Configurando SSL...
✓ Iniciando sistema...
✓ Configurando backup automático...
```

---

## 🎉 **MENSAGEM DE SUCESSO**

Quando terminar, você verá:

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║              🎉  INSTALAÇÃO CONCLUÍDA COM SUCESSO!  🎉            ║
║                                                                   ║
║                  O SISPAT 2.0 ESTÁ FUNCIONANDO!                   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════
         COMO ACESSAR O SISTEMA AGORA                
═══════════════════════════════════════════════════

🌐 PASSO 1: Abra seu navegador e digite:

     https://sispat.prefeitura.com.br

👤 PASSO 2: Faça login com estas credenciais:

     Email: admin@ssbv.com
     Senha: password123

═══════════════════════════════════════════════════

✨ TUDO PRONTO! Acesse https://sispat.prefeitura.com.br agora!
```

---

## 🔐 **CREDENCIAIS CRIADAS**

O instalador cria automaticamente **5 usuários**:

| Email | Senha | Função | Para que serve |
|-------|-------|--------|----------------|
| `admin@ssbv.com` | `password123` | Admin | **Use este para começar!** |
| `[seu email]` | `Tiko6273@` | Superuser | Você (acesso total) |
| `supervisor@ssbv.com` | `password123` | Supervisor | Supervisão de setores |
| `usuario@ssbv.com` | `password123` | Usuário | Operações básicas |
| `visualizador@ssbv.com` | `password123` | Visualizador | Apenas visualização |

---

## 🎯 **EXEMPLO COMPLETO DE INSTALAÇÃO**

### **Cenário Real: Prefeitura de Vista Serrana - PB**

```bash
# 1. Conectar no servidor
ssh root@192.168.1.100

# 2. Executar instalador
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash

# 3. Responder perguntas:

Domínio: sispat.vistaserrana.pb.gov.br
Email: secretario@vistaserrana.pb.gov.br
Nome: José da Silva
Senha banco: [ENTER]
Senha login: [ENTER]
Senha outros: [ENTER]
Município: Prefeitura Municipal de Vista Serrana
Estado: PB
SSL: S
Confirma: S

# 4. Aguardar ~20 minutos ☕

# 5. Acessar
https://sispat.vistaserrana.pb.gov.br
Login: admin@ssbv.com
Senha: password123

# 6. Pronto! 🎉
```

---

## 🆘 **PROBLEMAS E SOLUÇÕES**

### **❌ "Domínio inválido"**
```
✗ ERRO: Domínio inválido. Use formato: sispat.prefeitura.com.br
```

**Solução:** Use o formato correto:
- ✅ `sispat.prefeitura.com.br`
- ✅ `patrimonio.municipio.pb.gov.br`
- ❌ `sispat` (faltando .com.br)
- ❌ `http://sispat.com` (não coloque http://)

---

### **❌ "Email inválido"**
```
✗ ERRO: Email inválido. Use formato: nome@dominio.com
```

**Solução:** Use um email válido:
- ✅ `admin@prefeitura.com.br`
- ✅ `joao.silva@gmail.com`
- ❌ `admin` (faltando @dominio.com)
- ❌ `admin@` (faltando domínio)

---

### **❌ "Este script deve ser executado como root"**
```
✗ ERRO: Este script deve ser executado como root. Use: sudo bash install.sh
```

**Solução:** Adicione `sudo` no comando:
```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash
```

---

### **❌ SSL falhou**
```
⚠ Não foi possível configurar SSL automaticamente
```

**Solução:** Configure depois manualmente:
```bash
sudo certbot --nginx -d sispat.prefeitura.com.br
```

---

## 📊 **REQUISITOS DO SERVIDOR**

### **Mínimo:**
- RAM: 2GB
- Disco: 20GB
- CPU: 1 core
- SO: Ubuntu 20.04+ ou Debian 11+

### **Recomendado:**
- RAM: 4GB
- Disco: 50GB SSD
- CPU: 2 cores
- SO: Ubuntu 22.04 ou Debian 12

---

## 🔄 **REINSTALAR (Se Necessário)**

Se algo der errado, você pode limpar tudo e reinstalar:

```bash
# 1. Limpar instalação anterior
sudo rm -rf /var/www/sispat
sudo -u postgres psql -c "DROP DATABASE IF EXISTS sispat_prod;"
sudo -u postgres psql -c "DROP USER IF EXISTS sispat_user;"
pm2 delete sispat-backend 2>/dev/null || true
pm2 save

# 2. Reinstalar
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash
```

---

## 📖 **DOCUMENTAÇÃO COMPLETA**

Após a instalação, você encontra documentação completa em:

```
/var/www/sispat/CREDENCIAIS_PRODUCAO.md      → Todas as credenciais
/var/www/sispat/GUIA_INSTALACAO_VPS.md       → Guia completo
/var/www/sispat/INSTALACAO_SIMPLES.md        → Guia simplificado
/var/www/sispat/DEPLOY_PRODUCTION.md         → Guia técnico
/var/www/sispat/README_PRODUCTION.md         → Documentação geral
```

---

## ✅ **CHECKLIST PÓS-INSTALAÇÃO**

Após a instalação, verifique:

```bash
# 1. Sistema está rodando?
pm2 status
# Deve mostrar: sispat-backend | online

# 2. Nginx está ativo?
sudo systemctl status nginx
# Deve mostrar: active (running)

# 3. Banco tem dados?
cd /var/www/sispat/backend
npm run prisma:studio
# Abre interface web - verifique tabela 'users'

# 4. Site está acessível?
curl -I https://sispat.prefeitura.com.br
# Deve retornar: HTTP/2 200

# 5. API está respondendo?
curl http://localhost:3000/health
# Deve retornar: {"status":"healthy",...}
```

---

## 🎯 **RESUMO ULTRA RÁPIDO**

```
1. Conecte no servidor: ssh root@IP
2. Execute: curl ... | sudo bash
3. Responda 8 perguntas simples
4. Aguarde 20 minutos
5. Acesse: https://seudominio.com
6. Login: admin@ssbv.com / password123
7. Pronto! 🎉
```

---

## 📞 **SUPORTE**

- **GitHub Issues:** https://github.com/junielsonfarias/sispat/issues
- **Documentação:** https://github.com/junielsonfarias/sispat
- **Logs:** `/var/log/sispat-install.log`

---

**🏆 Instalação mais fácil IMPOSSÍVEL!**

**Feito para pessoas SEM conhecimento técnico!**
