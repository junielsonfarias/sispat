# 🧪 Guia de Teste - Gerenciamento de Tipos de Bens

## 📋 Pré-requisitos

- ✅ Backend rodando (`cd backend && npm run dev`)
- ✅ Frontend rodando (`npm run dev`)
- ✅ Usuário logado como `admin` ou `supervisor`

---

## 🎯 Testes a Realizar

### 1️⃣ Acessar a Página

1. Faça login como **admin** ou **supervisor**
2. Clique em **"Configurações"** no menu
3. Clique em **"Gerenciar Tipos de Bens"**
4. Verifique se a página carrega corretamente

**Resultado Esperado**: 
- Página carrega sem erros
- Tabela exibe tipos de bens existentes
- Botão "+ Adicionar Tipo" visível

---

### 2️⃣ Criar Novo Tipo de Bem

1. Clique em **"+ Adicionar Tipo"**
2. Preencha o formulário:
   - **Nome**: "Eletrônicos"
   - **Descrição**: "Equipamentos eletrônicos em geral"
   - **Vida Útil**: 5
   - **Taxa Depreciação**: 20
3. Clique em **"Criar"**

**Resultado Esperado**:
- Toast de sucesso aparece
- Modal fecha automaticamente
- Novo tipo aparece na tabela
- Console mostra log de criação

---

### 3️⃣ Buscar Tipo de Bem

1. No campo de busca, digite: **"Eletrônicos"**
2. Observe a tabela filtrar em tempo real

**Resultado Esperado**:
- Tabela mostra apenas tipos que contêm "Eletrônicos"
- Busca funciona em nome e descrição
- Filtro é case-insensitive

---

### 4️⃣ Editar Tipo de Bem

1. Clique no botão **"Editar"** (ícone de lápis) de um tipo
2. Altere algum campo (ex: descrição)
3. Clique em **"Atualizar"**

**Resultado Esperado**:
- Toast de sucesso aparece
- Modal fecha
- Alterações refletem na tabela
- Console mostra log de atualização

---

### 5️⃣ Desativar/Ativar Tipo de Bem

1. Clique no botão **"Desativar"** de um tipo ativo
2. Observe o badge mudar para "Inativo"
3. Clique em **"Ativar"** novamente

**Resultado Esperado**:
- Status alterna entre Ativo/Inativo
- Badge muda de cor
- Toast de sucesso aparece

---

### 6️⃣ Tentar Excluir Tipo em Uso

1. Tente excluir um tipo que está sendo usado por patrimônios
2. Confirme a exclusão

**Resultado Esperado**:
- Erro 400 retornado
- Toast de erro: "Não é possível excluir. Tipo de bem está em uso."
- Tipo permanece na lista

---

### 7️⃣ Excluir Tipo Não Utilizado

1. Crie um tipo novo (ex: "Teste Delete")
2. Clique no botão **"Excluir"** (ícone de lixeira)
3. Confirme a exclusão no AlertDialog

**Resultado Esperado**:
- AlertDialog de confirmação aparece
- Após confirmar, tipo é removido da lista
- Toast de sucesso aparece
- Console mostra log de exclusão

---

### 8️⃣ Validações de Formulário

Teste as validações tentando:

1. **Nome vazio**: Deixe o campo nome em branco
   - ❌ Deve mostrar erro: "Nome é obrigatório"

2. **Nome muito curto**: Digite apenas 1 caractere
   - ❌ Deve mostrar erro: "Nome deve ter no mínimo 2 caracteres"

3. **Nome muito longo**: Digite mais de 50 caracteres
   - ❌ Deve mostrar erro: "Nome deve ter no máximo 50 caracteres"

4. **Vida útil inválida**: Digite 0 ou 101
   - ❌ Deve mostrar erro de validação

5. **Taxa depreciação inválida**: Digite -1 ou 101
   - ❌ Deve mostrar erro de validação

---

### 9️⃣ Verificar Logs de Atividade

1. Após criar/editar/excluir tipos, vá para **"Logs de Atividade"**
2. Verifique se as ações foram registradas:
   - `CREATE_TIPO_BEM`
   - `UPDATE_TIPO_BEM`
   - `DELETE_TIPO_BEM`

