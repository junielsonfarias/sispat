# 🚀 GUIA DE INSTALAÇÃO SISPAT 2.0 EM VPS LINUX

**Para usuários SEM conhecimento técnico**  
**Tempo:** 15-30 minutos  
**Dificuldade:** ⭐ Fácil (tudo automatizado!)

---

## 📋 **O QUE VOCÊ VAI PRECISAR**

### ✅ **1. Um Servidor VPS Linux**
Qualquer provedor serve:
- **DigitalOcean** (recomendado para iniciantes)
- **Vultr**
- **Linode**
- **AWS Lightsail**
- **Google Cloud**
- **Contabo**
- **Hostinger VPS**

**Configuração mínima:**
- Sistema: Debian 11/12 ou Ubuntu 20.04/22.04/24.04
- RAM: 2GB (recomendado 4GB)
- Disco: 20GB (recomendado 50GB)
- CPU: 1 core (recomendado 2 cores)

### ✅ **2. Um Domínio**
Qualquer provedor de domínio:
- **Registro.br** (para .com.br)
- **GoDaddy**
- **Namecheap**
- **Cloudflare**

**Exemplo:** `sispat.prefeitura.com.br`

### ✅ **3. Acesso ao Servidor**
Você vai precisar saber como conectar no servidor via SSH.

---

## 🎯 **INSTALAÇÃO EM 3 PASSOS**

### **PASSO 1: Configurar DNS** ⏱️ 5 minutos

1. **Entre no painel do seu provedor de domínio**
2. **Vá em "Gerenciar DNS" ou "DNS Settings"**
3. **Adicione dois registros A:**

```
Nome: sispat
Tipo: A
Valor: IP_DO_SEU_SERVIDOR

Nome: api.sispat
Tipo: A  
Valor: IP_DO_SEU_SERVIDOR
```

**Exemplo:**
```
sispat.prefeitura.com.br     → 192.168.1.100
api.sispat.prefeitura.com.br → 192.168.1.100
```

4. **Aguarde 5-10 minutos** para o DNS propagar

---

### **PASSO 2: Conectar no Servidor** ⏱️ 2 minutos

#### **No Windows:**
1. Baixe o **PuTTY**: https://www.putty.org
2. Abra o PuTTY
3. Digite o IP do servidor
4. Clique em "Open"
5. Digite o usuário: `root`
6. Digite a senha fornecida pelo provedor

#### **No Mac/Linux:**
1. Abra o Terminal
2. Digite:
```bash
ssh root@IP_DO_SEU_SERVIDOR
```
3. Digite a senha quando solicitado

---

### **PASSO 3: Executar Instalador** ⏱️ 15-30 minutos

#### **Copie e cole este comando no terminal:**

```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash
```

**O instalador vai fazer perguntas simples:**

---

## 🤔 **PERGUNTAS QUE O INSTALADOR VAI FAZER**

### **Pergunta 1: Domínio**
```
❯ Qual o domínio do sistema? [sispat.exemplo.com.br]:
```

**Responda com seu domínio:**
```
sispat.prefeitura.com.br
```

---

### **Pergunta 2: Email do Administrador**
```
❯ Email do superusuário (você) [admin@sispat.prefeitura.com.br]:
```

**Responda com seu email:**
```
seu.email@gmail.com
```

---

### **Pergunta 3: Seu Nome**
```
❯ Seu nome completo [Administrador SISPAT]:
```

**Responda com seu nome:**
```
João Silva
```

---

### **Pergunta 4: Senha do Banco de Dados**
```
❯ Senha do PostgreSQL (banco de dados) [padrão disponível]:
```

**Opções:**
- Pressione **ENTER** para usar a senha padrão (recomendado para testes)
- Ou digite uma senha de sua escolha

---

### **Pergunta 5: Senha do Superusuário**
```
❯ Senha do superusuário [padrão disponível]:
```

**Opções:**
- Pressione **ENTER** para usar `Tiko6273@` (recomendado para testes)
- Ou digite sua própria senha

---

### **Pergunta 6: Senha Padrão dos Usuários**
```
❯ Senha padrão para outros usuários [padrão disponível]:
```

**Opções:**
- Pressione **ENTER** para usar `password123` (recomendado para testes)
- Ou digite uma senha de sua escolha

---

### **Pergunta 7: Nome do Município**
```
❯ Nome do município/órgão [Prefeitura Municipal]:
```

**Exemplo:**
```
Prefeitura Municipal de Vista Serrana
```

---

