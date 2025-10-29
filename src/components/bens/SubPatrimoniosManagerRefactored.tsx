import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { SubPatrimonio, SubPatrimonioStatus } from '@/types'
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

  // Carregar sub-patrimônios quando o componente monta
  useEffect(() => {
    if (isKit) {
      // TODO - Integrar com API real para carregar sub-patrimônios
      setSubPatrimonios([])
    }
  }, [patrimonioId, isKit])

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

  const handleSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (editingSubPatrimonio) {
        // Editar sub-patrimônio existente
        setSubPatrimonios(prev =>
          prev.map(sp =>
            sp.id === editingSubPatrimonio.id
              ? {
                  ...sp,
                  ...data,
                  updated_at: new Date(),
                }
              : sp
          )
        )
        toast({
          title: 'Sucesso!',
          description: 'Sub-patrimônio atualizado com sucesso.',
        })
      } else {
        // Criar novo sub-patrimônio (gerar número sequencial)
        const nextNumber = subPatrimonios.length + 1
        const numeroSubPatrimonio = `${patrimonioNumero}-${nextNumber.toString().padStart(3, '0')}`
        
        const newSubPatrimonio: SubPatrimonio = {
          id: Date.now().toString(),
          patrimonio_id: patrimonioId,
          numero_subpatrimonio: numeroSubPatrimonio,
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
        }
        setSubPatrimonios(prev => [...prev, newSubPatrimonio])
        toast({
          title: 'Sucesso!',
          description: 'Sub-patrimônio criado com sucesso.',
        })
      }
      handleCloseDialog()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao salvar sub-patrimônio.',
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
      setSubPatrimonios(prev => prev.filter(sp => sp.id !== id))
      toast({
        title: 'Sucesso!',
        description: 'Sub-patrimônio excluído com sucesso.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao excluir sub-patrimônio.',
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

    try {
      setSubPatrimonios(prev =>
        prev.map(sp =>
          selectedItems.includes(sp.id)
            ? { ...sp, status: newStatus, updated_at: new Date() }
            : sp
        )
      )
      setSelectedItems([])
      toast({
        title: 'Sucesso!',
        description: `${selectedItems.length} sub-patrimônios atualizados.`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao atualizar sub-patrimônios.',
      })
    }
  }

  const handleExport = () => {
    // Implementar exportação para Excel/CSV
    toast({
      title: 'Exportação',
      description: 'Funcionalidade de exportação será implementada em breve.',
    })
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
