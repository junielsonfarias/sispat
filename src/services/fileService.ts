import axios from 'axios'
import { logger } from '@/lib/logger'

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
    logger.debug('[V3] Iniciando upload', { url: `${BACKEND_URL}/api/upload/single` })

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

    logger.debug('[V3] Resposta', { data: response.data })

    if (!response.data || !response.data.file_url) {
      if (import.meta.env.DEV) {
        console.error('❌ Backend retornou dados inválidos:', response.data)
      }
      throw new Error('Backend não retornou file_url')
    }

    logger.debug('[V3] Upload concluído!')
    
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
    logger.debug('[V3] Iniciando upload múltiplo', { count: files.length })

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

    logger.debug('[V3] Arquivos enviados', { count: filesMetadata.length })

    return filesMetadata
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ [V3] Erro no upload múltiplo:', error)
    }
    throw new Error('Falha ao fazer upload dos arquivos')
  }
}

export const getFilesForAsset = async (_assetId: string) => {
  return []
}

export const deleteFile = async (fileId: string, fileUrl: string) => {
  try {
    logger.debug('[V3] Solicitação para deletar', { fileId, fileUrl })

    // ✅ Ignorar URLs blob
    if (fileUrl.startsWith('blob:')) {
      logger.debug('[V3] URL blob - ignorando')
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

    logger.debug('[V3] Deletando arquivo', { filename, url: `${BACKEND_URL}/api/upload/${filename}` })

    await axios.delete(
      `${BACKEND_URL}/api/upload/${filename}`,
      {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      }
    )

    logger.debug('[V3] Arquivo deletado com sucesso')
  } catch (error: any) {
    // ✅ Ignorar 404 (arquivo já não existe) e 405 (método não permitido - pode ser que arquivo já foi deletado)
    if (error?.response?.status === 404 || error?.response?.status === 405) {
      logger.debug('[V3] Arquivo não existe ou método não permitido - OK', { status: error?.response?.status })
      return
    }
    
    if (import.meta.env.DEV) {
      console.error('❌ [V3] Erro ao deletar:', error?.response?.status, error?.message)
      console.warn('⚠️ [V3] Continuando...')
    }
    // Não lançar erro para não quebrar o fluxo
  }
}
