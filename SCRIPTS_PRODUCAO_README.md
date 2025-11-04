# 📋 Scripts de Produção - SISPAT

Este documento explica como usar os scripts de diagnóstico e correção para produção.

---

## 🚀 **COMO USAR**

### **Opção 1: Script Wrapper (RECOMENDADO)** ⭐

O script `EXECUTAR_SCRIPT.sh` sempre atualiza o código do repositório antes de executar qualquer script:

```bash
cd /var/www/sispat
chmod +x EXECUTAR_SCRIPT.sh
./EXECUTAR_SCRIPT.sh NOME_DO_SCRIPT.sh
```

**Exemplos:**

```bash
# Executar diagnóstico rápido (atualiza código automaticamente)
./EXECUTAR_SCRIPT.sh DIAGNOSTICO_RAPIDO.sh

# Corrigir problemas finais (atualiza código automaticamente)
./EXECUTAR_SCRIPT.sh CORRIGIR_PROBLEMAS_FINAIS.sh

# Analisar aplicação completa (atualiza código automaticamente)
./EXECUTAR_SCRIPT.sh ANALISAR_APLICACAO_PRODUCAO.sh
```

---

### **Opção 2: Execução Direta**

Se você já atualizou o código manualmente:

```bash
cd /var/www/sispat
git pull origin main  # Atualizar código primeiro
chmod +x NOME_DO_SCRIPT.sh
./NOME_DO_SCRIPT.sh
```

---

## 📁 **SCRIPTS DISPONÍVEIS**

### **🔍 Diagnóstico**

| Script | Descrição |
|--------|-----------|
| `DIAGNOSTICO_RAPIDO.sh` | Diagnóstico rápido do sistema (status, health check, rate limits) |
| `DIAGNOSTICAR_BACKEND_OFFLINE.sh` | Diagnóstico específico quando o backend não está iniciando |
| `VERIFICAR_INICIALIZACAO.sh` | Verificar erros de inicialização do backend |
| `ANALISAR_APLICACAO_PRODUCAO.sh` | Análise completa do ambiente de produção |

### **🔧 Correção**

| Script | Descrição |
|--------|-----------|
| `CORRIGIR_PROBLEMAS_FINAIS.sh` | Corrige problemas finais (rate limits, código atualizado) |
| `CORRIGIR_PROBLEMAS_PRODUCAO.sh` | Correção completa (atualiza tudo: código, dependências, recompila, reinicia) |
| `TESTAR_BACKEND_MANUAL.sh` | Testa o backend manualmente para ver erros |

### **⚙️ Utilitários**

| Script | Descrição |
|--------|-----------|
| `EXECUTAR_SCRIPT.sh` | Wrapper que sempre atualiza código antes de executar |

---

## 📝 **FLUXO RECOMENDADO**

### **1. Diagnóstico Inicial**

```bash
cd /var/www/sispat
./EXECUTAR_SCRIPT.sh DIAGNOSTICO_RAPIDO.sh
```

### **2. Se Houver Problemas**

```bash
# Correção rápida (rate limits, etc)
./EXECUTAR_SCRIPT.sh CORRIGIR_PROBLEMAS_FINAIS.sh
```

### **3. Se Problema Persistir**

```bash
# Correção completa (recompila tudo)
./EXECUTAR_SCRIPT.sh CORRIGIR_PROBLEMAS_PRODUCAO.sh
```

### **4. Análise Detalhada**

```bash
# Análise completa do ambiente
./EXECUTAR_SCRIPT.sh ANALISAR_APLICACAO_PRODUCAO.sh
```

---

## ⚠️ **IMPORTANTE**

### **✅ Todos os Scripts Fazem:**

1. **Atualização automática** do código do repositório (`git pull`)
2. **Configuração do Git** (permite pull sem erros de permissão)
3. **Verificação de status** do sistema

### **🔒 Segurança:**

- Todos os scripts pedem confirmação antes de fazer alterações críticas
- Backups automáticos antes de mudanças importantes
- Logs detalhados de todas as operações

---

## 🐛 **TROUBLESHOOTING**

### **Erro: "git pull failed"**

```bash
# Configurar permissões do Git
git config --global --add safe.directory /var/www/sispat

# Tentar novamente
git pull origin main
```

### **Erro: "Permission denied" ao executar script**

```bash
# Dar permissão de execução
chmod +x NOME_DO_SCRIPT.sh

# Executar
./NOME_DO_SCRIPT.sh
```

### **Erro: "Script not found"**

```bash
# Verificar se está no diretório correto
cd /var/www/sispat

# Listar scripts disponíveis
ls -la *.sh

# Atualizar código primeiro
git pull origin main
```

---

## 📊 **EXEMPLO DE SAÍDA**

```
════════════════════════════════════════════════════
  EXECUTOR DE SCRIPT COM ATUALIZAÇÃO AUTOMÁTICA
════════════════════════════════════════════════════

[1/3] Configurando Git...
✓ Git configurado

[2/3] Atualizando código do repositório...
  → Buscando atualizações...
  → Baixando atualizações...
✓ Código atualizado

[3/3] Executando script: CORRIGIR_PROBLEMAS_FINAIS.sh

════════════════════════════════════════════════════

[INFO] Iniciando correção de problemas finais...

...
```

---

## 🎯 **COMANDOS RÁPIDOS**

```bash
# Atualizar e executar diagnóstico
./EXECUTAR_SCRIPT.sh DIAGNOSTICO_RAPIDO.sh

# Atualizar e corrigir problemas
./EXECUTAR_SCRIPT.sh CORRIGIR_PROBLEMAS_FINAIS.sh

# Atualizar e fazer correção completa
./EXECUTAR_SCRIPT.sh CORRIGIR_PROBLEMAS_PRODUCAO.sh
```

---

## 📞 **SUPORTE**

Se os scripts não resolverem o problema:

1. Execute `ANALISAR_APLICACAO_PRODUCAO.sh` para gerar relatório completo
2. Verifique os logs: `pm2 logs sispat-backend`
3. Verifique Nginx: `sudo nginx -t` e `sudo systemctl status nginx`

---

**Última atualização:** 04/11/2025
