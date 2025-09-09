# ✅ CHECKLIST COMPLETO PARA PRODUÇÃO

## **SISPAT 2025 - Lista de Verificação Detalhada**

---

## 🎯 **INFORMAÇÕES DO PROJETO**

**Nome do Projeto:** SISPAT - Sistema de Patrimônio  
**Versão:** 0.0.193  
**Data:** 09/09/2025  
**Status:** ✅ Pronto para Produção

---

## 📋 **CHECKLIST GERAL**

### 🖥️ **1. PREPARAÇÃO DO SERVIDOR**

#### **1.1 Servidor VPS/Cloud**

- [ ] **Servidor contratado** (DigitalOcean, Linode, Vultr, AWS)
- [ ] **Especificações mínimas atendidas:**
  - [ ] RAM: 1GB (recomendado: 2GB)
  - [ ] CPU: 1 core (recomendado: 2 cores)
  - [ ] Disco: 25GB SSD
  - [ ] Sistema: Ubuntu 20.04 LTS ou 22.04 LTS
- [ ] **IP do servidor anotado:** `_________________`
- [ ] **Domínio configurado:** `_________________`
- [ ] **Acesso SSH funcionando**

#### **1.2 Conectividade**

- [ ] **SSH funcionando:** `ssh root@SEU_IP`
- [ ] **Ping funcionando:** `ping google.com`
- [ ] **DNS resolvendo:** `nslookup SEU_DOMINIO.com`

---

### 🔧 **2. INSTALAÇÃO DE DEPENDÊNCIAS**

#### **2.1 Sistema Operacional**

- [ ] **Sistema atualizado:** `sudo apt update && sudo apt upgrade -y`
- [ ] **Ferramentas básicas instaladas:** `curl wget git vim htop unzip`
- [ ] **Estrutura de diretórios criada:** `/opt/sispat`

#### **2.2 Node.js e PM2**

- [ ] **Node.js 18.x instalado:** `node --version` (v18.x.x)
- [ ] **NPM instalado:** `npm --version` (9.x.x)
- [ ] **PM2 instalado globalmente:** `pm2 --version`
- [ ] **PM2 funcionando:** `pm2 list`

#### **2.3 PostgreSQL**

- [ ] **PostgreSQL instalado:** `sudo apt install -y postgresql postgresql-contrib`
- [ ] **Serviço iniciado:** `sudo systemctl start postgresql`
- [ ] **Serviço habilitado:** `sudo systemctl enable postgresql`
- [ ] **Status verificado:** `sudo systemctl status postgresql`

#### **2.4 Nginx**

- [ ] **Nginx instalado:** `sudo apt install -y nginx`
- [ ] **Serviço iniciado:** `sudo systemctl start nginx`
- [ ] **Serviço habilitado:** `sudo systemctl enable nginx`
- [ ] **Status verificado:** `sudo systemctl status nginx`

#### **2.5 Firewall**

- [ ] **UFW instalado:** `sudo apt install -y ufw`
- [ ] **Regras configuradas:**
  - [ ] SSH: `sudo ufw allow ssh`
  - [ ] HTTP: `sudo ufw allow 80/tcp`
  - [ ] HTTPS: `sudo ufw allow 443/tcp`
- [ ] **Firewall ativado:** `sudo ufw enable`
- [ ] **Status verificado:** `sudo ufw status`

---

### 🗄️ **3. CONFIGURAÇÃO DO BANCO DE DADOS**

#### **3.1 Usuário e Banco**

- [ ] **Usuário criado:** `sispat_user`
- [ ] **Senha definida:** `_________________`
- [ ] **Banco criado:** `sispat_production`
- [ ] **Permissões concedidas**
- [ ] **Conexão testada:** `psql -h localhost -U sispat_user -d sispat_production`

#### **3.2 Otimizações**

