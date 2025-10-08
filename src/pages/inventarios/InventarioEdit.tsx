import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { useInventory } from '@/contexts/InventoryContext'
import { useSectors } from '@/contexts/SectorContext'
import { useLocais } from '@/contexts/LocalContext'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Inventory } from '@/types'

const inventoryEditSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  sectorName: z.string().min(1, 'Setor é obrigatório'),
  scope: z.enum(['sector', 'location'], {
    required_error: 'Escopo é obrigatório',
  }),
  locationType: z.string().optional(),
})

type InventoryEditFormValues = z.infer<typeof inventoryEditSchema>

export default function InventarioEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getInventoryById, updateInventory } = useInventory()
  const { sectors } = useSectors()
  const { getLocaisBySectorId } = useLocais()
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<InventoryEditFormValues>({
    resolver: zodResolver(inventoryEditSchema),
    defaultValues: {
      name: '',
      sectorName: '',
      scope: 'sector',
      locationType: '',
    },
  })

  useEffect(() => {
    if (id) {
      const inv = getInventoryById(id)
      if (inv) {
        setInventory(inv)
        form.reset({
          name: inv.name,
          sectorName: inv.sectorName,
          scope: inv.scope,
          locationType: inv.locationType || '',
        })
      } else {
        navigate('/inventarios')
      }
    }
  }, [id, getInventoryById, navigate, form])

  const selectedSectorName = form.watch('sectorName')
  const selectedScope = form.watch('scope')
  const selectedSector = sectors.find((s) => s.name === selectedSectorName)

  const locationOptions = useMemo(() => {
    if (!selectedSector || selectedScope !== 'location') return []
    const locais = getLocaisBySectorId(selectedSector.id)
    return locais.map((local) => ({ value: local.name, label: local.name }))
  }, [selectedSector, selectedScope, getLocaisBySectorId])

  const onSubmit = async (data: InventoryEditFormValues) => {
    if (!inventory || !id) return
    
    setIsLoading(true)
    try {
      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Atualizar inventário
      const updatedInventory = {
        ...inventory,
        name: data.name,
        sectorName: data.sectorName,
        scope: data.scope,
        locationType: data.scope === 'location' ? data.locationType : undefined,
      }
      
      updateInventory(id, updatedInventory)
      
      toast({
        title: 'Sucesso!',
        description: 'Inventário atualizado com sucesso.',
      })
      
      navigate('/inventarios')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao atualizar inventário.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!inventory) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Verificar se o inventário pode ser editado
  if (inventory.status === 'completed') {
    return (
      <div className="flex-1 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Inventário Finalizado
            </h1>
            <p className="text-gray-600 mb-6">
              Este inventário já foi finalizado e não pode ser editado.
            </p>
            <Button variant="outline" onClick={() => navigate('/inventarios')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a Lista
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/inventarios')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-2">
                Editar Inventário
              </h1>
              <p className="text-base lg:text-lg text-gray-600">
                Atualize as informações do inventário
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
                  Informações do Inventário
                </CardTitle>
                <CardDescription>
                  Edite as informações básicas do inventário
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Inventário *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Inventário Janeiro 2024" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sectorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o setor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sectors.map((sector) => (
                              <SelectItem key={sector.id} value={sector.name}>
                                {sector.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Escopo *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o escopo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sector">Todo o Setor</SelectItem>
                            <SelectItem value="location">Local Específico</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedScope === 'location' && (
                  <FormField
                    control={form.control}
                    name="locationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local Específico *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o local" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locationOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/inventarios')}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
