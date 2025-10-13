/**
 * Hook wrapper para TiposBens usando React Query
 * Substitui TiposBensContext mantendo mesma interface
 * v2.1.0 - Migration para React Query
 */

import { useTiposBens, useCreateTipoBem, useUpdateTipoBem, useDeleteTipoBem } from './queries/use-tipos-bens'
import { useActivityLog } from '@/contexts/ActivityLogContext'
import { toast } from './use-toast'

export interface TipoBem {
  id: string
  nome: string
  descricao?: string
  codigo?: string
  vidaUtilPadrao?: number
  taxaDepreciacao?: number
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Hook que substitui useTiposBens() do context
 * Agora usa React Query para melhor performance
 */
export function useTiposBensQuery() {
  const { logActivity } = useActivityLog()
  
  // Queries
  const { data: tiposBens = [], isLoading, refetch } = useTiposBens()
  
  // Mutations
  const createMutation = useCreateTipoBem()
  const updateMutation = useUpdateTipoBem()
  const deleteMutation = useDeleteTipoBem()
  
  // Filtrar apenas ativos
  const activeTiposBens = tiposBens.filter((tipo) => tipo.ativo)
  
  // Funções com mesma interface do context
  const addTipoBem = async (nome: string, descricao?: string, codigo?: string, vidaUtilPadrao?: number, taxaDepreciacao?: number) => {
    try {
      const novoTipo = await createMutation.mutateAsync({
        nome,
        descricao,
        codigo,
        vidaUtilPadrao,
        taxaDepreciacao,
        ativo: true,
      })
      
      logActivity('TIPO_BEM_CREATE', {
        details: `Tipo de bem criado: ${nome}`,
        entityId: novoTipo.id,
      })
      
      toast({ description: 'Tipo de bem criado com sucesso.' })
      return novoTipo
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível criar o tipo de bem.',
      })
      throw error
    }
  }
  
  const updateTipoBem = async (
    id: string,
    nome: string,
    descricao?: string,
    codigo?: string,
    vidaUtilPadrao?: number,
    taxaDepreciacao?: number
  ) => {
    try {
      const tipoAtualizado = await updateMutation.mutateAsync({
        id,
        data: { nome, descricao, codigo, vidaUtilPadrao, taxaDepreciacao },
      })
      
      logActivity('TIPO_BEM_UPDATE', {
        details: `Tipo de bem atualizado: ${nome}`,
        entityId: id,
      })
      
      toast({ description: 'Tipo de bem atualizado com sucesso.' })
      return tipoAtualizado
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o tipo de bem.',
      })
      throw error
    }
  }
  
  const deleteTipoBem = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      
      logActivity('TIPO_BEM_DELETE', {
        details: `Tipo de bem deletado: ${id}`,
        entityId: id,
      })
      
      toast({ description: 'Tipo de bem deletado com sucesso.' })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível deletar o tipo de bem.',
      })
      throw error
    }
  }
  
  const toggleTipoBemStatus = async (id: string, currentStatus: boolean): Promise<boolean> => {
    try {
      const novoStatus = !currentStatus
      await updateMutation.mutateAsync({
        id,
        data: { ativo: novoStatus },
      })
      
      logActivity('TIPO_BEM_TOGGLE', {
        details: `Tipo de bem ${novoStatus ? 'ativado' : 'desativado'}: ${id}`,
        entityId: id,
      })
      
      toast({ 
        description: `Tipo de bem ${novoStatus ? 'ativado' : 'desativado'} com sucesso.` 
      })
      
      return novoStatus
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
      })
      return currentStatus
    }
  }
  
  return {
    tiposBens,
    activeTiposBens,
    isLoading,
    addTipoBem,
    updateTipoBem,
    deleteTipoBem,
    toggleTipoBemStatus,
    refetch,
  }
}

