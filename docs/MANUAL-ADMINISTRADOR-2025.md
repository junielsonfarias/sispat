# 📚 MANUAL DO ADMINISTRADOR - SISPAT 2025

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Acesso ao Sistema](#acesso-ao-sistema)
3. [Gerenciamento de Usuários](#gerenciamento-de-usuários)
4. [Gerenciamento de Municípios](#gerenciamento-de-municípios)
5. [Gerenciamento de Setores](#gerenciamento-de-setores)
6. [Gerenciamento de Patrimônios](#gerenciamento-de-patrimônios)
7. [Relatórios e Etiquetas](#relatórios-e-etiquetas)
8. [Configurações do Sistema](#configurações-do-sistema)
9. [Monitoramento](#monitoramento)
10. [Backup e Restauração](#backup-e-restauração)
11. [Troubleshooting](#troubleshooting)
12. [Contatos e Suporte](#contatos-e-suporte)

---

## 🎯 Visão Geral

O **SISPAT (Sistema de Patrimônio)** é uma solução completa para gestão de patrimônio público,
desenvolvida especificamente para municípios brasileiros. Este manual fornece instruções detalhadas
para administradores do sistema.

### 🏗️ Arquitetura do Sistema

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + PostgreSQL
- **Monitoramento**: Prometheus + Grafana
- **Deploy**: PM2 + Nginx + Docker
- **Backup**: Automatizado com retenção configurável

### 🔐 Níveis de Acesso

1. **Superuser**: Acesso total ao sistema
2. **Supervisor**: Acesso a município específico
3. **Usuário**: Acesso limitado a setores específicos

---

## 🔑 Acesso ao Sistema

### Primeiro Acesso

1. **URL do Sistema**: `https://seu-dominio.com`
2. **Credenciais Padrão**:
   - **Usuário**: `admin`
   - **Senha**: `admin123`

### Alteração de Senha

1. Faça login com as credenciais padrão
2. Acesse **Perfil** → **Alterar Senha**
3. Digite a senha atual e a nova senha
4. Confirme a alteração

### Recuperação de Senha

```bash
# Via terminal (apenas superuser)
cd /opt/sispat
node scripts/reset-admin-password.js
```

---

## 👥 Gerenciamento de Usuários

### Criar Novo Usuário

1. Acesse **Administração** → **Usuários**
2. Clique em **Novo Usuário**
3. Preencha os dados:
   - **Nome**: Nome completo
   - **Email**: Email válido
   - **Usuário**: Nome de usuário único
   - **Senha**: Senha temporária
   - **Município**: Selecione o município
   - **Setores**: Selecione os setores
   - **Tipo**: Supervisor ou Usuário
4. Clique em **Salvar**

### Editar Usuário

1. Acesse **Administração** → **Usuários**
2. Clique no usuário desejado
3. Modifique os dados necessários
4. Clique em **Salvar**

### Bloquear/Desbloquear Usuário

1. Acesse **Administração** → **Usuários**
2. Clique no usuário desejado
3. Clique em **Bloquear** ou **Desbloquear**
4. Confirme a ação

### Resetar Senha de Usuário

1. Acesse **Administração** → **Usuários**
2. Clique no usuário desejado
3. Clique em **Resetar Senha**
4. Uma nova senha temporária será gerada

---

## 🏛️ Gerenciamento de Municípios

### Adicionar Município

1. Acesse **Administração** → **Municípios**
2. Clique em **Novo Município**
3. Preencha os dados:
   - **Nome**: Nome do município
   - **Código IBGE**: Código do IBGE
   - **Estado**: Estado (UF)
   - **CEP**: CEP principal
   - **Endereço**: Endereço da prefeitura
   - **Telefone**: Telefone de contato
   - **Email**: Email de contato
4. Clique em **Salvar**

### Configurar Município

1. Acesse **Administração** → **Municípios**
2. Clique no município desejado
3. Configure:
   - **Setores Padrão**: Crie setores básicos
   - **Supervisor**: Atribua um supervisor
   - **Configurações**: Personalize o sistema

---

## 🏢 Gerenciamento de Setores

### Criar Setor

1. Acesse **Administração** → **Setores**
2. Clique em **Novo Setor**
3. Preencha os dados:
   - **Nome**: Nome do setor
   - **Código**: Código único
   - **Descrição**: Descrição do setor
   - **Responsável**: Usuário responsável
   - **Município**: Município vinculado
4. Clique em **Salvar**

### Hierarquia de Setores

O sistema suporta hierarquia de setores:

- **Setor Pai**: Setor superior
- **Setores Filhos**: Setores subordinados

### Atribuir Usuários a Setores

1. Acesse **Administração** → **Usuários**
2. Clique no usuário desejado
3. Na aba **Setores**:
   - Clique em **Adicionar Setor**
   - Selecione o setor
   - Defina se é setor primário
4. Clique em **Salvar**

---

## 📦 Gerenciamento de Patrimônios

### Cadastrar Patrimônio

1. Acesse **Patrimônios** → **Novo**
2. Preencha os dados:
   - **Número**: Número do patrimônio
   - **Descrição**: Descrição detalhada
   - **Categoria**: Categoria do bem
   - **Marca/Modelo**: Marca e modelo
   - **Número de Série**: Número de série
   - **Valor**: Valor de aquisição
   - **Data de Aquisição**: Data de compra
   - **Setor**: Setor responsável
   - **Localização**: Local físico
   - **Status**: Ativo, Inativo, Baixado
3. Clique em **Salvar**

### Importar Patrimônios

1. Acesse **Patrimônios** → **Importar**
2. Baixe o template Excel
3. Preencha os dados no template
4. Faça upload do arquivo
5. Verifique os dados importados
6. Clique em **Confirmar Importação**

### Gerar Etiquetas

1. Acesse **Patrimônios** → **Lista**
2. Selecione os patrimônios desejados
3. Clique em **Gerar Etiquetas**
4. Escolha o modelo de etiqueta
5. Clique em **Gerar**

### Transferir Patrimônio

1. Acesse **Patrimônios** → **Lista**
2. Clique no patrimônio desejado
3. Clique em **Transferir**
4. Selecione o novo setor
5. Adicione observações
6. Clique em **Confirmar Transferência**

---

## 📊 Relatórios e Etiquetas

### Relatórios Disponíveis

1. **Relatório de Patrimônios por Setor**
2. **Relatório de Patrimônios por Categoria**
3. **Relatório de Transferências**
4. **Relatório de Baixas**
5. **Relatório de Inventário**
6. **Relatório de Valor Total**

### Gerar Relatório

1. Acesse **Relatórios**
2. Selecione o tipo de relatório
3. Configure os filtros:
   - **Período**: Data inicial e final
   - **Setor**: Setores específicos
   - **Categoria**: Categorias específicas
   - **Status**: Status dos patrimônios
4. Clique em **Gerar Relatório**

### Modelos de Etiquetas

O sistema inclui modelos pré-configurados:

- **Modelo Padrão**: Etiqueta básica
- **Modelo Detalhado**: Etiqueta com mais informações
- **Modelo QR Code**: Etiqueta com QR code

### Personalizar Modelo de Etiqueta

1. Acesse **Configurações** → **Modelos de Etiqueta**
2. Clique em **Novo Modelo**
3. Configure:
   - **Nome**: Nome do modelo
   - **Dimensões**: Largura e altura
   - **Elementos**: Adicione campos
   - **Posicionamento**: Posicione os elementos
4. Clique em **Salvar**

---

## ⚙️ Configurações do Sistema

### Configurações Gerais

1. Acesse **Configurações** → **Gerais**
2. Configure:
   - **Nome do Sistema**: Nome personalizado
   - **Logo**: Upload do logo
   - **Cores**: Cores do tema
   - **Idioma**: Português (padrão)
   - **Fuso Horário**: UTC-3 (padrão)

### Configurações de Segurança

1. Acesse **Configurações** → **Segurança**
2. Configure:
   - **Tempo de Sessão**: Tempo de inatividade
   - **Tentativas de Login**: Máximo de tentativas
   - **Bloqueio de IP**: Bloqueio automático
   - **Senha Mínima**: Requisitos de senha

### Configurações de Backup

1. Acesse **Configurações** → **Backup**
2. Configure:
   - **Frequência**: Diário, semanal, mensal
   - **Retenção**: Dias de retenção
   - **Local**: Local do backup
   - **Nuvem**: Configuração de nuvem

---

## 📈 Monitoramento

### Dashboard de Monitoramento

Acesse **Monitoramento** → **Dashboard** para visualizar:

- **Status do Sistema**: Saúde geral
- **Usuários Ativos**: Usuários conectados
- **Patrimônios**: Estatísticas gerais
- **Performance**: Métricas de performance

### Logs do Sistema

1. Acesse **Monitoramento** → **Logs**
2. Visualize logs de:
   - **Aplicação**: Logs da aplicação
   - **Sistema**: Logs do sistema operacional
   - **Segurança**: Logs de segurança
   - **Erros**: Logs de erro

### Alertas

O sistema envia alertas para:

- **Falhas de Sistema**: Falhas críticas
- **Tentativas de Invasão**: Tentativas suspeitas
- **Uso de Recursos**: Alto uso de CPU/memória
- **Backup**: Falhas de backup

---

## 💾 Backup e Restauração

### Backup Automático

O sistema realiza backup automático:

- **Banco de Dados**: Diário às 2h
- **Arquivos**: Semanal aos domingos às 3h
- **Completo**: Mensal no dia 1 às 4h

### Backup Manual

```bash
# Backup do banco de dados
/opt/sispat/scripts/backup-database.sh

# Backup de arquivos
/opt/sispat/scripts/backup-files.sh

# Backup completo
/opt/sispat/scripts/backup-full.sh
```

### Restaurar Backup

```bash
# Listar backups disponíveis
/opt/sispat/scripts/restore-backup.sh --list

# Restaurar banco de dados
/opt/sispat/scripts/restore-backup.sh --database backup.dump

# Restaurar backup completo
/opt/sispat/scripts/restore-backup.sh --all backup.tar.gz
```

### Backup em Nuvem

O sistema suporta backup em nuvem:

- **AWS S3**: Amazon Web Services
- **Google Cloud**: Google Cloud Storage
- **Azure**: Microsoft Azure

---

## 🔧 Troubleshooting

### Problemas Comuns

#### Sistema Não Inicia

```bash
# Verificar status dos serviços
systemctl status nginx
systemctl status postgresql
pm2 status

# Verificar logs
tail -f /var/log/sispat/application/error.log
```

#### Erro de Conexão com Banco

```bash
# Verificar conexão
pg_isready -h localhost -p 5432

# Verificar configuração
cat /opt/sispat/.env | grep DB_
```

#### Problemas de Performance

```bash
# Verificar uso de recursos
htop
df -h
free -h

# Verificar logs de performance
tail -f /var/log/sispat/application/performance.log
```

#### Problemas de Backup

```bash
# Verificar espaço em disco
df -h /opt/sispat/backups

# Verificar permissões
ls -la /opt/sispat/backups

# Executar backup manual
/opt/sispat/scripts/backup-database.sh
```

### Comandos Úteis

```bash
# Reiniciar serviços
systemctl restart nginx
systemctl restart postgresql
pm2 restart all

# Verificar logs
tail -f /var/log/sispat/application/combined.log

# Verificar status
pm2 status
systemctl status nginx
systemctl status postgresql

# Limpar cache
pm2 flush
```

### Logs Importantes

- **Aplicação**: `/var/log/sispat/application/`
- **Sistema**: `/var/log/sispat/system/`
- **Segurança**: `/var/log/sispat/security/`
- **Monitoramento**: `/var/log/sispat/monitoring/`

---

## 📞 Contatos e Suporte

### Suporte Técnico

- **Email**: suporte@sispat.com
- **Telefone**: (11) 99999-9999
- **Horário**: Segunda a Sexta, 8h às 18h

### Documentação

- **Manual do Usuário**: `docs/MANUAL-USUARIO-2025.md`
- **Guia de Instalação**: `docs/GUIA-INSTALACAO-2025.md`
- **API Documentation**: `docs/GUIA-APIS-2025.md`

### Treinamento

- **Vídeo Aulas**: Disponível no portal
- **Webinars**: Mensais
- **Suporte Presencial**: Sob demanda

---

## 📝 Changelog

### Versão 2025.1.0

- ✅ Sistema de monitoramento completo
- ✅ Backup automatizado
- ✅ Testes de segurança
- ✅ Documentação atualizada

### Versão 2025.0.0

- ✅ Versão inicial do SISPAT
- ✅ Gestão de patrimônios
- ✅ Relatórios e etiquetas
- ✅ Sistema de usuários

---

**© 2025 SISPAT - Sistema de Patrimônio. Todos os direitos reservados.**
