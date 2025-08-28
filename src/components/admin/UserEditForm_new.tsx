import { useState, useMemo, useEffect, ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { User } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { MultiSelect } from '@/components/ui/multi-select'
import { useSectors } from '@/contexts/SectorContext'
import { useMunicipalities } from '@/contexts/MunicipalityContext'

const userEditSchema = z.object({
  name: z.string().min(1, { message: 'Nome completo é obrigatório.' }),
  email: z.string().email({ message: 'Formato de e-mail inválido.' }),
  role: z.enum(['supervisor', 'usuario', 'visualizador'], {
    required_error: 'Perfil é obrigatório.',
  }),
  sector: z.string().optional(),
  responsibleSectors: z.array(z.string()).optional(),
  municipalityId: z.string().min(1, { message: 'Município é obrigatório.' }),
  avatarUrl: z.string().optional(),
})

type UserEditFormValues = z.infer<typeof userEditSchema>

interface UserEditFormProps {
  user: User
  onSuccess: (updatedUser: User) => void
}

const roleOptions: SearchableSelectOption[] = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'usuario', label: 'Usuário' },
  { value: 'visualizador', label: 'Visualizador' },
]

export const UserEditForm = ({ user, onSuccess }: UserEditFormProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const { user: currentUser, updateUser } = useAuth()
  const { sectors, fetchSectorsByMunicipality, isLoading: sectorsLoading } = useSectors()
  const { municipalities } = useMunicipalities()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const municipalityOptions = useMemo(
    () => {
      console.log('Municipalities in edit form:', municipalities)
      const options = municipalities.map((m) => ({
        value: m.id,
        label: m.name,
      }))
      console.log('Municipality options in edit form:', options)
      return options
    },
    [municipalities],
  )

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      sector: user.sector,
      avatarUrl: user.avatarUrl,
      responsibleSectors: user.responsibleSectors || [],
      municipalityId: user.municipalityId,
    },
  })

  const role = form.watch('role')
  const municipalityId = form.watch('municipalityId')

  const allSectors = useMemo(
    () => {
      console.log('🔍 Filtrando setores para município:', municipalityId)
      console.log('📋 Setores disponíveis:', sectors.map(s => ({ id: s.id, name: s.name, municipalityId: s.municipalityId })))
      
      const filteredSectors = sectors
        .filter((s) => s.municipalityId === municipalityId)
        .map((s) => ({ value: s.name, label: s.name }))
      
      console.log('✅ Setores filtrados:', filteredSectors)
      return filteredSectors
    },
    [sectors, municipalityId],
  )

  // Carregar setores quando o município for selecionado
  useEffect(() => {
    if (municipalityId) {
      console.log('🔄 Carregando setores para município:', municipalityId)
      fetchSectorsByMunicipality(municipalityId)
    } else {
      // Limpar setores quando não há município selecionado
      console.log('🔄 Limpando setores - nenhum município selecionado')
    }
  }, [municipalityId]) // Removido fetchSectorsByMunicipality da dependência

  useEffect(() => {
    form.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      sector: user.sector,
      avatarUrl: user.avatarUrl,
      responsibleSectors: user.responsibleSectors || [],
      municipalityId: user.municipalityId,
    })
    setAvatarPreview(user.avatarUrl)
  }, [user, form])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setAvatarPreview(result)
        form.setValue('avatarUrl', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: UserEditFormValues) => {
    setIsLoading(true)
    try {
      const updatedUser = await updateUser(user.id, data)
      toast({
        title: 'Sucesso!',
        description: `Usuário ${updatedUser.name} atualizado.`,
      })
      onSuccess(updatedUser)
    } catch (error) {
      toast({
        title: 'Erro',
        description:
          error instanceof Error ? error.message : 'Falha ao atualizar usuário',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome do usuário" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {currentUser?.role === 'superuser' && (
          <FormField
            control={form.control}
            name="municipalityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Município</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={municipalityOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Selecione o município"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="sector"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setor Principal</FormLabel>
              <FormControl>
                <SearchableSelect
                  options={allSectors}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={sectorsLoading ? "Carregando setores..." : "Selecione o setor principal (opcional)"}
                  disabled={!municipalityId || sectorsLoading}
                  isClearable
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Perfil</FormLabel>
              <FormControl>
                <SearchableSelect
                  options={roleOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Selecione um perfil"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {(role === 'usuario' || role === 'visualizador') && (
          <FormField
            control={form.control}
            name="responsibleSectors"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setores de Acesso</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={allSectors}
                    selected={field.value || []}
                    onChange={field.onChange}
                    placeholder={sectorsLoading ? "Carregando setores..." : "Selecione os setores..."}
                    disabled={!municipalityId || sectorsLoading}
                  />
                </FormControl>
                <FormDescription>
                  O usuário terá acesso aos bens destes setores e seus
                  subsetores.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Form>
  )
}