**Resultado Esperado**:
- Todas as ações aparecem nos logs
- Logs contêm detalhes da ação
- Usuário e timestamp corretos

---

### 🔟 Verificar Integração com Patrimônios

1. Vá para **"Cadastrar Bem"**
2. No campo **"Tipo de Bem"**, verifique se os tipos aparecem
3. Selecione um tipo e salve o patrimônio

**Resultado Esperado**:
- Dropdown mostra todos os tipos ativos
- Tipos inativos não aparecem
- Seleção funciona corretamente

---

## 🐛 Verificações de Console

Durante os testes, monitore o console do navegador:

### Logs Esperados (Frontend)
```
🔍 TiposBensContext: Iniciando busca de tipos de bens...
🔍 TiposBensContext: Resposta da API: [...]
🔍 TiposBensContext: Tipos de bens carregados: X
```

### Logs Esperados (Backend)
```
[HTTP] ✅ 200 GET /api/tipos-bens
[HTTP] ✅ 201 POST /api/tipos-bens
[HTTP] ✅ 200 PUT /api/tipos-bens/:id
[HTTP] ✅ 200 DELETE /api/tipos-bens/:id
```

---

## ❌ Erros Comuns e Soluções

### Erro: "Tipo de bem já existe"
**Causa**: Tentando criar tipo com nome duplicado
**Solução**: Use um nome diferente

### Erro: "Não é possível excluir. Tipo de bem está em uso"
**Causa**: Tipo está vinculado a patrimônios
**Solução**: Remova os patrimônios ou desative o tipo ao invés de excluir

### Erro: 403 Forbidden
**Causa**: Usuário sem permissão (não é admin/supervisor)
**Solução**: Faça login com usuário admin ou supervisor

### Erro: 401 Unauthorized
**Causa**: Token JWT expirado ou inválido
**Solução**: Faça logout e login novamente

---

## 📊 Checklist de Teste

Use este checklist para garantir que tudo está funcionando:

- [ ] Página carrega sem erros
- [ ] Listagem exibe tipos existentes
- [ ] Busca/filtro funciona
- [ ] Criar novo tipo funciona
- [ ] Editar tipo existente funciona
- [ ] Desativar/ativar tipo funciona
- [ ] Excluir tipo não utilizado funciona
- [ ] Validação impede exclusão de tipo em uso
- [ ] Validações de formulário funcionam
- [ ] Toasts de feedback aparecem
- [ ] Logs de atividade são registrados
- [ ] Integração com cadastro de patrimônios funciona
- [ ] Permissões de acesso funcionam
- [ ] Console não mostra erros

---

## 🎯 Teste de Performance

### Teste com Muitos Tipos

1. Crie 50+ tipos de bens
2. Teste a busca
3. Verifique se a tabela permanece responsiva

**Resultado Esperado**:
- Listagem rápida mesmo com muitos registros
- Busca instantânea
- Sem travamentos

---

## 🔐 Teste de Segurança

### Teste de Permissões

1. **Como Visualizador**:
   - ❌ Não deve ver link "Gerenciar Tipos de Bens"
   - ❌ Acesso direto à URL deve ser bloqueado

2. **Como Usuário**:
   - ❌ Não deve ver link "Gerenciar Tipos de Bens"
   - ❌ Acesso direto à URL deve ser bloqueado

3. **Como Supervisor**:
   - ✅ Deve ver e acessar a página
   - ✅ Pode criar e editar
   - ❌ Não pode excluir (apenas admin)

4. **Como Admin**:
   - ✅ Acesso completo
   - ✅ Pode criar, editar e excluir

---

## 📝 Relatório de Teste

Após completar os testes, preencha:

**Data do Teste**: ___/___/_____
**Testador**: _________________
**Versão**: 2.0
**Status**: ✅ Aprovado / ❌ Reprovado

**Observações**:
_________________________________
_________________________________
_________________________________

---

## 🎉 Conclusão

Se todos os testes passaram, o sistema de gerenciamento de tipos de bens está **100% funcional** e pronto para uso em produção!

---

**Última Atualização**: 08/10/2025
