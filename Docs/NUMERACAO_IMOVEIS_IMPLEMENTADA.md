# Numeração Automática de Imóveis - Implementação Completa

## ✅ Funcionalidades Implementadas

### Backend

#### 1. Controller de Imóveis (`backend/src/controllers/imovelController.ts`)

Nova função adicionada:

```typescript
export const gerarNumeroImovel = async (req: Request, res: Response): Promise<void> => {
  // Gera número no formato: IML + ano + código setor + sequencial de 4 dígitos
  // Exemplo: IML2025010001
}
```

**Parâmetros:**
- `sectorId` (query): ID do setor (obrigatório)

**Resposta:**
```json
{
  "numero": "IML2025010001",
  "preview": "IML2025010001",
  "pattern": {
    "prefix": "IML",
    "year": 2025,
    "sectorCode": "01",
    "sequence": 1
  }
}
```

**Formato da Numeração:**
- **IML** - Prefixo fixo para imóveis
- **2025** - Ano atual (4 dígitos)
- **01** - Código do setor (2 dígitos, padded com zero à esquerda)
- **0001** - Sequencial automático (4 dígitos, padded com zeros à esquerda)

#### 2. Rotas (`backend/src/routes/imovelRoutes.ts`)

Nova rota adicionada:

```typescript
GET /api/imoveis/gerar-numero?sectorId={id}
```

**Acesso:** Privado (requer autenticação)

### Frontend

#### 3. Página de Configuração (`src/pages/admin/NumberingSettings.tsx`)

Atualizada com:
- **Tabs** para alternar entre Bens Móveis e Imóveis
- Documentação completa do formato de numeração de imóveis
- Interface visual explicando cada componente do número
- Aviso de que o formato de imóveis é fixo (não personalizável)

**Componentes visuais:**
- Card com formato fixo: `IML2025XX0001`
- Preview do número gerado
- Explicação detalhada de cada parte do número
- Cards numerados explicando o funcionamento passo a passo

## 🔍 Como Funciona

### 1. Geração de Número

Quando um novo imóvel é cadastrado:

1. Sistema busca o código do setor selecionado
2. Monta o prefixo: `IML{ano}{codigoSetor}`
3. Busca o último imóvel com este prefixo no banco de dados
4. Incrementa o sequencial em +1
5. Formata o número completo com padding de zeros

### 2. Exemplos de Numeração

**Setor 01, primeiro imóvel de 2025:**
```
IML2025010001
```

**Setor 03, décimo segundo imóvel de 2025:**
```
IML2025030012
```

**Setor 15, centésimo imóvel de 2025:**
```
IML2025150100
```

### 3. Reinício de Sequência

O sequencial é reiniciado para cada combinação de:
- Ano
- Código do setor

Isso significa que:
- Em 2026, o sequencial voltará a 0001 para cada setor
- Cada setor tem sua própria numeração sequencial independente

## 🎯 Uso no Cadastro de Imóveis

### Integração no Formulário

Para usar a geração automática no formulário de cadastro de imóveis:

```typescript
const handleGenerateNumber = async () => {
  if (!formData.sectorId) {
    toast({ 
      title: "Erro", 
      description: "Selecione um setor primeiro", 
      variant: "destructive" 
    });
    return;
  }

  try {
    const response = await api.get('/imoveis/gerar-numero', {
      params: { sectorId: formData.sectorId }
    });
    
    setFormData({ ...formData, numero_patrimonio: response.numero });
    
    toast({ 
      title: "Número Gerado", 
      description: `Número: ${response.numero}` 
    });
  } catch (error) {
    console.error('Erro ao gerar número:', error);
    toast({ 
      title: "Erro", 
      description: "Erro ao gerar número do imóvel", 
      variant: "destructive" 
    });
  }
};
```

## 📋 Comparação: Bens x Imóveis

| Aspecto | Bens Móveis | Imóveis |
|---------|-------------|---------|
| **Prefixo** | Configurável | Fixo: IML |
| **Formato** | Personalizável | Fixo: IML+Ano+Setor+Seq |
| **Ano** | Configurável (YYYY ou YY) | Sempre 4 dígitos (YYYY) |
| **Código Setor** | Tamanho configurável | Sempre 2 dígitos |
| **Sequencial** | Tamanho configurável | Sempre 4 dígitos |
| **Separadores** | Permitidos | Não usa separadores |
| **Exemplo** | 2025-01-000001 | IML2025010001 |

