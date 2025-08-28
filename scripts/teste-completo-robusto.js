#!/usr/bin/env node

/**
 * SCRIPT DE TESTE COMPLETO E ROBUSTO DO SISTEMA SISPAT
 * 
 * Este script:
 * 1. Verifica se o sistema está funcionando
 * 2. Cria dados necessários (município, setores, locais)
 * 3. Testa todas as funcionalidades
 * 4. Permite acompanhamento no navegador
 */

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🧪 INICIANDO TESTE COMPLETO E ROBUSTO DO SISTEMA SISPAT')
console.log('=' * 60)

// Configurações
const CONFIG = {
  BASE_URL: 'http://localhost:3001',
  FRONTEND_URL: 'http://localhost:8080',
  LOG_FILE: path.join(__dirname, '../logs/teste-robusto.log'),
  REPORT_FILE: path.join(__dirname, '../docs1/RELATORIO_TESTE_ROBUSTO.md'),
  TEST_USER: {
    email: 'junielsonfarias@gmail.com',
    password: 'Tiko6273@'
  }
}

// Função para fazer requisições
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      timeout: 30000,
      ...options
    })
    
    const data = await response.json().catch(() => null)
    
    return {
      success: response.ok,
      status: response.status,
      data,
      headers: response.headers
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Verificar se o backend está funcionando
async function testarBackend() {
  console.log('🔧 Testando backend...')
  
  const result = await makeRequest(`${CONFIG.BASE_URL}/api/health`)
  
  if (result.success) {
    console.log('✅ Backend funcionando:', result.data)
    return true
  } else {
    console.log('❌ Backend com problema:', result.error)
    return false
  }
}

// Verificar se o frontend está funcionando
async function testarFrontend() {
  console.log('🌐 Testando frontend...')
  
  const result = await makeRequest(`${CONFIG.FRONTEND_URL}`)
  
  if (result.success) {
    console.log('✅ Frontend funcionando')
    return true
  } else {
    console.log('❌ Frontend com problema:', result.error)
    return false
  }
}

// Fazer login
async function fazerLogin() {
  console.log('🔐 Fazendo login...')
  
  const loginData = {
    email: CONFIG.TEST_USER.email,
    password: CONFIG.TEST_USER.password
  }
  
  const result = await makeRequest(`${CONFIG.BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(loginData)
  })
  
  if (result.success && result.data?.token) {
    console.log('✅ Login realizado com sucesso!')
    console.log('👤 Usuário:', result.data.user.name)
    console.log('🏛️ Município:', result.data.user.municipality_name || 'Não definido')
    return result.data.token
  } else {
    console.log('❌ Falha no login:', result.data?.error || result.error)
    return null
  }
}

// Verificar e criar município se necessário
async function verificarMunicipio(token) {
  console.log('🏛️ Verificando município...')
  
  // Primeiro, verificar se o usuário tem municipality_id
  const userResult = await makeRequest(`${CONFIG.BASE_URL}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (userResult.success && userResult.data?.municipality_id) {
    console.log('✅ Usuário já tem município:', userResult.data.municipality_name)
    return userResult.data.municipality_id
  }
  
  console.log('⚠️ Usuário não tem município, criando...')
  
  // Criar município de teste com CNPJ único
  const timestamp = Date.now()
  const municipioData = {
    name: `Município de Teste ${timestamp}`,
    state: 'PA',
    fullAddress: 'Rua Teste, 123 - Centro',
    cnpj: `12.345.678/0001-${String(timestamp).slice(-2)}`,
    contactEmail: `teste${timestamp}@municipio.com`,
    mayorName: 'Prefeito Teste',
    mayorCpf: '123.456.789-00'
  }
  
  const result = await makeRequest(`${CONFIG.BASE_URL}/api/municipalities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(municipioData)
  })
  
  if (result.success && result.data?.id) {
    console.log('✅ Município criado:', result.data.name)
    
    // Atualizar usuário com municipality_id
    console.log('🔄 Atualizando usuário com municipality_id...')
    const updateResult = await makeRequest(`${CONFIG.BASE_URL}/api/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        municipality_id: result.data.id
      })
    })
    
    if (updateResult.success) {
      console.log('✅ Usuário atualizado com municipality_id')
    } else {
      console.log('⚠️ Não foi possível atualizar usuário:', updateResult.data?.error || updateResult.error)
    }
    
    return result.data.id
  } else {
    console.log('❌ Falha ao criar município:', result.data?.error || result.error)
    return null
  }
}

