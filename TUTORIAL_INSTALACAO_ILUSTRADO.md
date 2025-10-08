# 📸 TUTORIAL ILUSTRADO - INSTALAÇÃO SISPAT 2.0

**Guia visual passo a passo**  
**Para INICIANTES em servidores Linux**

---

## 🎯 **VISÃO GERAL**

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Comprar   │  →   │  Configurar  │  →   │   Instalar  │
│     VPS     │      │     DNS      │      │   SISPAT    │
└─────────────┘      └──────────────┘      └─────────────┘
   10 minutos            5 minutos           20 minutos
```

---

## 📝 **ETAPA 1: COMPRAR SERVIDOR VPS**

### **O que é VPS?**
VPS = Servidor Virtual Privado  
É um computador na internet que fica ligado 24h/dia

### **Passo 1.1: Criar conta na DigitalOcean**

```
┌────────────────────────────────────────┐
│  https://www.digitalocean.com          │
│                                        │
│  [ Sign Up ]  ← Clique aqui           │
│                                        │
│  Nome:  ___________________            │
│  Email: ___________________            │
│  Senha: ___________________            │
│                                        │
│  [ Create Account ]                    │
└────────────────────────────────────────┘
```

### **Passo 1.2: Criar Droplet (Servidor)**

```
┌────────────────────────────────────────┐
│  Create Droplet                        │
│                                        │
│  Choose an image:                      │
│  ○ Ubuntu  ● Ubuntu 22.04 LTS  ← Este!│
│                                        │
│  Choose a plan:                        │
│  ● Basic  ○ Premium                    │
│                                        │
│  CPU options:                          │
│  ● Regular    $12/mo                   │
│    2GB RAM / 1 CPU / 50GB SSD  ← Este!│
│                                        │
│  Choose a datacenter:                  │
│  ● New York 1  (mais próximo)          │
│                                        │
│  Authentication:                       │
│  ● Password  ○ SSH Key                 │
│    Password: _______________           │
│    (anote esta senha!)                 │
│                                        │
│  [ Create Droplet ]                    │
└────────────────────────────────────────┘
```

### **Passo 1.3: Anotar Informações**

Após criar, você verá:

```
┌────────────────────────────────────────┐
│  ubuntu-s-2vcpu-4gb-nyc1               │
│                                        │
│  IP Address: 192.168.1.100  ← ANOTE! │
│  Status: ● Active                      │
│                                        │
└────────────────────────────────────────┘
```

**⚠️ ANOTE:**
- ✏️ IP do servidor: `192.168.1.100`
- ✏️ Usuário: `root`
- ✏️ Senha: (a que você criou)

---

## 📝 **ETAPA 2: COMPRAR E CONFIGURAR DOMÍNIO**

### **Passo 2.1: Comprar Domínio**

**No Registro.br (para .com.br):**

```
┌────────────────────────────────────────┐
│  https://registro.br                   │
│                                        │
│  Buscar domínio:                       │
│  [sispat.prefeitura.com.br] [ Buscar ]│
│                                        │
│  ✓ Disponível!          R$ 40/ano      │
│                                        │
│  [ Adicionar ao Carrinho ]             │
└────────────────────────────────────────┘
```

### **Passo 2.2: Configurar DNS**

Após comprar, vá em "Gerenciar Domínio":

```
┌────────────────────────────────────────┐
│  Gerenciar: sispat.prefeitura.com.br   │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ Zona de DNS                       │  │
│  │                                   │  │
│  │ [ + Adicionar Registro ]          │  │
│  │                                   │  │
│  │ Tipo: A                           │  │
│  │ Nome: sispat                      │  │
│  │ Valor: 192.168.1.100     ← IP VPS│  │
│  │ TTL: 3600                         │  │
│  │ [ Salvar ]                        │  │
│  │                                   │  │
│  │ [ + Adicionar Registro ]          │  │
│  │                                   │  │
│  │ Tipo: A                           │  │
│  │ Nome: api.sispat                  │  │
│  │ Valor: 192.168.1.100     ← IP VPS│  │
│  │ TTL: 3600                         │  │
│  │ [ Salvar ]                        │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

⏳ **Aguarde 10-30 minutos para propagar**

---

## 📝 **ETAPA 3: CONECTAR NO SERVIDOR**

### **Windows - Usando PuTTY:**

