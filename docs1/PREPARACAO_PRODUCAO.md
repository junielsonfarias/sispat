# PREPARAÇÃO PARA PRODUÇÃO - SISPAT

## ✅ Correções Implementadas

### 1. Sistema de Autenticação

- **Status**: ✅ Funcionando em desenvolvimento
- **Problema Resolvido**: Configuração da API frontend
- **Correção**: BaseURL com prefixo `/api/`
- **Token**: Gerenciamento unificado (`sispat_auth_token`)

### 2. Dependências

- **Status**: ✅ Todas instaladas
- **Bibliotecas Adicionadas**:
  - `@tailwindcss/typography@0.5.16`
  - `@tailwindcss/aspect-ratio@0.4.2`
  - `sonner@2.0.7`
  - `@radix-ui/react-scroll-area@1.2.10`

### 3. Configuração CORS

- **Status**: ✅ Configurado para desenvolvimento
- **IPs Permitidos**: localhost e rede local (192.168.1.173)

## 🔧 Configurações para Produção

### 1. Variáveis de Ambiente

Criar arquivo `.env.production`:

```env
# Banco de Dados
DB_HOST=seu_host_producao
DB_PORT=5432
DB_NAME=sispat_prod
DB_USER=sispat_user
DB_PASSWORD=senha_segura

# JWT
JWT_SECRET=chave_jwt_super_segura_producao

# API
API_URL=https://seu-dominio.com
FRONTEND_URL=https://seu-dominio.com

# CORS
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com

# Rate Limiting
REDIS_URL=redis://seu-redis-host:6379

# Logs
LOG_LEVEL=info
LOG_FILE=logs/production.log

# SSL
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### 2. Build de Produção

```bash
# Frontend
npm run build

# Verificar arquivos gerados
ls -la dist/

# Testar build localmente
npm run preview
```

### 3. Configuração do Servidor

#### Nginx (Recomendado)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Docker (Alternativo)

```dockerfile
# Dockerfile.production
FROM node:18-alpine

WORKDIR /app

# Copiar arquivos
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Instalar dependências
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copiar código
COPY . .

# Build frontend
RUN pnpm build

# Expor porta
EXPOSE 3001

# Comando de início
CMD ["npm", "run", "start:prod"]
```

### 5. PM2 (Gerenciador de Processos)

```json
{
  "name": "sispat-backend",
  "script": "server/index.js",
  "instances": "max",
  "exec_mode": "cluster",
  "env": {
    "NODE_ENV": "production",
    "PORT": "3001"
  },
  "log_file": "logs/combined.log",
  "out_file": "logs/out.log",
  "error_file": "logs/error.log",
  "log_date_format": "YYYY-MM-DD HH:mm Z"
}
```

## 🔍 Checklist Pré-Deploy

### Segurança

- [ ] Alterar todas as senhas padrão
- [ ] Configurar HTTPS/SSL
- [ ] Configurar firewall
- [ ] Validar configurações CORS
- [ ] Testar rate limiting

### Performance

- [ ] Otimizar queries do banco
- [ ] Configurar cache Redis
- [ ] Comprimir assets estáticos
- [ ] Configurar CDN (opcional)

### Monitoramento

- [ ] Configurar logs estruturados
- [ ] Implementar health checks
- [ ] Configurar alertas
- [ ] Backup automático do banco

### Testes

- [ ] Testar autenticação
- [ ] Testar CRUD de patrimônios
- [ ] Testar relatórios
- [ ] Testar upload de arquivos
- [ ] Testar em diferentes navegadores

## 🚀 Comandos de Deploy

```bash
# 1. Preparar ambiente
git clone https://github.com/seu-repo/sispat.git
cd sispat

# 2. Instalar dependências
pnpm install

# 3. Configurar ambiente
cp .env.production.example .env

# 4. Build frontend
pnpm build

# 5. Inicializar banco
npm run db:migrate

# 6. Iniciar com PM2
pm2 start ecosystem.config.js

# 7. Configurar nginx
sudo cp nginx.conf /etc/nginx/sites-available/sispat
sudo ln -s /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 📊 Monitoramento Pós-Deploy

### Logs Importantes

```bash
# Logs da aplicação
tail -f logs/production.log

# Logs do PM2
pm2 logs sispat-backend

# Logs do Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Métricas

- CPU e Memória do servidor
- Tempo de resposta das APIs
- Taxa de erro das requisições
- Uso do banco de dados
- Espaço em disco

## 🔧 Troubleshooting

### Problemas Comuns

1. **Erro 502 Bad Gateway**: Verificar se o backend está rodando na porta 3001
2. **CORS Error**: Verificar configuração de ALLOWED_ORIGINS
3. **Database Connection**: Verificar credenciais e conectividade
4. **Assets não carregam**: Verificar configuração do nginx para arquivos estáticos

### Comandos Úteis

```bash
# Verificar status dos serviços
pm2 status
systemctl status nginx
systemctl status postgresql

# Reiniciar serviços
pm2 restart sispat-backend
sudo systemctl restart nginx

# Verificar logs em tempo real
pm2 logs --lines 100
```

---

**Data de Criação**: 28/08/2025  
**Última Atualização**: 28/08/2025  
**Status**: Pronto para produção com as correções implementadas
