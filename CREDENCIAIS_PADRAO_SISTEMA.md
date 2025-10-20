# 🔐 Credenciais Padrão do SISPAT 2.0

## 📋 Informações Importantes

Este documento contém as credenciais padrão configuradas no sistema SISPAT 2.0 após a instalação automática.

**Data:** 13 de Outubro de 2025  
**Versão:** 2.0.2  
**Status:** ✅ Configurações Fixas

---

## 👑 SUPERUSUÁRIO (Administrador)

### Configuração durante Instalação

Durante a instalação, você será solicitado a informar:

1. **Email do administrador**
   - Pergunta: "Qual seu email?"
   - Padrão sugerido: `admin@[SEU_DOMINIO]`
   - Você pode personalizar

2. **Nome do administrador**
   - Pergunta: "Qual seu nome completo?"
   - Padrão sugerido: "Administrador SISPAT"
   - Você pode personalizar

3. **Senha do administrador**
   - Pergunta: "Sua senha de login"
   - Padrão sugerido: `Tiko6273@`
   - Você pode personalizar

### Credenciais Finais

As credenciais que você **informar durante a instalação** serão usadas para:
- ✅ Primeiro acesso ao sistema
- ✅ Configuração inicial
- ✅ Gestão completa do sistema

**⚠️ IMPORTANTE:** Você define essas credenciais durante a instalação!

---

## 👨‍💼 SUPERVISOR (Usuário Operacional)

### Credenciais PRÉ-CONFIGURADAS (Fixas)

O supervisor já vem criado automaticamente com credenciais fixas:

| Campo | Valor |
|-------|-------|
| **Nome** | Supervisor |
| **Email** | supervisor@ssbv.com |
| **Senha** | Master6273@ |
| **Função** | supervisor |

### Características

- ✅ **Pré-configurado:** Criado automaticamente na instalação
- ✅ **Pronto para uso:** Não precisa configurar
- ✅ **Gestão operacional:** Pode gerenciar patrimônio e relatórios
- ⚠️ **Altere a senha:** Recomendado após primeiro acesso

---

## 🏛️ MUNICÍPIO PADRÃO

### Configuração Automática

| Campo | Valor |
|-------|-------|
| **Nome** | Prefeitura Municipal de Vista Serrana |
| **Estado** | PB |
| **Criado em** | Instalação automática |

Você pode alterar essas informações pelo painel administrativo após o primeiro acesso.

---

## 🗄️ BANCO DE DADOS

### Credenciais (Geradas Automaticamente)

| Campo | Valor |
|-------|-------|
| **Nome do Banco** | sispat_prod |
| **Usuário** | sispat_user |
| **Senha** | Gerada automaticamente (16 caracteres) |
| **Host** | localhost |
| **Porta** | 5432 |

A senha do banco é gerada automaticamente durante a instalação e armazenada no arquivo `.env` do backend.

---

## 🔑 JWT (Autenticação)

### Configuração de Segurança

| Campo | Valor |
|-------|-------|
| **JWT_SECRET** | Gerado automaticamente (128 caracteres hex) |
| **JWT_EXPIRES_IN** | 24h |
| **JWT_REFRESH_EXPIRES_IN** | 7d |
| **BCRYPT_ROUNDS** | 12 |

Essas configurações garantem segurança máxima para autenticação.

---

## 📝 Resumo de Perguntas na Instalação

O script faz **apenas 5 perguntas simples**:

1. **Domínio do sistema** (ex: sispat.prefeitura.com.br)
2. **Seu email** (administrador principal)
3. **Seu nome completo**
4. **Sua senha de acesso**
5. **Configurar SSL/HTTPS?** (sim/não)

**Automático (não pergunta):**
- ✅ Supervisor: `supervisor@ssbv.com` / `Master6273@`
- ✅ Município: "Prefeitura Municipal de Vista Serrana - PB"
- ✅ Senha do banco: Gerada automaticamente
- ✅ JWT_SECRET: Gerado automaticamente

---

## 🎯 Credenciais para Primeiro Acesso

### Opção 1: Usar Conta de Administrador

**Email:** O que você informou na instalação (ex: `admin@sistema.com`)  
**Senha:** A que você informou na instalação (padrão: `Tiko6273@`)

### Opção 2: Usar Conta de Supervisor

**Email:** `supervisor@ssbv.com`  
**Senha:** `Master6273@`

Ambas as contas permitem acesso completo ao sistema no primeiro momento.

---

## 🔒 Segurança e Boas Práticas

### ⚠️ Após Primeiro Acesso