```
┌────────────────────────────────────────┐
│  PuTTY Configuration                   │
│                                        │
│  Host Name (or IP address)             │
│  [192.168.1.100____________]  ← IP VPS│
│                                        │
│  Port: [22]                            │
│  Connection type: ● SSH                │
│                                        │
│  [ Open ]  ← Clique aqui              │
└────────────────────────────────────────┘

Vai abrir uma tela preta:

┌────────────────────────────────────────┐
│  login as: root_                       │
│  password: ******* (digite sua senha)  │
│                                        │
│  Welcome to Ubuntu 22.04 LTS           │
│  root@servidor:~# _                    │
│                                        │
└────────────────────────────────────────┘

Você está DENTRO do servidor! ✅
```

---

## 📝 **ETAPA 4: INSTALAR SISPAT**

### **No terminal (tela preta), cole este comando:**

```
┌────────────────────────────────────────┐
│  root@servidor:~# _                    │
│                                        │
│  Cole aqui:                            │
│  curl -fsSL https://raw.githubuserco│
│  ntent.com/junielsonfarias/sispat/ma│
│  in/install.sh | sudo bash             │
│                                        │
│  [ENTER] ← Pressione                  │
└────────────────────────────────────────┘
```

### **Respondendo as Perguntas:**

```
┌────────────────────────────────────────┐
│ 🏛️  INSTALADOR SISPAT 2.0  🏛️          │
├────────────────────────────────────────┤
│                                        │
│ ❯ Qual o domínio do sistema?          │
│   sispat.prefeitura.com.br_            │
│                                        │
│ ❯ Email do superusuário?               │
│   seu.email@gmail.com_                 │
│                                        │
│ ❯ Seu nome completo?                   │
│   João da Silva_                       │
│                                        │
│ ❯ Senha do PostgreSQL:                 │
│   ******* (ou ENTER para padrão)       │
│                                        │
│ ❯ Senha do superusuário:               │
│   ******* (ou ENTER para padrão)       │
│                                        │
│ ❯ Senha padrão outros usuários:        │
│   ******* (ENTER recomendado)          │
│                                        │
│ ❯ Nome do município?                   │
│   Prefeitura Municipal de ...._        │
│                                        │
│ ❯ Sigla do estado (UF)?                │
│   PB_                                  │
│                                        │
│ ❯ Configurar SSL automático? [S/n]:    │
│   S_                                   │
│                                        │
│ ❯ Confirma as configurações? [S/n]:    │
│   S_                                   │
└────────────────────────────────────────┘
```

### **Instalação em Progresso:**

```
┌────────────────────────────────────────┐
│  [███████████████████░░░░░] 75%        │
│  ✓ Instalando Node.js...               │
│  ✓ Instalando PostgreSQL...            │
│  ✓ Instalando Nginx...                 │
│  → Compilando aplicação...             │
│                                        │
│  ⏳ Aguarde aproximadamente 20 minutos │
└────────────────────────────────────────┘
```

**☕ Aproveite para tomar um café!**

---

## 🎉 **INSTALAÇÃO CONCLUÍDA!**

Quando terminar:

```
┌────────────────────────────────────────┐
│  🎉  INSTALAÇÃO CONCLUÍDA COM SUCESSO! │
├────────────────────────────────────────┤
│                                        │
│  ═══ INFORMAÇÕES DE ACESSO ═══         │
│                                        │
│  🌐 URL do Sistema:                    │
│     https://sispat.prefeitura.com.br   │
│                                        │
│  👤 ACESSO PRINCIPAL (ADMIN):          │
│     Email: admin@ssbv.com              │
│     Senha: password123                 │
│                                        │
│  👤 ACESSO SUPERUSUÁRIO (VOCÊ):        │
│     Email: seu.email@gmail.com         │
│     Senha: Tiko6273@                   │
│                                        │
│  ═══ COMANDOS ÚTEIS ═══                │
│                                        │
│  Ver status:  systemctl status sispat  │
│  Ver logs:    pm2 logs sispat-backend  │
│  Reiniciar:   pm2 restart sispat       │
│                                        │
│  🎊 Sistema instalado e funcionando!   │
└────────────────────────────────────────┘
```

---

## 🌐 **ACESSAR O SISTEMA**

### **No seu computador:**

