import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/services/public-api'
import { Patrimonio } from '@/types'

/**
 * Chave de cache da listagem PÚBLICA de patrimônios.
 */
export const PUBLIC_PATRIMONIOS_KEY = ['public-patrimonios'] as const

/**
 * Busca a listagem pública de bens via GET /public/patrimonios (SEM autenticação).
 *
 * A consulta pública (`/consulta-publica`) é acessível a visitantes anônimos, então
 * NÃO pode usar `useAllPatrimonios()` (que bate em /patrimonios?all=true, autenticado).
 * O endpoint público devolve uma forma reduzida (camelCase, sem valor de aquisição);
 * aqui mapeamos para os campos snake_case que a página `PublicAssets` consome.
 */
export const usePublicPatrimonios = () =>
  useQuery({
    queryKey: PUBLIC_PATRIMONIOS_KEY,
    queryFn: async () => {
      const items = await publicApi.listPatrimonios()
      return items.map((p) => ({
        id: p.id,
        numero_patrimonio: p.numeroPatrimonio,
        descricao_bem: p.descricaoBem,
        tipo: p.tipo ?? '',
        marca: p.marca ?? '',
        modelo: p.modelo ?? '',
        status: p.status,
        setor_responsavel: p.setor ?? '',
        local_objeto: p.local ?? '',
      })) as unknown as Patrimonio[]
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
