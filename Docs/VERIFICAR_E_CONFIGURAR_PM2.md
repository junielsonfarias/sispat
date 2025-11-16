# 🔧 Verificar e Configurar PM2 em Produção

## 📋 Situação Atual

Após o build, o processo PM2 `sispat-frontend` não foi encontrado. Precisamos verificar e configurar.

## 🔍 Comandos para Verificar

### 1. Verificar processos PM2 existentes:

```bash
pm2 list
```

### 2. Verificar se há processos com outros nomes:

```bash
pm2 list | grep -i sispat
```

### 3. Verificar estrutura do projeto:

```bash
cd /var/www/sispat
ls -la
```

## 🚀 Configurar PM2 (se necessário)

### Opção 1: Se o frontend está servido pelo Nginx (estático)

Se o Nginx está servindo os arquivos estáticos de `dist/`, não precisa de PM2 para frontend:

```bash
# Apenas recarregar Nginx
sudo systemctl reload nginx
```

### Opção 2: Se precisa de PM2 para servir o frontend

```bash
cd /var/www/sispat

# Verificar se há um servidor de desenvolvimento rodando
# Se sim, criar processo PM2:

# Para servir o dist/ com um servidor simples:
pm2 serve dist 8080 --name sispat-frontend --spa

# OU usar o servidor do Vite (se houver):
# pm2 start npm --name sispat-frontend -- run preview

# Salvar configuração
pm2 save
```

### Opção 3: Verificar configuração do Nginx

```bash
# Verificar configuração do Nginx
sudo cat /etc/nginx/sites-available/sispat
# ou
sudo cat /etc/nginx/conf.d/sispat.conf

# Verificar se está apontando para dist/
```

## 📊 Estrutura Esperada

### Se frontend está na raiz:
```
/var/www/sispat/
├── dist/          # Build do frontend
├── backend/       # Backend
├── package.json   # Na raiz
└── ...
```

### Se frontend está em subdiretório:
```
/var/www/sispat/
├── frontend/
│   └── dist/      # Build do frontend
└── backend/
```

## ✅ Verificar se está funcionando

```bash
# 1. Verificar se dist/ existe e tem arquivos
ls -lh /var/www/sispat/dist/ | head -10

# 2. Verificar se index.html existe
ls -lh /var/www/sispat/dist/index.html

# 3. Verificar Nginx
sudo nginx -t
sudo systemctl status nginx

# 4. Testar acesso
curl -I http://localhost
# ou
curl -I https://sispat.vps-kinghost.net
```

## 🔄 Recarregar Nginx

```bash
sudo systemctl reload nginx
# ou
sudo systemctl restart nginx
```

## 📝 Próximos Passos

1. Verificar estrutura: `ls -la /var/www/sispat`
2. Verificar PM2: `pm2 list`
3. Verificar Nginx: `sudo systemctl status nginx`
4. Recarregar Nginx: `sudo systemctl reload nginx`
5. Testar no navegador