```
┌────────────────────────────────────────┐
│  🌐 Navegador (Chrome/Firefox/Edge)    │
├────────────────────────────────────────┤
│                                        │
│  Barra de endereço:                    │
│  [https://sispat.prefeitura.com.br___] │
│                                        │
│  [ENTER] ← Pressione                  │
└────────────────────────────────────────┘

Abre a tela de login:

┌────────────────────────────────────────┐
│         🏛️ SISPAT 2.0 🏛️                │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  📧 Email                         │  │
│  │  [admin@ssbv.com____________]     │  │
│  │                                   │  │
│  │  🔒 Senha                         │  │
│  │  [password123________________]    │  │
│  │                                   │  │
│  │  [ Entrar ] ← Clique             │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘

Depois de clicar em Entrar:

┌────────────────────────────────────────┐
│  🏛️ SISPAT 2.0 - Dashboard             │
├────────────────────────────────────────┤
│  ☰ Menu                    João Silva ▼│
│  ─────────────────────────────────────│
│  🏠 Dashboard                          │
│  📦 Bens                               │
│  🏢 Imóveis                            │
│  📊 Relatórios                         │
│  ⚙️  Configurações                      │
│                                        │
│  ┌─────┐  ┌─────┐  ┌─────┐            │
│  │ 150 │  │ R$  │  │  85 │            │
│  │ Bens│  │500k │  │Ativos│           │
│  └─────┘  └─────┘  └─────┘            │
│                                        │
│  📈 Gráficos e estatísticas...         │
└────────────────────────────────────────┘

VOCÊ ESTÁ DENTRO! 🎉
```

---

## 🎨 **PRIMEIROS PASSOS NO SISTEMA**

### **1. Alterar Sua Senha**

```
Clique no seu nome (canto superior direito)
↓
[ João Silva ▼ ]
  ├─ Perfil          ← Clique aqui
  ├─ Configurações
  └─ Sair

Abre a página de perfil:
↓
┌────────────────────────────────────────┐
│  👤 Perfil do Usuário                  │
├────────────────────────────────────────┤
│  Nome: João da Silva                   │
│  Email: seu.email@gmail.com            │
│                                        │
│  🔒 Alterar Senha                      │
│  Senha atual:    [__________]          │
│  Nova senha:     [__________]          │
│  Confirmar:      [__________]          │
│                                        │
│  [ Salvar Alterações ]                 │
└────────────────────────────────────────┘
```

---

### **2. Cadastrar Primeiro Patrimônio**

```
Menu Lateral > Bens > Novo Patrimônio
↓
┌────────────────────────────────────────┐
│  📦 Cadastrar Novo Patrimônio          │
├────────────────────────────────────────┤
│                                        │
│  Descrição do Bem: *                   │
│  [Computador Dell OptiPlex_______]     │
│                                        │
│  Tipo: *                               │
│  [Equipamentos de Informática__▼]      │
│                                        │
│  Setor Responsável: *                  │
│  [Secretaria de Administração___▼]     │
│                                        │
│  Local: *                              │
│  [Sala da Secretaria____________▼]     │
│                                        │
│  Valor de Aquisição: *                 │
│  [R$ 3.500,00___________________]      │
│                                        │
│  Data de Aquisição: *                  │
│  [08/10/2025____] 📅                   │
│                                        │
│  Situação:                             │
│  ● Bom  ○ Regular  ○ Ruim              │
│                                        │
│  📸 Adicionar Foto                     │
│  [Escolher arquivo...]                 │
│                                        │
│  [ Cancelar ]  [ Salvar Patrimônio ]   │
└────────────────────────────────────────┘

Clique em "Salvar Patrimônio"
↓
✅ Patrimônio cadastrado com sucesso!
```

---

### **3. Gerar Relatório**

```
Menu Lateral > Ferramentas > Relatórios
↓
┌────────────────────────────────────────┐
│  📊 Gerar Relatório                    │
├────────────────────────────────────────┤
│                                        │
│  Tipo de Relatório:                    │
│  ● Todos os bens                       │
│  ○ Apenas ativos                       │
│  ○ Apenas baixados                     │
│                                        │
│  Período:                              │
│  De: [01/01/2025] 📅                   │
│  Até: [31/12/2025] 📅                  │
│                                        │
│  Filtrar por Setor:                    │
│  [Todos___________________▼]           │
│                                        │
│  [ Gerar Relatório ]                   │
└────────────────────────────────────────┘

Clique em "Gerar Relatório"
↓
Abre o relatório na tela
↓
[ Imprimir ]  [ Exportar PDF ]  [ Excel ]
```

---

## 🔧 **COMANDOS BÁSICOS (SE PRECISAR)**

### **Ver se o sistema está rodando:**

