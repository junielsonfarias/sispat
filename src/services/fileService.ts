import axios from 'axios'
import { generateId } from '@/lib/utils'

const BACKEND_URL = 'http://localhost:3000'

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
      console.log('🗑️ [V3] Solicitação para deletar:', fileUrl)
    }

    // ✅ Ignorar URLs blob
    if (fileUrl.startsWith('blob:')) {
      if (import.meta.env.DEV) {
        console.log('⚠️ [V3] URL blob - ignorando')
      }
      return
    }

    const filename = fileUrl.split('/').pop()
    
    if (!filename) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ [V3] Nome do arquivo inválido')
      }
      return
    }

    const token = getAuthToken()

    await axios.delete(
      `${BACKEND_URL}/api/upload/${filename}`,
      {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      }
    )

    if (import.meta.env.DEV) {
      console.log('✅ [V3] Arquivo deletado')
    }
  } catch (error: any) {
    if (error?.response?.status === 404) {
      if (import.meta.env.DEV) {
        console.log('⚠️ [V3] Arquivo não existe (404) - OK')
      }
      return
    }
    
    if (import.meta.env.DEV) {
      console.error('❌ [V3] Erro ao deletar:', error)
      console.warn('⚠️ [V3] Continuando...')
    }
  }
}
