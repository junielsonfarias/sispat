# 🚀 SISPAT - Instalação e Deploy em VPS

Este guia fornece instruções completas para instalar e configurar o SISPAT em um servidor VPS
(Virtual Private Server).

## 📋 Pré-requisitos

- VPS com Ubuntu 20.04+ ou CentOS 8+
- Usuário com privilégios sudo
- Domínio configurado (opcional, mas recomendado)
- Pelo menos 2GB de RAM e 20GB de espaço em disco

## 🛠️ Instalação

### 1. Instalação Inicial

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/sispat.git
cd sispat

# Torne os scripts executáveis
chmod +x scripts/*.sh

# Execute a instalação
./scripts/install-vps.sh
```

### 2. Configuração do Ambiente

```bash
# Execute o script de configuração
./scripts/setup-environment.sh
```

Este script irá:

- Solicitar informações do domínio e email
- Configurar variáveis de ambiente
- Configurar SSL com Let's Encrypt
- Configurar Nginx com proxy reverso
- Configurar PM2 para gerenciamento de processos
- Configurar backup automático
- Configurar monitoramento

### 3. Deploy da Aplicação

```bash
# Execute o deploy
./scripts/deploy-vps.sh
```

## 📊 Monitoramento e Manutenção

### Scripts Disponíveis

#### Monitoramento de Memória (Linux)

```bash
# Monitorar uso de memória
node scripts/monitor-memory-linux.js

# Limpar processos desnecessários
node scripts/cleanup-memory-linux.js
```

#### Manutenção do Sistema

```bash
# Manutenção completa
./scripts/maintenance-vps.sh

# Limpeza rápida
./scripts/maintenance-vps.sh cleanup

# Verificação de saúde
./scripts/maintenance-vps.sh health

# Backup manual
./scripts/maintenance-vps.sh backup
```

#### Deploy e Atualizações

```bash
# Deploy completo
./scripts/deploy-vps.sh

# Rollback em caso de problemas
./scripts/deploy-vps.sh rollback
```

## 🔧 Configurações

### Variáveis de Ambiente

O arquivo `.env` é criado automaticamente com as seguintes configurações:

```env
# Configurações do SISPAT
NODE_ENV=production
PORT=3001
VITE_PORT=8080

# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat
DB_USER=sispat
DB_PASSWORD=sua_senha

# JWT e Segurança
JWT_SECRET=sua_chave_secreta
API_SECRET=sua_chave_api
ENCRYPTION_KEY=sua_chave_criptografia

# URLs
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=SISPAT
VITE_APP_VERSION=1.0.0
```

### PM2 Configuration

O arquivo `ecosystem.config.js` é criado com configurações otimizadas:

```javascript
module.exports = {
  apps: [
    {
      name: 'sispat-backend',
      script: 'server/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      // ... outras configurações
    },
  ],
};
```

### Nginx Configuration

O Nginx é configurado com:

- Proxy reverso para frontend e backend
- Suporte a WebSocket
- Compressão gzip
- Headers de segurança
- SSL/TLS com Let's Encrypt

## 📈 Monitoramento

### Logs

Os logs são armazenados em:

- `/var/log/sispat/` - Logs da aplicação
- `/var/log/nginx/` - Logs do Nginx
- `/var/log/postgresql/` - Logs do PostgreSQL

### Métricas

O sistema monitora:

- Uso de memória e CPU
- Espaço em disco
- Status da aplicação
- Resposta da API
- Conexões de banco de dados

### Alertas

Alertas são gerados para:

- Uso de memória > 80%
- Uso de disco > 80%
- Aplicação não respondendo
- Erros críticos

## 🔄 Backup e Recuperação

### Backup Automático

Backups são criados automaticamente:

- Diariamente às 2:00 AM
- Antes de cada deploy
- Durante manutenção

### Localização dos Backups

```
/opt/sispat/backups/
├── pre_deploy_YYYYMMDD_HHMMSS/
│   ├── database.sql
│   └── files.tar.gz
└── maintenance_YYYYMMDD_HHMMSS/
    ├── database.sql
    └── files.tar.gz
```

### Restauração

```bash
# Restaurar backup específico
tar -xzf /opt/sispat/backups/backup_name/files.tar.gz -C /opt/sispat/
psql -h localhost -U sispat -d sispat < /opt/sispat/backups/backup_name/database.sql
pm2 restart ecosystem.config.js
```

## 🚨 Troubleshooting

### Problemas Comuns

#### Aplicação não inicia

```bash
# Verificar logs
pm2 logs sispat-backend

# Verificar status
pm2 status

# Reiniciar
pm2 restart ecosystem.config.js
```

#### Erro de banco de dados

```bash
# Verificar conexão
sudo -u postgres psql -d sispat

# Verificar logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### Erro de SSL

```bash
# Renovar certificado
sudo certbot renew

# Verificar configuração
sudo nginx -t
```

#### Alto uso de memória

```bash
# Limpar processos
node scripts/cleanup-memory-linux.js

# Reiniciar aplicação
pm2 restart ecosystem.config.js
```

### Comandos Úteis

```bash
# Verificar status dos serviços
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis

# Verificar uso de recursos
htop
df -h
free -h

# Verificar logs em tempo real
sudo tail -f /var/log/sispat/combined.log
pm2 logs --lines 100
```

## 📞 Suporte

Para suporte técnico:

1. Verifique os logs de erro
2. Execute o script de verificação de saúde
3. Consulte a documentação
4. Entre em contato com a equipe de suporte

## 🔐 Segurança

### Recomendações

1. **Firewall**: Configure adequadamente
2. **SSL**: Use sempre HTTPS
3. **Senhas**: Use senhas fortes
4. **Atualizações**: Mantenha o sistema atualizado
5. **Backups**: Faça backups regulares
6. **Monitoramento**: Monitore logs e métricas

### Configurações de Segurança

- Headers de segurança no Nginx
- Rate limiting
- Validação de entrada
- Criptografia de dados sensíveis
- Logs de auditoria

## 📚 Recursos Adicionais

- [Documentação do PM2](https://pm2.keymetrics.io/docs/)
- [Documentação do Nginx](https://nginx.org/en/docs/)
- [Documentação do PostgreSQL](https://www.postgresql.org/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)

---

**Nota**: Este guia assume conhecimento básico de administração de sistemas Linux. Para dúvidas
específicas, consulte a documentação oficial dos componentes utilizados.
