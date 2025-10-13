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
  sectorId: string
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
  
  // Filtrar por setor (client-side, mas dados vêm cacheados)
  const getLocaisBySectorId = (sectorId: string) => {
    return locais.filter((l) => l.sectorId === sectorId)
  }
  
  // Funções com mesma interface do context
  const addLocal = async (name: string, sectorId: string) => {
    try {
      await createMutation.mutateAsync({
        name,
        sectorId,
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
  
  const updateLocal = async (id: string, name: string, sectorId: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: { name, sectorId },
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
    getLocaisBySectorId,
    addLocal,
    updateLocal,
    deleteLocal,
    refetch,
  }
}

