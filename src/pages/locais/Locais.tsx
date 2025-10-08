import { useState, useMemo } from 'react'
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react'
import { useLocais } from '@/contexts/LocalContext'
import { useSectors } from '@/contexts/SectorContext'
import { Local } from '@/types'
import { SectorLocalForm } from '@/components/admin/SectorLocalForm'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export default function Locais() {
  const { locais, addLocal, updateLocal, deleteLocal } = useLocais()
  const { sectors } = useSectors()
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [editingLocal, setEditingLocal] = useState<Local | undefined>()
  const [parentSectorId, setParentSectorId] = useState<string | null>(null)

  const groupedLocais = useMemo(() => {
    return sectors.map((sector) => ({
      ...sector,
      locais: locais.filter((local) => local.sectorId === sector.id),
    }))
  }, [sectors, locais])

  const handleCreate = (sectorId: string) => {
    setEditingLocal(undefined)
    setParentSectorId(sectorId)
    setDialogOpen(true)
  }

  const handleEdit = (local: Local) => {
    setEditingLocal(local)
    setParentSectorId(local.sectorId)
    setDialogOpen(true)
  }

  const handleSave = (data: { name: string; parentId: string | null }) => {
    if (!data.parentId) return
    if (editingLocal) {
      updateLocal(editingLocal.id, data.name, data.parentId)
    } else {
      addLocal(data.name, data.parentId)
    }
    setDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gerenciar Locais</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Locais por Setor</CardTitle>
          <CardDescription>
            Gerencie os locais onde os bens estão alocados, agrupados por setor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {groupedLocais.map((sector) => (
              <AccordionItem value={sector.id} key={sector.id}>
                <AccordionTrigger>
                  {sector.name} ({sector.locais.length} locais)
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-4">
                    {sector.locais.map((local) => (
                      <div
                        key={local.id}
                        className="flex items-center justify-between p-2 rounded-md border"
                      >
                        <span>{local.name}</span>
                        <div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(local)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteLocal(local.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreate(sector.id)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Local
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocal ? 'Editar Local' : 'Novo Local'}
            </DialogTitle>
            <DialogDescription>
              {editingLocal ? 'Edite as informações do local.' : 'Preencha as informações para criar um novo local.'}
            </DialogDescription>
          </DialogHeader>
          <SectorLocalForm
            type="local"
            data={editingLocal}
            parentId={parentSectorId}
            onSave={handleSave}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