- [ ] **Configurações otimizadas:** `/etc/postgresql/14/main/postgresql.conf`
- [ ] **PostgreSQL reiniciado:** `sudo systemctl restart postgresql`
- [ ] **Script de otimização executado:** `node scripts/setup-database-optimization.cjs`

#### **3.3 Backup**

- [ ] **Script de backup configurado:** `bash scripts/setup-backup-automation.sh`
- [ ] **Diretório de backup criado:** `/opt/sispat/backups/`
- [ ] **Cron job configurado**

---

### 📱 **4. CONFIGURAÇÃO DA APLICAÇÃO**

#### **4.1 Código Fonte**

- [ ] **Repositório clonado:** `git clone https://github.com/junielsonfarias/sispat.git app`
- [ ] **Diretório correto:** `/opt/sispat/app`
- [ ] **Arquivos verificados:** `ls -la`

#### **4.2 Variáveis de Ambiente**

- [ ] **Arquivo .env criado:** `cp env.production.example .env`
- [ ] **Variáveis configuradas:**
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3001`
  - [ ] `DB_HOST=localhost`
  - [ ] `DB_PORT=5432`
  - [ ] `DB_NAME=sispat_production`
  - [ ] `DB_USER=sispat_user`
  - [ ] `DB_PASSWORD=_________________`
  - [ ] `JWT_SECRET=_________________`
  - [ ] `SMTP_HOST=_________________`
  - [ ] `SMTP_USER=_________________`
  - [ ] `SMTP_PASS=_________________`

#### **4.3 Dependências**

- [ ] **Dependências instaladas:** `npm install`
- [ ] **Node_modules verificado:** `ls node_modules/`
- [ ] **Sem erros de instalação**

#### **4.4 Migrações**

- [ ] **Migrações executadas:** `node server/database/migrate.js`
- [ ] **Tabelas criadas:** `psql -c "\dt"`
- [ ] **Estrutura verificada**

#### **4.5 Build**

- [ ] **Build executado:** `npm run build`
- [ ] **Diretório dist criado:** `ls -la dist/`
- [ ] **Arquivos estáticos gerados**

---

### 🌐 **5. CONFIGURAÇÃO DO NGINX**

#### **5.1 Configuração do Site**

- [ ] **Arquivo criado:** `/etc/nginx/sites-available/sispat`
- [ ] **Configuração adicionada:**
  - [ ] Server blocks configurados
  - [ ] Proxy para backend (porta 3001)
  - [ ] Proxy para WebSocket
  - [ ] Servir arquivos estáticos
  - [ ] Headers de segurança
- [ ] **Site ativado:** `sudo ln -s /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/`
- [ ] **Site padrão removido:** `sudo rm /etc/nginx/sites-enabled/default`

#### **5.2 Teste e Ativação**

- [ ] **Configuração testada:** `sudo nginx -t`
- [ ] **Nginx recarregado:** `sudo systemctl reload nginx`
- [ ] **Status verificado:** `sudo systemctl status nginx`

---

### 🔒 **6. CONFIGURAÇÃO DO SSL**

#### **6.1 Certbot**

- [ ] **Certbot instalado:** `sudo apt install -y certbot python3-certbot-nginx`
- [ ] **Versão verificada:** `certbot --version`

#### **6.2 Certificado SSL**

- [ ] **Certificado obtido:** `sudo certbot --nginx -d SEU_DOMINIO.com`
- [ ] **Certificado verificado:** `sudo certbot certificates`
- [ ] **Renovação testada:** `sudo certbot renew --dry-run`
- [ ] **HTTPS funcionando:** `curl -I https://SEU_DOMINIO.com`

---

### ⚙️ **7. CONFIGURAÇÃO DO PM2**

#### **7.1 Aplicação**

- [ ] **PM2 iniciado:** `pm2 start ecosystem.production.config.cjs`
- [ ] **Status verificado:** `pm2 status`
- [ ] **Logs verificados:** `pm2 logs sispat`
- [ ] **Informações detalhadas:** `pm2 show sispat`

