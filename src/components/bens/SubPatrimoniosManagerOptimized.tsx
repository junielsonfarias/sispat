import React, { useState, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Download, 
  CheckSquare, 
  Square,
  Filter,
  X
} from 'lucide-react'
import { Patrimonio } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { usePatrimonio } from '@/hooks/usePatrimonio'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api-adapter'

// Schema de validação
const subPatrimonioSchema = z.object({
  numero_patrimonio: z.string().min(1, 'Número do patrimônio é obrigatório'),
  descricao_bem: z.string().min(1, 'Descrição é obrigatória'),
  situacao_bem: z.string().min(1, 'Situação é obrigatória'),
  valor_aquisicao: z.number().min(0, 'Valor deve ser positivo'),
  observacoes: z.string().optional(),
})

type SubPatrimonioFormData = z.infer<typeof subPatrimonioSchema>

interface SubPatrimoniosManagerProps {
  patrimonio: Patrimonio
  onUpdate: (updatedPatrimonio: Patrimonio) => void
}

// Componente de filtros otimizado
const SubPatrimoniosFilters = React.memo(({ 
  searchTerm, 
  onSearchChange, 
  statusFilter, 
  onStatusFilterChange,
  onClearFilters 
}: {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  onClearFilters: () => void
}) => (
  <div className="flex flex-col sm:flex-row gap-4 mb-4">
    <div className="flex-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar sub-patrimônios..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
    <div className="w-full sm:w-48">
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger>
          <SelectValue placeholder="Filtrar por situação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as situações</SelectItem>
          <SelectItem value="ATIVO">Ativo</SelectItem>
          <SelectItem value="BAIXADO">Baixado</SelectItem>
          <SelectItem value="EM MANUTENÇÃO">Em Manutenção</SelectItem>
          <SelectItem value="TRANSFERIDO">Transferido</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <Button
      variant="outline"
      onClick={onClearFilters}
      className="w-full sm:w-auto"
    >
      <X className="h-4 w-4 mr-2" />
      Limpar
    </Button>
  </div>
))

