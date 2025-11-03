# 🚀 Guia Rápido - Instalação Corrigida do SISPAT 2.0

## ✅ O Que Foi Corrigido

O erro **"vite: not found"** foi completamente resolvido! O script `install.sh` agora:

1. ✅ Limpa instalações anteriores automaticamente
2. ✅ Verifica se Vite foi instalado antes de fazer build
3. ✅ Tenta reinstalar com `--force` se detectar falha
4. ✅ Valida se os arquivos foram realmente gerados
5. ✅ Mostra logs detalhados em caso de erro

---

## 🎯 Como Usar o Script Atualizado

### Opção 1: Instalação Limpa (Recomendado)

Se você ainda não instalou ou quer começar do zero:

```bash
# 1. Fazer upload dos arquivos atualizados para o servidor
# (Certifique-se de enviar o install.sh atualizado)

# 2. No servidor VPS, executar:
cd ~
sudo bash install.sh
```

O script agora detecta e corrige automaticamente problemas com Vite e TypeScript!

---

### Opção 2: Corrigir Instalação Existente

Se você já tem o SISPAT parcialmente instalado mas o build falhou:

```bash
# No servidor VPS, executar o script de correção:
sudo bash fix-build-error.sh
```

Este script vai:
- Limpar tudo e reinstalar dependências corretamente
- Verificar Vite e TypeScript
- Fazer build do frontend e backend
- Te guiar nos próximos passos

---

## 📋 Passo a Passo Completo

### 1️⃣ Enviar Arquivos Atualizados

Na sua máquina local, faça upload para o servidor:

```bash
# Via SCP (substitua SEU_IP e SEU_USUARIO)
scp install.sh SEU_USUARIO@SEU_IP:~/
scp fix-build-error.sh SEU_USUARIO@SEU_IP:~/
```

Ou use um cliente FTP como FileZilla.

---

### 2️⃣ No Servidor VPS

```bash
# Conectar via SSH
ssh SEU_USUARIO@SEU_IP

# Tornar scripts executáveis
chmod +x install.sh fix-build-error.sh

# Executar instalação
sudo bash install.sh
```

---

### 3️⃣ Acompanhar o Progresso

Agora você verá mensagens mais detalhadas:

```
╔═══════════════════════════════════════════════════╗
║  ETAPA 1/4: Instalando dependências do frontend  ║
╚═══════════════════════════════════════════════════╝

  → Removendo node_modules anterior...
  → Instalando pacotes do frontend...
✓ ✅ Dependências do frontend instaladas

╔═══════════════════════════════════════════════════╗
║  ETAPA 2/4: Compilando frontend (React/TypeScript)║
╚═══════════════════════════════════════════════════╝

  → Compilando código React/TypeScript...
✓ ✅ Frontend compilado com sucesso
```

---

## 🔧 Se Algo Der Errado

### Cenário 1: Build do Frontend Falhou

```bash
# Ver o log do erro
cat /tmp/build-frontend.log

# Executar correção automática
sudo bash fix-build-error.sh
```

### Cenário 2: Build do Backend Falhou

```bash
# Ver o log do erro
cat /tmp/build-backend.log

# Executar correção automática
sudo bash fix-build-error.sh
```

### Cenário 3: Erro Desconhecido

```bash
# Ver todos os logs
ls -lh /tmp/build-*.log

# Ver o log mais recente
cat /tmp/build-*.log | tail -50

# Tentar correção manual
cd /var/www/sispat
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps --force
npm run build
```

---

## 🎯 Verificar Se Funcionou

Após a instalação, verifique:

### 1. Frontend compilado?
```bash
ls -lh /var/www/sispat/dist/
# Deve mostrar: index.html e pasta assets/
```

### 2. Backend compilado?
```bash
ls -lh /var/www/sispat/backend/dist/
# Deve mostrar: index.js e outros arquivos .js
```

### 3. API está rodando?
```bash
pm2 list
# Deve mostrar: sispat-backend - online
```

