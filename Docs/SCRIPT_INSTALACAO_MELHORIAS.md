# 🔧 MELHORIAS DO SCRIPT DE INSTALAÇÃO

**Data:** 09/10/2025  
**Arquivo:** install.sh  
**Status:** ✅ Script já está bem completo

---

## ✅ O QUE JÁ ESTÁ IMPLEMENTADO

O script `install.sh` já possui:

1. ✅ **Limpeza de instalação anterior**
2. ✅ **Instalação de dependências**
3. ✅ **Configuração do PostgreSQL**
4. ✅ **Configuração do Nginx**
5. ✅ **Configuração do PM2**
6. ✅ **Build de produção**
7. ✅ **Configuração SSL (Certbot)**
8. ✅ **Logs estruturados**
9. ✅ **Validação de pré-requisitos**
10. ✅ **Interface amigável com cores**

---

## 🎯 MELHORIAS RECOMENDADAS

### **1. Validação de Ambiente**

Adicionar verificação se é realmente produção:

```bash
if [ "$INSTALL_ENV" != "production" ]; then
    warning "⚠️  Este script é para PRODUÇÃO!"
    read -p "Tem certeza que deseja continuar? [s/N]: " confirm
    [[ "$confirm" =~ ^[Ss]$ ]] || exit 1
fi
```

### **2. Backup Automático**

Adicionar criação automática de script de backup:

```bash
create_backup_script() {
    cat > /usr/local/bin/backup-sispat.sh <<'BACKUP_SCRIPT'
#!/bin/bash
BACKUP_DIR="/var/backups/sispat"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup do banco
docker exec sispat-postgres pg_dump -U postgres sispat_prod > "$BACKUP_DIR/db_$DATE.sql"

# Backup dos uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C /var/www/sispat/backend uploads

# Limpar backups antigos (>30 dias)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
BACKUP_SCRIPT

    chmod +x /usr/local/bin/backup-sispat.sh
    
    # Agendar backup diário
    (crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup-sispat.sh") | crontab -
}
```

### **3. Monitoramento**

Adicionar configuração de monitoramento básico:

```bash
setup_monitoring() {
    # Instalar pm2-logrotate
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 10M
    pm2 set pm2-logrotate:retain 7
    
    # Configurar health check
    echo "*/5 * * * * curl -f http://localhost:3000/api/health || pm2 restart sispat-backend" | crontab -
}
```

### **4. Verificação Pós-Instalação**

Adicionar testes automatizados:

```bash
post_install_tests() {
    echo "🧪 Executando testes pós-instalação..."
    
    # Teste 1: Backend respondendo
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        success "✅ Backend respondendo"
    else
        error "❌ Backend não está respondendo"
    fi
    
    # Teste 2: Nginx rodando
    if systemctl is-active --quiet nginx; then
        success "✅ Nginx rodando"
    else
        error "❌ Nginx não está rodando"
    fi
    
    # Teste 3: PostgreSQL rodando
    if docker ps | grep -q sispat-postgres; then
        success "✅ PostgreSQL rodando"
    else
        error "❌ PostgreSQL não está rodando"
    fi
    
    # Teste 4: SSL configurado
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        success "✅ SSL configurado"
    else
        warning "⚠️  SSL não configurado (executar certbot manualmente)"
    fi
}
```

### **5. Documentação no Final**

Adicionar resumo com credenciais e próximos passos:

```bash
show_final_summary() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     ✅  INSTALAÇÃO CONCLUÍDA COM SUCESSO!        ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📋 INFORMAÇÕES DO SISTEMA:${NC}"
    echo -e "   ${WHITE}Diretório:${NC} $INSTALL_DIR"
    echo -e "   ${WHITE}Domínio:${NC} https://$DOMAIN"
    echo -e "   ${WHITE}Backend:${NC} http://localhost:$APP_PORT"
    echo ""
    echo -e "${CYAN}🔐 CREDENCIAIS DE ACESSO:${NC}"
    echo -e "   ${WHITE}Email:${NC} $SUPERUSER_EMAIL"
    echo -e "   ${WHITE}Senha:${NC} $SUPERUSER_PASSWORD"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
    echo -e "   1. Altere a senha após o primeiro acesso!"
    echo -e "   2. Configure backup automático"
    echo -e "   3. Configure monitoramento"
    echo -e "   4. Teste o sistema completamente"
    echo ""
    echo -e "${CYAN}📚 PRÓXIMOS PASSOS:${NC}"
    echo -e "   1. Acessar: ${GREEN}https://$DOMAIN${NC}"
    echo -e "   2. Fazer login com as credenciais acima"
    echo -e "   3. Configurar setores e locais"
    echo -e "   4. Criar tipos de bens"
    echo -e "   5. Cadastrar usuários"
    echo ""
    echo -e "${CYAN}🔧 COMANDOS ÚTEIS:${NC}"
    echo -e "   ${WHITE}Ver logs:${NC} pm2 logs"
    echo -e "   ${WHITE}Status:${NC} pm2 status"
    echo -e "   ${WHITE}Reiniciar:${NC} pm2 restart sispat-backend"
    echo -e "   ${WHITE}Backup:${NC} /usr/local/bin/backup-sispat.sh"
    echo ""
    echo -e "${GREEN}🎉 Sistema pronto para uso!${NC}"
    echo ""
}
```

---

## 📝 COMO APLICAR AS MELHORIAS

### **Opção 1: Atualização Manual**

Edite o arquivo `install.sh` e adicione as funções acima antes da função `main()`.

### **Opção 2: Script Complementar**

Crie um arquivo `post-install.sh` com as melhorias adicionais:

```bash
#!/bin/bash
# post-install.sh - Melhorias pós-instalação

source install.sh  # Importar funções

# Executar melhorias
create_backup_script
setup_monitoring
post_install_tests
show_final_summary
```

---

## ✅ CONCLUSÃO

O script `install.sh` atual já é muito completo e funcional. As melhorias sugeridas são **opcionais** e podem ser implementadas conforme necessidade.

**Prioridade das melhorias:**
1. 🔴 **Alta:** Backup Automático
2. 🟡 **Média:** Monitoramento
3. 🟢 **Baixa:** Testes Pós-Instalação

---

**Status Atual:** ✅ Script pronto para uso em produção

