import { test, expect } from '@playwright/test'

test.describe('Patrimônio E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@test.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 })
  })

  test('should navigate to patrimônios list', async ({ page }) => {
    // Navigate to patrimônios
    await page.click('text=Bens Cadastrados')
    
    // Should be on patrimônios page
    await expect(page).toHaveURL(/.*bens-cadastrados/)
    await expect(page.locator('h1')).toContainText('Bens Cadastrados')
  })

  test('should display patrimônios list', async ({ page }) => {
    await page.goto('/bens-cadastrados')
    
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Bens Cadastrados', { timeout: 10000 })
    
    // Should have a table or list of patrimônios
    await expect(page.locator('[data-testid="patrimonios-table"], table')).toBeVisible({ timeout: 5000 })
  })

  test('should open create patrimônio form', async ({ page }) => {
    await page.goto('/bens-cadastrados')
    
    // Click new patrimônio button
    await page.click('text=Novo Bem, text=Cadastrar, [data-testid="new-patrimonio-btn"]')
    
    // Should navigate to create form
    await expect(page).toHaveURL(/.*novo/)
    await expect(page.locator('text=Cadastro de Bem')).toBeVisible()
  })

  test('should show validation errors on empty form submission', async ({ page }) => {
    await page.goto('/bens-cadastrados/novo')
    
    // Try to submit empty form
    await page.click('button[type="submit"], text=Salvar')
    
    // Should show validation errors
    await expect(page.locator('text=obrigatório')).toBeVisible({ timeout: 5000 })
  })

  test('should create new patrimônio successfully', async ({ page }) => {
    await page.goto('/bens-cadastrados/novo')
    
    // Fill the form
    await page.fill('input[name="numero_patrimonio"], [data-testid="numero-patrimonio"]', '2024001')
    await page.fill('input[name="descricao"], [data-testid="descricao"]', 'Computador de Teste E2E')
    await page.fill('input[name="categoria"], [data-testid="categoria"]', 'Equipamentos de Informática')
    await page.fill('input[name="valor"], [data-testid="valor"]', '2500')
    
    // Select status if it's a dropdown
    await page.selectOption('select[name="status"], [data-testid="status"]', 'ativo')
    
    // Submit form
    await page.click('button[type="submit"], text=Salvar')
    
    // Should redirect to list or show success message
    await expect(page.locator('text=sucesso, text=criado')).toBeVisible({ timeout: 10000 })
  })

  test('should search patrimônios', async ({ page }) => {
    await page.goto('/bens-cadastrados')
    
    // Find and use search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"], [data-testid="search-input"]')
    await searchInput.fill('Computador')
    
    // Press Enter or click search button
    await searchInput.press('Enter')
    
    // Should filter results
    await expect(page.locator('text=Computador')).toBeVisible({ timeout: 5000 })
  })

  test('should view patrimônio details', async ({ page }) => {
    await page.goto('/bens-cadastrados')
    
    // Click on first patrimônio in the list
    await page.click('tr:nth-child(2) td:first-child a, [data-testid="patrimonio-link"]:first')
    
    // Should navigate to details page
    await expect(page).toHaveURL(/.*ver\/.*/)
    await expect(page.locator('text=Detalhes do Bem')).toBeVisible()
  })

  test('should edit patrimônio', async ({ page }) => {
    await page.goto('/bens-cadastrados')
    
    // Click edit button on first patrimônio
    await page.click('[data-testid="edit-patrimonio"]:first, text=Editar')
    
    // Should navigate to edit form
    await expect(page).toHaveURL(/.*editar\/.*/)
    await expect(page.locator('text=Editar Bem')).toBeVisible()
    
    // Make a change
    await page.fill('input[name="descricao"], [data-testid="descricao"]', 'Computador Editado E2E')
    
    // Save changes
    await page.click('button[type="submit"], text=Salvar')
    
    // Should show success message
    await expect(page.locator('text=atualizado, text=sucesso')).toBeVisible({ timeout: 10000 })
  })

  test('should delete patrimônio', async ({ page }) => {
    await page.goto('/bens-cadastrados')
    
    // Click delete button
    await page.click('[data-testid="delete-patrimonio"]:first, text=Excluir')
    
    // Confirm deletion in modal/dialog
    await page.click('text=Confirmar, text=Sim, button:has-text("Excluir")')
    
    // Should show success message
    await expect(page.locator('text=excluído, text=removido')).toBeVisible({ timeout: 10000 })
  })

  test('should filter patrimônios by category', async ({ page }) => {
    await page.goto('/bens-cadastrados')
    
    // Open filters
    await page.click('text=Filtros, [data-testid="filter-button"]')
    
    // Select a category filter
    await page.selectOption('select[name="categoria"], [data-testid="categoria-filter"]', 'Equipamentos de Informática')
    
    // Apply filter
    await page.click('text=Aplicar, button[type="submit"]')
    
    // Should show filtered results
    await expect(page.locator('text=Equipamentos de Informática')).toBeVisible()
  })

  test('should export patrimônios list', async ({ page }) => {
    await page.goto('/bens-cadastrados')
    
    // Click export button
    await page.click('text=Exportar, [data-testid="export-button"]')
    
    // Wait for download to start
    const downloadPromise = page.waitForEvent('download')
    await page.click('text=Excel, text=PDF')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/patrimonio.*\.(xlsx|pdf)/)
  })
})
