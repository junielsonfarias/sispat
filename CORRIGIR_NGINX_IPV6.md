# 🔧 Corrigir Erro Nginx IPv6 (Connection Refused)

## 📋 Problema Identificado

O Nginx está tentando conectar ao backend usando IPv6 (`[::1]:3000`) em vez de IPv4 (`127.0.0.1:3000`), causando erro:

```
connect() failed (111: Connection refused) while connecting to upstream
upstream: "http://[::1]:3000/api/health"
```

### Causa

Quando o Nginx usa `localhost:3000`, o sistema pode resolver para IPv6 (`[::1]`) em vez de IPv4 (`127.0.0.1`). O backend está escutando em `0.0.0.0:3000` (IPv4), então a conexão IPv6 falha.

---

## ✅ SOLUÇÃO RÁPIDA

Execute no servidor:

```bash
# Corrigir configuração do Nginx
sed -i 's/proxy_pass http:\/\/localhost:3000/proxy_pass http:\/\/127.0.0.1:3000/g' /etc/nginx/sites-available/sispat

# Verificar alteração
grep "proxy_pass" /etc/nginx/sites-available/sispat | grep "/api"

# Testar configuração
nginx -t

# Recarregar Nginx
systemctl reload nginx

# Testar proxy
curl http://localhost/api/health
```

---

## 🔍 VERIFICAÇÃO

Após aplicar a correção:

```bash
# 1. Verificar configuração
cat /etc/nginx/sites-available/sispat | grep -A 5 "location /api"

# Deve mostrar:
# proxy_pass http://127.0.0.1:3000;

# 2. Testar backend diretamente
curl http://127.0.0.1:3000/api/health

# 3. Testar através do Nginx
curl http://localhost/api/health

# 4. Verificar logs do Nginx
tail -10 /var/log/nginx/error.log
# Não deve mais aparecer erros de Connection refused
```

---

## 📝 ALTERAÇÃO APLICADA

**Antes:**
```nginx
location /api {
    proxy_pass http://localhost:3000;
    ...
}
```

**Depois:**
```nginx
location /api {
    proxy_pass http://127.0.0.1:3000;
    ...
}
```

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Aplicar correção no servidor (comando acima)
2. ✅ Verificar se Nginx consegue fazer proxy
3. ✅ Testar login no frontend

---

**Data**: 2025-11-03  
**Status**: ✅ Correção aplicada no script de instalação

