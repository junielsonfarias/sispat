# Correção: Erro na Configuração do Nginx

## 📋 Problema Identificado

Durante a execução do script de instalação no VPS, ocorreu erro na configuração do Nginx:

```
[ERRO] Erro na configuração do Nginx. Verifique: /tmp/nginx-test.log
```

### Causa Raiz

O script estava criando uma configuração do Nginx que incluía um bloco `server` para HTTPS (porta 443) mesmo quando o SSL **não estava sendo configurado**. O problema específico:

1. **Bloco HTTPS sem certificados**: O script criava `listen 443 ssl http2` sem ter os certificados SSL configurados
2. **Duplicação de blocos HTTP**: Havia dois blocos `server` escutando na porta 80 com o mesmo `server_name`
3. **Referência a certificados inexistentes**: Comentários mencionavam certificados que não existiam

Quando o Nginx tentava validar a configuração (`nginx -t`), ele falhava porque:
- Tentava escutar na porta 443 com SSL sem certificados válidos
- Tinha múltiplos blocos server com conflitos

---

## ✅ Correção Aplicada

### Antes (Problema)

O script sempre criava ambos os blocos (HTTP e HTTPS), independentemente da escolha do usuário:

```bash
# Sempre criava HTTPS mesmo sem SSL
server {
    listen 443 ssl http2;  # ❌ Erro se SSL não configurado
    ...
}

# Dois blocos HTTP com mesmo server_name
server {
    listen 80;  # ❌ Duplicado
    ...
}
```

### Depois (Corrigido)

Agora o script cria configurações diferentes baseadas na escolha do usuário:

#### 1. **Com SSL** (`SETUP_SSL = "S"`)

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge {
        root /var/www/html;
    }
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ...
}
```

#### 2. **Sem SSL** (`SETUP_SSL = "n"`)

```nginx
# HTTP server (sem SSL)
server {
    listen 80;
    server_name $DOMAIN;
    root /var/www/sispat/dist;
    ...
}
```

---

## 📝 Mudanças no Script

**Arquivo**: `install-sispat.sh` (linhas 354-487)

**Alterações**:

1. ✅ Adicionada verificação condicional `if [[ "$SETUP_SSL" =~ ^[Ss]$ ]]`
2. ✅ Configuração separada para casos com e sem SSL
3. ✅ Removida duplicação de blocos HTTP
4. ✅ Removidas referências a certificados SSL quando não configurados
5. ✅ Adicionados headers de segurança em ambos os casos

---

## 🧪 Validação

A configuração agora passa na validação do Nginx (`nginx -t`) em ambos os cenários:

- ✅ **Com SSL**: Configuração completa com redirect HTTP→HTTPS
- ✅ **Sem SSL**: Apenas HTTP na porta 80

---

## 🚀 Próximos Passos

1. ✅ Correção aplicada ao script
2. ⏳ Script pronto para nova tentativa de instalação
3. ⏳ Usuário pode executar novamente: `sudo bash install-sispat.sh`

---

**Data**: 2025-11-03  
**Versão**: 2.0.0  
**Status**: ✅ Corrigido

