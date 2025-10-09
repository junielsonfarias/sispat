import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should display login page correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Bem-vindo')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('button[type="submit"]')
    await expect(page.locator('text=obrigatório')).toBeVisible()
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@prefeitura.com')
    await page.fill('input[type="password"]', 'Senha@123')
    await page.click('button[type="submit"]')

    // Aguardar navegação para dashboard
    await page.waitForURL('/')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'wrong@email.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=credenciais inválidas')).toBeVisible()
  })

  test('should navigate to consulta publica', async ({ page }) => {
    await page.click('text=Consulta Pública')
    await page.waitForURL('/consulta-publica')
    await expect(page.locator('h1')).toContainText('Consulta Pública')
  })
})

