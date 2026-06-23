import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { SubPatrimonio, SubPatrimonioStatus } from '@/types'
import { api } from '@/services/api-adapter'
import { logger } from '@/lib/logger'
import { downloadCsv } from '@/lib/sub-patrimonio-utils'
import { SubPatrimoniosHeader } from './SubPatrimoniosHeader'
import { SubPatrimoniosBulkActions } from './SubPatrimoniosBulkActions'
import { SubPatrimoniosTable } from './SubPatrimoniosTable'
import { SubPatrimonioForm } from './SubPatrimonioForm'

interface SubPatrimoniosManagerProps {
  patrimonioId: string
  patrimonioNumero: string
  isKit: boolean
  quantidadeUnidades?: number
}

export function SubPatrimoniosManagerRefactored({ 
  patrimonioId, 
  patrimonioNumero, 
  isKit, 
  quantidadeUnidades = 0 
}: SubPatrimoniosManagerProps) {
  const [subPatrimonios, setSubPatrimonios] = useState<SubPatrimonio[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubPatrimonio, setEditingSubPatrimonio] = useState<SubPatrimonio | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubPatrimonioStatus | 'all'>('all')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const endpoint = `/patrimonios/${patrimonioId}/sub-patrimonios`

  const fetchSubPatrimonios = useCallback(async () => {
    if (!isKit) return
    setIsLoading(true)
    try {
      const data = await api.get<SubPatrimonio[]>(endpoint)
      setSubPatrimonios(data ?? [])
    } catch (error) {
      logger.error('[SubPatrimonios] Erro ao carregar', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os sub-patrimônios.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, isKit])

  // Carregar sub-patrimônios quando o componente monta / muda o patrimônio
  useEffect(() => {
    void fetchSubPatrimonios()
  }, [fetchSubPatrimonios])

  const filteredSubPatrimonios = subPatrimonios.filter((subPatrimonio) => {
    const matchesSearch = subPatrimonio.numero_subpatrimonio
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      subPatrimonio.localizacao_especifica?.toLowerCase()
      .includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || subPatrimonio.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: SubPatrimonioStatus) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'baixado':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'manutencao':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleOpenDialog = (subPatrimonio?: SubPatrimonio) => {
    if (subPatrimonio) {
      setEditingSubPatrimonio(subPatrimonio)
    } else {
      setEditingSubPatrimonio(null)
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingSubPatrimonio(null)
  }

  const handleSubmit = async (data: {
    status: SubPatrimonioStatus
    localizacao_especifica?: string
    observacoes?: string
  }) => {
    setIsLoading(true)
    const payload = {
      status: data.status,
      localizacao_especifica: data.localizacao_especifica || null,
      observacoes: data.observacoes || null,
    }
    try {
      if (editingSubPatrimonio) {
        await api.put(`${endpoint}/${editingSubPatrimonio.id}`, payload)
        toast({ title: 'Sucesso!', description: 'Sub-patrimônio atualizado com sucesso.' })
      } else {
        // O número é gerado pelo backend a partir do número do bem pai.
        await api.post(endpoint, payload)
        toast({ title: 'Sucesso!', description: 'Sub-patrimônio criado com sucesso.' })
      }
      handleCloseDialog()
      await fetchSubPatrimonios()
    } catch (error) {
      logger.error('[SubPatrimonios] Erro ao salvar', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: (error as Error)?.message || 'Falha ao salvar sub-patrimônio.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este sub-patrimônio?')) {
      return
    }

    try {
      await api.delete(`${endpoint}/${id}`)
      setSubPatrimonios(prev => prev.filter(sp => sp.id !== id))
      setSelectedItems(prev => prev.filter(item => item !== id))
      toast({ title: 'Sucesso!', description: 'Sub-patrimônio excluído com sucesso.' })
    } catch (error) {
      logger.error('[SubPatrimonios] Erro ao excluir', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: (error as Error)?.message || 'Falha ao excluir sub-patrimônio.',
      })
    }
  }

  const handleSelectAll = () => {
    if (selectedItems.length === filteredSubPatrimonios.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredSubPatrimonios.map(sp => sp.id))
    }
  }

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const handleBulkStatusChange = async (newStatus: SubPatrimonioStatus) => {
    if (selectedItems.length === 0) return

    const count = selectedItems.length
    try {
      await api.post(`${endpoint}/bulk-status`, { ids: selectedItems, status: newStatus })
      setSelectedItems([])
      toast({ title: 'Sucesso!', description: `${count} sub-patrimônios atualizados.` })
      await fetchSubPatrimonios()
    } catch (error) {
      logger.error('[SubPatrimonios] Erro no bulk', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: (error as Error)?.message || 'Falha ao atualizar sub-patrimônios.',
      })
    }
  }

  const handleExport = () => {
    if (subPatrimonios.length === 0) {
      toast({ title: 'Nada para exportar', description: 'Não há sub-patrimônios na lista.' })
      return
    }
    downloadCsv(subPatrimonios, `sub-patrimonios-${patrimonioNumero}.csv`)
  }

  if (!isKit) {
    return null
  }

  return (
    <Card className="border-0 shadow-lg bg-white">
      <SubPatrimoniosHeader
        subPatrimoniosCount={subPatrimonios.length}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onOpenDialog={() => handleOpenDialog()}
      />
      
      <CardContent className="px-6 pb-6">
        <SubPatrimoniosBulkActions
          selectedCount={selectedItems.length}
          onBulkStatusChange={handleBulkStatusChange}
          onExport={handleExport}
        />
        
        <SubPatrimoniosTable
          subPatrimonios={filteredSubPatrimonios}
          selectedItems={selectedItems}
          onSelectAll={handleSelectAll}
          onSelectItem={handleSelectItem}
          onEdit={handleOpenDialog}
          onDelete={handleDelete}
          getStatusColor={getStatusColor}
        />
      </CardContent>

      <SubPatrimonioForm
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
        editingSubPatrimonio={editingSubPatrimonio}
        isLoading={isLoading}
      />
    </Card>
  )
}
