import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlusCircle, Edit, Trash2 } from 'lucide-react'
import { useMunicipalities } from '@/contexts/MunicipalityContext'
import { MunicipalityForm } from '@/components/superuser/MunicipalityForm'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { Municipality, User } from '@/types'
import { Badge } from '@/components/ui/badge'
import { isBefore, format } from 'date-fns'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSectors } from '@/contexts/SectorContext'

export default function MunicipalityManagement() {
  const {
    municipalities,
    addMunicipality,
    updateMunicipality,
    deleteMunicipality,
    refreshMunicipalities,
  } = useMunicipalities()
  
  console.log('MunicipalityManagement - municipalities:', municipalities)
  const { users } = useAuth()
  const { patrimonios } = usePatrimonio()
  const { addSector } = useSectors()
  const [isFormOpen, setFormOpen] = useState(false)
  const [editingMunicipality, setEditingMunicipality] = useState<
    Municipality | undefined
  >()

  const handleCreate = () => {
    setEditingMunicipality(undefined)
    setFormOpen(true)
  }

  const handleEdit = (municipality: Municipality) => {
    setEditingMunicipality(municipality)
    setFormOpen(true)
  }

  const handleSave = async (data: any, user: User) => {
    try {
      if (editingMunicipality) {
        updateMunicipality(editingMunicipality.id, data, user)
        toast({
          title: 'Sucesso!',
          description: 'Município atualizado com sucesso.',
        })
      } else {
        const newMunicipality = await addMunicipality(data, user)

        // Verificar se o nome existe antes de usar substring
        if (newMunicipality.name) {
          addSector({
            name: newMunicipality.name,
            sigla: newMunicipality.name.substring(0, 5).toUpperCase(),
            codigo: String(municipalities.length % 99).padStart(2, '0'),
            parentId: null,
            municipalityId: newMunicipality.id,
          })
        }

        toast({
          title: 'Sucesso!',
          description: 'Município criado com sucesso.',
        })
      }
      setFormOpen(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description:
          error instanceof Error
            ? error.message
            : 'Ocorreu uma falha ao salvar os dados.',
      })
    }
  }

  const handleDelete = async (municipalityId: string, force: boolean = false) => {
    try {
      await deleteMunicipality(municipalityId, force)
      
      toast({
        title: 'Sucesso!',
        description: force ? 'Município excluído com sucesso (forçado).' : 'Município excluído com sucesso.',
      })
      
      // Forçar refresh da lista
      await refreshMunicipalities()
      
    } catch (error: any) {
      console.error('Erro ao excluir município:', error)
      
      // Check if it's a dependency error
      if (error.message?.includes('Existem dados vinculados')) {
        // Show dialog with force option
        if (confirm('Este município possui dados vinculados. Deseja forçar a exclusão removendo todos os dados associados?')) {
          await handleDelete(municipalityId, true)
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Erro ao excluir município.',
        })
      }
    }
  }

  const getAccessStatus = (m: Municipality) => {
    if (!m.accessEndDate) return <Badge variant="secondary">Indefinido</Badge>
    const endDate = new Date(m.accessEndDate)
    if (isBefore(endDate, new Date())) {
      return <Badge variant="destructive">Expirado</Badge>
    }
    return <Badge variant="default">Ativo</Badge>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Municípios</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie os municípios no sistema.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Município
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Fim do Acesso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {municipalities.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.cnpj}</TableCell>
                    <TableCell>
                      {m.accessEndDate
                        ? format(new Date(m.accessEndDate), 'dd/MM/yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{getAccessStatus(m)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(m)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Todos os dados
                              associados a este município serão perdidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(m.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMunicipality ? 'Editar Município' : 'Novo Município'}
            </DialogTitle>
            <DialogDescription>
              Preencha os detalhes do município.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="pr-6">
              <MunicipalityForm
                municipality={editingMunicipality}
                onSave={handleSave}
                onClose={() => setFormOpen(false)}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
