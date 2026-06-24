/**
 * Hook wrapper para Locais usando React Query
 * Substitui LocalContext mantendo mesma interface
 * v2.1.0 - Migration para React Query
 */

import { useLocais, useCreateLocal, useUpdateLocal, useDeleteLocal } from './queries/use-locais'
import { toast } from './use-toast'

export interface Local {
  id: string
  name: string
  description?: string
  municipalityId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Hook que substitui useLocal() do context
 * Agora usa React Query para melhor performance
 */
export function useLocaisQuery() {
  // Queries
  const { data: locais = [], isLoading, refetch } = useLocais()

  // Mutations
  const createMutation = useCreateLocal()
  const updateMutation = useUpdateLocal()
  const deleteMutation = useDeleteLocal()

  // Filtrar por nome (campo sectorId não existe na query — filtro client-side por name)
  const getLocaisByName = (name: string) => {
    return locais.filter((l) => l.name.toLowerCase().includes(name.toLowerCase()))
  }

  // Funções com mesma interface do context
  const addLocal = async (name: string) => {
    try {
      await createMutation.mutateAsync({
        name,
        municipalityId: 'municipality-1', // Single municipality
      })

      toast({ description: 'Local criado com sucesso.' })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível criar o local.',
      })
      throw error
    }
  }

  const updateLocal = async (id: string, name: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        name,
      })

      toast({ description: 'Local atualizado com sucesso.' })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o local.',
      })
      throw error
    }
  }

  const deleteLocal = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)

      toast({ description: 'Local deletado com sucesso.' })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível deletar o local.',
      })
      throw error
    }
  }

  return {
    locais,
    isLoading,
    getLocaisByName,
    addLocal,
    updateLocal,
    deleteLocal,
    refetch,
  }
}