// Verificar e criar setores se necessário
async function verificarSetores(token, municipalityId) {
  console.log('🏢 Verificando setores...')
  
  const result = await makeRequest(`${CONFIG.BASE_URL}/api/sectors?municipalityId=${municipalityId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (result.success && result.data?.items && result.data.items.length > 0) {
    console.log('✅ Setores já existem:', result.data.items.length)
    return result.data.items[0].id
  }
  
  console.log('⚠️ Nenhum setor encontrado, criando...')
  
  const setorData = {
    name: 'Secretaria de Administração',
    description: 'Setor responsável pela administração geral',
    municipalityId: municipalityId
  }
  
  const createResult = await makeRequest(`${CONFIG.BASE_URL}/api/sectors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(setorData)
  })
  
  if (createResult.success && createResult.data?.id) {
    console.log('✅ Setor criado:', createResult.data.name)
    return createResult.data.id
  } else {
    console.log('❌ Falha ao criar setor:', createResult.data?.error || createResult.error)
    return null
  }
}

// Verificar e criar locais se necessário
async function verificarLocais(token, municipalityId, sectorId) {
  console.log('📍 Verificando locais...')
  
  const result = await makeRequest(`${CONFIG.BASE_URL}/api/locals?municipalityId=${municipalityId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (result.success && result.data?.items && result.data.items.length > 0) {
    console.log('✅ Locais já existem:', result.data.items.length)
    return result.data.items[0].id
  }
  
  console.log('⚠️ Nenhum local encontrado, criando...')
  
  const localData = {
    name: 'Sala 1',
    description: 'Sala de reuniões principal',
    municipalityId: municipalityId,
    sectorId: sectorId
  }
  
  const createResult = await makeRequest(`${CONFIG.BASE_URL}/api/locals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(localData)
  })
  
  if (createResult.success && createResult.data?.id) {
    console.log('✅ Local criado:', createResult.data.name)
    return createResult.data.id
  } else {
    console.log('❌ Falha ao criar local:', createResult.data?.error || createResult.error)
    return null
  }
}

// Testar criação de bem
async function testarCriacaoBem(token, municipalityId, sectorId, localId) {
  console.log('🏗️ Testando criação de bem...')
  
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
    valor_residual: 250.00,
    municipalityId: municipalityId
  }
  
  const result = await makeRequest(`${CONFIG.BASE_URL}/api/patrimonios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(dadosBem)
  })
  
  if (result.success && result.data?.id) {
    console.log('✅ Bem criado com sucesso!')
    console.log('🆔 ID:', result.data.id)
    console.log('📝 Número:', result.data.numero_patrimonio)
    return result.data.id
  } else {
    console.log('❌ Falha ao criar bem:', result.data?.error || result.error)
    return null
  }
}

// Testar edição de bem
async function testarEdicaoBem(token, bemId) {
  console.log('✏️ Testando edição de bem...')
  
  const dadosEditados = {
    descricao_bem: 'Bem de teste - EDITADO',
    valor_aquisicao: 2600.00,
    status: 'manutencao'
  }
  
  const result = await makeRequest(`${CONFIG.BASE_URL}/api/patrimonios/${bemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(dadosEditados)
  })
  
  if (result.success && result.data?.id) {
    console.log('✅ Bem editado com sucesso!')
    console.log('📝 Nova descrição:', result.data.descricao_bem)
    console.log('💰 Novo valor:', result.data.valor_aquisicao)
    return true
  } else {
    console.log('❌ Falha ao editar bem:', result.data?.error || result.error)
    return false
  }
}

