import React, { useState } from 'react'
import { Plus, Edit, Trash2, Power, PowerOff, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTiposBens } from '@/contexts/TiposBensContext'
import { useToast } from '@/hooks/use-toast'
import { TipoBem } from '@/contexts/TiposBensContext'

const GerenciarTipos = () => {
  const { tiposBens, isLoading, createTipoBem, updateTipoBem, deleteTipoBem, toggleTipoBemStatus } = useTiposBens()
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTipo, setSelectedTipo] = useState<TipoBem | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    codigo: ''
  })

  const filteredTipos = tiposBens.filter(tipo =>
    tipo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tipo.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tipo.descricao && tipo.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleCreate = async () => {
    try {
      await createTipoBem({
        ...formData,
        ativo: true,
        municipalityId: '1' // Será preenchido pelo contexto
      })
      setIsCreateDialogOpen(false)
      setFormData({ nome: '', descricao: '', codigo: '' })
      toast({
        title: 'Sucesso',
        description: 'Tipo de bem criado com sucesso!',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar tipo de bem',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = async () => {
    if (!selectedTipo) return
    
    try {
      await updateTipoBem(selectedTipo.id, formData)
      setIsEditDialogOpen(false)
      setSelectedTipo(null)
      setFormData({ nome: '', descricao: '', codigo: '' })
      toast({
        title: 'Sucesso',
        description: 'Tipo de bem atualizado com sucesso!',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar tipo de bem',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedTipo) return
    
    try {
      await deleteTipoBem(selectedTipo.id)
      setIsDeleteDialogOpen(false)
      setSelectedTipo(null)
      toast({
        title: 'Sucesso',
        description: 'Tipo de bem excluído com sucesso!',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir tipo de bem',
        variant: 'destructive',
      })
    }
  }

  const handleToggleStatus = async (tipo: TipoBem) => {
    try {
      await toggleTipoBemStatus(tipo.id)
      toast({
        title: 'Sucesso',
        description: `Tipo ${tipo.ativo ? 'desativado' : 'ativado'} com sucesso!`,
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao alterar status do tipo',
        variant: 'destructive',
      })
    }
  }

  const openEditDialog = (tipo: TipoBem) => {
    setSelectedTipo(tipo)
    setFormData({
      nome: tipo.nome,
      descricao: tipo.descricao || '',
      codigo: tipo.codigo
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (tipo: TipoBem) => {
    setSelectedTipo(tipo)
    setIsDeleteDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando tipos de bens...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">
            Gerenciar Tipos de Bens
          </h1>
          <p className="text-sm lg:text-base text-gray-600 mt-1">
            Gerencie os tipos de bens patrimoniais do sistema
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full lg:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar tipos de bens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{tiposBens.length}</p>
              <p className="text-sm text-gray-600">Total de Tipos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Bens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTipos.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell className="font-mono text-sm">{tipo.codigo}</TableCell>
                    <TableCell className="font-medium">{tipo.nome}</TableCell>
                    <TableCell className="text-gray-600">
                      {tipo.descricao || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tipo.ativo ? 'default' : 'secondary'}>
                        {tipo.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(tipo)}
                          title={tipo.ativo ? 'Desativar' : 'Ativar'}
                        >
                          {tipo.ativo ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(tipo)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(tipo)}
                          title="Excluir"
                          className="text-red-600 hover:text-red-700"
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
          
          {filteredTipos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Nenhum tipo encontrado para a busca.' : 'Nenhum tipo de bem cadastrado.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Novo Tipo de Bem</DialogTitle>
            <DialogDescription>
              Adicione um novo tipo de bem patrimonial ao sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Equipamento de Informática"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                placeholder="Ex: INFO"
                className="uppercase"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição detalhada do tipo de bem"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!formData.nome || !formData.codigo}>
              Criar Tipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Tipo de Bem</DialogTitle>
            <DialogDescription>
              Edite as informações do tipo de bem patrimonial.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Equipamento de Informática"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-codigo">Código *</Label>
              <Input
                id="edit-codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                placeholder="Ex: INFO"
                className="uppercase"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição detalhada do tipo de bem"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={!formData.nome || !formData.codigo}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o tipo "{selectedTipo?.nome}"? 
              Esta ação não pode ser desfeita e pode afetar patrimônios que utilizam este tipo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default GerenciarTipos