### 4. Site está acessível?
```bash
curl http://localhost
# Deve retornar HTML
```

---

## 📊 Diferenças Entre os Scripts

| Script | Quando Usar | O Que Faz |
|--------|-------------|-----------|
| `install.sh` | Instalação completa do zero | Instala tudo: Node, PostgreSQL, Nginx, compila código, configura banco |
| `fix-build-error.sh` | Corrigir erro de build | Apenas corrige o build do frontend e backend |

---

## 💡 Dicas Importantes

### 1. Memória RAM

Se seu servidor tem **menos de 4GB de RAM**, adicione SWAP antes:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
free -h  # Verificar
```

### 2. Espaço em Disco

Certifique-se de ter pelo menos **20GB livres**:

```bash
df -h
```

### 3. DNS Configurado

Se for usar SSL, configure o DNS **antes** de rodar o script:

```
Tipo: A
Nome: sispat (ou @)
Valor: IP_DO_SEU_SERVIDOR
TTL: 3600
```

---

## 🎉 Após Instalação Bem-Sucedida

O script mostrará suas credenciais:

```
╔═══════════════════════════════════════════════════════════════════╗
║                  🔐 SUAS CREDENCIAIS DE ACESSO                    ║
╚═══════════════════════════════════════════════════════════════════╝

👑 SUPERUSUÁRIO:
   📧 Email: admin@seudominio.com
   🔑 Senha: (a senha que você configurou)

🌐 Acesse: https://seudominio.com
```

### Primeiro Acesso

1. Acesse o endereço mostrado
2. Faça login com as credenciais
3. **IMPORTANTE:** Altere sua senha imediatamente!
4. Configure as secretarias e usuários
5. Comece a cadastrar patrimônio

---

## 🆘 Suporte

### Logs Disponíveis

```bash
# Log da instalação completa
cat /var/log/sispat-install.log

# Logs do build
ls -lh /tmp/build-*.log

# Logs da aplicação
pm2 logs sispat-backend
```

### Comandos Úteis

```bash
# Ver status da aplicação
pm2 status

# Reiniciar aplicação
pm2 restart sispat-backend

# Ver logs em tempo real
pm2 logs sispat-backend --lines 100

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver status do Nginx
sudo systemctl status nginx

# Testar configuração do Nginx
sudo nginx -t
```

---

## 📞 Reportar Problemas

Se ainda encontrar problemas, reúna as seguintes informações:

```bash
# 1. Informações do sistema
uname -a
free -h
df -h

# 2. Logs de instalação
cat /var/log/sispat-install.log > ~/diagnostico.log
cat /tmp/build-frontend.log >> ~/diagnostico.log
cat /tmp/build-backend.log >> ~/diagnostico.log

# 3. Status dos serviços
pm2 list >> ~/diagnostico.log
sudo systemctl status nginx >> ~/diagnostico.log

# 4. Baixar arquivo de diagnóstico
# Use SCP ou FTP para baixar ~/diagnostico.log
```

E envie o arquivo `diagnostico.log` junto com o issue no GitHub.

---

## ✅ Checklist de Instalação

- [ ] Servidor VPS com Ubuntu/Debian
- [ ] Mínimo 2GB RAM (4GB recomendado)
- [ ] Mínimo 20GB disco livre
- [ ] DNS configurado (se usar SSL)
- [ ] Portas 80 e 443 abertas no firewall
- [ ] Acesso root ou sudo
- [ ] `install.sh` atualizado enviado para o servidor
- [ ] Script executado com `sudo bash install.sh`
- [ ] Instalação concluída sem erros
- [ ] Frontend acessível no navegador
- [ ] Login funcionando
- [ ] Senha alterada no primeiro acesso

---

**Pronto! Agora sua instalação está muito mais robusta e resiliente a erros! 🚀**

Se precisar de ajuda, consulte também:
- `CHANGELOG_INSTALL_SCRIPT.md` - Detalhes técnicos das mudanças
- `GUIA_INSTALACAO_VPS_COMPLETO.md` - Guia completo de instalação