1. **ALTERE SUA SENHA IMEDIATAMENTE**
   - Vá em: Perfil → Alterar Senha
   - Use senha forte (12+ caracteres)
   - Combine maiúsculas, minúsculas, números e símbolos

2. **Altere a Senha do Supervisor**
   - Faça login como admin
   - Vá em: Usuários → Editar Supervisor
   - Altere a senha padrão

3. **Configure Secretarias e Setores**
   - Crie as secretarias do seu município
   - Defina os setores
   - Configure locais de armazenamento

4. **Crie Usuários Reais**
   - Não use contas padrão em produção
   - Crie usuários para cada funcionário
   - Defina permissões adequadas

---

## 🛡️ Níveis de Acesso

### SUPERUSER (Superusuário)
- ✅ Controle total do sistema
- ✅ Gerenciar usuários
- ✅ Configurar sistema
- ✅ Ver todos os relatórios
- ✅ Fazer backup/restore

### SUPERVISOR
- ✅ Gerenciar patrimônio
- ✅ Criar relatórios
- ✅ Ver dashboards
- ✅ Aprovar transferências
- ⚠️ Não pode gerenciar usuários do tipo superuser

### ADMIN
- ✅ Gerenciar usuários da secretaria
- ✅ Gerenciar patrimônio da secretaria
- ✅ Ver relatórios da secretaria
- ⚠️ Acesso limitado à sua secretaria

### USER (Usuário Comum)
- ✅ Cadastrar patrimônio
- ✅ Editar patrimônio responsável
- ✅ Ver relatórios básicos
- ⚠️ Não pode excluir ou transferir

### VIEWER (Visualizador)
- ✅ Apenas visualização
- ⚠️ Não pode editar nada

---

## 📞 Recuperação de Senha

### Se Esquecer a Senha

Execute no servidor:

```bash
cd /var/www/sispat/backend

# Criar script de reset
cat > reset-password.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPassword() {
  const email = 'admin@sistema.com'; // Seu email
  const newPassword = 'NovaSenha123@';  // Nova senha
  
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  await prisma.user.update({
    where: { email: email },
    data: { password: hashedPassword }
  });
  
  console.log('✅ Senha resetada!');
  console.log('Email:', email);
  console.log('Nova senha:', newPassword);
  
  await prisma.$disconnect();
}

resetPassword().catch(console.error);
EOF

# Executar
node reset-password.js

# Limpar
rm reset-password.js
```

---

## 📊 Tabela de Credenciais

| Usuário | Email | Senha Padrão | Pode Alterar? |
|---------|-------|--------------|---------------|
| **Admin** | *Definido por você* | *Definida por você* | ✅ Sim |
| **Supervisor** | supervisor@ssbv.com | Master6273@ | ✅ Sim (recomendado) |

---

## 🎯 Checklist de Segurança

Após instalação:

- [ ] ✅ Fazer login com conta de admin
- [ ] ✅ Alterar senha do admin
- [ ] ✅ Fazer login com conta de supervisor
- [ ] ✅ Alterar senha do supervisor
- [ ] ✅ Criar usuários reais para cada funcionário
- [ ] ✅ Definir permissões adequadas
- [ ] ✅ Testar login de cada usuário
- [ ] ✅ Configurar SSL/HTTPS (se ainda não fez)
- [ ] ✅ Fazer backup do banco de dados
- [ ] ✅ Documentar credenciais em local seguro

---

## 💡 Dicas de Segurança

### Senhas Fortes

✅ **Bom exemplo:**
```
Sispat@2025!VistaSerrana
Patrimonio#2025$Seguro
Admin@SSBV2025!Forte
```

❌ **Evite:**
```
123456
password
admin123
senha123
```

### Gerenciamento de Senhas

1. Use um gerenciador de senhas (LastPass, 1Password, Bitwarden)
2. Não compartilhe senhas por email ou WhatsApp
3. Altere senhas periodicamente (a cada 90 dias)
4. Use senhas únicas para cada usuário
5. Ative autenticação de dois fatores se disponível

---

## 📧 Contato e Suporte

Se tiver dúvidas sobre credenciais:

1. Consulte este documento
2. Execute o script de reset de senha
3. Verifique os logs: `pm2 logs sispat-backend`
4. Abra issue no GitHub se necessário

---

**IMPORTANTE:** Mantenha este documento em local seguro e não compartilhe senhas padrão!

**Versão:** 2.0.2  
**Última Atualização:** 13/10/2025  
**Status:** ✅ Documentação Oficial

