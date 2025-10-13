# 📱 GUIA RÁPIDO - NAVEGAÇÃO MOBILE SISPAT 2.0

## 🚀 DEPLOY EM 3 PASSOS

```bash
# 1. Atualizar código
cd /var/www/sispat && git pull origin main

# 2. Rebuild frontend
npm run build

# 3. Reiniciar backend
cd backend && pm2 restart sispat-backend
```

---

## 🎯 PRINCIPAIS MUDANÇAS

### Header Mobile
```
ANTES: 96px de altura, sem menu visível
AGORA: 64px de altura, botão hamburguer no canto esquerdo
```

### Bottom Navigation
```
ANTES: Design simples, sem feedback
AGORA: 5 itens, estados ativos, animações suaves
```

### Listagens
```
ANTES: Tabelas com scroll horizontal
AGORA: Cards verticais responsivos (MobileCard)
```

### Formulários
```
ANTES: Inputs 36px, difícil de tocar
AGORA: Inputs 48px, touch-friendly
```

---

## 📝 USO RÁPIDO

### MobileCard
```tsx
import { MobileCard, MobileCardField } from '@/components/ui/mobile-card'

<MobileCard
  title="Item"
  subtitle="Descrição"
  badge={{ label: 'Status' }}
  onClick={() => {}}
>
  <MobileCardField label="Campo" value="Valor" />
</MobileCard>
```

### Formulário Mobile
```tsx
<div className="form-field-mobile">
  <label>Campo *</label>
  <input type="text" />
</div>
```

### Visibilidade Responsiva
```tsx
{/* Desktop */}
<div className="hidden md:block">
  <Table>...</Table>
</div>

{/* Mobile */}
<div className="md:hidden">
  <MobileCardList>...</MobileCardList>
</div>
```

---

## 🧪 TESTES

### Checklist Rápido:
```
✅ Header tem 64px de altura
✅ Botão hamburguer está visível
✅ Bottom navigation tem 5 itens
✅ Cards aparecem em mobile
✅ Formulários têm campos grandes
✅ Todos os botões são clicáveis
```

### Testar em:
```
- iPhone SE (375px)
- iPhone 12 (390px)
- Galaxy S21 (360px)
- iPad Mini (768px)
```

---

## 🔧 TROUBLESHOOTING

### CSS não atualizado?
```bash
rm -rf dist && npm run build
```

### Menu não abre?
```bash
# Verificar console (F12) por erros JS
pm2 logs sispat-backend --err
```

### Bottom nav não aparece?
```bash
# Rebuild forçado
npm run build -- --force
```

---

## 📊 ARQUIVOS PRINCIPAIS

```
✅ src/components/Header.tsx (linha 361-447)
✅ src/components/MobileNavigation.tsx (linha 392-449)
✅ src/components/Layout.tsx (linha 44)
✅ src/components/ui/mobile-card.tsx (NOVO)
✅ src/main.css (linha 360-383)
```

---

## ✅ VALIDAÇÃO

Após deploy, verificar:
```bash
# 1. API funcionando
curl http://localhost:3000/api/health

# 2. PM2 status
pm2 status

# 3. Testar no smartphone
# Abrir http://seu-ip:3000
```

---

## 📚 DOCS COMPLETAS

- `MELHORIAS_MOBILE_NAVEGACAO.md` - Documentação detalhada
- `COMANDOS_DEPLOY_MOBILE.md` - Scripts e comandos
- `RESUMO_MELHORIAS_MOBILE.md` - Antes vs Depois

---

**✅ PRONTO PARA PRODUÇÃO!** 📱🎉

