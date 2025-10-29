import { test, expect } from '@playwright/test'

test.describe('Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@prefeitura.com')
    await page.fill('input[type="password"]', 'Senha@123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('should display dashboard with all sections', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    // Verificar se as seções principais estão presentes
    await expect(page.locator('[data-testid="stats-cards"]')).toBeVisible()
    await expect(page.locator('[data-testid="charts-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="recent-patrimonios"]')).toBeVisible()
    await expect(page.locator('[data-testid="alerts-section"]')).toBeVisible()
  })

  test('should display statistics cards', async ({ page }) => {
    const statsCards = page.locator('[data-testid="stats-cards"] [data-testid="stat-card"]')
    await expect(statsCards).toHaveCount(4) // Total, Ativos, Inativos, Baixados
    
    // Verificar se os valores são numéricos
    const totalPatrimonios = statsCards.nth(0)
    await expect(totalPatrimonios.locator('[data-testid="stat-value"]')).toContainText(/\d+/)
  })

  test('should display charts', async ({ page }) => {
    const chartsSection = page.locator('[data-testid="charts-section"]')
    await expect(chartsSection).toBeVisible()
    
    // Verificar se há pelo menos um gráfico
    const charts = page.locator('canvas, [data-testid="chart"]')
    await expect(charts.first()).toBeVisible()
  })

  test('should display recent patrimonios', async ({ page }) => {
    const recentSection = page.locator('[data-testid="recent-patrimonios"]')
    await expect(recentSection).toBeVisible()
    
    // Verificar se há lista de patrimônios recentes
    const patrimoniosList = recentSection.locator('[data-testid="patrimonio-item"]')
    await expect(patrimoniosList.first()).toBeVisible()
  })

  test('should display alerts', async ({ page }) => {
    const alertsSection = page.locator('[data-testid="alerts-section"]')
    await expect(alertsSection).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Verificar se o dashboard se adapta ao mobile
    await expect(page.locator('[data-testid="stats-cards"]')).toBeVisible()
    
    // Verificar se a navegação mobile está presente
    const mobileNav = page.locator('[data-testid="mobile-navigation"]')
    await expect(mobileNav).toBeVisible()
  })

  test('should handle loading states', async ({ page }) => {
    // Interceptar requisições para simular loading
    await page.route('**/api/patrimonios', route => {
      // Delay para simular loading
      setTimeout(() => route.continue(), 1000)
    })
    
    await page.reload()
    
    // Verificar se loading states são exibidos
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]')
    await expect(loadingSpinner).toBeVisible()
  })

  test('should handle errors gracefully', async ({ page }) => {
    // Interceptar requisições para simular erro
    await page.route('**/api/patrimonios', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      })
    })
    
    await page.reload()
    
    // Verificar se erro é exibido
    const errorMessage = page.locator('[data-testid="error-message"]')
    await expect(errorMessage).toBeVisible()
  })
})
