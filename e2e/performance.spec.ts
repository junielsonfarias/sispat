import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@prefeitura.com')
    await page.fill('input[type="password"]', 'Senha@123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('should load dashboard within 3 seconds', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForSelector('[data-testid="stats-cards"]')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000)
  })

  test('should load patrimonios list within 2 seconds', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/bens-cadastrados')
    await page.waitForSelector('table, [data-testid="patrimonio-card"]')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(2000)
  })

  test('should handle large datasets efficiently', async ({ page }) => {
    // Interceptar requisição para simular grande dataset
    await page.route('**/api/patrimonios', route => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `patrimonio-${i}`,
        numero_patrimonio: `PAT202500${i.toString().padStart(4, '0')}`,
        descricao_bem: `Bem ${i}`,
        status: 'ativo'
      }))
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeDataset)
      })
    })
    
    const startTime = Date.now()
    
    await page.goto('/bens-cadastrados')
    await page.waitForSelector('table, [data-testid="patrimonio-card"]')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(5000) // 5 segundos para 1000 itens
  })

  test('should have good Core Web Vitals', async ({ page }) => {
    await page.goto('/')
    
    // Medir LCP (Largest Contentful Paint)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          resolve(lastEntry.startTime)
        }).observe({ entryTypes: ['largest-contentful-paint'] })
      })
    })
    
    expect(lcp).toBeLessThan(2500) // LCP < 2.5s
    
    // Medir FID (First Input Delay)
    const fid = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const firstEntry = entries[0]
          resolve(firstEntry.processingStart - firstEntry.startTime)
        }).observe({ entryTypes: ['first-input'] })
      })
    })
    
    expect(fid).toBeLessThan(100) // FID < 100ms
  })

  test('should handle concurrent requests', async ({ page }) => {
    // Fazer múltiplas requisições simultâneas
    const promises = [
      page.goto('/bens-cadastrados'),
      page.goto('/imoveis'),
      page.goto('/transferencias'),
      page.goto('/documentos')
    ]
    
    const startTime = Date.now()
    
    await Promise.all(promises)
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(10000) // 10 segundos para todas as páginas
  })

  test('should cache resources effectively', async ({ page }) => {
    // Primeira visita
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Segunda visita (deve usar cache)
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(1000) // < 1s com cache
  })

  test('should handle slow network conditions', async ({ page }) => {
    // Simular rede lenta
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000) // 1s delay
    })
    
    const startTime = Date.now()
    
    await page.goto('/bens-cadastrados')
    await page.waitForSelector('table, [data-testid="patrimonio-card"]')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(10000) // < 10s mesmo com rede lenta
  })

  test('should not have memory leaks', async ({ page }) => {
    // Navegar entre páginas múltiplas vezes
    for (let i = 0; i < 10; i++) {
      await page.goto('/bens-cadastrados')
      await page.waitForLoadState('networkidle')
      
      await page.goto('/imoveis')
      await page.waitForLoadState('networkidle')
      
      await page.goto('/transferencias')
      await page.waitForLoadState('networkidle')
      
      await page.goto('/documentos')
      await page.waitForLoadState('networkidle')
    }
    
    // Verificar se não há erros de memória
    const errors = await page.evaluate(() => {
      return window.performance.memory ? {
        usedJSHeapSize: window.performance.memory.usedJSHeapSize,
        totalJSHeapSize: window.performance.memory.totalJSHeapSize
      } : null
    })
    
    if (errors) {
      expect(errors.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024) // < 100MB
    }
  })

  test('should handle search efficiently', async ({ page }) => {
    await page.goto('/bens-cadastrados')
    
    const startTime = Date.now()
    
    // Fazer busca
    const searchInput = page.locator('input[placeholder*="Buscar"]')
    await searchInput.fill('Notebook')
    
    // Aguardar resultados
    await page.waitForTimeout(500)
    
    const searchTime = Date.now() - startTime
    expect(searchTime).toBeLessThan(1000) // < 1s para busca
  })

  test('should handle pagination efficiently', async ({ page }) => {
    await page.goto('/bens-cadastrados')
    
    // Aguardar primeira página carregar
    await page.waitForSelector('table, [data-testid="patrimonio-card"]')
    
    const startTime = Date.now()
    
    // Ir para próxima página
    const nextButton = page.locator('button[aria-label="Próxima página"]')
    await nextButton.click()
    
    // Aguardar próxima página carregar
    await page.waitForSelector('table, [data-testid="patrimonio-card"]')
    
    const paginationTime = Date.now() - startTime
    expect(paginationTime).toBeLessThan(2000) // < 2s para paginação
  })
})