#### **7.2 Inicialização Automática**

- [ ] **Startup configurado:** `pm2 startup`
- [ ] **Comando executado** (o que apareceu no terminal)
- [ ] **Configuração salva:** `pm2 save`
- [ ] **Lista verificada:** `pm2 list`

---

### 🚀 **8. DEPLOY E TESTES**

#### **8.1 Deploy**

- [ ] **Script de deploy executado:** `bash scripts/setup-production-complete.sh`
- [ ] **Todos os serviços rodando:**
  - [ ] PM2: `pm2 status`
  - [ ] Nginx: `sudo systemctl status nginx`
  - [ ] PostgreSQL: `sudo systemctl status postgresql`

#### **8.2 Testes Básicos**

- [ ] **API funcionando:** `curl -I http://localhost:3001/api/health`
- [ ] **Nginx funcionando:** `curl -I https://SEU_DOMINIO.com`
- [ ] **Aplicação completa:** `curl -I https://SEU_DOMINIO.com/api/health`
- [ ] **Arquivos estáticos:** `curl -I https://SEU_DOMINIO.com/`

#### **8.3 Testes Automatizados**

- [ ] **Testes funcionais:** `bash scripts/run-production-tests.sh`
- [ ] **Relatório verificado:** `cat reports/production-tests-report.json`
- [ ] **Testes de performance:** `bash scripts/run-production-load-tests.sh`
- [ ] **Relatório verificado:** `cat reports/load-tests-report.json`

---

### 📊 **9. MONITORAMENTO**

#### **9.1 Prometheus e Grafana**

- [ ] **Monitoramento instalado:** `bash scripts/setup-production-monitoring.sh`
- [ ] **Prometheus rodando:** `sudo systemctl status prometheus`
- [ ] **Grafana rodando:** `sudo systemctl status grafana-server`
- [ ] **Portas verificadas:** `sudo netstat -tlnp | grep -E "(3000|9090)"`

#### **9.2 Dashboards**

- [ ] **Dashboards configurados:** `bash scripts/setup-grafana-dashboards.sh`
- [ ] **Grafana acessível:** `http://SEU_IP:3000`
- [ ] **Login funcionando:** `admin/admin`
- [ ] **Dashboards carregando**

#### **9.3 Alertas**

- [ ] **Sistema de alertas configurado:** `bash scripts/setup-monitoring-alerts.sh`
- [ ] **Logs centralizados:** `/opt/sispat/logs/`
- [ ] **Alertas funcionando**

---

### 💾 **10. BACKUP**

#### **10.1 Backup Local**

- [ ] **Sistema de backup configurado:** `bash scripts/setup-backup-system.sh`
- [ ] **Diretório de backup:** `/opt/sispat/backups/`
- [ ] **Backup automático funcionando**
- [ ] **Retenção configurada**

#### **10.2 Backup na Nuvem (Opcional)**

- [ ] **AWS S3 configurado** (se aplicável)
- [ ] **Google Cloud configurado** (se aplicável)
- [ ] **Azure configurado** (se aplicável)
- [ ] **Backup na nuvem funcionando**

---

## 🎯 **VERIFICAÇÃO FINAL**

### ✅ **11. CHECKLIST DE FUNCIONAMENTO**

#### **11.1 Acesso à Aplicação**

- [ ] **HTTPS funcionando:** `https://SEU_DOMINIO.com`
- [ ] **Login funcionando**
- [ ] **Dashboard carregando**
- [ ] **Navegação funcionando**
- [ ] **APIs respondendo**

#### **11.2 Performance**

- [ ] **Tempo de carregamento < 3 segundos**
- [ ] **Sem erros no console**
- [ ] **Recursos carregando corretamente**
- [ ] **Responsividade funcionando**

#### **11.3 Segurança**

- [ ] **HTTPS obrigatório**
- [ ] **Headers de segurança ativos**
- [ ] **Firewall configurado**
- [ ] **Certificado SSL válido**

