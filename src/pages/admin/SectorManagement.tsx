import { useState, useEffect } from 'react'
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
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlusCircle, Edit, Trash2 } from 'lucide-react'
import { useSectors } from '@/contexts/SectorContext'
import { useMunicipalities } from '@/contexts/MunicipalityContext'
import { Sector } from '@/types'
import { SectorForm } from '@/components/admin/SectorForm'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { toast } from '@/hooks/use-toast'
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
import { useAuth } from '@/hooks/useAuth'

export default function SectorManagement() {
  const { sectors, addSector, updateSector, deleteSector, fetchSectorsByMunicipality } = useSectors()
  const { municipalities } = useMunicipalities()
  const { user } = useAuth()
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [editingSector, setEditingSector] = useState<Sector | undefined>()
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string | null>(null)

  const handleCreate = () => {
    setEditingSector(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (sector: Sector) => {
    setEditingSector(sector)
    setDialogOpen(true)
  }

  const handleSave = async (data: Omit<Sector, 'id' | 'municipalityId'>) => {
    try {
      console.log('Saving sector with data:', data)
      console.log('User role:', user?.role)
      console.log('User municipalityId:', user?.municipalityId)
      console.log('Selected municipalityId:', selectedMunicipalityId)
      console.log('Available municipalities:', municipalities)
      
      if (editingSector) {
        await updateSector(editingSector.id, data)
      } else {
        let municipalityId: string | null = null
        
        if (user?.role === 'superuser') {
          municipalityId = selectedMunicipalityId
        } else {
          municipalityId = user?.municipalityId || null
        }
        
        console.log('Using municipalityId:', municipalityId)
        
        if (municipalityId) {
          await addSector({ ...data, municipalityId })
        } else {
          console.error('No municipalityId available')
          
          // For superusers, show different message
          if (user?.role === 'superuser') {
            toast({
              variant: 'destructive',
              title: 'Erro',
              description: 'Selecione um município antes de criar o setor.',
            })
          } else {
            toast({
              variant: 'destructive',
              title: 'Erro',
              description: 'Município não encontrado. Verifique se você está vinculado a um município.',
            })
          }
          return
        }
      }
      setDialogOpen(false)
    } catch (error) {
      console.error('Error saving sector:', error)
      // Não fechar o dialog em caso de erro
    }
  }

  // Carregar setores automaticamente quando a página é carregada
  useEffect(() => {
    const loadSectors = async () => {
      if (user?.role === 'superuser') {
        // Para superusuários, não carregar automaticamente - aguardar seleção de município
        console.log('🔍 Superusuário - aguardando seleção de município')
      } else {
        // Para outros usuários, carregar setores do seu município
        console.log('🔍 Carregando setores para usuário:', user?.role, 'Município:', user?.municipalityId)
        if (user?.municipalityId) {
          await fetchSectorsByMunicipality(user.municipalityId)
        }
      }
    }

    loadSectors()
  }, [user, fetchSectorsByMunicipality])

  const handleMunicipalityChange = async (municipalityId: string | null) => {
    setSelectedMunicipalityId(municipalityId)
    if (municipalityId && user?.role === 'superuser') {
      await fetchSectorsByMunicipality(municipalityId)
    }
  }

  const municipalityOptions = municipalities.map((m) => ({
    value: m.id,
    label: m.name,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gerenciar Setores</h1>
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Setor
        </Button>
      </div>
      
      {/* Seletor de município para superusuários */}
      {user?.role === 'superuser' && (
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Município</CardTitle>
            <CardDescription>
              Selecione um município para visualizar seus setores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchableSelect
              options={municipalityOptions}
              value={selectedMunicipalityId}
              onChange={handleMunicipalityChange}
              placeholder="Selecione um município"
            />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Setores Cadastrados</CardTitle>
          <CardDescription>
            Visualize, adicione e edite os setores do município.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Setor Pai</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectors.map((sector) => (
                <TableRow key={sector.id}>
                  <TableCell className="font-medium">{sector.name}</TableCell>
                  <TableCell>{sector.codigo}</TableCell>
                  <TableCell>{sector.responsavel || 'N/A'}</TableCell>
                  <TableCell>
                    {sectors.find((s) => s.id === sector.parentId)?.name ||
                      'Raiz'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(sector)}
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
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteSector(sector.id)}
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
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSector ? 'Editar Setor' : 'Novo Setor'}
            </DialogTitle>
          </DialogHeader>
          <SectorForm
            data={editingSector}
            onSave={handleSave}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
