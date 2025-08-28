#!/usr/bin/env node

/**
 * Script de Teste Completo do Sistema SISPAT
 * 
 * Este script testa todas as funcionalidades principais do sistema:
 * - Estrutura do banco de dados
 * - Endpoints da API
 * - Criação, edição, exclusão de dados
 * - Integridade referencial
 * - Mapeamento de campos
 * - Autenticação e autorização
 */

import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Configuração
const BASE_URL = process.env.API_URL || 'http://localhost:3001/api'
const TEST_USER = {
  email: process.env.TEST_EMAIL || 'admin@test.com',
  password: process.env.TEST_PASSWORD || 'admin123'
}

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  subheader: (msg) => console.log(`${colors.magenta}${msg}${colors.reset}`)
}

class SystemTester {
  constructor() {
    this.token = null
    this.testData = {
      municipality: null,
      sector: null,
      local: null,
      patrimonio: null,
      user: null
    }
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    }
  }

  async run() {
    log.header('🚀 INICIANDO TESTE COMPLETO DO SISTEMA SISPAT')
    log.info(`URL Base: ${BASE_URL}`)
    log.info(`Usuário de Teste: ${TEST_USER.email}`)

    try {
      await this.testAuthentication()
      await this.testDatabaseStructure()
      await this.testAPIEndpoints()
      await this.testCRUDOperations()
      await this.testDataIntegrity()
      await this.testFieldMapping()
      await this.testAuthorization()
      await this.cleanupTestData()
      await this.generateReport()
    } catch (error) {
      log.error(`Erro fatal durante os testes: ${error.message}`)
      process.exit(1)
    }
  }

  async testAuthentication() {
    log.header('🔐 TESTE DE AUTENTICAÇÃO')
    
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER)
      })

      if (!response.ok) {
        throw new Error(`Login falhou: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      this.token = data.token
      
      log.success('Autenticação realizada com sucesso')
      this.recordTest('authentication', true, 'Login realizado com sucesso')
    } catch (error) {
      log.error(`Falha na autenticação: ${error.message}`)
      this.recordTest('authentication', false, error.message)
      throw error
    }
  }

  async testDatabaseStructure() {
    log.header('🗄️ TESTE DA ESTRUTURA DO BANCO DE DADOS')
    
    const tables = ['users', 'municipalities', 'sectors', 'locals', 'patrimonios', 'activity_logs']
    
    for (const table of tables) {
      try {
        const response = await fetch(`${BASE_URL}/debug/table/${table}`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        })

        if (response.ok) {
          const data = await response.json()
          log.success(`Tabela ${table}: ${data.record_count} registros`)
          this.recordTest(`table_${table}`, true, `${data.record_count} registros encontrados`)
        } else {
          log.warning(`Tabela ${table}: não encontrada ou erro de acesso`)
          this.recordTest(`table_${table}`, false, `Erro ${response.status}`)
        }
      } catch (error) {
        log.error(`Erro ao verificar tabela ${table}: ${error.message}`)
        this.recordTest(`table_${table}`, false, error.message)
      }
    }
  }

  async testAPIEndpoints() {
    log.header('🌐 TESTE DOS ENDPOINTS DA API')
    
    const endpoints = [
      { name: 'users', path: '/users' },
      { name: 'municipalities', path: '/municipalities' },
      { name: 'sectors', path: '/sectors' },
      { name: 'locals', path: '/locals' },
      { name: 'patrimonios', path: '/patrimonios' }
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${BASE_URL}${endpoint.path}`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        })

        if (response.ok) {
          const data = await response.json()
          log.success(`${endpoint.name}: ${Array.isArray(data) ? data.length : 'OK'}`)
          this.recordTest(`endpoint_${endpoint.name}`, true, 'Endpoint funcionando')
        } else {
          log.warning(`${endpoint.name}: Erro ${response.status}`)
          this.recordTest(`endpoint_${endpoint.name}`, false, `Erro ${response.status}`)
        }
      } catch (error) {
        log.error(`Erro no endpoint ${endpoint.name}: ${error.message}`)
        this.recordTest(`endpoint_${endpoint.name}`, false, error.message)
      }
    }
  }

  async testCRUDOperations() {
    log.header('🔄 TESTE DE OPERAÇÕES CRUD')
    
    // Teste 1: Criar município
    await this.testCreateMunicipality()
    
    // Teste 2: Criar setor
    await this.testCreateSector()
    
    // Teste 3: Criar local
    await this.testCreateLocal()
    
    // Teste 4: Criar patrimônio
    await this.testCreatePatrimonio()
    
    // Teste 5: Atualizar dados
    await this.testUpdateOperations()
    
    // Teste 6: Excluir dados
    await this.testDeleteOperations()
  }

  async testCreateMunicipality() {
    log.subheader('Criando município de teste...')
    
    try {
      const municipalityData = {
        name: 'Município de Teste - SISPAT',
        state: 'TS',
        code: 'TEST001'
      }

      const response = await fetch(`${BASE_URL}/municipalities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(municipalityData)
      })

      if (response.ok) {
        const data = await response.json()
        this.testData.municipality = data
        log.success('Município criado com sucesso')
        this.recordTest('create_municipality', true, 'Município criado')
      } else {
        const error = await response.text()
        log.warning(`Erro ao criar município: ${error}`)
        this.recordTest('create_municipality', false, error)
      }
    } catch (error) {
      log.error(`Erro ao criar município: ${error.message}`)
      this.recordTest('create_municipality', false, error.message)
    }
  }

  async testCreateSector() {
    log.subheader('Criando setor de teste...')
    
    if (!this.testData.municipality) {
      log.warning('Pulando criação de setor - município não disponível')
      return
    }

    try {
      const sectorData = {
        name: 'Setor de Teste - SISPAT',
        description: 'Setor criado para testes do sistema',
        municipalityId: this.testData.municipality.id
      }

      const response = await fetch(`${BASE_URL}/sectors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(sectorData)
      })

      if (response.ok) {
        const data = await response.json()
        this.testData.sector = data
        log.success('Setor criado com sucesso')
        this.recordTest('create_sector', true, 'Setor criado')
      } else {
        const error = await response.text()
        log.warning(`Erro ao criar setor: ${error}`)
        this.recordTest('create_sector', false, error)
      }
    } catch (error) {
      log.error(`Erro ao criar setor: ${error.message}`)
      this.recordTest('create_sector', false, error.message)
    }
  }

  async testCreateLocal() {
    log.subheader('Criando local de teste...')
    
    if (!this.testData.sector) {
      log.warning('Pulando criação de local - setor não disponível')
      return
    }

    try {
      const localData = {
        name: 'Local de Teste - SISPAT',
        description: 'Local criado para testes do sistema',
        sectorId: this.testData.sector.id
      }

      const response = await fetch(`${BASE_URL}/locals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(localData)
      })

      if (response.ok) {
        const data = await response.json()
        this.testData.local = data
        log.success('Local criado com sucesso')
        this.recordTest('create_local', true, 'Local criado')
      } else {
        const error = await response.text()
        log.warning(`Erro ao criar local: ${error}`)
        this.recordTest('create_local', false, error)
      }
    } catch (error) {
      log.error(`Erro ao criar local: ${error.message}`)
      this.recordTest('create_local', false, error.message)
    }
  }

  async testCreatePatrimonio() {
    log.subheader('Criando patrimônio de teste...')
    
    if (!this.testData.local) {
      log.warning('Pulando criação de patrimônio - local não disponível')
      return
    }

    try {
      const patrimonioData = {
        numero_patrimonial: 'TEST-001',
        descricao: 'Patrimônio de Teste - SISPAT',
        tipo: 'Equipamento',
        valor_aquisicao: 1000.00,
        data_aquisicao: new Date().toISOString(),
        local_objeto: this.testData.local.name,
        setor_responsavel: this.testData.sector.name
      }

      const response = await fetch(`${BASE_URL}/patrimonios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(patrimonioData)
      })

      if (response.ok) {
        const data = await response.json()
        this.testData.patrimonio = data
        log.success('Patrimônio criado com sucesso')
        this.recordTest('create_patrimonio', true, 'Patrimônio criado')
      } else {
        const error = await response.text()
        log.warning(`Erro ao criar patrimônio: ${error}`)
        this.recordTest('create_patrimonio', false, error)
      }
    } catch (error) {
      log.error(`Erro ao criar patrimônio: ${error.message}`)
      this.recordTest('create_patrimonio', false, error.message)
    }
  }

  async testUpdateOperations() {
    log.subheader('Testando operações de atualização...')
    
    if (this.testData.local) {
      try {
        const updateData = {
          name: 'Local de Teste - Atualizado',
          description: 'Local atualizado para testes'
        }

        const response = await fetch(`${BASE_URL}/locals/${this.testData.local.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(updateData)
        })

        if (response.ok) {
          log.success('Local atualizado com sucesso')
          this.recordTest('update_local', true, 'Local atualizado')
        } else {
          log.warning('Erro ao atualizar local')
          this.recordTest('update_local', false, 'Erro na atualização')
        }
      } catch (error) {
        log.error(`Erro ao atualizar local: ${error.message}`)
        this.recordTest('update_local', false, error.message)
      }
    }
  }

  async testDeleteOperations() {
    log.subheader('Testando operações de exclusão...')
    
    // Excluir patrimônio
    if (this.testData.patrimonio) {
      try {
        const response = await fetch(`${BASE_URL}/patrimonios/${this.testData.patrimonio.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.token}` }
        })

        if (response.ok) {
          log.success('Patrimônio excluído com sucesso')
          this.recordTest('delete_patrimonio', true, 'Patrimônio excluído')
        } else {
          log.warning('Erro ao excluir patrimônio')
          this.recordTest('delete_patrimonio', false, 'Erro na exclusão')
        }
      } catch (error) {
        log.error(`Erro ao excluir patrimônio: ${error.message}`)
        this.recordTest('delete_patrimonio', false, error.message)
      }
    }
  }

  async testDataIntegrity() {
    log.header('🔗 TESTE DE INTEGRIDADE DOS DADOS')
    
    try {
      const response = await fetch(`${BASE_URL}/debug/audit`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      })

      if (response.ok) {
        const data = await response.json()
        
        // Verificar erros de integridade
        if (data.errors && data.errors.length > 0) {
          log.warning(`Encontrados ${data.errors.length} erros de integridade:`)
          data.errors.forEach(error => log.warning(`  - ${error}`))
          this.recordTest('data_integrity', false, `${data.errors.length} erros encontrados`)
        } else {
          log.success('Nenhum erro de integridade encontrado')
          this.recordTest('data_integrity', true, 'Integridade OK')
        }

        // Verificar avisos
        if (data.warnings && data.warnings.length > 0) {
          log.warning(`Encontrados ${data.warnings.length} avisos:`)
          data.warnings.forEach(warning => log.warning(`  - ${warning}`))
        }
      } else {
        log.error('Erro ao executar auditoria de integridade')
        this.recordTest('data_integrity', false, 'Erro na auditoria')
      }
    } catch (error) {
      log.error(`Erro no teste de integridade: ${error.message}`)
      this.recordTest('data_integrity', false, error.message)
    }
  }

  async testFieldMapping() {
    log.header('🗺️ TESTE DE MAPEAMENTO DE CAMPOS')
    
    try {
      // Testar se locals retorna sectorId e municipalityId
      const response = await fetch(`${BASE_URL}/locals`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.length > 0) {
          const local = data[0]
          const hasSectorId = 'sectorId' in local
          const hasMunicipalityId = 'municipalityId' in local
          
          if (hasSectorId && hasMunicipalityId) {
            log.success('Mapeamento de campos correto')
            this.recordTest('field_mapping', true, 'Mapeamento OK')
          } else {
            log.warning('Problemas no mapeamento de campos')
            this.recordTest('field_mapping', false, 'Mapeamento incorreto')
          }
        } else {
          log.warning('Nenhum local encontrado para testar mapeamento')
          this.recordTest('field_mapping', true, 'Sem dados para testar')
        }
      } else {
        log.error('Erro ao testar mapeamento de campos')
        this.recordTest('field_mapping', false, 'Erro na consulta')
      }
    } catch (error) {
      log.error(`Erro no teste de mapeamento: ${error.message}`)
      this.recordTest('field_mapping', false, error.message)
    }
  }

  async testAuthorization() {
    log.header('🔒 TESTE DE AUTORIZAÇÃO')
    
    // Testar acesso a rotas protegidas sem token
    try {
      const response = await fetch(`${BASE_URL}/users`)
      
      if (response.status === 401) {
        log.success('Autorização funcionando corretamente')
        this.recordTest('authorization', true, 'Proteção OK')
      } else {
        log.warning('Problema na autorização')
        this.recordTest('authorization', false, 'Proteção falhou')
      }
    } catch (error) {
      log.error(`Erro no teste de autorização: ${error.message}`)
      this.recordTest('authorization', false, error.message)
    }
  }

  async cleanupTestData() {
    log.header('🧹 LIMPEZA DOS DADOS DE TESTE')
    
    // Excluir dados de teste na ordem correta
    if (this.testData.local) {
      try {
        await fetch(`${BASE_URL}/locals/${this.testData.local.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.token}` }
        })
        log.success('Local de teste removido')
      } catch (error) {
        log.warning(`Erro ao remover local: ${error.message}`)
      }
    }

    if (this.testData.sector) {
      try {
        await fetch(`${BASE_URL}/sectors/${this.testData.sector.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.token}` }
        })
        log.success('Setor de teste removido')
      } catch (error) {
        log.warning(`Erro ao remover setor: ${error.message}`)
      }
    }

    if (this.testData.municipality) {
      try {
        await fetch(`${BASE_URL}/municipalities/${this.testData.municipality.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.token}` }
        })
        log.success('Município de teste removido')
      } catch (error) {
        log.warning(`Erro ao remover município: ${error.message}`)
      }
    }
  }

  async generateReport() {
    log.header('📊 RELATÓRIO FINAL DOS TESTES')
    
    const totalTests = this.results.passed + this.results.failed
    const successRate = totalTests > 0 ? ((this.results.passed / totalTests) * 100).toFixed(1) : 0
    
    log.info(`Total de testes: ${totalTests}`)
    log.success(`Testes aprovados: ${this.results.passed}`)
    log.error(`Testes falharam: ${this.results.failed}`)
    log.warning(`Avisos: ${this.results.warnings}`)
    log.info(`Taxa de sucesso: ${successRate}%`)

    if (this.results.failed > 0) {
      log.subheader('Testes que falharam:')
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => log.error(`  - ${test.name}: ${test.message}`))
    }

    if (this.results.warnings > 0) {
      log.subheader('Avisos:')
      this.results.tests
        .filter(test => test.warning)
        .forEach(test => log.warning(`  - ${test.name}: ${test.message}`))
    }

    // Salvar relatório em arquivo
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        successRate: parseFloat(successRate)
      },
      tests: this.results.tests
    }

    const fs = await import('fs')
    const reportPath = join(__dirname, 'test-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    log.success(`Relatório salvo em: ${reportPath}`)

    // Status final
    if (this.results.failed === 0) {
      log.success('🎉 TODOS OS TESTES PASSARAM! Sistema funcionando corretamente.')
      process.exit(0)
    } else {
      log.error('❌ ALGUNS TESTES FALHARAM. Verifique os problemas acima.')
      process.exit(1)
    }
  }

  recordTest(name, passed, message, warning = false) {
    this.results.tests.push({ name, passed, message, warning })
    
    if (passed) {
      this.results.passed++
    } else {
      this.results.failed++
    }
    
    if (warning) {
      this.results.warnings++
    }
  }
}

// Executar testes
const tester = new SystemTester()
tester.run().catch(error => {
  log.error(`Erro fatal: ${error.message}`)
  process.exit(1)
})
