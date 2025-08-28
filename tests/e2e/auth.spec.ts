import { test, expect } from '@playwright/test'

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing authentication
    await page.context().clearCookies()
    await page.goto('/')
  })

  test('should redirect to login page when not authenticated', async ({ page }) => {
    await page.goto('/')
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*login/)
    await expect(page.locator('h1')).toContainText('Bem-vindo ao SISPAT')
  })

  test('should display login form elements', async ({ page }) => {
    await page.goto('/login')
    
    // Wait for the page to load completely
    await expect(page.locator('h1')).toContainText('Bem-vindo ao SISPAT')
    
    // Check for form elements using exact structure from Login.tsx
    await expect(page.locator('input[placeholder="seu@email.com"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]:has-text("Entrar")')).toBeVisible()
    
    // Check for labels
    await expect(page.locator('label:has-text("Email")')).toBeVisible()
    await expect(page.locator('label:has-text("Senha")')).toBeVisible()
    
    // Check for municipality select (should be visible for non-superuser)
    await expect(page.locator('label:has-text("Município")')).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login')
    
    // First select superuser to enable the form
    await page.check('input[type="checkbox"]:near(label:has-text("Superusuário"))')
    
    // Try to submit empty form
    await page.click('button[type="submit"]:has-text("Entrar")')
    
    // Wait for validation errors to appear (based on zod schema)
    await expect(page.locator('text=Por favor, insira um e-mail válido')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Senha é obrigatória')).toBeVisible({ timeout: 5000 })
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // First select superuser to enable the form
    await page.check('input[type="checkbox"]:near(label:has-text("Superusuário"))')
    
    // Fill form with invalid credentials
    await page.fill('input[placeholder="seu@email.com"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Entrar")')
    
    // Wait for error message (based on Alert component)
    await expect(page.locator('[role="alert"]:has-text("Erro de Autenticação")')).toBeVisible({ timeout: 10000 })
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // First select superuser to enable the form
    await page.check('input[type="checkbox"]:near(label:has-text("Superusuário"))')
    
    // Fill form with valid credentials (these should be test credentials)
    await page.fill('input[placeholder="seu@email.com"]', 'superuser@test.com')
    await page.fill('input[type="password"]', 'superuser123')
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Entrar")')
    
    // Should show success toast first
    await expect(page.locator('text=Bem-vindo(a) de volta')).toBeVisible({ timeout: 10000 })
    
    // Should be redirected to superuser dashboard
    await expect(page).toHaveURL(/.*superuser/, { timeout: 15000 })
  })

  test('should logout successfully', async ({ page }) => {
    // First login as superuser
    await page.goto('/login')
    await page.check('input[type="checkbox"]:near(label:has-text("Superusuário"))')
    await page.fill('input[placeholder="seu@email.com"]', 'superuser@test.com')
    await page.fill('input[type="password"]', 'superuser123')
    await page.click('button[type="submit"]:has-text("Entrar")')
    
    // Wait for superuser dashboard
    await expect(page).toHaveURL(/.*superuser/, { timeout: 10000 })
    
    // Find and click logout button in user menu
    await page.click('button:has([data-testid="user-menu"]), [aria-label="Menu do usuário"]')
    await page.click('text=Sair, text=Logout')
    
    // Should be redirected back to login
    await expect(page).toHaveURL(/.*login/, { timeout: 5000 })
  })

  test('should remember login state on page refresh', async ({ page }) => {
    // Login first as superuser
    await page.goto('/login')
    await page.check('input[type="checkbox"]:near(label:has-text("Superusuário"))')
    await page.fill('input[placeholder="seu@email.com"]', 'superuser@test.com')
    await page.fill('input[type="password"]', 'superuser123')
    await page.click('button[type="submit"]:has-text("Entrar")')
    
    // Wait for superuser dashboard
    await expect(page).toHaveURL(/.*superuser/, { timeout: 10000 })
    
    // Refresh page
    await page.reload()
    
    // Should still be logged in and on superuser page
    await expect(page).toHaveURL(/.*superuser/)
    await expect(page.locator('text=Superusuário, h1, h2')).toBeVisible()
  })
})