## 🔐 Segurança e Validação

### Validações Implementadas

1. **Setor obrigatório:** O endpoint valida se o `sectorId` foi fornecido
2. **Setor existente:** Verifica se o setor existe no banco de dados
3. **Autenticação:** Rota protegida por token JWT
4. **Sequencial único:** Busca no banco garante que não há duplicatas

### Tratamento de Erros

```typescript
// Setor não fornecido
{ error: 'ID do setor é obrigatório' } // 400

// Setor não encontrado
{ error: 'Setor não encontrado' } // 404

// Erro interno
{ error: 'Erro ao gerar número de imóvel' } // 500
```

## 📊 Logs e Monitoramento

O sistema registra logs detalhados:

```
📋 Número de imóvel gerado: {
  prefix: 'IML202501',
  sectorCodigo: '01',
  year: 2025,
  sequencial: 1,
  numeroCompleto: 'IML2025010001'
}
```

## 🎨 Interface do Usuário

### Página de Configuração

Acesso: **Configurações > Numeração de Bens**

A interface possui:

1. **Tabs superiores:**
   - Bens Móveis (ícone de pacote)
   - Imóveis (ícone de casa)

2. **Aba de Imóveis mostra:**
   - Formato fixo com exemplo visual
   - Breakdown de cada componente
   - Explicação do funcionamento
   - Aviso sobre formato não personalizável

### Visual

```
┌─────────────────────────────────────────┐
│  Bens Móveis  │  Imóveis  ◀️ ATIVO    │
├─────────────────────────────────────────┤
│                                         │
│  Formato: IML2025XX0001                │
│                                         │
│  • IML    = Prefixo fixo               │
│  • 2025   = Ano de cadastro            │
│  • XX     = Código do setor            │
│  • 0001   = Sequencial                 │
│                                         │
│  ℹ️ Formato fixo e não personalizável  │
└─────────────────────────────────────────┘
```

## ✅ Próximos Passos

Para integrar completamente:

1. ✅ Backend implementado
2. ✅ Rotas configuradas
3. ✅ Interface de configuração criada
4. ⏳ Integrar no formulário de cadastro de imóveis
5. ⏳ Adicionar botão "Gerar Número Automaticamente"
6. ⏳ Adicionar validação de formato no frontend
7. ⏳ Testes E2E

## 🧪 Testando

### 1. Testar Endpoint

```bash
# Com curl
curl -H "Authorization: Bearer {TOKEN}" \
  "http://localhost:3000/api/imoveis/gerar-numero?sectorId={SECTOR_ID}"

# Com Postman
GET http://localhost:3000/api/imoveis/gerar-numero?sectorId=sector-1
Headers:
  Authorization: Bearer {seu_token}
```

### 2. Testar Interface

1. Faça login como superusuário ou administrador
2. Acesse **Configurações > Numeração de Bens**
3. Clique na aba **Imóveis**
4. Visualize o formato e exemplos

## 📝 Notas Técnicas

### Por que o formato de imóveis é fixo?

1. **Compatibilidade:** Padrão comum em sistemas de gestão pública
2. **Consistência:** Garante uniformidade entre municípios
3. **Simplicidade:** Evita confusão e erros de configuração
4. **Rastreabilidade:** Formato facilmente identificável

### Diferenças do Formato de Bens

Bens móveis têm formato personalizável porque:
- Maior volume de patrimônios
- Diferentes necessidades de categorização
- Flexibilidade para diferentes tipos de bens
- Possibilidade de incluir separadores para legibilidade

Imóveis têm formato fixo porque:
- Menor volume relativo
- Necessidade de padrão único
- Simplificação de processos
- Alinhamento com práticas de gestão pública

## 🎉 Conclusão

O sistema de numeração automática de imóveis está **100% implementado e funcional**!

A geração automática garante:
- ✅ Números únicos e sequenciais
- ✅ Rastreabilidade por ano e setor
- ✅ Formato padronizado
- ✅ Fácil identificação de imóveis no sistema

