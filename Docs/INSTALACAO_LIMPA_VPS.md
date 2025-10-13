# 🔄 INSTALAÇÃO LIMPA - SISPAT 2.0

**Versão:** 2.0.0  
**Data:** 09/10/2025  
**Servidor:** Debian 12

---

## ✅ INSTALAÇÃO COMPLETAMENTE LIMPA

### **Execute no servidor SSH:**

```bash
# ============================================
# PASSO 1: LIMPAR INSTALAÇÃO ANTERIOR
# ============================================

# Parar serviços
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
systemctl stop nginx 2>/dev/null || true

# Remover diretório antigo
rm -rf /var/www/sispat

# ============================================
# PASSO 2: CRIAR SWAP (SE NECESSÁRIO)
# ============================================

# Verificar memória
free -h

# Se Swap < 2GB, criar:
if [ $(free -m | awk '/^Swap:/{print $2}') -lt 2000 ]; then
    echo "Criando swap de 2GB..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# ============================================
# PASSO 3: CLONAR REPOSITÓRIO
# ============================================

cd /var/www
git clone https://github.com/junielsonfarias/sispat.git
cd sispat

# ============================================
# PASSO 4: EXECUTAR INSTALADOR PRINCIPAL
# ============================================

chmod +x install.sh
./install.sh
```

---

## 📋 COMANDO ÚNICO (COPIE E COLE)

```bash
pm2 delete all 2>/dev/null || true && pm2 kill 2>/dev/null || true && rm -rf /var/www/sispat && cd /var/www && git clone https://github.com/junielsonfarias/sispat.git && cd sispat && chmod +x install.sh && ./install.sh
```

---

## ✅ O QUE O install.sh FAZ (CORRIGIDO)

O `install.sh` principal **JÁ ESTÁ ATUALIZADO** com todas as correções:

1. ✅ Instala dependências do **frontend** (incluindo browser-image-compression)
2. ✅ Compila frontend com Vite
3. ✅ Instala dependências do **backend** (express, prisma, @types/node, etc)
4. ✅ Compila backend com TypeScript
5. ✅ Configura PostgreSQL
6. ✅ Gera Prisma Client
7. ✅ Aplica migrations
8. ✅ Executa seed (cria usuários iniciais)
9. ✅ Configura PM2
10. ✅ Configura Nginx
11. ✅ Oferece configurar SSL

---

## ⏱️ TEMPO ESTIMADO

| Etapa | Tempo |
|-------|-------|
| Limpeza | 1 min |
| Swap | 1 min |
| Clone | 1 min |
| Deps frontend | 3-5 min |
| Build frontend | 5-10 min |
| Deps backend | 2-3 min |
| Build backend | 1-2 min |
| Configuração | 2-3 min |
| **TOTAL** | **15-25 min** |

---

## 🎯 PERGUNTAS QUE O SCRIPT FARÁ

Durante a instalação, o script vai perguntar:

### **1. Nome do Município**
```
Digite o nome do município: Prefeitura Municipal de Sua Cidade
```

### **2. Estado (UF)**
```
Digite o estado (sigla, ex: PA): PA
```

### **3. Domínio**
```
Digite o domínio (ex: sispat.gov.br): seu-dominio.com
```

### **4. Email do Admin**
```
Email do superusuário: admin@seu-dominio.com
```

### **5. Senha do Admin**
```
Senha do superusuário: SuaSenhaForte123!
```

### **6. Configurar SSL**
```
Deseja configurar SSL com Let's Encrypt? [s/N]: s
```

---

## ✅ APÓS A INSTALAÇÃO

### **Você verá:**

```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║        ✅  INSTALAÇÃO CONCLUÍDA COM SUCESSO!     ║
║                                                   ║
╚═══════════════════════════════════════════════════╝

📋 INFORMAÇÕES DO SISTEMA:
   Diretório: /var/www/sispat
   Domínio: https://seu-dominio.com
   Backend: http://localhost:3000

🔐 CREDENCIAIS DE ACESSO:
   Email: admin@seu-dominio.com
   Senha: SuaSenhaForte123!

⚠️  IMPORTANTE:
   1. Altere a senha após o primeiro acesso!
   2. Configure backup automático
   3. Configure monitoramento
   4. Teste o sistema completamente

🚀 Sistema pronto para uso!
```

---

## 🧪 VERIFICAR INSTALAÇÃO

```bash
# 1. Health check
curl http://localhost:3000/api/health

# 2. PM2 status
pm2 status

# 3. Nginx status
systemctl status nginx

# 4. Testar frontend
curl -I https://seu-dominio.com

# 5. Executar testes completos
bash /var/www/sispat/scripts/test-deploy.sh
```

---

## 🆘 SE ALGO DER ERRADO

### **Ver logs da instalação:**

```bash
tail -f /var/log/sispat-install.log
```

### **Ver logs do build:**

```bash
cat /tmp/build-frontend.log
cat /tmp/build-backend.log
```

### **Reiniciar do zero:**

Execute o comando único de instalação limpa novamente.

---

## 💡 DICAS

### **Servidor com < 4GB RAM:**
- ✅ Certifique-se de ter swap configurado
- ✅ Use o `install.sh` normal (já otimizado)

### **Se o build travar:**
- ✅ Adicione mais swap (até 4GB)
- ✅ Ou faça build local no Windows e transfira

---

**Execute o comando único acima no servidor! 🚀**

