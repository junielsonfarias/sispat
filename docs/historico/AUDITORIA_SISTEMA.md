# 🔍 Auditoria Completa do Sistema SISPAT

Este documento descreve como usar a ferramenta de auditoria completa do sistema SISPAT para
verificar todas as funcionalidades e identificar problemas.

## 📋 O que a Auditoria Verifica

### 1. **Estrutura do Banco de Dados**

- ✅ Existência de todas as tabelas necessárias
- ✅ Estrutura das colunas
- ✅ Relacionamentos (Foreign Keys)
- ✅ Índices e constraints
- ✅ Contagem de registros por tabela

### 2. **Endpoints da API**

- ✅ Disponibilidade de todos os endpoints
- ✅ Respostas corretas
- ✅ Autenticação e autorização
- ✅ Mapeamento de campos (camelCase vs snake_case)

### 3. **Operações CRUD**

- ✅ Criação de dados (Create)
- ✅ Leitura de dados (Read)
- ✅ Atualização de dados (Update)
- ✅ Exclusão de dados (Delete)

### 4. **Integridade dos Dados**

- ✅ Relacionamentos válidos
- ✅ Dados órfãos
- ✅ Consistência entre tabelas
- ✅ Problemas de referência

### 5. **Funcionalidades do Frontend**

- ✅ Contextos React
- ✅ Formulários
- ✅ Navegação
- ✅ Estados de loading

## 🚀 Como Usar a Auditoria

### Opção 1: Interface Web (Recomendado)

1. **Acesse a página de auditoria:**

   ```
   http://localhost:8080/admin/auditoria
   ```

2. **Execute a auditoria completa:**
   - Clique em "Executar Auditoria"
   - Aguarde a conclusão (pode levar alguns segundos)
   - Analise os resultados

3. **Execute testes de criação:**
   - Clique em "Testes de Criação"
   - Verifique se todas as operações CRUD funcionam

### Opção 2: Script de Linha de Comando

1. **Configure as variáveis de ambiente:**

   ```bash
   export API_URL="http://localhost:3001/api"
   export TEST_EMAIL="admin@test.com"
   export TEST_PASSWORD="admin123"
   ```

2. **Execute o script de teste:**

   ```bash
   node test-system.js
   ```

3. **Analise o relatório:**
   - O script gera um arquivo `test-report.json`
   - Verifique a taxa de sucesso
   - Identifique problemas específicos

## 📊 Interpretando os Resultados

### Status do Sistema

- **🟢 SAUDÁVEL**: Todos os testes passaram
- **🟡 ATENÇÃO**: Alguns avisos, mas sem erros críticos
- **🔴 PROBLEMAS**: Erros encontrados que precisam ser corrigidos

### Tipos de Problemas

#### 1. **Erros Críticos** (Vermelho)

- Tabelas ausentes no banco
- Endpoints não funcionando
- Problemas de autenticação
- Erros de integridade referencial

#### 2. **Avisos** (Amarelo)

- Dados de exemplo ausentes
- Configurações recomendadas
- Problemas menores de mapeamento

#### 3. **Recomendações** (Azul)

- Melhorias sugeridas
- Configurações opcionais
- Otimizações

## 🔧 Problemas Comuns e Soluções

### 1. **Tabela `activity_logs` não existe**

```sql
-- Criar tabela de logs de atividade
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255),
  action VARCHAR(100),
  details TEXT,
  municipality_id UUID REFERENCES municipalities(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. **Problemas de mapeamento de campos**

- Verificar se o backend retorna `sectorId` em vez de `sector_id`
- Verificar se o frontend espera `municipalityId` em vez de `municipality_id`

### 3. **Dados órfãos**

- Patrimônios com locais/setores inexistentes
- Locais com setores inexistentes
- Usuários sem município válido

### 4. **Endpoints não funcionando**

- Verificar se o servidor está rodando
- Verificar se as rotas estão registradas
- Verificar se a autenticação está funcionando

## 📈 Monitoramento Contínuo

### 1. **Auditoria Automática**

Configure a auditoria para rodar periodicamente:

```bash
# Adicione ao crontab para rodar diariamente
0 2 * * * cd /path/to/sispat && node test-system.js >> audit.log 2>&1
```

### 2. **Alertas**

Configure alertas para quando a taxa de sucesso cair abaixo de 95%:

```bash
# Exemplo de script de alerta
if [ $(jq '.summary.successRate < 95' test-report.json) = "true" ]; then
  echo "ALERTA: Taxa de sucesso do sistema abaixo de 95%"
  # Enviar email ou notificação
fi
```

### 3. **Relatórios**

Gere relatórios semanais/mensais:

```bash
# Script para gerar relatório semanal
node test-system.js
cp test-report.json "relatorio-$(date +%Y-%m-%d).json"
```

## 🛠️ Manutenção Preventiva

### 1. **Verificações Diárias**

- [ ] Auditoria automática executada
- [ ] Taxa de sucesso > 95%
- [ ] Nenhum erro crítico

### 2. **Verificações Semanais**

- [ ] Análise de logs de erro
- [ ] Verificação de performance
- [ ] Backup dos dados

### 3. **Verificações Mensais**

- [ ] Atualização de dependências
- [ ] Revisão de segurança
- [ ] Otimização de queries

## 📞 Suporte

Se encontrar problemas durante a auditoria:

1. **Verifique os logs do servidor:**

   ```bash
   tail -f server/logs/app.log
   ```

2. **Execute a auditoria em modo debug:**

   ```bash
   DEBUG=* node test-system.js
   ```

3. **Consulte a documentação da API:**

   ```
   http://localhost:3001/api/debug/audit
   ```

4. **Entre em contato com o suporte técnico** com:
   - Relatório completo da auditoria
   - Logs de erro
   - Descrição do problema

## 📝 Histórico de Auditorias

Mantenha um registro das auditorias realizadas:

| Data       | Taxa de Sucesso | Problemas Encontrados       | Status      |
| ---------- | --------------- | --------------------------- | ----------- |
| 2024-01-15 | 98.5%           | Nenhum                      | ✅ Saudável |
| 2024-01-08 | 95.2%           | 1 aviso sobre activity_logs | ⚠️ Atenção  |
| 2024-01-01 | 100%            | Nenhum                      | ✅ Saudável |

---

**Última atualização:** Janeiro 2024  
**Versão:** 1.0.0  
**Responsável:** Equipe de Desenvolvimento SISPAT
