#!/usr/bin/env node

/**
 * SCRIPT DE TESTE SIMPLES DO SISTEMA SISPAT
 */

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🧪 INICIANDO TESTE SIMPLES DO SISTEMA SISPAT')
console.log('=' * 60)

// Verificar se o backend está funcionando
async function testarBackend() {
  console.log('🔧 Testando backend...')
  
  try {
    const response = await fetch('http://localhost:3001/api/health')
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Backend funcionando:', data)
      return true
    } else {
      console.log('❌ Backend com problema:', data)
      return false
    }
  } catch (error) {
    console.log('❌ Erro ao conectar com backend:', error.message)
    return false
  }
}

// Verificar se o frontend está funcionando
async function testarFrontend() {
  console.log('🌐 Testando frontend...')
  
  try {
    const response = await fetch('http://localhost:8080')
    
    if (response.ok) {
      console.log('✅ Frontend funcionando')
      return true
    } else {
      console.log('❌ Frontend com problema:', response.status)
      return false
    }
  } catch (error) {
    console.log('❌ Erro ao conectar com frontend:', error.message)
    return false
  }
}

// Testar login
async function testarLogin() {
  console.log('🔐 Testando login...')
  
  try {
    const loginData = {
      email: 'junielsonfarias@gmail.com',
      password: 'Tiko6273@'
    }
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    })
    
    const data = await response.json()
    
    if (response.ok && data.token) {
      console.log('✅ Login realizado com sucesso!')
      console.log('👤 Usuário:', data.user.name)
      console.log('🏛️ Município:', data.user.municipality_name)
      return data.token
    } else {
      console.log('❌ Falha no login:', data.error || 'Erro desconhecido')
      return null
    }
  } catch (error) {
    console.log('❌ Erro no login:', error.message)
    return null
  }
}

// Testar criação de um bem
async function testarCriacaoBem(token) {
  console.log('🏗️ Testando criação de bem...')
  
  try {
    const dadosBem = {
      numero_patrimonio: 'TESTE001',
      descricao_bem: 'Bem de teste - Equipamento de Informática',
      tipo: 'Equipamento de Informática',
      marca: 'Dell',
      modelo: 'Modelo A 1',
      cor: 'Preto',
      numero_serie: 'SN000001',
      data_aquisicao: '2024-01-01',
      valor_aquisicao: 2500.00,
      quantidade: 1,
      numero_nota_fiscal: 'NF000001',
      forma_aquisicao: 'Compra Direta',
      setor_responsavel: 'Secretaria de Administração',
      local_objeto: 'Sala 1',
      situacao_bem: 'BOM',
      status: 'ativo',
      fotos: [],
      documentos: [],
      metodo_depreciacao: 'Linear',
      vida_util_anos: 5,
      valor_residual: 250.00
    }
    
    const response = await fetch('http://localhost:3001/api/patrimonios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dadosBem)
    })
    
    const data = await response.json()
    
    if (response.ok && data.id) {
      console.log('✅ Bem criado com sucesso!')
      console.log('🆔 ID:', data.id)
      console.log('📝 Número:', data.numero_patrimonio)
      return data.id
    } else {
      console.log('❌ Falha ao criar bem:', data.error || 'Erro desconhecido')
      return null
    }
  } catch (error) {
    console.log('❌ Erro ao criar bem:', error.message)
    return null
  }
}

// Testar edição de um bem
async function testarEdicaoBem(token, bemId) {
  console.log('✏️ Testando edição de bem...')
  
  try {
    const dadosEditados = {
      descricao: 'Bem de teste - EDITADO',
      valor_aquisicao: 2600.00,
      status: 'manutencao'
    }
    
    const response = await fetch(`http://localhost:3001/api/patrimonios/${bemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dadosEditados)
    })
    
    const data = await response.json()
    
    if (response.ok && data.id) {
      console.log('✅ Bem editado com sucesso!')
      console.log('📝 Nova descrição:', data.descricao)
      console.log('💰 Novo valor:', data.valor_aquisicao)
      return true
    } else {
      console.log('❌ Falha ao editar bem:', data.error || 'Erro desconhecido')
      return false
    }
  } catch (error) {
    console.log('❌ Erro ao editar bem:', error.message)
    return false
  }
}

// Testar exclusão de um bem
async function testarExclusaoBem(token, bemId) {
  console.log('🗑️ Testando exclusão de bem...')
  
  try {
    const response = await fetch(`http://localhost:3001/api/patrimonios/${bemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (response.ok) {
      console.log('✅ Bem excluído com sucesso!')
      return true
    } else {
      const data = await response.json()
      console.log('❌ Falha ao excluir bem:', data.error || 'Erro desconhecido')
      return false
    }
  } catch (error) {
    console.log('❌ Erro ao excluir bem:', error.message)
    return false
  }
}

// Função principal
async function main() {
  console.log('🚀 INICIANDO TESTE SIMPLES DO SISTEMA SISPAT')
  console.log('=' * 60)
  
  // 1. Testar backend
  const backendOk = await testarBackend()
  if (!backendOk) {
    console.log('❌ Teste interrompido: backend não está funcionando')
    return
  }
  
  // 2. Testar frontend
  const frontendOk = await testarFrontend()
  if (!frontendOk) {
    console.log('⚠️ Frontend não está funcionando, mas continuando com testes da API')
  }
  
  // 3. Testar login
  const token = await testarLogin()
  if (!token) {
    console.log('❌ Teste interrompido: falha no login')
    return
  }
  
  // 4. Testar criação de bem
  const bemId = await testarCriacaoBem(token)
  if (!bemId) {
    console.log('❌ Teste interrompido: falha na criação de bem')
    return
  }
  
  // 5. Testar edição de bem
  const edicaoOk = await testarEdicaoBem(token, bemId)
  if (!edicaoOk) {
    console.log('⚠️ Falha na edição, mas continuando com exclusão')
  }
  
  // 6. Testar exclusão de bem
  const exclusaoOk = await testarExclusaoBem(token, bemId)
  if (!exclusaoOk) {
    console.log('⚠️ Falha na exclusão')
  }
  
  console.log('=' * 60)
  console.log('🎉 TESTE SIMPLES FINALIZADO!')
  console.log('🌐 Para acompanhar no navegador, abra: http://localhost:8080')
  console.log('📊 Para ver logs detalhados, execute: pnpm run test:completo')
}

// Executar
main().catch(console.error)
