import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Documentos Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@prefeitura.com')
    await page.fill('input[type="password"]', 'Senha@123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('should navigate to documentos page', async ({ page }) => {
    await page.click('text=Documentos')
    await page.waitForURL('/documentos')
    await expect(page.locator('h1')).toContainText('Documentos')
  })

  test('should display documentos list', async ({ page }) => {
    await page.goto('/documentos')
    
    // Aguardar tabela carregar
    await page.waitForSelector('table, [data-testid="documento-card"]', { timeout: 5000 })
    
    // Verificar se há elementos na lista
    const hasTable = await page.locator('table').isVisible().catch(() => false)
    const hasCards = await page.locator('[data-testid="documento-card"]').isVisible().catch(() => false)
    
    expect(hasTable || hasCards).toBeTruthy()
  })

  test('should upload new document', async ({ page }) => {
    await page.goto('/documentos')
    
    // Clicar no botão de upload
    await page.click('text=Upload Documento')
    
    // Preencher metadados
    await page.fill('input[name="titulo"]', 'Documento de Teste')
    await page.fill('textarea[name="descricao"]', 'Descrição do documento de teste')
    await page.selectOption('select[name="tipo"]', 'pdf')
    await page.fill('input[name="categoria"]', 'Administrativo')
    await page.fill('input[name="tags"]', 'teste, documento')
    
    // Upload do arquivo
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(__dirname, '../test-files/sample.pdf'))
    
    // Submeter
    await page.click('button[type="submit"]')
    
    // Verificar se documento foi enviado
    await expect(page.locator('text=Documento enviado com sucesso')).toBeVisible()
  })

  test('should download document', async ({ page }) => {
    await page.goto('/documentos')
    
    // Aguardar lista carregar
    await page.waitForSelector('table tbody tr, [data-testid="documento-card"]')
    
    // Clicar no botão de download da primeira documento
    const downloadButton = page.locator('button[data-testid="download-documento"]').first()
    
    // Aguardar download
    const downloadPromise = page.waitForEvent('download')
    await downloadButton.click()
    await downloadPromise
    
    // Verificar se arquivo foi baixado
    expect(downloadPromise).toBeTruthy()
  })

  test('should edit document metadata', async ({ page }) => {
    await page.goto('/documentos')
    
    // Aguardar lista carregar
    await page.waitForSelector('table tbody tr, [data-testid="documento-card"]')
    
    // Clicar no botão de editar da primeira documento
    const editButton = page.locator('button[data-testid="edit-documento"]').first()
    await editButton.click()
    
    // Editar metadados
    await page.fill('input[name="titulo"]', 'Título Atualizado')
    await page.fill('textarea[name="descricao"]', 'Descrição atualizada')
    
    // Salvar
    await page.click('button[type="submit"]')
    
    // Verificar se documento foi atualizado
    await expect(page.locator('text=Documento atualizado com sucesso')).toBeVisible()
  })

  test('should delete document', async ({ page }) => {
    await page.goto('/documentos')
    
    // Aguardar lista carregar
    await page.waitForSelector('table tbody tr, [data-testid="documento-card"]')
    
    // Clicar no botão de deletar da primeira documento
    const deleteButton = page.locator('button[data-testid="delete-documento"]').first()
    await deleteButton.click()
    
    // Confirmar exclusão
    await page.click('text=Confirmar')
    
    // Verificar se documento foi deletado
    await expect(page.locator('text=Documento deletado com sucesso')).toBeVisible()
  })

  test('should filter documentos by type', async ({ page }) => {
    await page.goto('/documentos')
    
    // Selecionar filtro de tipo
    await page.click('select[name="tipo"]')
    await page.selectOption('select[name="tipo"]', 'pdf')
    
    // Aguardar filtro ser aplicado
    await page.waitForTimeout(500)
    
    // Verificar se apenas documentos PDF são exibidos
    const typeElements = page.locator('[data-testid="documento-tipo"]')
    const count = await typeElements.count()
    
    for (let i = 0; i < count; i++) {
      await expect(typeElements.nth(i)).toContainText('PDF')
    }
  })

  test('should search documentos', async ({ page }) => {
    await page.goto('/documentos')
    
    const searchInput = page.locator('input[placeholder*="Buscar"]')
    await searchInput.fill('teste')
    
    // Aguardar filtro ser aplicado
    await page.waitForTimeout(500)
    
    // Verificar se resultados foram filtrados
    const results = page.locator('table tbody tr, [data-testid="documento-card"]')
    await expect(results.first()).toBeVisible()
  })

  test('should toggle public/private status', async ({ page }) => {
    await page.goto('/documentos')
    
    // Aguardar lista carregar
    await page.waitForSelector('table tbody tr, [data-testid="documento-card"]')
    
    // Clicar no toggle de público/privado da primeira documento
    const publicToggle = page.locator('input[data-testid="public-toggle"]').first()
    await publicToggle.click()
    
    // Verificar se status mudou
    await expect(page.locator('text=Status atualizado')).toBeVisible()
  })

  test('should handle large file upload', async ({ page }) => {
    await page.goto('/documentos')
    
    // Clicar no botão de upload
    await page.click('text=Upload Documento')
    
    // Preencher metadados
    await page.fill('input[name="titulo"]', 'Arquivo Grande')
    await page.selectOption('select[name="tipo"]', 'pdf')
    
    // Upload de arquivo grande (simulado)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(__dirname, '../test-files/large-file.pdf'))
    
    // Verificar se progress bar aparece
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()
    
    // Aguardar upload completar
    await page.waitForSelector('[data-testid="upload-success"]', { timeout: 30000 })
  })

  test('should display error for invalid file type', async ({ page }) => {
    await page.goto('/documentos')
    
    // Clicar no botão de upload
    await page.click('text=Upload Documento')
    
    // Preencher metadados
    await page.fill('input[name="titulo"]', 'Arquivo Inválido')
    await page.selectOption('select[name="tipo"]', 'pdf')
    
    // Upload de arquivo inválido
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(__dirname, '../test-files/invalid-file.exe'))
    
    // Verificar se erro é exibido
    await expect(page.locator('text=Tipo de arquivo não permitido')).toBeVisible()
  })
})
