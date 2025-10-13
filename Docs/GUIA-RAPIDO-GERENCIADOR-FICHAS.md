# 🚀 Guia Rápido - Gerenciador de Fichas

## 📋 Visão Geral

O **Gerenciador de Fichas** permite criar e gerenciar templates personalizados para fichas de patrimônio (bens móveis e imóveis), oferecendo controle total sobre layout, campos e formatação.

---

## 🎯 Acesso Rápido

### **Caminho no Sistema:**
```
Menu Principal → Ferramentas → Gerenciador de Fichas
```

### **Permissões Necessárias:**
- ✅ **Admin** ou **Supervisor**
- ❌ Usuários comuns não têm acesso

---

## 📚 Funcionalidades Principais

### **1. Listar Templates**
- Visualize todos os templates criados
- Filtre por tipo (Bens Móveis/Imóveis)
- Busque por nome ou descrição
- Identifique templates padrão (badge amarelo)

### **2. Criar Template**
**Botão:** "Novo Template"

**Informações Necessárias:**
- ✅ **Nome:** Ex: "Modelo Simplificado"
- ✅ **Tipo:** Bens Móveis ou Imóveis
- ⚪ **Descrição:** Opcional

**Configurações:**
- 📄 **Header:** Logo, textos, secretaria
- 📑 **Seções:** Quais incluir (Patrimônio, Aquisição, Localização, Depreciação)
- ✍️ **Assinaturas:** Quantidade, layout, rótulos
- 🎨 **Estilos:** Margens, fontes

### **3. Editar Template**
**Ação:** Clicar em "Editar" no card do template

**Você pode modificar:**
- Nome e descrição
- Todas as configurações
- Campos a exibir
- Layout e formatação

### **4. Duplicar Template**
**Ação:** Clicar no ícone de "Copiar"

**Resultado:**
- Cria uma cópia do template
- Nome: "[Nome Original] (Cópia)"
- Permite criar variações rapidamente

### **5. Definir como Padrão**
**Ação:** Clicar no ícone de "Estrela"

**Efeito:**
- Template será usado por padrão
- Apenas um padrão por tipo
- Templates padrão têm badge amarelo

### **6. Excluir Template**
**Ação:** Clicar no ícone de "Lixeira"

**Restrições:**
- ❌ Não é possível excluir templates padrão
- ✅ Pede confirmação antes de excluir

---

## 🎨 Configurações Disponíveis

### **Header (Cabeçalho)**

| Configuração | Opções |
|--------------|--------|
| **Mostrar Logo** | Sim/Não |
| **Tamanho Logo** | Pequeno / Médio / Grande |
| **Mostrar Data** | Sim/Não |
| **Mostrar Secretaria** | Sim/Não |
| **Nome Secretaria** | Texto personalizado |
| **Nome Departamento** | Texto personalizado |

**Padrão:**
- Secretaria: "SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO E FINANÇAS"
- Departamento: "DEPARTAMENTO DE GESTÃO E CONTROLE DE PATRIMÔNIO"

---

### **Seções**

#### **1. Informações do Patrimônio**
- ✅/❌ Habilitar seção
- 📐 **Layout:** Grade ou Lista
- 📷 **Mostrar Foto:** Sim/Não
- 📏 **Tamanho Foto:** Pequeno / Médio / Grande
- 📝 **Campos:** Escolha quais exibir

#### **2. Informações de Aquisição**
- ✅/❌ Habilitar seção
- 📝 **Campos:**
  - Data de Aquisição
  - Valor de Aquisição
  - Forma de Aquisição
  - Número da Nota Fiscal

#### **3. Localização e Estado**
- ✅/❌ Habilitar seção
- 📝 **Campos:**
  - Setor Responsável
  - Local do Objeto
  - Status
  - Situação do Bem

#### **4. Informações de Depreciação**
- ✅/❌ Habilitar seção
- 📝 **Campos:**
  - Método de Depreciação
  - Vida Útil (anos)
  - Valor Residual
  - Taxa de Depreciação

---

### **Assinaturas**

| Configuração | Opções |
|--------------|--------|
| **Incluir Assinaturas** | Sim/Não |
| **Quantidade** | 1 a 4 linhas |
| **Layout** | Horizontal / Vertical |
| **Mostrar Datas** | Sim/Não |
| **Rótulos** | Texto personalizado |

**Padrão:**
- 2 assinaturas horizontais
- Rótulos: "Responsável pelo Setor" e "Responsável pelo Patrimônio"
- Com campos de data

---

### **Estilos**

