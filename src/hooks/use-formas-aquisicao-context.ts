/**
 * Hook wrapper para FormasAquisicao usando React Query
 * Substitui AcquisitionFormContext mantendo mesma interface
 * v2.1.0 - Migration para React Query
 */

import { useAcquisitionForms, useCreateAcquisitionForm, useUpdateAcquisitionForm, useDeleteAcquisitionForm } from './queries/use-formas-aquisicao'
import { useActivityLog } from '@/contexts/ActivityLogContext'
import { toast } from './use-toast'

export interface AcquisitionForm {
  id: string
  nome: string
  descricao?: string
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Hook que substitui useAcquisitionForm() do context
 * Agora usa React Query para melhor performance
 */
export function useFormasAquisicaoQuery() {
  const { logActivity } = useActivityLog()
  
  // Queries
  const { data: acquisitionForms = [], isLoading, refetch } = useAcquisitionForms()
  
  // Mutations
  const createMutation = useCreateAcquisitionForm()
  const updateMutation = useUpdateAcquisitionForm()
  const deleteMutation = useDeleteAcquisitionForm()
  
  // Filtrar apenas ativos
  const activeAcquisitionForms = acquisitionForms.filter((form) => form.ativo)
  
  // Funções com mesma interface do context
  const addAcquisitionForm = async (nome: string, descricao?: string) => {
    try {
      const novaForma = await createMutation.mutateAsync({
        nome,
        descricao,
        ativo: true,
      })
      
      logActivity('FORMA_AQUISICAO_CREATE', {
        details: `Forma de aquisição criada: ${nome}`,
        entityId: novaForma.id,
      })
      
      toast({ description: 'Forma de aquisição criada com sucesso.' })
      return novaForma
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível criar a forma de aquisição.',
      })
      throw error
    }
  }
  
  const updateAcquisitionForm = async (id: string, nome: string, descricao?: string) => {
    try {
      const formaAtualizada = await updateMutation.mutateAsync({
        id,
        data: { nome, descricao },
      })
      
      logActivity('FORMA_AQUISICAO_UPDATE', {
        details: `Forma de aquisição atualizada: ${nome}`,
        entityId: id,
      })
      
      toast({ description: 'Forma de aquisição atualizada com sucesso.' })
      return formaAtualizada
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar a forma de aquisição.',
      })
      throw error
    }
  }
  
  const deleteAcquisitionForm = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      
      logActivity('FORMA_AQUISICAO_DELETE', {
        details: `Forma de aquisição deletada: ${id}`,
        entityId: id,
      })
      
      toast({ description: 'Forma de aquisição deletada com sucesso.' })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível deletar a forma de aquisição.',
      })
      throw error
    }
  }
  
  const toggleAcquisitionFormStatus = async (id: string, currentStatus: boolean): Promise<boolean> => {
    try {
      const novoStatus = !currentStatus
      await updateMutation.mutateAsync({
        id,
        data: { ativo: novoStatus },
      })
      
      logActivity('FORMA_AQUISICAO_TOGGLE', {
        details: `Forma de aquisição ${novoStatus ? 'ativada' : 'desativada'}: ${id}`,
        entityId: id,
      })
      
      toast({ 
        description: `Forma de aquisição ${novoStatus ? 'ativada' : 'desativada'} com sucesso.` 
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
    acquisitionForms,
    activeAcquisitionForms,
    isLoading,
    addAcquisitionForm,
    updateAcquisitionForm,
    deleteAcquisitionForm,
    toggleAcquisitionFormStatus,
    refetch,
  }
}

