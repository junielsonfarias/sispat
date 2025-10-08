# ⚡ INSTALAÇÃO SUPER SIMPLES - SISPAT 2.0

**Para quem NÃO sabe nada de programação!**  
**Tempo: 30 minutos**

---

## 🎯 **VOCÊ VAI PRECISAR DE:**

### ✅ **1. Um Servidor na Internet (VPS)**

**Onde comprar (escolha um):**
- 🌟 **DigitalOcean** - https://www.digitalocean.com (Recomendado!)
- **Vultr** - https://www.vultr.com
- **Linode** - https://www.linode.com
- **Contabo** - https://www.contabo.com

**O que pedir:**
- Sistema: **Ubuntu 22.04** ou **Debian 12**
- RAM: **4GB**
- Disco: **50GB SSD**
- Preço: ~$20/mês

### ✅ **2. Um Domínio (Endereço do Site)**

**Onde comprar (escolha um):**
- 🌟 **Registro.br** - https://registro.br (Para .com.br)
- **GoDaddy** - https://www.godaddy.com
- **Namecheap** - https://www.namecheap.com

**Exemplo:** `sispat.prefeitura.com.br`

---

## 🚀 **PASSO A PASSO COMPLETO**

### **PASSO 1: Comprar e Configurar VPS** ⏱️ 10 min

#### **1.1 - Criar conta na DigitalOcean (ou outro provedor)**
1. Acesse https://www.digitalocean.com
2. Clique em "Sign Up"
3. Preencha seus dados
4. Confirme email

#### **1.2 - Criar um Droplet (Servidor)**
1. Clique em "Create" > "Droplets"
2. Escolha:
   - **Imagem:** Ubuntu 22.04 LTS
   - **Plano:** Basic
   - **CPU:** Regular (2GB RAM / 1 CPU) - $12/mês
   - **Datacenter:** Escolha o mais próximo do Brasil
   - **Autenticação:** Password (anote a senha!)
3. Clique em "Create Droplet"
4. **Anote o IP do servidor** (ex: 192.168.1.100)

---

### **PASSO 2: Configurar DNS (Domínio)** ⏱️ 5 min

#### **2.1 - Acessar painel do domínio**
1. Entre no site onde comprou o domínio
2. Vá em "Meus Domínios" ou "My Domains"
3. Clique no domínio que comprou
4. Procure "Gerenciar DNS" ou "DNS Management"

#### **2.2 - Adicionar registros DNS**
Adicione **2 registros tipo A:**

**Registro 1:**
```
Nome:  sispat
Tipo:  A
Valor: 192.168.1.100  ← (IP do seu servidor)
TTL:   3600
```

**Registro 2:**
```
Nome:  api.sispat
Tipo:  A
Valor: 192.168.1.100  ← (mesmo IP)
TTL:   3600
```

#### **2.3 - Aguardar propagação**
⏳ Aguarde **10-30 minutos** para o DNS propagar

**Como testar se propagou:**
```
Windows: Abra CMD e digite:
ping sispat.prefeitura.com.br

Deve mostrar o IP do seu servidor!
```

---

### **PASSO 3: Conectar no Servidor** ⏱️ 2 min

#### **No Windows:**

1. **Baixe o PuTTY:**
   - Acesse: https://www.putty.org
   - Baixe e instale

2. **Conecte no servidor:**
   - Abra o PuTTY
   - Em "Host Name": digite o **IP do servidor**
   - Clique em "Open"
   - Na tela preta, digite: `root`
   - Digite a **senha** que você anotou
   - Você está dentro do servidor! ✅

#### **No Mac/Linux:**

1. **Abra o Terminal**
2. **Digite:**
```bash
ssh root@192.168.1.100
```
3. **Digite a senha** quando pedir
4. Você está dentro do servidor! ✅

---

### **PASSO 4: INSTALAR O SISPAT** ⏱️ 20 min

#### **4.1 - Copie e cole este comando:**