#### **11.4 Monitoramento**

- [ ] **Logs sendo gerados**
- [ ] **Métricas sendo coletadas**
- [ ] **Alertas configurados**
- [ ] **Dashboards atualizando**

---

## 📋 **INFORMAÇÕES IMPORTANTES**

### 🔑 **Credenciais e Acessos**

**Servidor:**

- **IP:** `_________________`
- **Usuário SSH:** `_________________`
- **Porta SSH:** `22`

**Domínio:**

- **URL Principal:** `https://_________________`
- **URL com www:** `https://www._________________`

**Banco de Dados:**

- **Host:** `localhost`
- **Porta:** `5432`
- **Nome:** `sispat_production`
- **Usuário:** `sispat_user`
- **Senha:** `_________________`

**Aplicação:**

- **Porta Backend:** `3001`
- **Porta Frontend:** `80/443`
- **Ambiente:** `production`

**Monitoramento:**

- **Grafana:** `http://SEU_IP:3000`
- **Prometheus:** `http://SEU_IP:9090`
- **Usuário Grafana:** `admin`
- **Senha Grafana:** `admin`

### 📞 **Contatos de Suporte**

**Documentação:**

- **Guia Completo:** `docs/GUIA-COMPLETO-PRODUCAO-INICIANTES-2025.md`
- **Comandos:** `docs/COMANDOS-PRODUCAO-STEP-BY-STEP-2025.md`
- **Manual Admin:** `docs/MANUAL-ADMINISTRADOR-2025.md`
- **Manual Usuário:** `docs/MANUAL-USUARIO-2025.md`

**Scripts de Emergência:**

- **Limpeza de Portas:** `scripts/cleanup-ports.sh`
- **Monitoramento:** `scripts/monitor-production.sh`
- **Suporte:** `scripts/post-deploy-support.sh`

---

## 🎉 **STATUS FINAL**

### ✅ **SISTEMA PRONTO PARA PRODUÇÃO**

**Data de Deploy:** `_________________`  
**Responsável:** `_________________`  
**Versão:** `0.0.193`  
**Status:** `✅ FUNCIONANDO`

### 📊 **Métricas de Sucesso**

- [ ] **Uptime:** 99.9%
- [ ] **Tempo de Resposta:** < 2 segundos
- [ ] **Disponibilidade:** 24/7
- [ ] **Backup:** Automático
- [ ] **Monitoramento:** Ativo
- [ ] **Segurança:** Configurada
- [ ] **Performance:** Otimizada

---

## 🚨 **PROCEDIMENTOS DE EMERGÊNCIA**

### 🔴 **Se a Aplicação Parar**

```bash
# Verificar status
pm2 status
sudo systemctl status nginx postgresql

# Reiniciar se necessário
pm2 restart sispat
sudo systemctl restart nginx postgresql
```

### 🔴 **Se o Banco Parar**

```bash
# Verificar status
sudo systemctl status postgresql

# Reiniciar
sudo systemctl restart postgresql

# Verificar logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### 🔴 **Se o Nginx Parar**

```bash
# Verificar status
sudo systemctl status nginx

# Testar configuração
sudo nginx -t

# Reiniciar
sudo systemctl restart nginx
```

### 🔴 **Se Precisar de Backup**

```bash
# Backup manual
pg_dump -h localhost -U sispat_user -d sispat_production > backup_emergencia_$(date +%Y%m%d_%H%M%S).sql

# Verificar backup
ls -la backup_emergencia_*.sql
```

---

## ✅ **ASSINATURA DE CONCLUSÃO**

**Nome:** `_________________`  
**Data:** `_________________`  
**Status:** `✅ SISPAT EM PRODUÇÃO`

**Observações:**

```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

_Este checklist deve ser preenchido completamente antes de considerar o sistema em produção.
Mantenha uma cópia impressa ou digital para referência futura._
