# Correção: Erro 500 ao Criar Modelos de Relatório

## Problema

Ao tentar criar um novo modelo de relatório em produção, ocorre erro 500 com a mensagem:
- Frontend: "Falha ao salvar modelo de relatório"
- Console: `POST /api/config/report-templates 500 (Internal Server Error)`

## Causa Raiz

O controller `createReportTemplate` estava usando uma constante fixa `MUNICIPALITY_ID = '1'` em vez de usar `req.user?.municipalityId` do usuário autenticado. Além disso:

1. **MunicipalityId fixo**: O código usava `MUNICIPALITY_ID = '1'` que não corresponde ao ID real do município em produção
2. **Campos incompatíveis**: O frontend envia `fields` e `filters`, mas o backend esperava apenas `layout`
3. **Falta de validação**: Não havia validação adequada dos dados de entrada
4. **Logs insuficientes**: Erros não forneciam informações suficientes para diagnóstico

## Solução Aplicada

### 1. Usar `req.user.municipalityId`

Todas as funções de report templates agora usam `req.user?.municipalityId` em vez da constante fixa:

```typescript
const municipalityId = req.user?.municipalityId;

if (!municipalityId) {
  res.status(401).json({ error: 'Não autenticado' });
  return;
}
```

### 2. Suporte a `fields` e `filters`

O backend agora aceita tanto `layout` quanto `fields` do frontend. Se `fields` for enviado sem `layout`, cria automaticamente um layout padrão:

```typescript
// Se o frontend enviar fields mas não layout, criar layout padrão
if (!finalLayout && fields && Array.isArray(fields) && fields.length > 0) {
  finalLayout = [
    { id: 'header', type: 'HEADER', ... },
    { id: 'table', type: 'TABLE', props: { fields }, ... },
    { id: 'footer', type: 'FOOTER', ... },
  ];
}
```

### 3. Validação e Segurança

- Validação de nome obrigatório
- Verificação de autenticação
- Verificação de permissão do município no update/delete
- Logs detalhados para diagnóstico

### 4. Melhor Tratamento de Erros

Erros agora retornam mensagens mais específicas:
- `P2002`: Template com nome duplicado
- `municipalityId`: Município inválido
- Logs detalhados com contexto completo

## Aplicar Correção em Produção

### Opção 1: Script Automatizado (Recomendado)

```bash
cd /var/www/sispat
bash CORRIGIR_ERRO_500_REPORT_TEMPLATES.sh
```

### Opção 2: Manual

1. **Fazer backup:**
```bash
cd /var/www/sispat/backend
cp src/controllers/configController.ts src/controllers/configController.ts.backup
```

2. **Atualizar código:**
```bash
cd /var/www/sispat
git pull origin main
```

3. **Compilar backend:**
```bash
cd backend
npm run build
```

4. **Reiniciar backend:**
```bash
pm2 restart sispat-backend
```

5. **Verificar:**
```bash
curl http://127.0.0.1:3000/api/health
pm2 logs sispat-backend --lines 20
```

## Verificação

Após aplicar a correção:

1. **Teste criar um novo modelo:**
   - Acesse o frontend
   - Vá em "Ferramentas" > "Modelos de Relatório"
   - Clique em "Criar Novo Modelo"
   - Preencha o nome e selecione campos
   - Clique em "Salvar"

2. **Verifique os logs:**
```bash
pm2 logs sispat-backend --lines 50
```

Procure por:
- ✅ `Template de relatório criado` (sucesso)
- ❌ `Erro ao criar template de relatório` (erro)

## Arquivos Modificados

- `backend/src/controllers/configController.ts`
  - `getReportTemplates()` - Usa `req.user.municipalityId`
  - `createReportTemplate()` - Usa `req.user.municipalityId` + suporte a `fields`
  - `updateReportTemplate()` - Usa `req.user.municipalityId` + validação
  - `deleteReportTemplate()` - Usa `req.user.municipalityId` + validação

## Benefícios

1. ✅ Funciona com qualquer município (não apenas ID '1')
2. ✅ Compatível com dados enviados pelo frontend
3. ✅ Melhor segurança (validação de município)
4. ✅ Logs detalhados para diagnóstico
5. ✅ Mensagens de erro mais claras

## Troubleshooting

### Erro 401 "Não autenticado"
- Verifique se o token JWT está sendo enviado
- Verifique se o usuário está logado
- Verifique logs: `pm2 logs sispat-backend --lines 50`

### Erro 403 "Acesso negado"
- Verifique se o usuário tem permissão (admin/supervisor)
- Verifique se o template pertence ao município do usuário

### Erro 500 persistente
- Verifique logs detalhados: `pm2 logs sispat-backend --lines 100`
- Verifique se o banco de dados está acessível
- Verifique se a tabela `report_templates` existe

## Status

✅ Correção aplicada e testada
✅ Backend compilado com sucesso
✅ Compatível com frontend existente
✅ Pronto para produção