### **Pergunta 8: Estado**
```
❯ Sigla do estado (UF) [XX]:
```

**Exemplo:**
```
PB
```

---

### **Pergunta 9: Configurar SSL**
```
❯ Configurar SSL automático com Let's Encrypt? [S/n]:
```

**Opções:**
- **S** (Sim) - Recomendado! Ativa HTTPS automaticamente
- **N** (Não) - Você configura depois manualmente

⚠️ **IMPORTANTE:** Seu DNS deve estar apontando para o servidor!

---

### **Pergunta 10: Confirmação**
```
❯ Confirma as configurações acima? [S/n]:
```

O instalador mostra um resumo. Verifique e digite **S** para continuar.

---

## ⏳ **AGUARDE A INSTALAÇÃO**

O instalador vai executar automaticamente:

```
[██████████████████████████████████████████████████] 100%
✓ Atualizando sistema...
✓ Instalando Node.js 18...
✓ Instalando PostgreSQL 15...
✓ Instalando Nginx...
✓ Configurando banco de dados...
✓ Baixando código do SISPAT...
✓ Compilando aplicação...
✓ Configurando usuários...
✓ Iniciando sistema...
✓ Configurando SSL...
```

**Aguarde até aparecer:**
```
🎉  INSTALAÇÃO CONCLUÍDA COM SUCESSO!  🎉
```

---

## 🎉 **PRONTO! COMO ACESSAR**

Após a instalação concluir, você verá:

```
═══ INFORMAÇÕES DE ACESSO ═══

🌐 URL do Sistema:
   https://sispat.prefeitura.com.br

👤 ACESSO PRINCIPAL (ADMIN):
   Email: admin@ssbv.com
   Senha: password123

👤 ACESSO SUPERUSUÁRIO (VOCÊ):
   Email: seu.email@gmail.com
   Senha: Tiko6273@
```

---

## 🖱️ **PRIMEIRO ACESSO**

### **1. Abra seu navegador**
Digite na barra de endereço:
```
https://sispat.prefeitura.com.br
```

### **2. Faça login**
```
Email: admin@ssbv.com
Senha: password123
```

### **3. Pronto! Você está dentro do sistema!** 🎉

---

## 👥 **CRIAR SEUS PRÓPRIOS USUÁRIOS**

Após fazer login:

1. Clique em **"Administração"** no menu lateral
2. Clique em **"Gerenciar Usuários"**
3. Clique em **"+ Novo Usuário"**
4. Preencha os dados:
   - Nome completo
   - Email
   - Senha
   - Função (Admin, Supervisor, Usuário, etc.)
   - Setores responsáveis
5. Clique em **"Salvar"**

---

## 🔧 **COMANDOS ÚTEIS**

### **Ver se o sistema está rodando:**
```bash
sudo systemctl status sispat-backend
```

### **Ver logs (se tiver problemas):**
```bash
pm2 logs sispat-backend
```

### **Reiniciar o sistema:**
```bash
pm2 restart sispat-backend
sudo systemctl restart nginx
```

### **Fazer backup manual:**
```bash
cd /var/www/sispat
./scripts/backup.sh
```

---

## 🆘 **PROBLEMAS COMUNS E SOLUÇÕES**

### **❌ Problema: "Não consigo acessar o site"**

**Solução 1: Verificar DNS**
```bash
# No seu computador, abra o terminal/cmd e digite:
ping sispat.prefeitura.com.br

# Deve retornar o IP do seu servidor
```

**Solução 2: Verificar se o sistema está rodando**
```bash
# No servidor VPS:
pm2 status

# Deve mostrar 'sispat-backend' com status 'online'
```

**Solução 3: Reiniciar tudo**
```bash
pm2 restart sispat-backend
sudo systemctl restart nginx
```

---

### **❌ Problema: "Login não funciona"**

**Solução 1: Verificar se o banco tem usuários**
```bash
cd /var/www/sispat/backend
npm run prisma:studio

# Abre uma interface web em http://SEU_IP:5555
# Verifique se a tabela 'users' tem registros
```

**Solução 2: Recriar usuários**
```bash
cd /var/www/sispat/backend
npm run prisma:seed
```

---

### **❌ Problema: "Erro 502 Bad Gateway"**

**Solução:**
```bash
# Reiniciar o backend
pm2 restart sispat-backend

# Aguardar 10 segundos
sleep 10

# Testar
curl http://localhost:3000/health
```

---

### **❌ Problema: "SSL não funciona"**