```
No terminal SSH, digite:

┌────────────────────────────────────────┐
│  root@servidor:~# pm2 status           │
│                                        │
│  ┌─────┬──────────┬─────────┬────────┐│
│  │ id  │   name   │ status  │ cpu    ││
│  ├─────┼──────────┼─────────┼────────┤│
│  │ 0   │ sispat   │ online  │ 0.1%   ││
│  └─────┴──────────┴─────────┴────────┘│
│                                        │
│  ✅ Se aparecer "online" está OK!      │
└────────────────────────────────────────┘
```

### **Ver logs (se tiver erro):**

```
┌────────────────────────────────────────┐
│  root@servidor:~# pm2 logs sispat      │
│                                        │
│  ✅ Conectado ao banco de dados        │
│  🚀 Servidor rodando em http://...     │
│  [INFO] Sistema iniciado com sucesso   │
│                                        │
│  Pressione Ctrl+C para sair            │
└────────────────────────────────────────┘
```

### **Reiniciar o sistema:**

```
┌────────────────────────────────────────┐
│  root@servidor:~# pm2 restart sispat   │
│                                        │
│  [PM2] Applying action restartProcessId│
│  [PM2] ✓ sispat-backend                │
│                                        │
│  ✅ Sistema reiniciado!                │
└────────────────────────────────────────┘
```

---

## 🆘 **PROBLEMAS E SOLUÇÕES**

### **❓ "Não consigo acessar o site"**

**Teste 1: DNS propagou?**
```
No seu computador:
Windows: Abra CMD (Prompt de Comando)
Digite: ping sispat.prefeitura.com.br

Deve mostrar:
Reply from 192.168.1.100: bytes=32 time=50ms

✅ Se mostrar o IP, DNS está OK
❌ Se der erro, aguarde mais tempo (até 1 hora)
```

**Teste 2: Sistema está rodando?**
```
No servidor SSH:
Digite: pm2 status

Deve mostrar "online"
```

**Solução: Reiniciar**
```
pm2 restart sispat-backend
sudo systemctl restart nginx
```

---

### **❓ "Login não funciona"**

**Solução: Recriar usuários**
```
No servidor SSH:

cd /var/www/sispat/backend
npm run prisma:seed

Aguarde mensagem:
✅ 5 usuários criados

Agora tente fazer login novamente!
```

---

### **❓ "Deu erro durante a instalação"**

**Solução: Ver o que aconteceu**
```
cat /var/log/sispat-install.log

Copie o erro e abra uma issue:
https://github.com/junielsonfarias/sispat/issues
```

---

## 📞 **AJUDA RÁPIDA**

### **Perguntas Frequentes:**

**P: Preciso saber programar?**  
R: NÃO! O instalador faz tudo automaticamente.

**P: Quanto custa?**  
R: VPS ~$12-20/mês + Domínio ~$40/ano

**P: Funciona em Windows?**  
R: Não. Precisa de VPS Linux (Ubuntu/Debian).

**P: Posso testar antes de pagar?**  
R: Sim! DigitalOcean dá $200 de crédito grátis.

**P: E se eu errar alguma coisa?**  
R: Sem problema! Você pode reinstalar quantas vezes quiser.

**P: Preciso de suporte?**  
R: Documentação completa em `/var/www/sispat/`

---

## ✅ **CHECKLIST FINAL**

Após instalação, verifique:

- [ ] ✅ Consigo acessar `https://seudominio.com`
- [ ] ✅ Login funciona com `admin@ssbv.com`
- [ ] ✅ Dashboard aparece
- [ ] ✅ Consigo criar patrimônio
- [ ] ✅ Consigo criar usuário
- [ ] ✅ HTTPS está ativo (cadeado verde)

**Se marcou todos, parabéns! Sistema 100% funcional!** 🎉

---

## 🎯 **RESUMO ULTRA SIMPLES**

1. **Compre VPS** (DigitalOcean, $12/mês)
2. **Compre domínio** (Registro.br, R$40/ano)
3. **Configure DNS** (aponte para IP do VPS)
4. **Conecte SSH** (PuTTY no Windows)
5. **Cole comando:** `curl ... | sudo bash`
6. **Responda perguntas** (aperte ENTER na maioria)
7. **Aguarde 20 minutos** ☕
8. **Acesse seu domínio** 🌐
9. **Faça login** 👤
10. **Use o sistema!** 🎉

---

**🏆 Instalação mais fácil IMPOSSÍVEL!**

**Feito para pessoas SEM conhecimento técnico!**

**Tudo automatizado, passo a passo, sem complicação!**

---

**📅 Criado em:** 08/10/2025  
**📦 Versão:** SISPAT 2.0.0  
**🔗 Repositório:** https://github.com/junielsonfarias/sispat
