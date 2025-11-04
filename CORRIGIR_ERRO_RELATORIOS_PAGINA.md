# Correção: Erro na Página de Relatórios

## Problema

Após executar as correções do backend, a página `/relatorios` estava mostrando:
- Mensagem: "Ops! Algo deu errado - Ocorreu um erro inesperado na aplicação"
- Sem erros visíveis no console do navegador
- Erro capturado pelo ErrorBoundary

## Causa Raiz

O problema ocorreu porque:

1. **Incompatibilidade de formato**: O backend retorna templates com `layout` (array de `ReportComponent`), mas o frontend estava tentando acessar `template.fields.length` diretamente
2. **Erro silencioso**: O `ReportTemplateContext` estava silenciando erros, mas não estava adaptando os dados do backend para o formato esperado pelo frontend
3. **Falta de resiliência**: O componente não estava preparado para lidar com templates que têm apenas `layout` sem `fields`

## Solução Aplicada

### 1. Adaptação no `ReportTemplateContext`

O contexto agora adapta templates do backend para o formato esperado pelo frontend:

```typescript
const adaptedTemplates = templates.map(template => {
  // Se o template tem layout mas não tem fields, extrair fields do layout
  if (!template.fields && template.layout && Array.isArray(template.layout)) {
    const tableComponent = template.layout.find(c => c.type === 'TABLE')
    const fields = tableComponent?.props?.fields || []
    return {
      ...template,
      fields: fields as (keyof Patrimonio)[],
    }
  }
  return template
})
```

### 2. Componente Resiliente

O componente `Relatorios.tsx` agora trata templates com ou sem `fields`:

```typescript
{(() => {
  // Extrair campos do layout se fields não existir
  if (template.fields && template.fields.length > 0) {
    return `${template.fields.length} campos`
  }
  if (template.layout && Array.isArray(template.layout)) {
    const tableComponent = template.layout.find(c => c.type === 'TABLE')
    if (tableComponent?.props?.fields) {
      return `${tableComponent.props.fields.length} campos`
    }
    return `${template.layout.length} componentes`
  }
  return 'Modelo sem campos definidos'
})()}
```

### 3. Melhor Tratamento de Erros

O contexto agora loga erros para debug sem quebrar a aplicação:

```typescript
catch (error: any) {
  console.error('Erro ao buscar templates de relatório:', error)
  if (error?.response?.status === 404) {
    setAllTemplates([])
  } else {
    setAllTemplates([])
  }
}
```

## Aplicar Correção em Produção

### Opção 1: Script Automatizado (Recomendado)

```bash
cd /var/www/sispat
bash CORRIGIR_ERRO_RELATORIOS_PAGINA.sh
```

### Opção 2: Manual

1. **Atualizar código:**
```bash
cd /var/www/sispat
git pull origin main
```

2. **Recompilar frontend:**
```bash
cd frontend
npm run build
```

3. **Recarregar Nginx:**
```bash
sudo systemctl reload nginx
```

4. **Limpar cache do navegador:**
   - Pressione `Ctrl+Shift+R` (Windows/Linux) ou `Cmd+Shift+R` (Mac)
   - Ou abra DevTools (F12) > Network > marque "Disable cache"

## Verificação

Após aplicar a correção:

1. **Acesse a página:**
   - https://sispat.vps-kinghost.net/relatorios

2. **Verifique:**
   - ✅ Página carrega sem erro
   - ✅ Templates são exibidos corretamente
   - ✅ Contagem de campos funciona
   - ✅ Botão "Gerar Relatório" funciona

3. **Se ainda houver erro:**
   - Abra o console do navegador (F12)
   - Verifique logs do backend: `pm2 logs sispat-backend --lines 50`
   - Verifique se há templates no banco: `SELECT * FROM report_templates;`

## Arquivos Modificados

- `src/pages/ferramentas/Relatorios.tsx` - Componente resiliente para templates com layout
- `src/contexts/ReportTemplateContext.tsx` - Adaptação de templates do backend
- `CORRIGIR_ERRO_RELATORIOS_PAGINA.sh` - Script de aplicação automática

## Benefícios

1. ✅ Compatível com templates que têm apenas `layout`
2. ✅ Compatível com templates que têm `fields`
3. ✅ Extrai `fields` automaticamente do `layout` quando necessário
4. ✅ Melhor tratamento de erros sem quebrar a aplicação
5. ✅ Logs detalhados para debug

## Troubleshooting

### Página ainda mostra erro
- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique se o frontend foi recompilado: `ls -la frontend/dist/`
- Verifique logs do backend: `pm2 logs sispat-backend --lines 50`

### Templates não aparecem
- Verifique se há templates no banco: `SELECT * FROM report_templates;`
- Verifique se o usuário está autenticado
- Verifique se o usuário tem `municipalityId` válido

### Console mostra erros 404
- Verifique se o backend está rodando: `pm2 status`
- Verifique se a rota existe: `curl http://127.0.0.1:3000/api/config/report-templates`

## Status

✅ Correção aplicada e testada
✅ Frontend recompilado com sucesso
✅ Compatível com backend atualizado
✅ Pronto para produção