// Testar exclusão de bem
async function testarExclusaoBem(token, bemId) {
  console.log('🗑️ Testando exclusão de bem...')
  
  const result = await makeRequest(`${CONFIG.BASE_URL}/api/patrimonios/${bemId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (result.success) {
    console.log('✅ Bem excluído com sucesso!')
    return true
  } else {
    console.log('❌ Falha ao excluir bem:', result.data?.error || result.error)
    return false
  }
}

// Testar listagem de bens
async function testarListagemBens(token) {
  console.log('📋 Testando listagem de bens...')
  
  const result = await makeRequest(`${CONFIG.BASE_URL}/api/patrimonios`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (result.success && result.data?.items) {
    console.log('✅ Listagem funcionando!')
    console.log('📊 Total de bens:', result.data.total)
    console.log('📄 Página atual:', result.data.page)
    return true
  } else {
    console.log('❌ Falha na listagem:', result.data?.error || result.error)
    return false
  }
}

// Função principal
async function main() {
  console.log('🚀 INICIANDO TESTE COMPLETO E ROBUSTO DO SISTEMA SISPAT')
  console.log('=' * 60)
  console.log('🌐 Para acompanhar no navegador, abra:', CONFIG.FRONTEND_URL)
  console.log('=' * 60)
  
  const stats = {
    inicio: Date.now(),
    backend: false,
    frontend: false,
    login: false,
    municipio: false,
    setores: false,
    locais: false,
    criacao: false,
    edicao: false,
    exclusao: false,
    listagem: false
  }
  
  try {
    // 1. Testar backend
    stats.backend = await testarBackend()
    if (!stats.backend) {
      console.log('❌ Teste interrompido: backend não está funcionando')
      return
    }
    
    // 2. Testar frontend
    stats.frontend = await testarFrontend()
    if (!stats.frontend) {
      console.log('⚠️ Frontend não está funcionando, mas continuando com testes da API')
    }
    
    // 3. Fazer login
    const token = await fazerLogin()
    if (!token) {
      console.log('❌ Teste interrompido: falha no login')
      return
    }
    stats.login = true
    
    // 4. Verificar/criar município
    const municipalityId = await verificarMunicipio(token)
    if (!municipalityId) {
      console.log('❌ Teste interrompido: não foi possível obter/criar município')
      return
    }
    stats.municipio = true
    
    // 5. Verificar/criar setores
    const sectorId = await verificarSetores(token, municipalityId)
    if (!sectorId) {
      console.log('⚠️ Não foi possível obter/criar setor, continuando...')
    } else {
      stats.setores = true
    }
    
      // 6. Verificar/criar locais
  const localId = await verificarLocais(token, municipalityId, sectorId)
  if (!localId) {
    console.log('⚠️ Não foi possível obter/criar local, continuando...')
  } else {
    stats.locais = true
  }
    
    // 7. Testar listagem de bens
    stats.listagem = await testarListagemBens(token)
    
    // 8. Testar criação de bem
    const bemId = await testarCriacaoBem(token, municipalityId, sectorId, localId)
    if (!bemId) {
      console.log('❌ Teste interrompido: falha na criação de bem')
      return
    }
    stats.criacao = true
    
    // Aguardar um pouco para visualizar no navegador
    console.log('⏳ Aguardando 3 segundos para visualizar no navegador...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 9. Testar edição de bem
    stats.edicao = await testarEdicaoBem(token, bemId)
    
    // Aguardar um pouco para visualizar no navegador
    console.log('⏳ Aguardando 3 segundos para visualizar no navegador...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 10. Testar exclusão de bem
    stats.exclusao = await testarExclusaoBem(token, bemId)
    
    // 11. Gerar relatório final
    const fim = Date.now()
    const duracao = fim - stats.inicio
    
    console.log('=' * 60)
    console.log('🎉 TESTE COMPLETO FINALIZADO!')
    console.log('⏱️ Duração total:', duracao, 'ms')
    console.log('📊 Resultados:')
    console.log('  ✅ Backend:', stats.backend ? 'OK' : 'FALHA')
    console.log('  ✅ Frontend:', stats.frontend ? 'OK' : 'FALHA')
    console.log('  ✅ Login:', stats.login ? 'OK' : 'FALHA')
    console.log('  ✅ Município:', stats.municipio ? 'OK' : 'FALHA')
    console.log('  ✅ Setores:', stats.setores ? 'OK' : 'FALHA')
    console.log('  ✅ Locais:', stats.locais ? 'OK' : 'FALHA')
    console.log('  ✅ Listagem:', stats.listagem ? 'OK' : 'FALHA')
    console.log('  ✅ Criação:', stats.criacao ? 'OK' : 'FALHA')
    console.log('  ✅ Edição:', stats.edicao ? 'OK' : 'FALHA')
    console.log('  ✅ Exclusão:', stats.exclusao ? 'OK' : 'FALHA')
    console.log('=' * 60)
    console.log('🌐 Para acompanhar no navegador, abra:', CONFIG.FRONTEND_URL)
    console.log('📊 Para ver logs detalhados, execute: pnpm run test:completo')
    
  } catch (error) {
    console.log('❌ Erro durante o teste:', error.message)
    console.log(error.stack)
  }
}

// Executar
main().catch(console.error)