// Componente de formulário otimizado
const SubPatrimonioForm = React.memo(({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingSubPatrimonio 
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: SubPatrimonioFormData) => void
  editingSubPatrimonio?: Patrimonio | null
}) => {
  const form = useForm<SubPatrimonioFormData>({
    resolver: zodResolver(subPatrimonioSchema),
    defaultValues: {
      numero_patrimonio: editingSubPatrimonio?.numero_patrimonio || '',
      descricao_bem: editingSubPatrimonio?.descricao_bem || '',
      situacao_bem: editingSubPatrimonio?.situacao_bem || 'ATIVO',
      valor_aquisicao: editingSubPatrimonio?.valor_aquisicao || 0,
      observacoes: editingSubPatrimonio?.observacoes || '',
    },
  })

  const handleSubmit = useCallback((data: SubPatrimonioFormData) => {
    onSubmit(data)
    form.reset()
    onClose()
  }, [onSubmit, form, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingSubPatrimonio ? 'Editar Sub-patrimônio' : 'Adicionar Sub-patrimônio'}
          </DialogTitle>
          <DialogDescription>
            {editingSubPatrimonio 
              ? 'Atualize as informações do sub-patrimônio.'
              : 'Adicione um novo sub-patrimônio vinculado ao patrimônio principal.'
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numero_patrimonio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Patrimônio</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 2025001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="situacao_bem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situação</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a situação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ATIVO">Ativo</SelectItem>
                        <SelectItem value="BAIXADO">Baixado</SelectItem>
                        <SelectItem value="EM MANUTENÇÃO">Em Manutenção</SelectItem>
                        <SelectItem value="TRANSFERIDO">Transferido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="descricao_bem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Bem</FormLabel>
                  <FormControl>
                    <Input placeholder="Descrição detalhada do bem" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valor_aquisicao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor de Aquisição</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações adicionais..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingSubPatrimonio ? 'Atualizar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
})

// Componente principal otimizado
const SubPatrimoniosManagerOptimized = ({ patrimonio, onUpdate }: SubPatrimoniosManagerProps) => {
  const { user } = useAuth()
  const { updatePatrimonio } = usePatrimonio()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSubPatrimonio, setEditingSubPatrimonio] = useState<Patrimonio | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Memoizar sub-patrimônios filtrados
  const filteredSubPatrimonios = useMemo(() => {
    if (!patrimonio.subPatrimonios) return []
    
    return patrimonio.subPatrimonios.filter((sub) => {
      const matchesSearch = searchTerm === '' || 
        sub.numero_patrimonio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.descricao_bem?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || sub.situacao_bem === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [patrimonio.subPatrimonios, searchTerm, statusFilter])

  // Função para adicionar/editar sub-patrimônio
  const handleSubmit = useCallback(async (data: SubPatrimonioFormData) => {
    if (!user) return

    setIsLoading(true)
    try {
      const subPatrimonioData = {
        ...data,
        patrimonio_principal_id: patrimonio.id,
        setor_responsavel: patrimonio.setor_responsavel || patrimonio.setorResponsavel,
        local_objeto: patrimonio.local_objeto || patrimonio.localObjeto,
        data_aquisicao: new Date().toISOString(),
        created_by: user.id,
      }

      if (editingSubPatrimonio) {
        // Atualizar sub-patrimônio existente
        const response = await api.put(`/patrimonios/${editingSubPatrimonio.id}`, subPatrimonioData)
        const updatedPatrimonio = response.patrimonio
        
        const updatedSubPatrimonios = patrimonio.subPatrimonios?.map(sub => 
          sub.id === editingSubPatrimonio.id ? updatedPatrimonio : sub
        ) || []
        
        onUpdate({
          ...patrimonio,
          subPatrimonios: updatedSubPatrimonios
        })
        
        toast({
          title: 'Sub-patrimônio atualizado com sucesso!',
        })
      } else {
        // Adicionar novo sub-patrimônio
        const response = await api.post('/patrimonios', subPatrimonioData)
        const newSubPatrimonio = response.patrimonio
        
        onUpdate({
          ...patrimonio,
          subPatrimonios: [...(patrimonio.subPatrimonios || []), newSubPatrimonio]
        })
        
        toast({
          title: 'Sub-patrimônio adicionado com sucesso!',
        })
      }
    } catch (error) {
      console.error('Erro ao salvar sub-patrimônio:', error)
      toast({
        title: 'Erro ao salvar sub-patrimônio',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, patrimonio, editingSubPatrimonio, onUpdate])

  // Função para excluir sub-patrimônio
  const handleDelete = useCallback(async (subPatrimonioId: string) => {
    if (!user) return

    setIsLoading(true)
    try {
      await api.delete(`/patrimonios/${subPatrimonioId}`)
      
      const updatedSubPatrimonios = patrimonio.subPatrimonios?.filter(
        sub => sub.id !== subPatrimonioId
      ) || []
      
      onUpdate({
        ...patrimonio,
        subPatrimonios: updatedSubPatrimonios
      })
      
      toast({
        title: 'Sub-patrimônio excluído com sucesso!',
      })
    } catch (error) {
      console.error('Erro ao excluir sub-patrimônio:', error)
      toast({
        title: 'Erro ao excluir sub-patrimônio',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, patrimonio, onUpdate])

  // Função para abrir formulário de edição
  const handleEdit = useCallback((subPatrimonio: Patrimonio) => {
    setEditingSubPatrimonio(subPatrimonio)
    setIsFormOpen(true)
  }, [])

  // Função para limpar filtros
  const handleClearFilters = useCallback(() => {
    setSearchTerm('')
    setStatusFilter('all')
  }, [])

  // Função para abrir formulário de novo sub-patrimônio
  const handleAddNew = useCallback(() => {
    setEditingSubPatrimonio(null)
    setIsFormOpen(true)
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Sub-patrimônios</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={handleAddNew}
              size="sm"
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <SubPatrimoniosFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onClearFilters={handleClearFilters}
        />
        
        {filteredSubPatrimonios.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Nenhum sub-patrimônio encontrado com os filtros aplicados.'
              : 'Nenhum sub-patrimônio cadastrado.'
            }
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubPatrimonios.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-mono text-sm">
                      {sub.numero_patrimonio}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {sub.descricao_bem}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.situacao_bem === 'ATIVO' ? 'default' :
                          sub.situacao_bem === 'BAIXADO' ? 'destructive' :
                          sub.situacao_bem === 'EM MANUTENÇÃO' ? 'secondary' : 'outline'
                        }
                      >
                        {sub.situacao_bem}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(sub.valor_aquisicao || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(sub)}
                          disabled={isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(sub.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      <SubPatrimonioForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        editingSubPatrimonio={editingSubPatrimonio}
      />
    </Card>
  )
}

export default SubPatrimoniosManagerOptimized
