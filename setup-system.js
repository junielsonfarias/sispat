#!/usr/bin/env node

/**
 * Script de Setup e Otimização do Sistema SISPAT
 * 
 * Este script executa automaticamente todas as correções e otimizações
 * necessárias para o sistema funcionar corretamente.
 */

import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configurações
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api'
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''

class SystemSetup {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      steps: [],
      errors: [],
      warnings: [],
      summary: {
        total: 0,
        success: 0,
        failed: 0
      }
    }
  }

  async log(step, status, message, data = null) {
    const logEntry = {
      step,
      status,
      message,
      timestamp: new Date().toISOString(),
      data
    }
    
    this.results.steps.push(logEntry)
    
    if (status === 'error') {
      this.results.errors.push(logEntry)
      this.results.summary.failed++
    } else if (status === 'success') {
      this.results.summary.success++
    } else if (status === 'warning') {
      this.results.warnings.push(logEntry)
    }
    
    this.results.summary.total++
    
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : status === 'warning' ? '⚠️' : 'ℹ️'
    console.log(`${emoji} ${step}: ${message}`)
  }

  async makeRequest(endpoint, method = 'GET', body = null) {
    try {
      const url = `${API_BASE_URL}${endpoint}`
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` })
        },
        ...(body && { body: JSON.stringify(body) })
      }
      
      const response = await fetch(url, options)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }
      
      return data
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`)
    }
  }

  async checkServerHealth() {
    try {
      await this.log('Verificando saúde do servidor', 'info', 'Testando conectividade...')
      
      const health = await this.makeRequest('/health')
      
      if (health.status === 'OK') {
        await this.log('Verificação de saúde', 'success', 'Servidor está funcionando corretamente')
        return true
      } else {
        await this.log('Verificação de saúde', 'error', 'Servidor não está respondendo corretamente')
        return false
      }
    } catch (error) {
      await this.log('Verificação de saúde', 'error', `Erro de conectividade: ${error.message}`)
      return false
    }
  }

  async fixCommonIssues() {
    try {
      await this.log('Correção de problemas comuns', 'info', 'Executando correções automáticas...')
      
      const result = await this.makeRequest('/debug/fix-common-issues', 'POST')
      
      if (result.success) {
        await this.log('Correção de problemas comuns', 'success', 'Problemas corrigidos com sucesso', result.results)
        return true
      } else {
        await this.log('Correção de problemas comuns', 'error', 'Falha ao corrigir problemas')
        return false
      }
    } catch (error) {
      await this.log('Correção de problemas comuns', 'error', `Erro: ${error.message}`)
      return false
    }
  }

  async createBackup() {
    try {
      await this.log('Criação de backup', 'info', 'Criando backup do sistema...')
      
      const result = await this.makeRequest('/backup/create', 'POST')
      
      if (result.success) {
        await this.log('Criação de backup', 'success', `Backup criado: ${result.data.filename}`, result.data)
        return true
      } else {
        await this.log('Criação de backup', 'error', 'Falha ao criar backup')
        return false
      }
    } catch (error) {
      await this.log('Criação de backup', 'error', `Erro: ${error.message}`)
      return false
    }
  }

  async optimizePerformance() {
    try {
      await this.log('Otimização de performance', 'info', 'Otimizando performance do banco...')
      
      const result = await this.makeRequest('/debug/optimize/performance', 'POST')
      
      if (result.success) {
        await this.log('Otimização de performance', 'success', 'Performance otimizada com sucesso', result.results)
        return true
      } else {
        await this.log('Otimização de performance', 'error', 'Falha na otimização')
        return false
      }
    } catch (error) {
      await this.log('Otimização de performance', 'error', `Erro: ${error.message}`)
      return false
    }
  }

  async getPerformanceStats() {
    try {
      await this.log('Estatísticas de performance', 'info', 'Obtendo estatísticas...')
      
      const result = await this.makeRequest('/debug/optimize/stats', 'GET')
      
      if (result.success) {
        await this.log('Estatísticas de performance', 'success', 'Estatísticas obtidas com sucesso', result.data)
        return result.data
      } else {
        await this.log('Estatísticas de performance', 'error', 'Falha ao obter estatísticas')
        return null
      }
    } catch (error) {
      await this.log('Estatísticas de performance', 'error', `Erro: ${error.message}`)
      return null
    }
  }

  async listBackups() {
    try {
      await this.log('Listagem de backups', 'info', 'Verificando backups existentes...')
      
      const result = await this.makeRequest('/backup/list', 'GET')
      
      if (result.success) {
        await this.log('Listagem de backups', 'success', `${result.data.length} backups encontrados`, result.data)
        return result.data
      } else {
        await this.log('Listagem de backups', 'error', 'Falha ao listar backups')
        return []
      }
    } catch (error) {
      await this.log('Listagem de backups', 'error', `Erro: ${error.message}`)
      return []
    }
  }

  async runFullSetup() {
    console.log('🚀 Iniciando setup completo do sistema SISPAT...\n')
    
    // 1. Verificar saúde do servidor
    const serverHealthy = await this.checkServerHealth()
    if (!serverHealthy) {
      await this.log('Setup', 'error', 'Servidor não está disponível. Abortando setup.')
      return this.results
    }
    
    // 2. Corrigir problemas comuns
    await this.fixCommonIssues()
    
    // 3. Criar backup inicial
    await this.createBackup()
    
    // 4. Otimizar performance
    await this.optimizePerformance()
    
    // 5. Obter estatísticas finais
    await this.getPerformanceStats()
    
    // 6. Listar backups
    await this.listBackups()
    
    // Gerar relatório final
    await this.generateReport()
    
    console.log('\n🎉 Setup completo finalizado!')
    console.log(`📊 Resumo: ${this.results.summary.success}/${this.results.summary.total} etapas bem-sucedidas`)
    
    if (this.results.errors.length > 0) {
      console.log(`❌ ${this.results.errors.length} erros encontrados`)
    }
    
    if (this.results.warnings.length > 0) {
      console.log(`⚠️ ${this.results.warnings.length} avisos`)
    }
    
    return this.results
  }

  async generateReport() {
    try {
      const reportPath = path.join(__dirname, 'setup-report.json')
      fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2))
      
      await this.log('Geração de relatório', 'success', `Relatório salvo em: ${reportPath}`)
    } catch (error) {
      await this.log('Geração de relatório', 'error', `Erro ao gerar relatório: ${error.message}`)
    }
  }

  async runQuickFix() {
    console.log('🔧 Executando correção rápida...\n')
    
    // Apenas correções essenciais
    await this.checkServerHealth()
    await this.fixCommonIssues()
    
    console.log('\n✅ Correção rápida finalizada!')
    return this.results
  }
}

// Função principal
async function main() {
  const setup = new SystemSetup()
  
  const args = process.argv.slice(2)
  const command = args[0] || 'full'
  
  try {
    switch (command) {
      case 'full':
        await setup.runFullSetup()
        break
      case 'quick':
        await setup.runQuickFix()
        break
      case 'backup':
        await setup.createBackup()
        break
      case 'optimize':
        await setup.optimizePerformance()
        break
      case 'stats':
        await setup.getPerformanceStats()
        break
      default:
        console.log('Uso: node setup-system.js [full|quick|backup|optimize|stats]')
        console.log('  full     - Setup completo (padrão)')
        console.log('  quick    - Correção rápida')
        console.log('  backup   - Apenas criar backup')
        console.log('  optimize - Apenas otimizar performance')
        console.log('  stats    - Apenas obter estatísticas')
    }
  } catch (error) {
    console.error('❌ Erro fatal:', error.message)
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default SystemSetup