Na tela preta do PuTTY ou Terminal, **copie e cole:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash
```

**Pressione ENTER**

#### **4.2 - Responda as perguntas:**

O instalador vai fazer **8 perguntas simples**. Veja como responder:

---

#### **📋 PERGUNTA 1: Domínio do Sistema**
```
Qual o domínio do sistema?
(ou pressione ENTER para usar: sispat.exemplo.com.br)

Digite aqui: sispat.prefeitura.com.br
```
**O que digitar:** Seu domínio real (ex: `sispat.prefeitura.com.br`)

---

#### **📋 PERGUNTA 2: Seu Email**
```
Qual seu email?
(ou pressione ENTER para usar: admin@sispat.prefeitura.com.br)

Digite aqui: seu.email@gmail.com
```
**O que digitar:** Seu email pessoal ou profissional

---

#### **📋 PERGUNTA 3: Seu Nome**
```
Qual seu nome completo?
(ou pressione ENTER para usar: Administrador SISPAT)

Digite aqui: João da Silva
```
**O que digitar:** Seu nome completo

---

#### **📋 PERGUNTA 4: Senha do Banco de Dados**
```
Senha do PostgreSQL
(Pressione ENTER para usar senha padrão ou digite sua própria senha)

Digite a senha: 
```
**O que fazer:** 
- **Recomendado:** Apenas pressione **ENTER** (usa senha padrão)
- Ou digite uma senha se preferir

---

#### **📋 PERGUNTA 5: Sua Senha de Login**
```
Sua senha de login
(Pressione ENTER para usar senha padrão ou digite sua própria senha)

Digite a senha:
```
**O que fazer:**
- **Recomendado:** Apenas pressione **ENTER** (usa `Tiko6273@`)
- Ou digite sua própria senha

---

#### **📋 PERGUNTA 6: Senha para Outros Usuários**
```
Senha padrão para outros usuários
(Pressione ENTER para usar senha padrão ou digite sua própria senha)

Digite a senha:
```
**O que fazer:** Pressione **ENTER** (usa `password123`)

---

#### **📋 PERGUNTA 7: Nome do Município**
```
Nome do município/órgão
(ou pressione ENTER para usar: Prefeitura Municipal)

Digite aqui: Prefeitura Municipal de Vista Serrana
```
**O que digitar:** Nome completo do município

---

#### **📋 PERGUNTA 8: Estado (UF)**
```
Sigla do estado (UF)
(ou pressione ENTER para usar: XX)

Digite aqui: PB
```
**O que digitar:** Sigla do estado (PB, SP, RJ, MG, etc.)

---

#### **📋 CONFIGURAÇÃO ADICIONAL: SSL/HTTPS**
```
Deseja configurar SSL/HTTPS automaticamente agora?
(Digite S para Sim ou N para Não) [Sim]:
```
**O que digitar:** 
- **S** ou **Sim** ou apenas **ENTER** (ativa HTTPS)
- **N** ou **Não** (configura depois)

---

#### **📋 CONFIRMAÇÃO FINAL**
```
Tudo certo? Posso começar a instalação?
(Digite S para Sim ou N para Não) [Sim]:
```
**O que digitar:** **S** ou **Sim** ou apenas **ENTER**

---

#### **4.3 - AGUARDE A INSTALAÇÃO**

Você verá algo assim:

```
[██████████████████████] 100%
✓ Atualizando sistema...
✓ Instalando Node.js...
✓ Instalando PostgreSQL...
✓ Instalando Nginx...
✓ Baixando SISPAT...
✓ Compilando aplicação...
✓ Configurando banco...
✓ Criando usuários...
✓ Configurando SSL...
✓ Iniciando sistema...
```

**Aguarde até aparecer:**
```
🎉  INSTALAÇÃO CONCLUÍDA COM SUCESSO!  🎉
```

---

## 🎊 **PRONTO! COMO ACESSAR**

Quando terminar, você verá:

```
═══ INFORMAÇÕES DE ACESSO ═══

