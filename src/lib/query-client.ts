import { QueryClient } from '@tanstack/react-query'

/**
 * Configuração global do React Query
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache configuração
      staleTime: 5 * 60 * 1000,        // Dados "fresh" por 5 minutos
      gcTime: 10 * 60 * 1000,          // Garbage collection após 10 minutos (antes cacheTime)
      
      // Retry configuração
      retry: 1,                         // Tentar 1x em caso de erro
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch configuração
      refetchOnWindowFocus: false,      // Não refetch ao focar janela
      refetchOnMount: false,            // Não refetch ao montar se tem cache
      refetchOnReconnect: true,         // Refetch ao reconectar internet
      
      // Network mode
      networkMode: 'online',            // Apenas online (pode mudar para 'offlineFirst')
    },
    mutations: {
      // Retry em mutations
      retry: 0,                         // Não retry em mutations (evitar duplicação)
      
      // Network mode
      networkMode: 'online',
    },
  },
})

/**
 * Funções helper para invalidação de cache
 */
export const invalidateQueries = {
  // Invalidar patrimonios
  patrimonios: () => queryClient.invalidateQueries({ queryKey: ['patrimonios'] }),
  patrimonio: (id: string) => queryClient.invalidateQueries({ queryKey: ['patrimonio', id] }),
  
  // Invalidar imoveis
  imoveis: () => queryClient.invalidateQueries({ queryKey: ['imoveis'] }),
  imovel: (id: string) => queryClient.invalidateQueries({ queryKey: ['imovel', id] }),
  
  // Invalidar setores
  sectors: () => queryClient.invalidateQueries({ queryKey: ['sectors'] }),
  
  // Invalidar locais
  locais: () => queryClient.invalidateQueries({ queryKey: ['locais'] }),
  
  // Invalidar tipos de bens
  tiposBens: () => queryClient.invalidateQueries({ queryKey: ['tiposBens'] }),
  
  // Invalidar formas de aquisição
  formasAquisicao: () => queryClient.invalidateQueries({ queryKey: ['formasAquisicao'] }),
  
  // Invalidar tudo relacionado a patrimônios
  allPatrimonioRelated: () => {
    queryClient.invalidateQueries({ queryKey: ['patrimonios'] })
    queryClient.invalidateQueries({ queryKey: ['sectors'] })
    queryClient.invalidateQueries({ queryKey: ['locais'] })
    queryClient.invalidateQueries({ queryKey: ['tiposBens'] })
  },
}

/**
 * Prefetch functions para otimização
 */
export const prefetchQueries = {
  patrimonios: async () => {
    await queryClient.prefetchQuery({
      queryKey: ['patrimonios'],
      queryFn: () => fetch('/api/patrimonios').then(r => r.json()),
    })
  },
}