#### **Margens (em milímetros)**
- 📏 **Superior:** Padrão 40mm
- 📏 **Inferior:** Padrão 20mm
- 📏 **Esquerda:** Padrão 15mm
- 📏 **Direita:** Padrão 15mm

#### **Fontes**
- 📝 **Família:** Padrão Arial
- 📝 **Tamanho:** Padrão 12pt

---

## 💡 Dicas de Uso

### **Criando Variações de Templates**

**Exemplo: Templates por Setor**
1. 📄 Crie "Modelo Padrão - Completo"
2. 📋 Duplique para "Modelo Educação"
3. ✏️ Ajuste campos específicos para educação
4. 📋 Duplique para "Modelo Saúde"
5. ✏️ Ajuste campos específicos para saúde

### **Templates por Complexidade**

**Modelo Completo:**
- ✅ Todas as seções habilitadas
- ✅ Todos os campos
- ✅ Foto grande
- ✅ 4 linhas de assinatura

**Modelo Simplificado:**
- ✅ Apenas Patrimônio e Localização
- ✅ Campos essenciais
- ✅ Foto pequena
- ✅ 2 linhas de assinatura

**Modelo Rápido:**
- ✅ Apenas Patrimônio
- ✅ Campos mínimos
- ❌ Sem foto
- ✅ 1 linha de assinatura

---

## 🎯 Casos de Uso

### **Caso 1: Ficha Completa para Auditoria**
```
Nome: "Modelo Auditoria - Completo"
Tipo: Bens Móveis
Seções: Todas habilitadas
Campos: Todos incluídos
Assinaturas: 4 linhas (Responsável, Auditor, Gestor, Diretor)
```

### **Caso 2: Ficha Rápida para Inventário**
```
Nome: "Modelo Inventário - Rápido"
Tipo: Bens Móveis
Seções: Apenas Patrimônio e Localização
Campos: Essenciais (Descrição, Tipo, Status, Local)
Assinaturas: 2 linhas
Foto: Habilitada (médio)
```

### **Caso 3: Ficha de Imóveis**
```
Nome: "Modelo Imóveis - Padrão"
Tipo: Imóveis
Seções: Patrimônio, Aquisição, Localização
Campos: Denominação, Endereço, Área, Valor
Depreciação: Desabilitada
Assinaturas: 2 linhas
Foto: Habilitada (grande)
```

---

## ⚠️ Observações Importantes

### **Limitações**
- ❌ **Não é possível excluir** templates padrão
- ❌ **Apenas um padrão** por tipo (Bens/Imóveis)
- ⚠️ **Permissões:** Apenas admin e supervisor

### **Recomendações**
- ✅ **Teste templates** antes de definir como padrão
- ✅ **Mantenha nomes descritivos** para fácil identificação
- ✅ **Use descrições** para documentar o propósito
- ✅ **Crie backups** duplicando templates importantes

### **Boas Práticas**
- 📝 **Nomenclatura clara:** Ex: "Modelo [Uso] - [Tipo]"
- 📋 **Descrição detalhada:** Explique quando usar cada template
- 🎯 **Templates específicos:** Crie para cada necessidade
- 🔄 **Revise periodicamente:** Atualize conforme necessário

---

## 🆘 Solução de Problemas

### **Template não aparece na lista**
- ✅ Verifique os filtros ativos
- ✅ Use a busca pelo nome
- ✅ Verifique o tipo (Bens/Imóveis)

### **Não consigo editar template**
- ✅ Verifique suas permissões (Admin/Supervisor)
- ✅ Certifique-se de estar logado
- ✅ Recarregue a página

### **Erro ao salvar template**
- ✅ Preencha o nome (obrigatório)
- ✅ Selecione o tipo (obrigatório)
- ✅ Verifique a conexão com internet
- ✅ Veja o console para erros

### **Não consigo definir como padrão**
- ✅ Apenas um template pode ser padrão por tipo
- ✅ O anterior será automaticamente removido do padrão

---

## 📞 Suporte

**Em caso de dúvidas:**
1. 📖 Consulte a documentação completa: `GERENCIADOR-FICHAS-IMPLEMENTACAO.md`
2. 🔍 Verifique os logs do sistema
3. 💬 Entre em contato com o administrador

---

## 🎉 Conclusão

O Gerenciador de Fichas oferece **flexibilidade total** para personalizar suas fichas de patrimônio, adaptando-as às necessidades específicas de cada município, setor ou tipo de uso.

**Experimente diferentes configurações e encontre o layout perfeito para seu caso de uso!**

---

## 📅 Versão
**Última Atualização:** 11 de Outubro de 2025
**Versão do Sistema:** 2.0.7
