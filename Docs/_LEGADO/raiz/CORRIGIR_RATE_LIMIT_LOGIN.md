# 🔧 Correção: Erro 429 (Too Many Requests) no Login

## ✅ Problema Identificado

O erro `429 (Too Many Requests)` ocorria durante tentativas de login porque:

1. **Rate limit muito restritivo**: O limite estava configurado para apenas **5 tentativas por 15 minutos**
2. **Global rate limiter interferindo**: O `globalRateLimiter` estava sendo aplicado também nas rotas de autenticação
3. **Múltiplas tentativas rápidas**: Problemas de rede ou conexão podem causar múltiplas requisições, excedendo rapidamente o limite

## 🔧 Correções Aplicadas

### 1. **Aumento do Limite de Autenticação**
- **Antes**: 5 tentativas por 15 minutos
- **Depois**: 20 tentativas por 15 minutos
- **Arquivo**: `backend/src/routes/authRoutes.ts`

### 2. **Global Rate Limiter Ignorando Autenticação**
- Adicionado `/api/auth` à lista de rotas ignoradas pelo `globalRateLimiter`
- Rotas de autenticação agora têm apenas seu próprio rate limiter
- **Arquivo**: `backend/src/middlewares/advanced-rate-limit.ts`

### 3. **Handler Customizado**
- Adicionado handler customizado no `authLimiter` para melhor logging
- Mensagens de erro mais claras para o usuário

## 📋 Arquivos Modificados

1. **`backend/src/middlewares/advanced-rate-limit.ts`**
   - Adicionado `req.path.startsWith('/api/auth')` ao skip do `globalRateLimiter`

2. **`backend/src/routes/authRoutes.ts`**
   - Aumentado `max` de 5 para 20 no `authLimiter`
   - Adicionado handler customizado com logging

## 🚀 Como Aplicar no Servidor

Execute o script no servidor:

```bash
cd /var/www/sispat
chmod +x CORRIGIR_RATE_LIMIT_LOGIN.sh
sudo ./CORRIGIR_RATE_LIMIT_LOGIN.sh
```

Ou execute manualmente:

```bash
cd /var/www/sispat
sudo git pull origin main

# Limpar cache do Redis (se disponível)
redis-cli --scan --pattern "rl:auth:*" | xargs -r redis-cli del
redis-cli --scan --pattern "rl:global:*" | xargs -r redis-cli del

# Recompilar backend
cd backend
npm run build

# Reiniciar backend
pm2 restart sispat-backend
```

## ⚠️ Se o Erro Persistir

Se você ainda estiver recebendo erro 429 após aplicar as correções:

### Opção 1: Aguardar 15 minutos
O rate limit expira naturalmente após 15 minutos da última tentativa bloqueada.

### Opção 2: Limpar Cache do Redis Manualmente
```bash
# Limpar todos os rate limits
redis-cli --scan --pattern "rl:*" | xargs redis-cli del

# Ou reiniciar o Redis
sudo systemctl restart redis
```

### Opção 3: Reiniciar o Backend
Se o Redis não estiver disponível, o rate limit está em memória e será limpo ao reiniciar:

```bash
pm2 restart sispat-backend
```

## 🔍 Verificar Status do Rate Limit

### Ver chaves do rate limit no Redis:
```bash
redis-cli --scan --pattern "rl:auth:*"
redis-cli --scan --pattern "rl:global:*"
```

### Ver logs do backend:
```bash
pm2 logs sispat-backend --lines 50
```

### Verificar se há bloqueios:
Procure por mensagens como:
- `⚠️ Rate limit de autenticação excedido`
- `⚠️ Rate limit exceeded`

## 📊 Limites Atuais

| Rota | Limite | Janela | Observação |
|------|--------|--------|------------|
| `/api/auth/login` | 20 tentativas | 15 minutos | Rate limiter específico |
| `/api/auth/forgot-password` | 3 tentativas | 15 minutos | Rate limiter específico |
| `/api/auth/reset-password` | 3 tentativas | 15 minutos | Rate limiter específico |
| Rotas gerais | 2000 requisições | 15 minutos | Global (ignora `/api/auth`) |

## 🔐 Segurança

O aumento do limite de 5 para 20 tentativas por 15 minutos ainda oferece proteção adequada contra:
- **Brute force attacks**: 20 tentativas em 15 minutos não são suficientes para quebrar senhas seguras
- **Account enumeration**: Limite por IP impede tentativas massivas
- **DDoS**: O global rate limiter continua protegendo outras rotas

Para ambientes com maior risco, você pode ajustar o limite editando `backend/src/routes/authRoutes.ts`:

```typescript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Ajuste este valor conforme necessário
  // ...
});
```