🌐 URL do Sistema:
   https://sispat.prefeitura.com.br

👤 ACESSO PRINCIPAL:
   Email: admin@ssbv.com
   Senha: password123
```

---

### **Acesse o Sistema:**

1. **Abra seu navegador** (Chrome, Firefox, Edge)
2. **Digite na barra de endereço:**
```
https://sispat.prefeitura.com.br
```
(Use seu domínio)

3. **Faça login:**
```
Email: admin@ssbv.com
Senha: password123
```

4. **Pronto! Você está dentro!** 🎉

---

## 🎨 **PRIMEIROS PASSOS NO SISTEMA**

### **1. Trocar sua senha:**
1. Clique no seu nome (canto superior direito)
2. Clique em "Perfil"
3. Clique em "Alterar Senha"
4. Digite uma senha forte
5. Salve

### **2. Configurar o município:**
1. Menu lateral > "Configurações"
2. Clique em "Personalização"
3. Preencha:
   - Nome do município
   - Brasão/Logo
   - Cores do sistema
4. Salve

### **3. Criar seus usuários:**
1. Menu lateral > "Administração"
2. Clique em "Gerenciar Usuários"
3. Clique em "+ Novo Usuário"
4. Preencha os dados
5. Escolha a função (Admin, Supervisor, Usuário)
6. Salve

### **4. Cadastrar um patrimônio:**
1. Menu lateral > "Bens"
2. Clique em "Novo Patrimônio"
3. Preencha os dados:
   - Descrição
   - Tipo
   - Setor
   - Local
   - Valor
   - Foto (opcional)
4. Salve

---

## 🆘 **PRECISA DE AJUDA?**

### **Problema: Não consigo acessar o site**

**Verifique:**
1. DNS propagou? (Teste: `ping sispat.prefeitura.com.br`)
2. Sistema está rodando? (No servidor: `pm2 status`)
3. Firewall liberou as portas? (No servidor: `sudo ufw status`)

**Solução rápida:**
```bash
# Conecte no servidor via SSH
ssh root@IP_DO_SERVIDOR

# Reinicie tudo
pm2 restart sispat-backend
sudo systemctl restart nginx

# Aguarde 10 segundos
sleep 10

# Teste
curl http://localhost:3000/health
```

---

### **Problema: Login não funciona**

**Solução:**
```bash
# Conecte no servidor via SSH
ssh root@IP_DO_SERVIDOR

# Recrie os usuários
cd /var/www/sispat/backend
npm run prisma:seed

# Aguarde mensagem de sucesso
# Tente fazer login novamente
```

---

## 📞 **CONTATO E SUPORTE**

### **GitHub:**
https://github.com/junielsonfarias/sispat/issues

### **Documentação Completa:**
- No servidor: `/var/www/sispat/`
- Todos os arquivos `.md`

---

## 🎬 **RESUMO ULTRA RÁPIDO**

```
1. Compre VPS Ubuntu 22.04 (4GB RAM)
2. Compre domínio (ex: sispat.prefeitura.com.br)
3. Configure DNS apontando para IP do servidor
4. Conecte via SSH (PuTTY no Windows)
5. Cole: curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash
6. Responda as perguntas
7. Aguarde 20 minutos
8. Acesse https://seudominio.com.br
9. Login: admin@ssbv.com / password123
10. Pronto! 🎉
```

---

## ✅ **CHECKLIST RÁPIDO**

Antes de começar, tenha em mãos:
- [ ] IP do servidor VPS
- [ ] Senha do servidor
- [ ] Domínio comprado
- [ ] Acesso ao painel do domínio
- [ ] PuTTY instalado (Windows) ou Terminal (Mac/Linux)

---

**🏆 Instalação mais simples impossível!**

**Tudo automatizado, sem complicação, sem comandos difíceis!**
