import { test, expect } from '@playwright/test'

test.describe('Patrimônio Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@prefeitura.com')
    await page.fill('input[type="password"]', 'Senha@123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('should navigate to bens cadastrados', async ({ page }) => {
    await page.click('text=Bens Cadastrados')
    await page.waitForURL('/bens-cadastrados')
    await expect(page.locator('h1')).toContainText('Bens Cadastrados')
  })

  test('should display patrimonio list', async ({ page }) => {
    await page.goto('/bens-cadastrados')
    
    // Aguardar tabela ou cards carregarem
    await page.waitForSelector('table, [data-testid="patrimonio-card"]', { timeout: 5000 })
    
    // Verificar se há elementos na lista
    const hasTable = await page.locator('table').isVisible().catch(() => false)
    const hasCards = await page.locator('[data-testid="patrimonio-card"]').isVisible().catch(() => false)
    
    expect(hasTable || hasCards).toBeTruthy()
  })

  test('should search for patrimonio', async ({ page }) => {
    await page.goto('/bens-cadastrados')
    
    const searchInput = page.locator('input[placeholder*="Buscar"]')
    await searchInput.fill('Notebook')
    
    // Aguardar filtro ser aplicado
    await page.waitForTimeout(500)
    
    // Verificar se resultados foram filtrados
    const results = page.locator('table tbody tr, [data-testid="patrimonio-card"]')
    await expect(results.first()).toBeVisible()
  })

  test('should open new patrimonio form', async ({ page }) => {
    await page.goto('/bens-cadastrados')
    await page.click('text=Cadastrar Bem')
    await page.waitForURL('/bens-cadastrados/novo')
    await expect(page.locator('h1')).toContainText('Novo')
  })

  test('should use keyboard shortcuts', async ({ page }) => {
    await page.goto('/')
    
    // Test Ctrl+B (Bens Cadastrados)
    await page.keyboard.press('Control+b')
    await page.waitForURL('/bens-cadastrados')
    
    // Test Ctrl+H (Home)
    await page.keyboard.press('Control+h')
    await page.waitForURL('/')
    
    // Test Ctrl+I (Imóveis)
    await page.keyboard.press('Control+i')
    await page.waitForURL('/imoveis')
  })

  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/')
    
    // Clicar no botão de tema
    const themeButton = page.locator('button[aria-label="Alternar tema"]')
    await themeButton.click()
    
    // Selecionar modo escuro
    await page.click('text=Escuro')
    
    // Verificar se dark class foi adicionada
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)
  })
})

