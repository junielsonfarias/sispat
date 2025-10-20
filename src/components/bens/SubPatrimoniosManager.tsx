import { useState, useEffect } from 'react'
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
  MoreHorizontal,
  Package
} from 'lucide-react'
import { SubPatrimonio, SubPatrimonioStatus } from '@/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const subPatrimonioSchema = z.object({
  localizacao_especifica: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['ativo', 'baixado', 'manutencao']),
})

type SubPatrimonioFormValues = z.infer<typeof subPatrimonioSchema>

interface SubPatrimoniosManagerProps {
  patrimonioId: string
  patrimonioNumero: string
  isKit: boolean
  quantidadeUnidades?: number
}

// ✅ CORREÇÃO: Removido mock data - será integrado com API real

const SubPatrimoniosManager = ({ 
  patrimonioId, 
  patrimonioNumero, 
  isKit, 
  quantidadeUnidades = 0 
}: SubPatrimoniosManagerProps) => {
  const [subPatrimonios, setSubPatrimonios] = useState<SubPatrimonio[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubPatrimonio, setEditingSubPatrimonio] = useState<SubPatrimonio | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubPatrimonioStatus | 'all'>('all')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<SubPatrimonioFormValues>({
    resolver: zodResolver(subPatrimonioSchema),
    defaultValues: {
      localizacao_especifica: '',
      observacoes: '',
      status: 'ativo',
    },
  })

  // Carregar sub-patrimônios quando o componente monta
  useEffect(() => {
    if (isKit) {
      // ✅ CORREÇÃO: TODO - Integrar com API real para carregar sub-patrimônios
      // Por enquanto, inicia com array vazio
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
      form.reset({
        localizacao_especifica: subPatrimonio.localizacao_especifica || '',
        observacoes: subPatrimonio.observacoes || '',
        status: subPatrimonio.status,
      })
    } else {
      setEditingSubPatrimonio(null)
      form.reset({
        localizacao_especifica: '',
        observacoes: '',
        status: 'ativo',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingSubPatrimonio(null)
    form.reset()
  }

  const onSubmit = async (data: SubPatrimonioFormValues) => {
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
      <CardHeader className="pb-4 px-6 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
              Sub-Patrimônios ({subPatrimonios.length})
            </CardTitle>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar sub-patrimônios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SubPatrimonioStatus | 'all')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="baixado">Baixado</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingSubPatrimonio ? 'Editar Sub-Patrimônio' : 'Novo Sub-Patrimônio'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSubPatrimonio
                      ? 'Atualize as informações do sub-patrimônio.'
                      : 'Adicione um novo sub-patrimônio ao kit.'}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ativo">Ativo</SelectItem>
                              <SelectItem value="baixado">Baixado</SelectItem>
                              <SelectItem value="manutencao">Manutenção</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="localizacao_especifica"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Localização Específica</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Sala 101 - Mesa 1" />
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
                            <Textarea {...field} placeholder="Observações sobre o sub-patrimônio" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseDialog}
                        disabled={isLoading}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Salvando...' : editingSubPatrimonio ? 'Atualizar' : 'Criar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {selectedItems.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedItems.length} item(s) selecionado(s)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusChange('ativo')}
                >
                  Marcar como Ativo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusChange('baixado')}
                >
                  Marcar como Baixado
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusChange('manutencao')}
                >
                  Marcar como Manutenção
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Exportar
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-8 w-8 p-0"
                  >
                    {selectedItems.length === filteredSubPatrimonios.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubPatrimonios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Nenhum sub-patrimônio encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubPatrimonios.map((subPatrimonio) => (
                  <TableRow key={subPatrimonio.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectItem(subPatrimonio.id)}
                        className="h-8 w-8 p-0"
                      >
                        {selectedItems.includes(subPatrimonio.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {subPatrimonio.numero_subpatrimonio}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(subPatrimonio.status)}>
                        {subPatrimonio.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {subPatrimonio.localizacao_especifica || '-'}
                    </TableCell>
                    <TableCell>
                      {subPatrimonio.observacoes || '-'}
                    </TableCell>
                    <TableCell>
                      {subPatrimonio.created_at.toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(subPatrimonio)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(subPatrimonio.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default SubPatrimoniosManager
