import axios from 'axios'
import { generateId } from '@/lib/utils'

// ✅ Usar URL do backend configurada ou fallback para localhost
const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'

// ✅ Função auxiliar para pegar o token
const getAuthToken = () => {
  const token = localStorage.getItem('sispat_token')
  if (token) {
    return JSON.parse(token)
  }
  return null
}

export const uploadFile = async (
  file: File,
  assetId: string,
  userId: string,
) => {
  try {
    // ✅ Logs apenas em desenvolvimento
    if (import.meta.env.DEV) {
      console.log('📤 [V3] Iniciando upload para:', `${BACKEND_URL}/api/upload/single`)
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('assetId', assetId)
    formData.append('userId', userId)

    const token = getAuthToken()
    
    // ✅ Usar axios direto sem instância customizada
    const response = await axios.post(
      `${BACKEND_URL}/api/upload/single`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        timeout: 60000,
      }
    )

    if (import.meta.env.DEV) {
      console.log('📦 [V3] Resposta:', response.data)
    }

    if (!response.data || !response.data.file_url) {
      if (import.meta.env.DEV) {
        console.error('❌ Backend retornou dados inválidos:', response.data)
      }
      throw new Error('Backend não retornou file_url')
    }

    if (import.meta.env.DEV) {
      console.log('✅ [V3] Upload concluído!')
    }
    
    // Retornar os metadados do arquivo
    return response.data
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('❌ [V3] Erro no upload:', error.response?.status, error.message)
    }
    throw new Error('Falha ao fazer upload do arquivo')
  }
}

export const uploadMultipleFiles = async (
  files: File[],
  assetId: string,
  userId: string,
) => {
  try {
    // ✅ Logs apenas em desenvolvimento
    if (import.meta.env.DEV) {
      console.log(`📤 [V3] Iniciando upload de ${files.length} arquivos`)
    }

    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })
    formData.append('assetId', assetId)
    formData.append('userId', userId)

    const token = getAuthToken()

    const response = await axios.post(
      `${BACKEND_URL}/api/upload/multiple`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        timeout: 60000,
      }
    )

    const filesMetadata = response.data.files || response.data

    if (import.meta.env.DEV) {
      console.log(`✅ [V3] ${filesMetadata.length} arquivo(s) enviado(s)`)
    }

    return filesMetadata
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ [V3] Erro no upload múltiplo:', error)
    }
    throw new Error('Falha ao fazer upload dos arquivos')
  }
}

export const getFilesForAsset = async (assetId: string) => {
  return []
}

export const deleteFile = async (fileId: string, fileUrl: string) => {
  try {
    // ✅ Logs apenas em desenvolvimento
    if (import.meta.env.DEV) {
      console.log('🗑️ [V3] Solicitação para deletar:', { fileId, fileUrl })
    }

    // ✅ Ignorar URLs blob
    if (fileUrl.startsWith('blob:')) {
      if (import.meta.env.DEV) {
        console.log('⚠️ [V3] URL blob - ignorando')
      }
      return
    }

    // ✅ CORREÇÃO: Extrair apenas o nome do arquivo (sem /uploads/)
    let filename = fileUrl
    // Remover protocolo e domínio se existir
    if (filename.includes('://')) {
      filename = filename.split('://')[1].split('/').slice(1).join('/')
    }
    // Remover /uploads/ ou /api/uploads/ do início
    filename = filename.replace(/^\/?(api\/)?uploads\//, '')
    // Pegar apenas o nome do arquivo (última parte)
    filename = filename.split('/').pop() || filename
    
    if (!filename || filename.trim() === '') {
      if (import.meta.env.DEV) {
        console.warn('⚠️ [V3] Nome do arquivo inválido:', fileUrl)
      }
      return
    }

    const token = getAuthToken()

    if (import.meta.env.DEV) {
      console.log('🗑️ [V3] Deletando arquivo:', { filename, url: `${BACKEND_URL}/api/upload/${filename}` })
    }

    await axios.delete(
      `${BACKEND_URL}/api/upload/${filename}`,
      {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      }
    )

    if (import.meta.env.DEV) {
      console.log('✅ [V3] Arquivo deletado com sucesso')
    }
  } catch (error: any) {
    // ✅ Ignorar 404 (arquivo já não existe) e 405 (método não permitido - pode ser que arquivo já foi deletado)
    if (error?.response?.status === 404 || error?.response?.status === 405) {
      if (import.meta.env.DEV) {
        console.log(`⚠️ [V3] Arquivo não existe ou método não permitido (${error?.response?.status}) - OK`)
      }
      return
    }
    
    if (import.meta.env.DEV) {
      console.error('❌ [V3] Erro ao deletar:', error?.response?.status, error?.message)
      console.warn('⚠️ [V3] Continuando...')
    }
    // Não lançar erro para não quebrar o fluxo
  }
}