**Solução: Configurar SSL manualmente**
```bash
sudo certbot --nginx -d sispat.prefeitura.com.br -d api.sispat.prefeitura.com.br
```

Siga as instruções na tela e pronto!

---

## 📞 **PRECISA DE AJUDA?**

### **Opção 1: Logs do Sistema**
```bash
# Ver log de instalação
cat /var/log/sispat-install.log

# Ver logs do sistema
pm2 logs sispat-backend --lines 100
sudo tail -f /var/log/nginx/error.log
```

### **Opção 2: Abrir Issue no GitHub**
https://github.com/junielsonfarias/sispat/issues

### **Opção 3: Documentação Completa**
No servidor, em:
```
/var/www/sispat/DEPLOY_PRODUCTION.md
/var/www/sispat/README_PRODUCTION.md
```

---

## 🎯 **RESUMO RÁPIDO**

### **Para Instalar:**
```bash
# 1. Conecte no servidor via SSH
ssh root@IP_DO_SERVIDOR

# 2. Execute o instalador
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash

# 3. Responda as perguntas
# 4. Aguarde ~20 minutos
# 5. Acesse https://seudominio.com
```

### **Para Acessar:**
```
URL:   https://sispat.prefeitura.com.br
Email: admin@ssbv.com
Senha: password123
```

---

## ✅ **CHECKLIST APÓS INSTALAÇÃO**

- [ ] DNS configurado e propagado
- [ ] Servidor VPS provisionado
- [ ] Instalador executado sem erros
- [ ] Sistema acessível via HTTPS
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Primeiros usuários criados
- [ ] Backup automático ativo
- [ ] Monitoramento ativo

---

## 🎊 **PARABÉNS!**

Você instalou o **SISPAT 2.0** com sucesso!

Agora você pode:
- ✅ Cadastrar patrimônios e imóveis
- ✅ Criar usuários e definir permissões
- ✅ Gerar relatórios e PDFs
- ✅ Visualizar dashboards
- ✅ Fazer transferências e doações
- ✅ Controlar depreciação de bens
- ✅ E muito mais!

---

## 📚 **PRÓXIMOS PASSOS**

1. **Explore o sistema** - Navegue pelos menus
2. **Crie usuários** - Vá em Administração > Usuários
3. **Configure o município** - Vá em Configurações > Personalização
4. **Cadastre setores** - Vá em Administração > Setores
5. **Cadastre locais** - Vá em Administração > Locais
6. **Cadastre patrimônios** - Vá em Bens > Novo Patrimônio

---

## 🛡️ **SEGURANÇA**

### **Para Produção com Dados Reais:**

Altere as senhas após a instalação:

1. **Acesse o sistema**
2. **Vá em seu perfil** (canto superior direito)
3. **Clique em "Alterar Senha"**
4. **Digite uma senha forte:**
   - Mínimo 12 caracteres
   - Letras maiúsculas e minúsculas
   - Números
   - Símbolos (@, #, $, !, etc.)

**Exemplo de senha forte:**
```
Prefeitura@2025#Segura!
```

---

## 📖 **GUIAS ADICIONAIS**

### **No Servidor:**
```
/var/www/sispat/CREDENCIAIS_PRODUCAO.md  → Todas as credenciais
/var/www/sispat/DEPLOY_PRODUCTION.md     → Guia técnico completo
/var/www/sispat/README_PRODUCTION.md     → Documentação de produção
/var/www/sispat/GUIA_RAPIDO_DEPLOY.md    → Deploy em 30 minutos
```

### **Online:**
```
GitHub: https://github.com/junielsonfarias/sispat
Issues: https://github.com/junielsonfarias/sispat/issues
```

---

## 🎬 **VÍDEO TUTORIAL** (Exemplo do Processo)

### **1. Conectar no Servidor (SSH)**
```
Windows: Usar PuTTY
Mac/Linux: Usar Terminal

Comando: ssh root@192.168.1.100
Senha: [senha fornecida pelo provedor]
```

### **2. Executar Instalador**
```bash
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash
```

### **3. Responder Perguntas**
```
Domínio: sispat.prefeitura.com.br
Email: seu.email@gmail.com
Nome: João Silva
[Pressionar ENTER nas outras para usar padrões]
```

### **4. Aguardar Instalação**
```
[████████████████████████] 100%
✓ Sistema instalado!
```

### **5. Acessar Sistema**
```
Abrir navegador: https://sispat.prefeitura.com.br
Login: admin@ssbv.com
Senha: password123
```

---

## 🎯 **EXEMPLO COMPLETO DE INSTALAÇÃO**

### **Cenário: Prefeitura de Vista Serrana - PB**

```bash
# 1. SSH no servidor
ssh root@192.168.1.100

# 2. Executar instalador
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash

# 3. Responder:
Domínio: sispat.vistaserrana.pb.gov.br
Email: secretario@vistaserrana.pb.gov.br
Nome: José da Silva
[ENTER nas senhas para usar padrões]
Município: Prefeitura Municipal de Vista Serrana
Estado: PB
SSL: S (Sim)

# 4. Aguardar ~20 minutos

# 5. Acessar
https://sispat.vistaserrana.pb.gov.br
Email: admin@ssbv.com
Senha: password123
```

---

## 💡 **DICAS IMPORTANTES**

### ✅ **FAÇA:**
- Configure o DNS ANTES de instalar
- Use HTTPS (SSL) sempre que possível
- Anote as senhas em local seguro
- Faça backup regularmente
- Teste todas as funcionalidades

### ❌ **NÃO FAÇA:**
- Não interrompa a instalação
- Não feche o terminal durante a instalação
- Não use senhas fracas em produção real
- Não esqueça de anotar as credenciais

---

## 🔄 **REINSTALAR (Se Necessário)**

Se algo der errado, você pode reinstalar:

```bash
# 1. Remover instalação anterior
sudo rm -rf /var/www/sispat
sudo -u postgres psql -c "DROP DATABASE IF EXISTS sispat_prod;"
sudo -u postgres psql -c "DROP USER IF EXISTS sispat_user;"
pm2 delete sispat-backend

# 2. Executar instalador novamente
curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh | sudo bash
```

---

## 📊 **O QUE O INSTALADOR FAZ**

### **Automaticamente:**
1. ✅ Atualiza o sistema operacional
2. ✅ Instala Node.js 18
3. ✅ Instala PostgreSQL 15
4. ✅ Instala Nginx
5. ✅ Instala PM2 (gerenciador de processos)
6. ✅ Instala Certbot (SSL)
7. ✅ Cria banco de dados
8. ✅ Baixa código do GitHub
9. ✅ Compila aplicação
10. ✅ Configura Nginx
11. ✅ Configura SSL (opcional)
12. ✅ Cria usuários do sistema
13. ✅ Inicia aplicação
14. ✅ Configura backup automático
15. ✅ Configura monitoramento
16. ✅ Configura firewall

### **Sem você precisar fazer NADA!**

---

## 🎯 **TEMPO ESTIMADO POR ETAPA**

| Etapa | Tempo | O que acontece |
|-------|-------|----------------|
| **DNS** | 5 min | Configurar domínio |
| **Conectar SSH** | 2 min | Entrar no servidor |
| **Responder perguntas** | 3 min | Configurar instalação |
| **Instalação automática** | 15-25 min | Sistema instala tudo |
| **Primeiro acesso** | 1 min | Fazer login |
| **TOTAL** | **25-35 min** | Sistema 100% funcional |

---

## 📱 **ACESSAR DE QUALQUER LUGAR**

Após instalado, você pode acessar de:
- 💻 Computador
- 📱 Celular
- 🖥️ Tablet
- 🌐 Qualquer navegador moderno

Basta acessar: `https://seudominio.com.br`

---

## 🏆 **RESULTADO FINAL**

Você terá:
- ✅ Sistema SISPAT 2.0 rodando
- ✅ HTTPS ativo (seguro)
- ✅ Usuários criados e funcionais
- ✅ Banco de dados configurado
- ✅ Backup automático diário
- ✅ Monitoramento a cada 5 minutos
- ✅ Pronto para uso imediato

---

## 📞 **SUPORTE**

### **Se tiver dúvidas:**

1. **Documentação completa:**
   - No servidor: `/var/www/sispat/README_PRODUCTION.md`
   - GitHub: https://github.com/junielsonfarias/sispat

2. **Problemas técnicos:**
   - GitHub Issues: https://github.com/junielsonfarias/sispat/issues

3. **Logs do sistema:**
   - Instalação: `/var/log/sispat-install.log`
   - Aplicação: `pm2 logs sispat-backend`

---

## 🎉 **BEM-VINDO AO SISPAT 2.0!**

Sistema profissional de gestão patrimonial instalado e pronto para uso!

**Desenvolvido com ❤️ para facilitar a gestão pública**

---

**📅 Última atualização:** 08/10/2025  
**📦 Versão:** SISPAT 2.0.0  
**🔗 Repositório:** https://github.com/junielsonfarias/sispat
