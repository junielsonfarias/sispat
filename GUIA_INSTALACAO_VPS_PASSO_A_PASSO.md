# 📘 GUIA VISUAL PASSO A PASSO - INSTALAÇÃO SISPAT 2.0 EM VPS

**Versão:** 2.0.4  
**Nível:** Iniciante  
**Tempo:** ~20 minutos

---

## 📋 ÍNDICE

1. [Preparação Inicial](#-preparação-inicial)
2. [Conectar ao Servidor](#-conectar-ao-servidor)
3. [Executar Instalação](#-executar-instalação)
4. [Verificar Instalação](#-verificar-instalação)
5. [Primeiro Acesso](#-primeiro-acesso)
6. [Troubleshooting](#-troubleshooting)

---

## 🔧 PREPARAÇÃO INICIAL

### **O que você precisa:**

✅ **VPS Contratado**
- Exemplo: DigitalOcean, AWS, Google Cloud, Azure
- Mínimo: 2GB RAM, 2 CPUs, 20GB disco
- Recomendado: 4GB RAM, 4 CPUs, 50GB disco

✅ **Domínio Configurado**
- Exemplo: `sispat.prefeitura.com.br`
- DNS A apontando para IP do VPS
- Aguardar 1-24h para propagação

✅ **Informações Prontas**
- Nome do município
- Estado (UF)
- Email para administrador
- Senha forte (12+ caracteres)

✅ **Conexão SSH**
- Linux/Mac: Terminal nativo
- Windows: PuTTY ou PowerShell

---

## 🔐 CONECTAR AO SERVIDOR

### **Passo 1: Abrir Terminal**

**No Windows:**
```
Win + R → digite "cmd" ou "powershell" → Enter
```

**No Linux/Mac:**
```
Procure por "Terminal" no menu de aplicativos
```

### **Passo 2: Conectar via SSH**

Digite no terminal:

```bash
ssh root@SEU_IP_VPS
```

**Exemplo:**
```bash
ssh root@192.168.1.100
# Ou
ssh root@sispat.prefeitura.com.br
```

### **Passo 3: Confirmar Conexão**

Você verá algo assim:

```
The authenticity of host '192.168.1.100' can't be established.
ECDSA key fingerprint is SHA256:...
Are you sure you want to continue connecting (yes/no)?
```

Digite: **`yes`**

### **Passo 4: Inserir Senha**

Digite a senha root do seu VPS e pressione Enter.

**Dica:** A senha não aparece enquanto você digita!

### **Passo 5: Confirmar Login**

Você verá algo assim:

```
Welcome to Ubuntu 22.04 LTS (GNU/Linux...)
Last login: Mon Jan 8 10:00:00 2025 from...
root@servidor:~#
```

**✅ Conexão estabelecida!**

---

## 🚀 EXECUTAR INSTALAÇÃO

### **Passo 1: Baixar Script**

No terminal conectado, digite:

```bash
wget https://raw.githubusercontent.com/junielsonfarias/sispat/main/install-sispat.sh
```

Você verá:
```
--2025-01-08 10:00:00--  https://...
Resolving github.com... connected
Length: 15000 bytes
Saving to: 'install-sispat.sh'
install-sispat.sh saved
```

### **Passo 2: Tornar Executável**

```bash
chmod +x install-sispat.sh
```

### **Passo 3: Executar Instalação**

```bash
sudo bash install-sispat.sh
```

### **Passo 4: Responder Perguntas**

O instalador vai perguntar:

#### **1. Domínio**

```
Domínio do sistema (ex: sispat.prefeitura.com.br): sispat.prefeitura.com.br
```

👉 Digite o domínio configurado no DNS

#### **2. Email do Superusuário**

```
Email do superusuário: admin@prefeitura.com.br
```

👉 Digite um email válido

#### **3. Senha do Superusuário**

```
Senha do superusuário (12+ caracteres): [você digita]
```

👉 Digite uma senha forte com 12+ caracteres

#### **4. Nome Completo**

```
Nome completo do superusuário: João da Silva
```

👉 Digite o nome do administrador

#### **5. Nome do Município**

```
Nome do município: Prefeitura Municipal de São Paulo
```

👉 Digite o nome completo

#### **6. Estado (UF)**

```
Estado (UF): SP
```

👉 Digite a sigla (SP, RJ, MG, etc)

#### **7. Senha do Banco**

```
Senha do banco PostgreSQL: [você digita ou Enter para gerar]
```

👉 Digite uma senha ou pressione Enter para gerar automaticamente

#### **8. Configurar SSL?**

```
Configurar SSL com Let's Encrypt? [S/n]: S
```

👉 Pressione Enter para sim (S) ou digite 'n' para não

### **Passo 5: Confirmar Instalação**

O instalador mostra:

```
═══════════════════════════════════════════════════
   RESUMO DA INSTALAÇÃO
═══════════════════════════════════════════════════

Domínio: sispat.prefeitura.com.br
Email Admin: admin@prefeitura.com.br
Município: Prefeitura Municipal de São Paulo
Estado: SP
SSL: S

Confirmar instalação? [S/n]: S
```

👉 Digite `S` e pressione Enter

---

## ⏳ AGUARDAR INSTALAÇÃO

A instalação leva **~15-20 minutos**. Você verá:

### **Etapa 1/8: Atualizando Sistema**

```
[INFO] Atualizando sistema...
[OK] Sistema atualizado
```

**⏱️ Tempo:** 2-3 minutos

### **Etapa 2/8: Instalando Dependências**

```
[INFO] Etapa 2/8: Instalando dependências básicas...
[OK] Dependências instaladas
```

**⏱️ Tempo:** 1-2 minutos

### **Etapa 3/8: Instalando Node.js**

```
[INFO] Etapa 3/8: Instalando Node.js 20...
[OK] Node.js v20.x.x instalado
```

**⏱️ Tempo:** 2-3 minutos

### **Etapa 4/8: Instalando PNPM e PM2**

```
[INFO] Etapa 4/8: Instalando PNPM e PM2...
[OK] PNPM e PM2 instalados
```

**⏱️ Tempo:** 1-2 minutos

### **Etapa 5/8: Instalando PostgreSQL**

```
[INFO] Etapa 5/8: Instalando PostgreSQL...
[OK] PostgreSQL instalado
```

**⏱️ Tempo:** 2-3 minutos

### **Etapa 6/8: Instalando Nginx**

```
[INFO] Etapa 6/8: Instalando Nginx...
[OK] Nginx instalado
```

**⏱️ Tempo:** 1-2 minutos

### **Etapa 7/8: Instalando Certbot**

```
[INFO] Etapa 7/8: Instalando Certbot...
[OK] Certbot instalado
```

**⏱️ Tempo:** 1-2 minutos

### **Etapa 8/8: Clonando Repositório**

```
[INFO] Etapa 8/8: Clonando repositório...
[OK] Código baixado
```

**⏱️ Tempo:** 2-3 minutos

### **Configurações Finais**

```
[INFO] Configurando banco de dados...
[OK] Banco de dados configurado

[INFO] Configurando backend...
[OK] Backend configurado

[INFO] Instalando dependências do backend...
[OK] Dependências do backend instaladas

[INFO] Compilando backend...
⏱️ Isso pode levar 3-5 minutos...
[OK] Backend compilado

[INFO] Aplicando migrations do banco...
[OK] Migrations aplicadas

[INFO] Populando banco de dados...
[OK] Banco populado

[INFO] Configurando frontend...
[OK] Frontend configurado

[INFO] Instalando dependências do frontend...
⏱️ Isso pode levar 2-3 minutos...
[OK] Dependências do frontend instaladas

[INFO] Compilando frontend...
⏱️ Isso pode levar 3-5 minutos...
[OK] Frontend compilado

[INFO] Configurando Nginx...
[OK] Nginx configurado

[INFO] Configurando SSL com Let's Encrypt...
[OK] SSL configurado

[INFO] Configurando permissões...
[OK] Permissões configuradas

[INFO] Iniciando backend...
[OK] Backend iniciado

[INFO] Aguardando backend iniciar...
[OK] Backend respondendo corretamente

[INFO] Verificando instalação...
[OK] Backend respondendo corretamente
[OK] PM2 rodando corretamente
[OK] Nginx rodando corretamente
[OK] Banco de dados OK (2 usuários)
```

---

## ✅ MENSAGEM DE SUCESSO

Você verá:

```
═══════════════════════════════════════════════════
   ✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!
═══════════════════════════════════════════════════

📍 Acesso ao Sistema:
   URL: https://sispat.prefeitura.com.br

👤 Credenciais de Acesso:
   Email: admin@prefeitura.com.br
   Senha: [Senha configurada]

🔐 Senha do Banco de Dados:
   [senha gerada ou digitada]

⚠️  IMPORTANTE:
   1. Alterar senha no primeiro acesso
   2. Configurar backup automático
   3. Monitorar logs: pm2 logs sispat-backend
   4. Verificar SSL se não foi configurado

📚 Comandos Úteis:
   Ver logs: pm2 logs sispat-backend
   Status: pm2 status
   Reiniciar: pm2 restart sispat-backend
   Nginx: systemctl status nginx

🎉 Sistema pronto para uso!
```

---

## 🌐 VERIFICAR INSTALAÇÃO

### **Passo 1: Abrir Navegador**

Abra seu navegador favorito (Chrome, Firefox, Edge, etc)

### **Passo 2: Acessar URL**

Digite na barra de endereços:

```
https://sispat.prefeitura.com.br
```

**Ou:**

```
http://sispat.prefeitura.com.br
```

### **Passo 3: Verificar Página**

Você deve ver:

- ✅ Tela de login do SISPAT
- ✅ Logo do município (se configurado)
- ✅ Campos de Email e Senha
- ✅ Botão "Entrar"

**Se aparecer erro SSL:**
- Clique em "Avançado"
- Clique em "Continuar para o site"

---

## 🎯 PRIMEIRO ACESSO

### **Passo 1: Fazer Login**

1. Digite o **Email** do superusuário
2. Digite a **Senha** configurada
3. Clique em **"Entrar"**

### **Passo 2: Aguardar Carregamento**

Você será redirecionado para o Dashboard

### **Passo 3: Confirmar Funcionamento**

Você deve ver:

- ✅ Dashboard com estatísticas
- ✅ Menu lateral funcional
- ✅ Nome do município no cabeçalho
- ✅ Nenhum erro no console

### **Passo 4: Alterar Senha**

1. Clique no seu nome no canto superior direito
2. Clique em "Perfil"
3. Altere a senha
4. Salve as alterações

---

## 🔍 TROUBLESHOOTING

### **Problema 1: Não consigo conectar via SSH**

**Erro:**
```
Permission denied (publickey)
```

**Solução:**
1. Verifique se digitou o IP correto
2. Verifique a senha do root
3. Contate suporte do VPS

---

### **Problema 2: DNS não propagou**

**Erro:**
```
SSL certificate não obtido
```

**Solução:**
1. Aguarde 1-24h para propagação DNS
2. Execute: `certbot --nginx -d seu-dominio.com`
3. Ou acesse via IP: `http://SEU_IP`

---

### **Problema 3: Backend não inicia**

**Erro:**
```
502 Bad Gateway
```

**Solução:**

1. Verificar logs:
```bash
pm2 logs sispat-backend
```

2. Reiniciar backend:
```bash
pm2 restart sispat-backend
```

3. Verificar banco:
```bash
sudo -u postgres psql -d sispat_prod -c "SELECT 1;"
```

---

### **Problema 4: Senha não funciona no login**

**Erro:**
```
Credenciais inválidas
```

**Solução:**

1. Verificar usuários:
```bash
sudo -u postgres psql -d sispat_prod -c "SELECT email FROM users;"
```

2. Resetar senha:
```bash
cd /var/www/sispat/backend
npm run prisma:seed
```

---

### **Problema 5: Página em branco**

**Erro:**
```
Página não carrega
```

**Solução:**

1. Verificar Nginx:
```bash
systemctl status nginx
```

2. Verificar logs:
```bash
tail -f /var/log/nginx/error.log
```

3. Reiniciar serviços:
```bash
systemctl restart nginx
pm2 restart sispat-backend
```

---

## 📚 COMANDOS ÚTEIS

### **Ver Status**

```bash
pm2 status
systemctl status nginx
systemctl status postgresql
```

### **Ver Logs**

```bash
pm2 logs sispat-backend        # Logs do backend
pm2 logs --lines 50            # Últimas 50 linhas
systemctl status nginx         # Status do Nginx
tail -f /var/log/nginx/access.log  # Logs de acesso
```

### **Reiniciar Serviços**

```bash
pm2 restart sispat-backend     # Reiniciar backend
pm2 restart all                # Reiniciar tudo
systemctl restart nginx        # Reiniciar Nginx
systemctl restart postgresql   # Reiniciar PostgreSQL
```

### **Backup**

```bash
# Backup do banco
sudo -u postgres pg_dump sispat_prod > backup.sql

# Restaurar backup
sudo -u postgres psql sispat_prod < backup.sql
```

---

## 📞 SUPORTE

### **Documentação Completa**

- 📖 **README.md** - Visão geral
- 📘 **Guia Completo** - `Docs/GUIA_INSTALACAO_VPS_COMPLETO.md`
- 🆘 **Troubleshooting** - `Docs/TROUBLESHOOTING_INSTALACAO.md`

### **Links Úteis**

- 🌐 **GitHub:** https://github.com/junielsonfarias/sispat
- 📝 **Issues:** https://github.com/junielsonfarias/sispat/issues
- 📧 **Email:** contato@sispat.com.br

---

## ✅ CHECKLIST FINAL

Após instalação, verifique:

- [ ] Acesso ao sistema funcionando
- [ ] Login com credenciais configuradas
- [ ] Dashboard carregando corretamente
- [ ] SSL/HTTPS funcionando
- [ ] Upload de arquivos funciona
- [ ] Backup configurado
- [ ] Senha alterada
- [ ] Equipe treinada

---

**🎉 Parabéns! Seu SISPAT 2.0 está rodando!**

**Próximos passos:**
1. Explorar funcionalidades
2. Configurar setores e usuários
3. Cadastrar primeiros patrimônios
4. Treinar equipe

**Dúvidas? Consulte a documentação completa!**

