import { SectorLocalForm } from '@/components/admin/SectorLocalForm';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocals } from '@/contexts/LocalContext';
import { useSectors } from '@/contexts/SectorContext';
import { Local } from '@/types';
import { Edit, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function Locais() {
  const { locals, fetchLocals } = useLocals();
  const { sectors } = useSectors();
  const [isDialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    void fetchLocals();
  }, [fetchLocals]);
  const [editingLocal, setEditingLocal] = useState<Local | undefined>();
  const [parentSectorId, setParentSectorId] = useState<string | null>(null);

  const groupedLocals = useMemo(() => {
    return sectors.map(sector => ({
      ...sector,
      locals: locals.filter(local => local.sectorId === sector.id),
    }));
  }, [sectors, locals]);

  const handleCreate = (sectorId: string) => {
    setEditingLocal(undefined);
    setParentSectorId(sectorId);
    setDialogOpen(true);
  };

  const handleEdit = (local: Local) => {
    setEditingLocal(local);
    setParentSectorId(local.sectorId);
    setDialogOpen(true);
  };

  const handleSave = (data: { name: string; parentId: string | null }) => {
    if (!data.parentId) return;
    // TODO: Implementar criação/edição de locais
    console.log('Salvando local:', data);
    setDialogOpen(false);
  };

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Gerenciar Locais</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Locais por Setor</CardTitle>
          <CardDescription>
            Gerencie os locais onde os bens estão alocados, agrupados por setor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type='multiple' className='w-full'>
            {groupedLocals.map(sector => (
              <AccordionItem value={sector.id} key={sector.id}>
                <AccordionTrigger>
                  {sector.name} ({sector.locals.length} locais)
                </AccordionTrigger>
                <AccordionContent>
                  <div className='space-y-2 pl-4'>
                    {sector.locals.map(local => (
                      <div
                        key={local.id}
                        className='flex items-center justify-between p-2 rounded-md border'
                      >
                        <span>{local.name}</span>
                        <div>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleEdit(local)}
                          >
                            <Edit className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='text-destructive hover:text-destructive'
                            onClick={() => {
                              // TODO: Implementar exclusão de local
                              console.log('Excluindo local:', local.id);
                            }}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleCreate(sector.id)}
                    >
                      <PlusCircle className='mr-2 h-4 w-4' /> Adicionar Local
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
          </DialogHeader>
          <SectorLocalForm
            type='local'
            data={editingLocal}
            parentId={parentSectorId}
            onSave={handleSave}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
