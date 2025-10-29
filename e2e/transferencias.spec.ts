import { test, expect } from '@playwright/test'

test.describe('Transferências Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@prefeitura.com')
    await page.fill('input[type="password"]', 'Senha@123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('should navigate to transferências page', async ({ page }) => {
    await page.click('text=Transferências')
    await page.waitForURL('/transferencias')
    await expect(page.locator('h1')).toContainText('Transferências')
  })

  test('should display transferências list', async ({ page }) => {
    await page.goto('/transferencias')
    
    // Aguardar tabela carregar
    await page.waitForSelector('table, [data-testid="transferencia-card"]', { timeout: 5000 })
    
    // Verificar se há elementos na lista
    const hasTable = await page.locator('table').isVisible().catch(() => false)
    const hasCards = await page.locator('[data-testid="transferencia-card"]').isVisible().catch(() => false)
    
    expect(hasTable || hasCards).toBeTruthy()
  })

  test('should create new transferência', async ({ page }) => {
    await page.goto('/transferencias')
    
    // Clicar no botão de nova transferência
    await page.click('text=Nova Transferência')
    
    // Preencher formulário
    await page.fill('input[name="patrimonioId"]', 'PAT2025000001')
    await page.fill('input[name="setorOrigem"]', 'TI')
    await page.fill('input[name="setorDestino"]', 'Administração')
    await page.fill('textarea[name="motivo"]', 'Transferência de setor')
    
    // Submeter
    await page.click('button[type="submit"]')
    
    // Verificar se transferência foi criada
    await expect(page.locator('text=Transferência criada com sucesso')).toBeVisible()
  })

  test('should approve transferência', async ({ page }) => {
    await page.goto('/transferencias')
    
    // Aguardar lista carregar
    await page.waitForSelector('table tbody tr, [data-testid="transferencia-card"]')
    
    // Clicar no botão de aprovar da primeira transferência
    const approveButton = page.locator('button[data-testid="approve-transferencia"]').first()
    await approveButton.click()
    
    // Confirmar aprovação
    await page.click('text=Confirmar')
    
    // Verificar se status mudou para aprovado
    await expect(page.locator('text=Aprovado')).toBeVisible()
  })

  test('should reject transferência', async ({ page }) => {
    await page.goto('/transferencias')
    
    // Aguardar lista carregar
    await page.waitForSelector('table tbody tr, [data-testid="transferencia-card"]')
    
    // Clicar no botão de rejeitar da primeira transferência
    const rejectButton = page.locator('button[data-testid="reject-transferencia"]').first()
    await rejectButton.click()
    
    // Preencher motivo da rejeição
    await page.fill('textarea[name="motivoRejeicao"]', 'Transferência não aprovada')
    
    // Confirmar rejeição
    await page.click('text=Confirmar')
    
    // Verificar se status mudou para rejeitado
    await expect(page.locator('text=Rejeitado')).toBeVisible()
  })

  test('should filter transferências by status', async ({ page }) => {
    await page.goto('/transferencias')
    
    // Selecionar filtro de status
    await page.click('select[name="status"]')
    await page.selectOption('select[name="status"]', 'pendente')
    
    // Aguardar filtro ser aplicado
    await page.waitForTimeout(500)
    
    // Verificar se apenas transferências pendentes são exibidas
    const statusElements = page.locator('[data-testid="transferencia-status"]')
    const count = await statusElements.count()
    
    for (let i = 0; i < count; i++) {
      await expect(statusElements.nth(i)).toContainText('Pendente')
    }
  })

  test('should search transferências', async ({ page }) => {
    await page.goto('/transferencias')
    
    const searchInput = page.locator('input[placeholder*="Buscar"]')
    await searchInput.fill('PAT2025000001')
    
    // Aguardar filtro ser aplicado
    await page.waitForTimeout(500)
    
    // Verificar se resultados foram filtrados
    const results = page.locator('table tbody tr, [data-testid="transferencia-card"]')
    await expect(results.first()).toBeVisible()
  })

  test('should export transferências', async ({ page }) => {
    await page.goto('/transferencias')
    
    // Clicar no botão de exportar
    await page.click('button[data-testid="export-transferencias"]')
    
    // Aguardar download
    const downloadPromise = page.waitForEvent('download')
    await downloadPromise
    
    // Verificar se arquivo foi baixado
    expect(downloadPromise).toBeTruthy()
  })
})
