#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const LOG_FILE = './docs1/DEV_LOG.md'
const TIMESTAMP = new Date().toISOString()

class DevLogger {
  constructor() {
    this.ensureLogFile()
  }

  ensureLogFile() {
    if (!fs.existsSync(LOG_FILE)) {
      const header = `# DEV LOG - SISPAT

## 📋 Histórico de Desenvolvimento

Este arquivo é atualizado automaticamente com todas as modificações e correções realizadas no sistema.

---

`
      fs.writeFileSync(LOG_FILE, header)
    }
  }

  logEntry(type, title, description, files = [], code = null) {
    const entry = `
## ${type} - ${title}

**Data:** ${new Date().toLocaleString('pt-BR')}  
**Timestamp:** ${TIMESTAMP}

### 📝 Descrição
${description}

### 📁 Arquivos Modificados
${files.map(file => `- \`${file}\``).join('\n')}

${code ? `### 💻 Código Relevante
\`\`\`${code.language || 'javascript'}
${code.content}
\`\`\`

` : ''}
### 🔍 Status
- [x] Modificação implementada
- [ ] Teste realizado
- [ ] Documentação atualizada

---

`
    
    // Ler o arquivo atual
    const currentContent = fs.readFileSync(LOG_FILE, 'utf8')
    
    // Inserir nova entrada após o header
    const headerEnd = currentContent.indexOf('\n---\n') + 5
    const newContent = currentContent.slice(0, headerEnd) + entry + currentContent.slice(headerEnd)
    
    fs.writeFileSync(LOG_FILE, newContent)
    
    console.log(`✅ Log entry added: ${type} - ${title}`)
  }

  logBugFix(title, description, files = [], code = null) {
    this.logEntry('🐛 BUG FIX', title, description, files, code)
  }

  logFeature(title, description, files = [], code = null) {
    this.logEntry('✨ FEATURE', title, description, files, code)
  }

  logRefactor(title, description, files = [], code = null) {
    this.logEntry('🔧 REFACTOR', title, description, files, code)
  }

  logPerformance(title, description, files = [], code = null) {
    this.logEntry('⚡ PERFORMANCE', title, description, files, code)
  }

  logSecurity(title, description, files = [], code = null) {
    this.logEntry('🔒 SECURITY', title, description, files, code)
  }

  // Método para detectar mudanças no git
  detectChanges() {
    try {
      const changes = execSync('git status --porcelain', { encoding: 'utf8' })
      return changes.split('\n').filter(line => line.trim())
    } catch (error) {
      console.log('Git não disponível ou não é um repositório')
      return []
    }
  }

  // Método para obter diff das mudanças
  getDiff() {
    try {
      const diff = execSync('git diff HEAD~1', { encoding: 'utf8' })
      return diff
    } catch (error) {
      return null
    }
  }
}

// Função para uso direto via linha de comando
function main() {
  const logger = new DevLogger()
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log(`
📝 DEV LOG - SISPAT

Uso:
  node scripts/dev-log.js <tipo> "<título>" "<descrição>" [arquivos...]

Tipos disponíveis:
  bug     - Correção de bug
  feature - Nova funcionalidade
  refactor - Refatoração
  perf    - Melhoria de performance
  security - Correção de segurança

Exemplos:
  node scripts/dev-log.js bug "Loop infinito nos setores" "Corrigido loop infinito no carregamento de setores nos formulários de usuário"
  node scripts/dev-log.js feature "Setores padrão automáticos" "Implementado sistema de criação automática de setores padrão municipais"
`)
    return
  }

  const [type, title, description, ...files] = args

  switch (type) {
    case 'bug':
      logger.logBugFix(title, description, files)
      break
    case 'feature':
      logger.logFeature(title, description, files)
      break
    case 'refactor':
      logger.logRefactor(title, description, files)
      break
    case 'perf':
      logger.logPerformance(title, description, files)
      break
    case 'security':
      logger.logSecurity(title, description, files)
      break
    default:
      console.log('❌ Tipo inválido. Use: bug, feature, refactor, perf, security')
  }
}

// Exportar para uso em outros scripts
export { DevLogger }

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
